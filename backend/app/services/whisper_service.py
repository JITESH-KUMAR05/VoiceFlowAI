"""Azure OpenAI Whisper: transcribing one caller utterance at a time.

Batch transcription of an already-finished utterance, not a streaming or
partial-transcript API - the caller (app/routers/browser_ws.py) decides an
utterance is finished via client-side voice activity detection, then hands
the whole thing to transcribe() at once.
"""

from __future__ import annotations

import logging

from openai import AsyncAzureOpenAI, OpenAIError

from app.config import Settings

logger = logging.getLogger(__name__)

TRANSCRIPTION_TIMEOUT_SECONDS = 10.0


class WhisperService:
    def __init__(self, settings: Settings) -> None:
        self._deployment = settings.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME
        self._client = AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            timeout=TRANSCRIPTION_TIMEOUT_SECONDS,
        )

    async def transcribe(self, wav_bytes: bytes) -> str:
        """Transcribe one WAV utterance. Empty string on failure.

        Empty rather than raising: a failed transcription should prompt the
        caller to repeat themselves, not drop the WebSocket connection.
        """
        try:
            response = await self._client.audio.transcriptions.create(
                model=self._deployment,
                file=("utterance.wav", wav_bytes, "audio/wav"),
            )
        except OpenAIError:
            logger.exception("Transcription failed")
            return ""

        return response.text.strip()
