"""Application factory.

``create_app`` takes its services as an argument so tests can supply fakes and
run the whole HTTP surface with no network and no credentials. In production
the argument is omitted and the real providers are built from settings.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.logging_config import configure_logging
from app.routers import audio, calls, crm, health, telephony
from app.services.container import Services, build_services

logger = logging.getLogger(__name__)

STATIC_DIR = Path("static")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    settings: Settings = app.state.settings
    logger.info(
        "Starting VoiceFlow API (twilio=%s salesforce=%s email=%s)",
        settings.twilio_configured,
        settings.salesforce_configured,
        settings.smtp_configured,
    )
    yield
    pruned = app.state.services.sessions.prune()
    logger.info("Shutting down; pruned %d expired session entries", pruned)


def create_app(
    settings: Settings | None = None, services: Services | None = None
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.LOG_LEVEL)

    app = FastAPI(
        title="VoiceFlow AI",
        description=(
            "Outbound voice agent: Twilio telephony, Azure OpenAI conversation, "
            "streamed Murf speech, Salesforce lead sync."
        ),
        version="0.1.0",
        lifespan=_lifespan,
    )

    app.state.settings = settings
    app.state.services = services or build_services(settings)

    # Credentials are not sent cross-origin by this frontend, and the previous
    # allow_origins=["*"] with allow_credentials=True is a combination browsers
    # reject outright rather than merely a permissive one.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    app.include_router(health.router)
    app.include_router(calls.router)
    app.include_router(telephony.router)
    app.include_router(audio.router)
    app.include_router(crm.router)

    if STATIC_DIR.is_dir():
        app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    return app


app = create_app()
