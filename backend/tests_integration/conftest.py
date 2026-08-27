"""Fixtures for the live provider suite.

Deliberately the opposite of tests/conftest.py: nothing here sets a dummy
credential. Settings is built directly from whatever backend/.env and the
real process environment actually contain, and every fixture skips its tests
rather than failing when the provider it needs isn't configured.

Settings() is constructed directly rather than through app.config.get_settings
(which is lru_cache'd) so this suite never risks reading a cached instance
built under the unit suite's dummy environment, if the two were ever run in
the same process.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import Settings  # noqa: E402


@pytest.fixture(scope="session")
def live_settings() -> Settings:
    return Settings()


@pytest.fixture
def require_azure_openai(live_settings: Settings) -> Settings:
    if not live_settings.AZURE_OPENAI_API_KEY:
        pytest.skip("AZURE_OPENAI_API_KEY not set in backend/.env")
    return live_settings


@pytest.fixture
def require_murf(live_settings: Settings) -> Settings:
    if not live_settings.MURF_API_KEY:
        pytest.skip("MURF_API_KEY not set in backend/.env")
    return live_settings


@pytest.fixture
def require_twilio(live_settings: Settings) -> Settings:
    if not live_settings.twilio_configured:
        pytest.skip("Twilio credentials not set in backend/.env")
    return live_settings


@pytest.fixture
def require_salesforce(live_settings: Settings) -> Settings:
    if not live_settings.salesforce_configured:
        pytest.skip("Salesforce credentials not set in backend/.env")
    return live_settings
