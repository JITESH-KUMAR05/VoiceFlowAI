"""A real Salesforce sync, against your actual org.

This is the test that answers "do the credentials work and are the custom
fields actually there" - the two things that can't be known until real
credentials exist. It creates one Lead, writes to it exactly the way
run_post_call_actions does, reads it back, and deletes it.

If this fails with something like "No such column 'AI_Lead_Score__c' on
sobject of type Lead", the custom fields from the README's setup table
haven't been created in this org yet.
"""

from __future__ import annotations

import uuid

import pytest
from simple_salesforce import Salesforce

from app.config import Settings
from app.services.salesforce_service import SalesforceService

TEST_MARKER = "integration-test.invalid"


@pytest.fixture
def sf_client(require_salesforce: Settings) -> Salesforce:
    return Salesforce(
        username=require_salesforce.SALESFORCE_USERNAME,
        password=require_salesforce.SALESFORCE_PASSWORD,
        security_token=require_salesforce.SALESFORCE_TOKEN,
        domain=require_salesforce.SALESFORCE_DOMAIN,
    )


def test_sync_call_data_creates_and_scores_a_real_lead(
    require_salesforce: Settings, sf_client: Salesforce
):
    service = SalesforceService(require_salesforce)
    test_email = f"qa-{uuid.uuid4().hex[:8]}@{TEST_MARKER}"

    lead_data = {
        "lead_name": "Integration Test Lead",
        "lead_email": test_email,
        "lead_company": "Integration Test Co",
        "agent_type": "b2b",
    }
    analysis = {
        "sentiment_score": 82,
        "summary": "Asked about pricing and wants a demo.",
    }
    transcript = "assistant: Hi, do you have a minute?\nuser: Sure, tell me more."

    lead_id = None
    try:
        lead_id = service.sync_call_data(lead_data, analysis, transcript)
        assert lead_id, "sync_call_data returned no Lead id - check credentials"

        record = sf_client.Lead.get(lead_id)
        assert record["Email"] == test_email
        assert record["AI_Lead_Score__c"] == 82
        assert record["AI_Sentiment__c"] == "Interested"  # >= 70
        assert transcript in record["AI_Transcript__c"]

        tasks = sf_client.query(
            f"SELECT Id, Subject FROM Task WHERE WhoId = '{lead_id}'"
        )
        assert tasks["totalSize"] >= 1, "No call Task was logged against the Lead"
    finally:
        if lead_id:
            sf_client.Lead.delete(lead_id)


def test_get_crm_data_reads_back_what_was_written(
    require_salesforce: Settings, sf_client: Salesforce
):
    service = SalesforceService(require_salesforce)
    test_email = f"qa-{uuid.uuid4().hex[:8]}@{TEST_MARKER}"

    lead_id = None
    try:
        lead_id = service.sync_call_data(
            {
                "lead_name": "Readback Test",
                "lead_email": test_email,
                "agent_type": "real_estate",
            },
            {"sentiment_score": 45, "summary": "Still deciding."},
            "assistant: Hello\nuser: Just looking for now",
        )

        rows = service.get_crm_data(agent_type="real-estate")
        matching = [r for r in rows if r["id"] == lead_id]

        assert matching, "The just-created Lead was not in get_crm_data's results"
        assert matching[0]["score"] == 45
        assert matching[0]["sentiment"] == "Neutral"  # 40 <= 45 < 70
    finally:
        if lead_id:
            sf_client.Lead.delete(lead_id)
