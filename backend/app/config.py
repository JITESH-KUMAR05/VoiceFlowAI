"""Application settings, resolved from the environment.

Required credentials are validated at startup rather than at first use, so a
misconfigured deployment fails immediately with a readable message instead of
surfacing as a 500 in the middle of a live call.

Twilio, Salesforce and SMTP are optional: browser mode runs the full
conversation pipeline without them, which is how the project is demonstrated
when no phone number is provisioned.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Azure OpenAI: required. Conversation and post-call analysis. ---
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_DEPLOYMENT_NAME: str
    AZURE_OPENAI_API_VERSION: str = "2024-12-01-preview"

    # --- Murf: required. Streamed speech synthesis. ---
    MURF_API_KEY: str

    # --- Twilio: optional. Absent means browser-only mode. ---
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Public URL Twilio calls back to. Must be reachable from the internet.
    BASE_URL: str = "http://localhost:8000"

    # Browser origins permitted to call this API.
    CORS_ORIGINS: str = "http://localhost:8080"

    # Reject Twilio webhooks whose signature does not verify. Disable only for
    # local testing without a tunnel; never in a deployment.
    VERIFY_TWILIO_SIGNATURE: bool = True

    # --- Salesforce: optional. Absent means calls are stored locally only. ---
    SALESFORCE_USERNAME: str = ""
    SALESFORCE_PASSWORD: str = ""
    SALESFORCE_TOKEN: str = ""
    SALESFORCE_DOMAIN: str = "login"

    # --- SMTP: optional. Absent means no follow-up email is sent. ---
    SMTP_SERVER: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""

    # --- Session bounds. See app/session.py. ---
    SESSION_TTL_SECONDS: int = Field(default=3600, gt=0)
    SESSION_MAX_ENTRIES: int = Field(default=500, gt=0)
    AUDIO_TTL_SECONDS: int = Field(default=300, gt=0)
    AUDIO_MAX_ENTRIES: int = Field(default=1000, gt=0)

    LOG_LEVEL: str = "INFO"

    @field_validator("AZURE_OPENAI_ENDPOINT")
    @classmethod
    def _endpoint_must_be_a_url(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError(
                "AZURE_OPENAI_ENDPOINT must start with http:// or https:// "
                f"(got {value!r})"
            )
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def twilio_configured(self) -> bool:
        return bool(
            self.TWILIO_ACCOUNT_SID
            and self.TWILIO_AUTH_TOKEN
            and self.TWILIO_PHONE_NUMBER
        )

    @property
    def salesforce_configured(self) -> bool:
        return bool(self.SALESFORCE_USERNAME and self.SALESFORCE_PASSWORD)

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_SERVER and self.SMTP_USERNAME and self.SMTP_PASSWORD)


@lru_cache
def get_settings() -> Settings:
    return Settings()
