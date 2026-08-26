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
    settings = Settings(
        AZURE_OPENAI_API_KEY="k",
        AZURE_OPENAI_ENDPOINT="https://test.openai.azure.com/",
        AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o",
        MURF_API_KEY="m",
        SALESFORCE_USERNAME="",
    )
    attempts: list = []
    service = SalesforceService(settings, client_factory=failing_client(attempts))

    assert service.get_crm_data() == []
    assert attempts == []
