"""Connection backoff after a Salesforce login failure.

An expired password or locked user makes every login attempt fail. Without a
backoff the service retried on every single request and logged a full
traceback each time, which buries real errors and adds a network round trip to
requests that cannot succeed.
"""

import pytest

from app.config import Settings
from app.services.salesforce_service import SalesforceService


class FakeClock:
    def __init__(self):
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def settings():
    return Settings(
        AZURE_OPENAI_API_KEY="k",
        AZURE_OPENAI_ENDPOINT="https://test.openai.azure.com/",
        AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o",
        MURF_API_KEY="m",
        SALESFORCE_USERNAME="user@example.com",
        SALESFORCE_PASSWORD="secret",
    )


def failing_client(attempts: list):
    def build(**kwargs):
        attempts.append(kwargs)
        raise RuntimeError("INVALID_LOGIN")

    return build


def test_a_failed_login_is_not_retried_on_the_next_call(settings):
    attempts: list = []
    clock = FakeClock()
    service = SalesforceService(
        settings, client_factory=failing_client(attempts), clock=clock
    )

    service.get_crm_data()
    service.get_crm_data()
    service.get_crm_data()

    assert len(attempts) == 1


def test_the_connection_is_retried_once_the_backoff_has_passed(settings):
    attempts: list = []
    clock = FakeClock()
    service = SalesforceService(
        settings, client_factory=failing_client(attempts), clock=clock
    )

    service.get_crm_data()
    clock.advance(301)
    service.get_crm_data()

    assert len(attempts) == 2


def test_crm_data_is_empty_rather_than_raising_when_login_fails(settings):
    service = SalesforceService(
        settings, client_factory=failing_client([]), clock=FakeClock()
    )

    assert service.get_crm_data() == []


def test_sync_returns_none_rather_than_raising_when_login_fails(settings):
    service = SalesforceService(
        settings, client_factory=failing_client([]), clock=FakeClock()
    )

    result = service.sync_call_data({"lead_name": "Asha"}, {}, "transcript")

    assert result is None


def test_a_disabled_integration_never_attempts_a_connection():
    # _env_file=None plus explicitly blanking every Salesforce credential:
    # a real backend/.env (or SalesforceService's own OAuth env vars set for
    # other tests in this session) would otherwise leak in and make this
    # settings object look configured regardless of what's passed here -
    # the same "presence, not truthiness" pitfall test_config.py's
    # isolated_env fixture exists to avoid.
    settings = Settings(
        _env_file=None,
        AZURE_OPENAI_API_KEY="k",
        AZURE_OPENAI_ENDPOINT="https://test.openai.azure.com/",
        AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o",
        MURF_API_KEY="m",
        SALESFORCE_USERNAME="",
        SALESFORCE_PASSWORD="",
        SALESFORCE_CONSUMER_KEY="",
        SALESFORCE_CONSUMER_SECRET="",
    )
    attempts: list = []
    service = SalesforceService(settings, client_factory=failing_client(attempts))

    assert service.get_crm_data() == []
    assert attempts == []
