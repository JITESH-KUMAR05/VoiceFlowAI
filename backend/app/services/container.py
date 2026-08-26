"""The set of services a request handler can reach.

Bundling them means routers depend on one object they can be handed, rather
than on module-level singletons. Tests construct this with fakes; nothing in
the routers knows the difference.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Protocol

from fastapi import Request

from app.config import Settings
from app.session import SessionStore

logger = logging.getLogger(__name__)


class SupportsTwilio(Protocol):
    configured: bool

    def initiate_call(self, to_number: str) -> str: ...
    def create_response(self, audio_url: str | None, language: str = ...) -> str: ...
    def is_valid_request(
        self, url: str, form: dict[str, str], signature: str | None
    ) -> bool: ...


@dataclass
class Services:
    openai: Any
    murf: Any
    salesforce: Any
    email: Any
    sessions: SessionStore
    twilio: SupportsTwilio | None = None


def build_services(settings: Settings) -> Services:
    """Construct the real providers.

    Twilio is only built when it is configured, so the API starts and browser
    mode works on a machine with no phone number provisioned.
    """
    from app.services.email_service import EmailService
    from app.services.murf_service import MurfService
    from app.services.openai_service import OpenAIService
    from app.services.salesforce_service import SalesforceService

    twilio = None
    if settings.twilio_configured:
        from app.services.twilio_service import TwilioService

        twilio = TwilioService(settings)
    else:
        logger.warning(
            "Twilio not configured - browser mode only, outbound calls disabled"
        )

    return Services(
        openai=OpenAIService(settings),
        murf=MurfService(settings),
        salesforce=SalesforceService(settings),
        email=EmailService(settings),
        sessions=SessionStore(
            session_ttl=settings.SESSION_TTL_SECONDS,
            session_max=settings.SESSION_MAX_ENTRIES,
            audio_ttl=settings.AUDIO_TTL_SECONDS,
            audio_max=settings.AUDIO_MAX_ENTRIES,
        ),
        twilio=twilio,
    )


def get_services(request: Request) -> Services:
    """FastAPI dependency: the services attached to this app."""
    return request.app.state.services


def get_settings_from_app(request: Request) -> Settings:
    return request.app.state.settings
