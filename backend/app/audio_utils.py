"""Small audio format helpers shared by the real-time browser pipeline."""

from __future__ import annotations

import io
import wave

# What the browser is told to record at: mono, 16-bit signed, 16kHz. Small
# enough to send over a WebSocket without meaningful delay, and the rate
# Whisper-class models are built around.
PCM_SAMPLE_RATE_HZ = 16_000
PCM_SAMPLE_WIDTH_BYTES = 2
PCM_CHANNELS = 1


def pcm_to_wav(pcm_bytes: bytes) -> bytes:
    """Wrap headerless PCM samples in a WAV container."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(PCM_CHANNELS)
        wav_file.setsampwidth(PCM_SAMPLE_WIDTH_BYTES)
        wav_file.setframerate(PCM_SAMPLE_RATE_HZ)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()
