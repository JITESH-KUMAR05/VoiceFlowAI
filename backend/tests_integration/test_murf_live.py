"""A real Murf synthesis call.

Confirms the API key, voice id, and streaming call shape actually produce
audio — the unit suite only proves create_audio_stream calls the client
correctly, not that Murf accepts what it sends.
"""

from __future__ import annotations

from app.config import Settings
from app.services.murf_service import MurfService


def test_streaming_a_short_line_returns_playable_wav_bytes(require_murf: Settings):
    service = MurfService(require_murf)

    chunks = list(
        service.create_audio_stream(
            "This is a short integration test.",
            voice_id="en-IN-anisha",
            language="en-IN",
        )
    )

    assert chunks, "Murf returned no audio at all"
    audio = b"".join(chunks)
    assert len(audio) > 1_000  # a real WAV, not an empty or error response
    assert audio[:4] == b"RIFF"
    assert audio[8:12] == b"WAVE"
