"""Starting a conversation, and the browser-mode turn loop."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.models.schemas import (
    BrowserChatRequest,
    BrowserChatResponse,
    InitiateCallRequest,
    InitiateCallResponse,
)
from app.personas import build_agent_profile
from app.post_call import run_post_call_actions
from app.routers.audio import register_audio_request
from app.services.container import Services, get_services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["calls"])


@router.post("/phone/call", response_model=InitiateCallResponse)
async def initiate_call(
    payload: InitiateCallRequest,
    request: Request,
    services: Services = Depends(get_services),
) -> InitiateCallResponse:
    """Start a conversation, over the phone or in the browser.

    Browser mode is not a mock. It runs the same prompt, model and synthesis
    path as a real call; only the transport differs. It exists so the pipeline
    can be demonstrated without a provisioned number or call credit.
    """
    profile = build_agent_profile(
        agent_type=payload.agent_type,
        lead_name=payload.lead_name,
        voice_id=payload.voice_id,
        lead_company=payload.lead_company,
        language=payload.language,
    )

    greeting_audio_url = None

    if payload.phone_number:
        if services.twilio is None:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Twilio is not configured on this deployment. "
                    "Omit phone_number to run the same pipeline in the browser."
                ),
            )
        session_id = services.twilio.initiate_call(payload.phone_number)
        status = "call_initiated"
    else:
        session_id = uuid.uuid4().hex
        status = "browser_session_started"
        # The browser needs a URL it can actually reach, which is this
        # request's own origin rather than the public Twilio callback URL.
        greeting_audio_url = register_audio_request(
            services,
            profile.greeting,
            payload.voice_id,
            payload.language,
            str(request.base_url),
        )

    services.sessions.conversations.set(
        session_id, [{"role": "system", "content": profile.system_prompt}]
    )
    services.sessions.metadata.set(
        session_id,
        {
            "greeting": profile.greeting,
            "agent_type": payload.agent_type,
            "language": payload.language,
            "voice_id": payload.voice_id,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "lead_data": payload.model_dump(mode="json"),
        },
    )

    logger.info("Started %s session %s", payload.agent_type, session_id)

    return InitiateCallResponse(
        status=status,
        call_sid=session_id,
        greeting=profile.greeting,
        greeting_audio_url=greeting_audio_url,
        language=payload.language,
    )


@router.post("/browser/chat", response_model=BrowserChatResponse)
async def browser_chat(
    payload: BrowserChatRequest,
    request: Request,
    services: Services = Depends(get_services),
) -> BrowserChatResponse:
    """One turn of a browser conversation."""
    history = services.sessions.conversations.get(payload.session_id)
    if history is None:
        # Either never started, or idled past the session TTL.
        raise HTTPException(status_code=404, detail="Session not found or expired")

    history = [*history, {"role": "user", "content": payload.message}]
    reply = await services.openai.generate_response(history)
    history.append({"role": "assistant", "content": reply})
    services.sessions.conversations.set(payload.session_id, history)

    metadata = services.sessions.metadata.get(payload.session_id, {})

    return BrowserChatResponse(
        text=reply,
        audio_url=register_audio_request(
            services,
            reply,
            metadata.get("voice_id", "en-IN-anisha"),
            metadata.get("language", "en-IN"),
            str(request.base_url),
        ),
    )


@router.post("/browser/end")
async def browser_end_call(
    payload: BrowserChatRequest,
    background_tasks: BackgroundTasks,
    services: Services = Depends(get_services),
) -> dict[str, str]:
    """End a browser conversation and run the post-call pipeline."""
    history = services.sessions.conversations.pop(payload.session_id)
    metadata = services.sessions.metadata.pop(payload.session_id, {})

    if not history:
        return {"status": "no_history"}

    background_tasks.add_task(
        run_post_call_actions,
        services,
        history,
        metadata,
        payload.session_id,
        "completed",
    )
    return {"status": "processing_started"}
