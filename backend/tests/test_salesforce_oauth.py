"""Connect via OAuth (Consumer Key/Secret) when configured, SOAP otherwise.

Newer Salesforce orgs (trial "orgfarm" orgs in particular) disable SOAP API
login by default - the exact login path SalesforceService always used. The
fix is a Connected App / External Client App with OAuth, but
simple_salesforce.SalesforceLogin has a specific and easy-to-miss quirk: it
checks `if security_token is not None` FIRST, before it ever looks at
consumer_key/consumer_secret. Pass security_token at all - even alongside
valid OAuth credentials - and it takes the SOAP path regardless. The OAuth
branch is only reached when security_token is omitted entirely, not just
empty.

So connect() has to build two genuinely different keyword-argument sets, not
just add two optional ones to the existing call.
"""

from __future__ import annotations

from time import monotonic

from app.config import Settings
from app.services.salesforce_service import SalesforceService

REQUIRED = {
    "AZURE_OPENAI_API_KEY": "key",
    "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com/",
    "AZURE_OPENAI_DEPLOYMENT_NAME": "gpt-4o",
    "MURF_API_KEY": "key",
}


def build_settings(**overrides) -> Settings:
    return Settings(_env_file=None, **REQUIRED, **overrides)


class RecordingClient:
    """Stands in for simple_salesforce.Salesforce - records what it was
    called with instead of actually connecting anywhere."""

    def __init__(self, **kwargs):
        self.kwargs = kwargs


def test_oauth_credentials_alone_are_not_enough_without_username_password():
    settings = build_settings(
        SALESFORCE_USERNAME="",
        SALESFORCE_PASSWORD="",
        SALESFORCE_CONSUMER_KEY="ck",
        SALESFORCE_CONSUMER_SECRET="cs",
    )
    assert settings.salesforce_configured is False


def test_oauth_mode_is_detected_only_when_both_key_and_secret_are_present():
    settings = build_settings(
        SALESFORCE_USERNAME="u",
        SALESFORCE_PASSWORD="p",
        SALESFORCE_CONSUMER_KEY="ck",
        SALESFORCE_CONSUMER_SECRET="",
    )
    assert settings.salesforce_oauth_configured is False

    settings = build_settings(
        SALESFORCE_USERNAME="u",
        SALESFORCE_PASSWORD="p",
        SALESFORCE_CONSUMER_KEY="ck",
        SALESFORCE_CONSUMER_SECRET="cs",
    )
    assert settings.salesforce_oauth_configured is True


def test_connect_uses_oauth_kwargs_and_omits_security_token_entirely():
    settings = build_settings(
        SALESFORCE_USERNAME="u",
        SALESFORCE_PASSWORD="p",
        SALESFORCE_TOKEN="should-not-be-sent",
        SALESFORCE_CONSUMER_KEY="ck",
        SALESFORCE_CONSUMER_SECRET="cs",
        SALESFORCE_DOMAIN="login",
    )
    service = SalesforceService(settings, client_factory=RecordingClient, clock=monotonic)

    assert service.connect() is True
    kwargs = service._sf.kwargs  # noqa: SLF001 - inspecting the fake directly
    assert kwargs["consumer_key"] == "ck"
    assert kwargs["consumer_secret"] == "cs"
    assert kwargs["username"] == "u"
    assert kwargs["password"] == "p"
    assert "security_token" not in kwargs


def test_connect_falls_back_to_security_token_when_oauth_is_not_configured():
    settings = build_settings(
        SALESFORCE_USERNAME="u",
        SALESFORCE_PASSWORD="p",
        SALESFORCE_TOKEN="tok",
    )
    service = SalesforceService(settings, client_factory=RecordingClient, clock=monotonic)

    assert service.connect() is True
    kwargs = service._sf.kwargs  # noqa: SLF001
    assert kwargs["security_token"] == "tok"
    assert "consumer_key" not in kwargs
    assert "consumer_secret" not in kwargs
