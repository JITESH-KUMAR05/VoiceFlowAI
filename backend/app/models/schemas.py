"""Request and response shapes for the API."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.personas import DEFAULT_VOICE_ID

# Twilio requires E.164: a leading +, a non-zero country code, up to 15 digits.
E164 = re.compile(r"^\+[1-9]\d{7,14}$")


class InitiateCallRequest(BaseModel):
    """Start a conversation.

    Omitting ``phone_number`` starts a browser session instead of dialling,
    which is how the pipeline is demonstrated without spending call credit.
    """

    lead_name: str = Field(min_length=1, max_length=120)
    agent_type: str = Field(default="b2b", max_length=40)
    phone_number: str | None = None
    lead_email: EmailStr | None = None
    lead_company: str | None = Field(default=None, max_length=200)
    language: str = Field(default="en-IN", max_length=10)
    voice_id: str = Field(default=DEFAULT_VOICE_ID, max_length=40)
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator("phone_number")
    @classmethod
    def _must_be_e164(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        cleaned = value.replace(" ", "").replace("-", "")
        if not E164.match(cleaned):
            raise ValueError(
                "phone_number must be E.164, e.g. +919876543210"
            )
        return cleaned


class InitiateCallResponse(BaseModel):
    status: str
    call_sid: str
    greeting: str
    greeting_audio_url: str | None = None
    language: str


class BrowserChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=4000)


class BrowserChatResponse(BaseModel):
    text: str
    audio_url: str


class CallAnalysis(BaseModel):
    """The post-call scoring contract.

    The model is asked for these keys by name; anything it omits falls back to
    a neutral value rather than failing the whole pipeline.
    """

    sentiment_score: int = Field(default=50, ge=0, le=100)
    sentiment_label: str = "Neutral"
    summary: str = "Analysis unavailable."
    company_type: str = "Unknown"
    client_lifestyle: str = "Unknown"
    pain_points: str = "Not identified"
    agent_verdict: str = "Manual review required"
    email_body: str = ""


class ProviderStatus(BaseModel):
    twilio: bool
    salesforce: bool
    email: bool


class HealthResponse(BaseModel):
    status: str
    providers: ProviderStatus
    active_sessions: int
