"""Twilio: placing outbound calls and answering their webhooks."""

from __future__ import annotations

import logging

from twilio.base.exceptions import TwilioRestException
from twilio.request_validator import RequestValidator
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse

from app.config import Settings

logger = logging.getLogger(__name__)

# Twilio waits this long for the caller to start speaking before treating the
# turn as silence.
GATHER_TIMEOUT_SECONDS = 5


class TwilioService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = Client(
            settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN
        )
        self._validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
        self._from_number = settings.TWILIO_PHONE_NUMBER
        self._base_url = settings.BASE_URL.rstrip("/")

    @property
    def configured(self) -> bool:
        return self._settings.twilio_configured

    def initiate_call(self, to_number: str) -> str:
        """Dial a number. Returns the Twilio call SID."""
        try:
            call = self._client.calls.create(
                to=to_number,
                from_=self._from_number,
                url=f"{self._base_url}/api/phone/twiml/start",
                method="POST",
                status_callback=f"{self._base_url}/api/phone/status",
                status_callback_event=["completed", "busy", "no-answer", "failed"],
                status_callback_method="POST",
            )
        except TwilioRestException:
            logger.exception("Could not place call to %s", to_number)
            raise

        logger.info("Placed call %s", call.sid)
        return call.sid

    def is_valid_request(
        self, url: str, form: dict[str, str], signature: str | None
    ) -> bool:
        """Verify a webhook actually came from Twilio.

        Twilio signs each request with the account auth token. Without this
        check, anyone who discovers the public callback URL can drive the call
        flow and spend model and synthesis credit.
        """
        if not signature:
            return False
        return self._validator.validate(url, form, signature)

    def create_response(self, audio_url: str | None, language: str = "en-IN") -> str:
        """Build the TwiML for one turn: speak, then listen."""
        response = VoiceResponse()

        if audio_url:
            response.play(audio_url)

        response.gather(
            input="speech",
            action=f"{self._base_url}/api/phone/twiml/process",
            method="POST",
            language=language,
            speechTimeout="auto",
            timeout=GATHER_TIMEOUT_SECONDS,
        )

        # Reached only when the gather collected nothing.
        response.say("I didn't hear anything. Goodbye.")
        response.hangup()
        return str(response)
