"""Real-time browser conversation: the WebSocket turn loop.

Replaces the push-to-talk REST turn loop (POST /api/browser/chat) with a
persistent connection. The client runs voice activity detection locally and
sends one complete utterance at a time; this endpoint transcribes it, runs
it through the same persona/OpenAI pipeline as every other transport, and
streams the spoken reply back as it's synthesized.

Wire protocol, once connected:

Client -> server:
    binary frame                - the caller's utterance: raw 16kHz mono
                                   16-bit PCM, no header (see
                                   app/audio_utils.py)
    {"type": "utterance_end"}   - the audio just sent is a complete
                                   utterance; transcribe and reply to it
    {"type": "cancel"}          - the caller started speaking again while
                                   the agent's reply was still being
                                   generated or played; abandon it

Server -> client:
    {"type": "user_transcript", "text": "..."}  - what Whisper heard
    {"type": "agent_reply", "text": "..."}      - the model's reply, before
                                                   its audio starts arriving
    binary frames                - the reply's audio: raw PCM chunks, as
                                    Murf produces them (see
                                    MurfService.create_audio_stream's
                                    audio_format="PCM")
    {"type": "turn_end"}         - every chunk for this reply has been sent
    {"type": "cancelled"}        - acknowledges a cancel
    {"type": "error", "detail": "..."}  - the turn failed; the caller should
                                    just try speaking again
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, WebSocket
from starlette.concurrency import iterate_in_threadpool

from app.audio_utils import pcm_to_wav
from app.personas import DEFAULT_VOICE_ID
from app.services.container import Services, get_services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ws", tags=["realtime"])

SESSION_NOT_FOUND_CLOSE_CODE = 4404


@router.websocket("/browser/{session_id}")
async def browser_turn_loop(
    websocket: WebSocket,
    session_id: str,
    services: Services = Depends(get_services),
) -> None:
    """Drive one browser call end to end over a single WebSocket connection.

    Accepts the connection, validates the session, then loops forever:
    buffering incoming PCM audio, kicking off a turn (transcribe -> reply ->
    speak) when the client signals ``utterance_end``, and cancelling any
    in-flight turn on either a fresh ``utterance_end`` or an explicit
    ``cancel`` so a caller talking over the agent actually stops it rather
    than just being ignored client-side.
    """
    await websocket.accept()

    metadata = services.sessions.metadata.get(session_id)
    if metadata is None:
        await websocket.send_json(
            {"type": "error", "detail": "Session not found or expired"}
        )
        await websocket.close(code=SESSION_NOT_FOUND_CLOSE_CODE)
        return

    voice_id = metadata.get("voice_id", DEFAULT_VOICE_ID)
    language = metadata.get("language", "en-IN")

    pcm_buffer = bytearray()
    current_turn: asyncio.Task | None = None

    while True:
        message = await websocket.receive()
        if message["type"] == "websocket.disconnect":
            break

        data = message.get("bytes")
        if data is not None:
            pcm_buffer.extend(data)
            continue

        text = message.get("text")
        if text is None:
            continue

        try:
            control = json.loads(text)
        except json.JSONDecodeError:
            continue

        control_type = control.get("type")

        if control_type == "utterance_end":
            # A fresh utterance always supersedes whatever turn is still
            # running - the caller has already moved on, so let that
            # turn's task cancellation stop it rather than letting two
            # replies race.
            if current_turn is not None and not current_turn.done():
                current_turn.cancel()
            pcm_bytes = bytes(pcm_buffer)
            pcm_buffer.clear()
            current_turn = asyncio.create_task(
                _run_turn(
                    websocket, services, session_id, voice_id, language, pcm_bytes
                )
            )
        elif control_type == "cancel":
            # Explicit barge-in: the caller started speaking again before
            # the agent finished. Cancel the task (not just stop reading
            # its output) so the OpenAI call or Murf stream actually stops
            # doing work instead of continuing in the background.
            if current_turn is not None and not current_turn.done():
                current_turn.cancel()
            await websocket.send_json({"type": "cancelled"})

    if current_turn is not None and not current_turn.done():
        current_turn.cancel()


async def _run_turn(
    websocket: WebSocket,
    services: Services,
    session_id: str,
    voice_id: str,
    language: str,
    pcm_bytes: bytes,
) -> None:
    """Transcribe one utterance, get a reply, and stream it back as speech."""
    try:
        wav_bytes = pcm_to_wav(pcm_bytes)
        transcript = await services.whisper.transcribe(wav_bytes)

        if not transcript:
            await websocket.send_json(
                {"type": "error", "detail": "Didn't catch that - try again."}
            )
            return

        await websocket.send_json({"type": "user_transcript", "text": transcript})

        history = services.sessions.conversations.get(session_id, [])
        history = [*history, {"role": "user", "content": transcript}]
        reply = await services.openai.generate_response(history)
        history.append({"role": "assistant", "content": reply})
        services.sessions.conversations.set(session_id, history)

        await websocket.send_json({"type": "agent_reply", "text": reply})

        async for chunk in iterate_in_threadpool(
            services.murf.create_audio_stream(
                reply, voice_id, language, audio_format="PCM"
            )
        ):
            await websocket.send_bytes(chunk)

        await websocket.send_json({"type": "turn_end"})
    except asyncio.CancelledError:
        # Barge-in: the loop above cancelled this task mid-flight (during
        # the OpenAI call, or while a Murf chunk was still being read).
        # Nothing left to send - the "cancelled" ack was already sent by
        # the branch that triggered this cancellation. Re-raise so asyncio
        # sees the task as actually cancelled rather than swallowing it.
        logger.info("Turn cancelled for session %s (barge-in)", session_id)
        raise
