"""pcm_to_wav: wrapping headerless mic PCM in a WAV container for Whisper.

Whisper's transcription endpoint needs a real audio file, not headerless
PCM - the browser sends the smallest possible wire format (raw samples,
no header), so this adds the header back on before transcription.
"""

from __future__ import annotations

import io
import wave

from app.audio_utils import (
    PCM_CHANNELS,
    PCM_SAMPLE_RATE_HZ,
    PCM_SAMPLE_WIDTH_BYTES,
    pcm_to_wav,
)


def test_pcm_to_wav_produces_a_valid_wav_with_the_expected_format():
    pcm = b"\x00\x01" * 100

    wav_bytes = pcm_to_wav(pcm)

    with wave.open(io.BytesIO(wav_bytes)) as wav_file:
        assert wav_file.getnchannels() == PCM_CHANNELS
        assert wav_file.getsampwidth() == PCM_SAMPLE_WIDTH_BYTES
        assert wav_file.getframerate() == PCM_SAMPLE_RATE_HZ
        assert wav_file.readframes(wav_file.getnframes()) == pcm


def test_pcm_to_wav_of_empty_bytes_is_still_a_valid_empty_wav():
    wav_bytes = pcm_to_wav(b"")

    with wave.open(io.BytesIO(wav_bytes)) as wav_file:
        assert wav_file.getnframes() == 0
