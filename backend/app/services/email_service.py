"""Follow-up email over SMTP.

Blocking: smtplib is synchronous, so callers must run this in a worker thread
rather than awaiting it on the event loop.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.config import Settings

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 30


class EmailService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def enabled(self) -> bool:
        return self._settings.smtp_configured

    def send_followup(self, to_email: str, subject: str, body: str) -> bool:
        """Send the post-call summary. Returns whether it went out.

        Never raises. A failed follow-up should not lose the CRM write that
        runs alongside it.
        """
        if not self.enabled:
            logger.info("SMTP not configured; skipping follow-up email")
            return False
        if not to_email:
            logger.info("No recipient address; skipping follow-up email")
            return False
        if not body:
            logger.info("Empty email body; skipping follow-up to %s", to_email)
            return False

        message = EmailMessage()
        message["From"] = self._settings.SMTP_USERNAME
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)

        try:
            with smtplib.SMTP(
                self._settings.SMTP_SERVER,
                self._settings.SMTP_PORT,
                timeout=SMTP_TIMEOUT_SECONDS,
            ) as server:
                server.starttls()
                server.login(
                    self._settings.SMTP_USERNAME, self._settings.SMTP_PASSWORD
                )
                server.send_message(message)
        except (smtplib.SMTPException, OSError):
            logger.exception("Could not send follow-up to %s", to_email)
            return False

        logger.info("Sent follow-up to %s", to_email)
        return True
