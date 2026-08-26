"""Twilio webhooks.

Every route here is public: Twilio calls them from the internet, so they
cannot sit behind a session. Authenticity comes from the request signature
instead, which is checked before any handler runs.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Request
from fastapi.responses import Response

from app.post_call import run_post_call_actions
from app.routers.audio import register_audio_request
from app.services.container import Services, get_services, get_settings_from_app

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/phone", tags=["telephony"])

DEFAULT_VOICE_BY_LANGUAGE = {"en-IN": "en-IN-anisha", "hi-IN": "hi-IN-khyati"}
FALLBACK_VOICE = "en-US-josie"

TERMINAL_STATUSES = {"completed", "failed", "busy", "no-answer", "canceled"}


async def verify_twilio_signature(
    request: Request, services: Services = Depends(get_services)
) -> None:
    """Reject anything that is not a genuine Twilio webhook.

    Twilio signs each request with the account auth token over the full URL
    and the posted form. Without this, anyone who discovers the public
    callback URL can drive the call flow and spend model and synthesis credit.
    """
    settings = get_settings_from_app(request)
    if not settings.VERIFY_TWILIO_SIGNATURE:
        logger.warning("Twilio signature verification is disabled")
        return

    if services.twilio is None:
        raise HTTPException(status_code=503, detail="Twilio is not configured")

    form = {key: str(value) for key, value in (await request.form()).items()}
    signature = request.headers.get("X-Twilio-Signature")

    if not services.twilio.is_valid_request(str(request.url), form, signature):
        logger.warning("Rejected unsigned webhook to %s", request.url.path)
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")


def _voice_for(metadata: dict) -> tuple[str, str]:
    language = metadata.get("language", "en-IN")
    default_voice = DEFAULT_VOICE_BY_LANGUAGE.get(language, FALLBACK_VOICE)
    return metadata.get("voice_id", default_voice), language


@router.post("/twiml/start", dependencies=[Depends(verify_twilio_signature)])
async def call_start(
    request: Request,
    CallSid: str = Form(...),
    services: Services = Depends(get_services),
) -> Response:
    """Twilio has connected the call. Speak the greeting, then listen."""
    metadata = services.sessions.metadata.get(CallSid, {})
    greeting = metadata.get("greeting", "Hello.")
    voice_id, language = _voice_for(metadata)

    history = services.sessions.conversations.get(CallSid)
    if history is not None:
        services.sessions.conversations.set(
            CallSid, [*history, {"role": "assistant", "content": greeting}]
        )

    audio_url = register_audio_request(
        services, greeting, voice_id, language, _public_base(request)
    )

    return Response(
        content=services.twilio.create_response(audio_url, language=language),
        media_type="application/xml",
    )


@router.post("/twiml/process", dependencies=[Depends(verify_twilio_signature)])
async def process_speech(
    request: Request,
    CallSid: str = Form(...),
    SpeechResult: str | None = Form(None),
    services: Services = Depends(get_services),
) -> Response:
    """The caller said something. Answer it, then listen again."""
    metadata = services.sessions.metadata.get(CallSid, {})
    voice_id, language = _voice_for(metadata)

    if not SpeechResult:
        # Silence. Re-issue the gather without speaking over them.
        return Response(
            content=services.twilio.create_response(None, language=language),
            media_type="application/xml",
        )

    history = services.sessions.conversations.get(CallSid, [])
    history = [*history, {"role": "user", "content": SpeechResult}]
    reply = await services.openai.generate_response(history)
    history.append({"role": "assistant", "content": reply})
    services.sessions.conversations.set(CallSid, history)

    audio_url = register_audio_request(
        services, reply, voice_id, language, _public_base(request)
    )

    return Response(
        content=services.twilio.create_response(audio_url, language=language),
        media_type="application/xml",
    )


@router.post("/status", dependencies=[Depends(verify_twilio_signature)])
async def call_status(
    background_tasks: BackgroundTasks,
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
    services: Services = Depends(get_services),
) -> dict[str, str]:
    """The call ended. Hand off to the post-call pipeline."""
    if CallStatus not in TERMINAL_STATUSES:
        return {"status": "ignored"}

    logger.info("Call %s ended: %s", CallSid, CallStatus)

    history = services.sessions.conversations.pop(CallSid, [])
    metadata = services.sessions.metadata.pop(CallSid, {})

    if history:
        background_tasks.add_task(
            run_post_call_actions, services, history, metadata, CallSid, CallStatus
        )

    return {"status": "ok"}


def _public_base(request: Request) -> str:
    """The URL Twilio will fetch audio from.

    Unlike browser mode this must be the configured public address: Twilio
    reaches the server from the internet and cannot resolve the request's own
    host, which behind a tunnel is an internal one.
    """
    return get_settings_from_app(request).BASE_URL
