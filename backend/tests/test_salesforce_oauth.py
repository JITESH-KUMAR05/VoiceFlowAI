"""Connect via OAuth Client Credentials when configured, SOAP otherwise.

Newer Salesforce orgs (trial "orgfarm" orgs in particular) disable SOAP API
login by default. The natural next choice, OAuth's Username-Password flow,
turned out to be disabled too - and on a fresh org that toggle is locked,
not just off, because password-based flows are actively discouraged now
(the same org would also just reject a password-flow login with
"Username-Password Flow Disabled" in Login History, independent of anything
this project's code does).

Client Credentials Flow sidesteps the whole category: it authenticates as
the Connected App / External Client App's configured "Run As" user using
only the consumer key and secret, no username or password at all, so
whatever blocks password-based login can't touch it.

simple_salesforce only takes the client_credentials path when a real
Salesforce My Domain is supplied - not the generic "login"/"test" aliases -
so SALESFORCE_DOMAIN has to be a real My Domain in this mode, which the
older SOAP/password modes never required.
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
        self.session_id = "fake-session"


def test_client_credentials_alone_count_as_configured_with_no_username():
    settings = build_settings(
        SALESFORCE_USERNAME="",
        SALESFORCE_PASSWORD="",
        SALESFORCE_CONSUMER_KEY="ck",
        SALESFORCE_CONSUMER_SECRET="cs",
    )
    # Client Credentials Flow needs no username or password at all - a
    # username-only check for "is Salesforce configured" would wrongly say
    # no here.
    assert settings.salesforce_configured is True


def test_oauth_mode_is_detected_only_when_both_key_and_secret_are_present():
    settings = build_settings(SALESFORCE_CONSUMER_KEY="ck", SALESFORCE_CONSUMER_SECRET="")
    assert settings.salesforce_oauth_configured is False

    settings = build_settings(SALESFORCE_CONSUMER_KEY="ck", SALESFORCE_CONSUMER_SECRET="cs")
    assert settings.salesforce_oauth_configured is True


def test_legacy_username_password_alone_still_counts_as_configured():
    settings = build_settings(SALESFORCE_USERNAME="u", SALESFORCE_PASSWORD="p")
    assert settings.salesforce_configured is True
    assert settings.salesforce_oauth_configured is False


def test_connect_uses_only_consumer_key_and_secret_in_oauth_mode():
    settings = build_settings(
        SALESFORCE_USERNAME="u",
        SALESFORCE_PASSWORD="p",
        SALESFORCE_TOKEN="should-not-be-sent",
        SALESFORCE_CONSUMER_KEY="ck",
        SALESFORCE_CONSUMER_SECRET="cs",
        SALESFORCE_DOMAIN="orgfarm-example-dev-ed.develop.my",
    )
    service = SalesforceService(settings, client_factory=RecordingClient, clock=monotonic)

    assert service.connect() is True
    kwargs = service._sf.kwargs  # noqa: SLF001 - inspecting the fake directly
    assert kwargs["consumer_key"] == "ck"
    assert kwargs["consumer_secret"] == "cs"
    assert kwargs["domain"] == "orgfarm-example-dev-ed.develop.my"
    # Client Credentials Flow takes no username, password or token - a
    # user's credentials play no part in this login at all.
    assert "username" not in kwargs
    assert "password" not in kwargs
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
    assert kwargs["username"] == "u"
    assert kwargs["password"] == "p"
    assert kwargs["security_token"] == "tok"
    assert "consumer_key" not in kwargs
    assert "consumer_secret" not in kwargs
