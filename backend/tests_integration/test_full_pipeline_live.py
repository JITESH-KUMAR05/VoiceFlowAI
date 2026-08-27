"""One browser call, through the real stack, end to end.

Every other test in this directory checks one provider in isolation. This
one runs the actual sequence a browser call takes - start, one turn, end -
against real Azure OpenAI, real Murf, and real Salesforce at once, the way
a person clicking through the UI would trigger it. It is the closest thing
this project has to a smoke test.

Skipped unless Azure OpenAI, Murf AND Salesforce are all configured, since
it is meaningless with any one of them faked.
"""

from __future__ import annotations

import time
import uuid

import pytest
from fastapi.testclient import TestClient
from simple_salesforce import Salesforce

from app.config import Settings
from app.main import create_app

TEST_MARKER = "integration-test.invalid"


@pytest.fixture
def live_client(require_azure_openai, require_murf, require_salesforce):
    app = create_app(settings=require_salesforce)  # any one satisfies all three
    with TestClient(app) as client:
        yield client


def _wait_for_lead(sf_client: Salesforce, email: str, attempts: int = 8):
    """The Salesforce write happens in a BackgroundTask. TestClient normally
    runs it to completion before the response returns, but this polls
    briefly rather than assume that timing across httpx/Starlette versions.
    """
    for _ in range(attempts):
        result = sf_client.query(
            f"SELECT Id, AI_Lead_Score__c, AI_Sentiment__c FROM Lead "
            f"WHERE Email = '{email}' LIMIT 1"
        )
        if result["totalSize"] > 0:
            return result["records"][0]
        time.sleep(1)
    return None


def test_a_browser_call_is_scored_and_synced_to_salesforce(
    live_client: TestClient, require_salesforce: Settings
):
    test_email = f"qa-{uuid.uuid4().hex[:8]}@{TEST_MARKER}"
    sf_client = Salesforce(
        username=require_salesforce.SALESFORCE_USERNAME,
        password=require_salesforce.SALESFORCE_PASSWORD,
        security_token=require_salesforce.SALESFORCE_TOKEN,
        domain=require_salesforce.SALESFORCE_DOMAIN,
    )

    lead_id = None
    try:
        started = live_client.post(
            "/api/phone/call",
            json={
                "lead_name": "Pipeline Test Lead",
                "lead_email": test_email,
                "agent_type": "b2b",
            },
        )
        assert started.status_code == 200
        session = started.json()
        assert session["status"] == "browser_session_started"
        assert session["greeting_audio_url"]

        # Confirm the greeting actually streams real audio. Fetched by
        # relative path rather than the URL as-issued, since that URL is
        # absolute and TestClient's base URL handling has changed across
        # httpx versions.
        audio_path = "/api/" + session["greeting_audio_url"].split("/api/")[1]
        audio = live_client.get(audio_path)
        assert audio.status_code == 200
        assert audio.content[:4] == b"RIFF"

        chat = live_client.post(
            "/api/browser/chat",
            json={
                "session_id": session["call_sid"],
                "message": "We're struggling to follow up on leads fast enough.",
            },
        )
        assert chat.status_code == 200
        assert chat.json()["text"]

        ended = live_client.post(
            "/api/browser/end", json={"session_id": session["call_sid"], "message": ""}
        )
        assert ended.status_code == 200
        assert ended.json()["status"] == "processing_started"

        record = _wait_for_lead(sf_client, test_email)
        assert record is not None, (
            "No Lead appeared in Salesforce after ending the call - "
            "check the backend logs for the post-call pipeline"
        )
        lead_id = record["Id"]
        assert record["AI_Lead_Score__c"] is not None
        assert record["AI_Sentiment__c"] in (
            "Interested",
            "Neutral",
            "Not Interested",
        )
    finally:
        if lead_id:
            sf_client.Lead.delete(lead_id)
