"""Settings validation.

CLAUDE.md's architecture section claims config.py "fails fast on missing
required keys." Nothing checked that claim was actually true.

``Settings`` is a pydantic-settings ``BaseSettings``: it reads from process
environment variables and a ``.env`` file in addition to constructor kwargs.
conftest.py sets dummy values for every required key directly on
``os.environ`` so the rest of the suite can import the app without a real
``.env`` - which means simply omitting a kwarg here is not enough to prove
it's "missing"; the dummy env var fills it in underneath. Every test below
passes ``_env_file=None`` to skip any real ``backend/.env`` on disk, and
clears the relevant environment variables explicitly.
"""

import pytest
from pydantic import ValidationError

from app.config import Settings

REQUIRED = {
    "AZURE_OPENAI_API_KEY": "key",
    "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com/",
    "AZURE_OPENAI_DEPLOYMENT_NAME": "gpt-4o",
    "MURF_API_KEY": "key",
}

# conftest.py also seeds truthy dummy values for these, for the rest of the
# suite's benefit. A test asserting something is "unconfigured by default"
# would otherwise silently pass against real Settings() while actually
# observing conftest's dummies, not the default.
OPTIONAL_KEYS = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "SALESFORCE_USERNAME",
    "SALESFORCE_PASSWORD",
    "SMTP_SERVER",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
]


@pytest.fixture(autouse=True)
def isolated_env(monkeypatch):
    """Settings must be judged only on what this test explicitly supplies."""
    for key in [*REQUIRED, *OPTIONAL_KEYS]:
        monkeypatch.delenv(key, raising=False)


def build(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_all_required_keys_present_constructs_cleanly():
    build(**REQUIRED)


@pytest.mark.parametrize("missing_key", sorted(REQUIRED))
def test_a_missing_required_key_fails_fast(missing_key):
    incomplete = {k: v for k, v in REQUIRED.items() if k != missing_key}

    with pytest.raises(ValidationError):
        build(**incomplete)


def test_the_endpoint_must_be_a_url():
    with pytest.raises(ValidationError):
        build(**{**REQUIRED, "AZURE_OPENAI_ENDPOINT": "not-a-url"})


def test_an_https_endpoint_is_accepted():
    settings = build(
        **{**REQUIRED, "AZURE_OPENAI_ENDPOINT": "https://x.openai.azure.com/"}
    )
    assert settings.AZURE_OPENAI_ENDPOINT.startswith("https://")


# --- optional integrations ---------------------------------------------------


def test_twilio_is_unconfigured_when_any_of_its_three_keys_is_missing():
    settings = build(
        **REQUIRED,
        TWILIO_ACCOUNT_SID="AC1",
        TWILIO_AUTH_TOKEN="",
        TWILIO_PHONE_NUMBER="+15550000000",
    )
    assert settings.twilio_configured is False


def test_twilio_is_configured_once_all_three_keys_are_present():
    settings = build(
        **REQUIRED,
        TWILIO_ACCOUNT_SID="AC1",
        TWILIO_AUTH_TOKEN="token",
        TWILIO_PHONE_NUMBER="+15550000000",
    )
    assert settings.twilio_configured is True


def test_salesforce_needs_only_username_and_password():
    settings = build(
        **REQUIRED, SALESFORCE_USERNAME="u@example.com", SALESFORCE_PASSWORD="p"
    )
    assert settings.salesforce_configured is True


def test_smtp_needs_server_username_and_password():
    settings = build(
        **REQUIRED,
        SMTP_SERVER="smtp.gmail.com",
        SMTP_USERNAME="u",
        SMTP_PASSWORD="p",
    )
    assert settings.smtp_configured is True


def test_by_default_every_optional_integration_is_unconfigured():
    settings = build(**REQUIRED)

    assert settings.twilio_configured is False
    assert settings.salesforce_configured is False
    assert settings.smtp_configured is False


# --- CORS origins -------------------------------------------------------------


def test_a_single_origin_is_returned_as_a_one_item_list():
    settings = build(**REQUIRED, CORS_ORIGINS="http://localhost:8080")
    assert settings.cors_origins == ["http://localhost:8080"]


def test_multiple_origins_are_split_on_commas_and_trimmed():
    settings = build(
        **REQUIRED,
        CORS_ORIGINS=" http://localhost:8080 , https://example.com ",
    )
    assert settings.cors_origins == ["http://localhost:8080", "https://example.com"]


def test_an_empty_origins_string_yields_no_origins():
    settings = build(**REQUIRED, CORS_ORIGINS="")
    assert settings.cors_origins == []


def test_a_trailing_comma_does_not_produce_an_empty_origin():
    settings = build(**REQUIRED, CORS_ORIGINS="http://localhost:8080,")
    assert settings.cors_origins == ["http://localhost:8080"]
