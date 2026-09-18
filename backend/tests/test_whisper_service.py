"""WhisperService: batch transcription of one recorded utterance.

Follows the same fake-the-client-after-construction pattern as
test_murf_service.py - real credentials are never touched.
"""

from __future__ import annotations

from openai import OpenAIError

from app.services.whisper_service import WhisperService


class FakeTranscriptionResult:
    def __init__(self, text: str) -> None:
        self.text = text


class FakeTranscriptions:
    def __init__(self, result_text: str = "hello there", raise_error=None):
        self.calls: list[dict] = []
        self._result_text = result_text
        self._raise = raise_error

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self._raise:
            raise self._raise
        return FakeTranscriptionResult(self._result_text)


class FakeAudio:
    def __init__(self, transcriptions: FakeTranscriptions):
        self.transcriptions = transcriptions


class FakeClient:
    def __init__(self, transcriptions: FakeTranscriptions):
        self.audio = FakeAudio(transcriptions)


def build_service(transcriptions: FakeTranscriptions) -> WhisperService:
    service = WhisperService.__new__(WhisperService)
    service._deployment = "whisper1"
    service._client = FakeClient(transcriptions)
    return service


async def test_transcribe_returns_the_stripped_transcript_text():
    service = build_service(FakeTranscriptions(result_text="  hi there  "))

    text = await service.transcribe(b"RIFF-fake-wav")

    assert text == "hi there"


async def test_transcribe_sends_the_configured_deployment_and_a_named_wav_file():
    transcriptions = FakeTranscriptions()
    service = build_service(transcriptions)

    await service.transcribe(b"RIFF-fake-wav")

    assert len(transcriptions.calls) == 1
    call = transcriptions.calls[0]
    assert call["model"] == "whisper1"
    filename, content, content_type = call["file"]
    assert filename == "utterance.wav"
    assert content == b"RIFF-fake-wav"
    assert content_type == "audio/wav"


async def test_a_transcription_failure_returns_an_empty_string_rather_than_raising():
    service = build_service(FakeTranscriptions(raise_error=OpenAIError("boom")))

    text = await service.transcribe(b"RIFF-fake-wav")

    assert text == ""
