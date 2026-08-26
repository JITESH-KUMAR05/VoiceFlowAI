"""Audio synthesis streaming.

A synthesis request is registered under an opaque id and handed out as a URL.
Twilio or the browser then fetches that URL, and the audio is streamed as Murf
produces it. The indirection exists because Twilio's <Play> needs a URL it can
fetch, not a response body.
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.services.container import Services, get_services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audio", tags=["audio"])


def register_audio_request(
    services: Services,
    text: str,
    voice_id: str,
    language: str,
    base_url: str,
) -> str:
    """Queue a line for synthesis and return the URL that will stream it."""
    request_id = uuid.uuid4().hex
    services.sessions.audio.set(
        request_id, {"text": text, "voice_id": voice_id, "language": language}
    )
    return f"{base_url.rstrip('/')}/api/audio/stream/{request_id}"


@router.get("/stream/{request_id}")
async def stream_audio(
    request_id: str, services: Services = Depends(get_services)
) -> StreamingResponse:
    """Stream one synthesised line as WAV.

    The request is popped, not read: each URL is played once, and leaving it
    behind would keep the text alive until its TTL.
    """
    pending = services.sessions.audio.pop(request_id)
    if pending is None:
        # Also the expiry path - a URL fetched long after it was issued.
        logger.info("Audio request %s not found or expired", request_id)
        raise HTTPException(status_code=404, detail="Audio request not found")

    return StreamingResponse(
        services.murf.create_audio_stream(
            pending["text"], pending["voice_id"], pending["language"]
        ),
        media_type="audio/wav",
    )
