"""Murf text-to-speech, streamed.

Synthesis is streamed chunk by chunk rather than rendered to a file and then
served. On a phone call the difference is audible: waiting for a complete WAV
adds the full synthesis time to every turn, whereas streaming lets playback
start as soon as the first chunk lands.
"""

from __future__ import annotations

import logging
from typing import Iterator

from murf import Murf, MurfRegion

from app.config import Settings

logger = logging.getLogger(__name__)

SYNTHESIS_TIMEOUT_SECONDS = 60
SAMPLE_RATE_HZ = 24_000

# "falcon-2", not the legacy "FALCON" this replaced. Measured live against
# the account's own streaming endpoint: FALCON's time-to-first-audio is
# ~170ms, falcon-2's is ~76ms - roughly half, and it's the model Murf's own
# docs now recommend. "GEN2" is not an option: it 400s outright on this
# account's region ("Gen2 Model is not available in in.api.murf.ai").
MODEL = "falcon-2"


def voice_name(voice_id: str) -> str:
    """Turn a locale-qualified voice id into the name Murf expects.

    The frontend and the persona table both use ids like "en-IN-anisha";
    Murf's streaming API wants "Anisha".
    """
    if "-" not in voice_id:
        return voice_id
    return voice_id.rsplit("-", 1)[-1].capitalize()


class MurfService:
    def __init__(self, settings: Settings) -> None:
        self._client = Murf(
            api_key=settings.MURF_API_KEY,
            region=MurfRegion.IN,
            timeout=SYNTHESIS_TIMEOUT_SECONDS,
        )

    def create_audio_stream(
        self,
        text: str,
        voice_id: str,
        language: str = "en-IN",
        audio_format: str = "WAV",
    ) -> Iterator[bytes]:
        """Yield audio chunks for ``text``.

        ``audio_format`` is "WAV" for the REST path (Twilio's <Play> and the
        browser's <audio> element both need a self-contained file) and "PCM"
        for the real-time WebSocket path, where the client schedules raw
        samples directly in the Web Audio API instead of decoding a file.

        Yields nothing if synthesis fails. Callers stream this straight to
        Twilio or the browser, so raising here would surface as a broken
        response body rather than a handleable error.
        """
        name = voice_name(voice_id)
        logger.info("Synthesising with voice=%s language=%s", name, language)

        try:
            stream = self._client.text_to_speech.stream(
                text=text,
                voice_id=name,
                model=MODEL,
                locale=language,
                format=audio_format,
                sample_rate=SAMPLE_RATE_HZ,
            )
        except Exception:
            logger.exception("Murf synthesis failed for voice=%s", name)
            return

        try:
            yield from stream
        except Exception:
            # A mid-stream failure truncates the audio. The caller hears a cut
            # sentence, which is recoverable; the turn continues.
            logger.exception("Murf stream interrupted for voice=%s", name)
