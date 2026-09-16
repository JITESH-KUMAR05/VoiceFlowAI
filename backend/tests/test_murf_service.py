"""MurfService: model choice, the locale parameter, and stream failure paths.

No coverage existed for this service before - the model and parameter names
it sends were only ever verified by eye. That's exactly how it ended up
sending "FALCON" (the legacy model, ~170ms time-to-first-audio, measured
live) instead of "falcon-2" (Murf's current recommended model, ~76ms
measured live) and multi_native_locale (superseded, per Murf's own SDK
docstring) instead of locale, without anything catching it.
"""

from __future__ import annotations

from app.services.murf_service import MODEL, MurfService, voice_name


class FakeStreamClient:
    """Records the kwargs it was called with; yields two fixed chunks."""

    def __init__(self, chunks=(b"chunk-a", b"chunk-b"), raise_before=None, raise_during=None):
        self.calls: list[dict] = []
        self._chunks = chunks
        self._raise_before = raise_before
        self._raise_during = raise_during

    def stream(self, **kwargs):
        self.calls.append(kwargs)
        if self._raise_before:
            raise self._raise_before
        return self._iter()

    def _iter(self):
        for chunk in self._chunks:
            if self._raise_during and chunk == self._chunks[-1]:
                raise self._raise_during
            yield chunk


class FakeTextToSpeech:
    def __init__(self, stream_client: FakeStreamClient):
        self.text_to_speech = stream_client


def build_service(stream_client: FakeStreamClient) -> MurfService:
    service = MurfService.__new__(MurfService)
    service._client = FakeTextToSpeech(stream_client)
    return service


def test_voice_name_extracts_the_bare_name_from_a_locale_qualified_id():
    assert voice_name("en-IN-anisha") == "Anisha"
    assert voice_name("hi-IN-khyati") == "Khyati"


def test_voice_name_passes_through_a_bare_name_unchanged():
    assert voice_name("Anisha") == "Anisha"


def test_the_model_in_use_is_falcon_2_not_the_legacy_falcon():
    # Guards against regressing to the older model this replaced. Measured
    # live: FALCON ~170ms time-to-first-audio, falcon-2 ~76ms.
    assert MODEL == "falcon-2"


def test_create_audio_stream_sends_the_current_model_and_locale_param():
    stream_client = FakeStreamClient()
    service = build_service(stream_client)

    list(service.create_audio_stream("Hello there", "en-IN-anisha", "en-IN"))

    assert len(stream_client.calls) == 1
    call = stream_client.calls[0]
    assert call["model"] == "falcon-2"
    assert call["locale"] == "en-IN"
    # multi_native_locale is superseded per Murf's own SDK docs - sending it
    # alongside locale is at best redundant, so it should be gone entirely.
    assert "multi_native_locale" not in call
    assert call["voice_id"] == "Anisha"
    assert call["format"] == "WAV"
    assert call["sample_rate"] == 24_000


def test_yields_the_chunks_the_stream_produces():
    stream_client = FakeStreamClient(chunks=(b"a", b"bc", b"def"))
    service = build_service(stream_client)

    chunks = list(service.create_audio_stream("Hi", "en-IN-anisha"))

    assert chunks == [b"a", b"bc", b"def"]


def test_a_failure_before_streaming_starts_yields_nothing_rather_than_raising():
    stream_client = FakeStreamClient(raise_before=RuntimeError("connection refused"))
    service = build_service(stream_client)

    chunks = list(service.create_audio_stream("Hi", "en-IN-anisha"))

    assert chunks == []


def test_a_mid_stream_failure_yields_what_arrived_before_it_rather_than_raising():
    stream_client = FakeStreamClient(
        chunks=(b"first", b"second"), raise_during=RuntimeError("connection reset")
    )
    service = build_service(stream_client)

    chunks = list(service.create_audio_stream("Hi", "en-IN-anisha"))

    # "first" arrives before the failure; "second" is where it breaks, per
    # FakeStreamClient raising on the last configured chunk instead of
    # yielding it.
    assert chunks == [b"first"]
