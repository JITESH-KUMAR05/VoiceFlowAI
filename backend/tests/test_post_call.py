"""The post-call pipeline: score, sync, follow-up, local record.

This is the part of the project that actually produces the CRM data everything
else displays, and it had no coverage. Each step is independently survivable -
a Salesforce or SMTP failure must not stop the other steps or lose the local
record, since the local record is the only copy of the call if both fail.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app import post_call


class FakeOpenAI:
    def __init__(self, analysis: dict[str, Any] | None = None):
        self.analysis = analysis or {
            "sentiment_score": 74,
            "summary": "Asked about pricing.",
            "email_body": "Thanks for your time.",
        }
        self.calls: list[tuple[list, str]] = []

    async def analyze_call(self, history, lead_name):
        self.calls.append((history, lead_name))
        return self.analysis


class FakeSalesforce:
    def __init__(self, raises: Exception | None = None):
        self.raises = raises
        self.synced: list[tuple] = []

    def sync_call_data(self, lead_data, analysis, transcript):
        if self.raises:
            raise self.raises
        self.synced.append((lead_data, analysis, transcript))
        return "00Q000000000000"


class FakeEmail:
    def __init__(self, raises: Exception | None = None):
        self.raises = raises
        self.sent: list[tuple] = []

    def send_followup(self, to_email, subject, body):
        if self.raises:
            raise self.raises
        self.sent.append((to_email, subject, body))
        return True


class Services:
    """A minimal stand-in - only the three attributes post_call touches."""

    def __init__(self, openai=None, salesforce=None, email=None):
        self.openai = openai or FakeOpenAI()
        self.salesforce = salesforce or FakeSalesforce()
        self.email = email or FakeEmail()


HISTORY = [
    {"role": "system", "content": "You are Anisha."},
    {"role": "assistant", "content": "Hi, this is Anisha."},
    {"role": "user", "content": "What does it cost?"},
    {"role": "assistant", "content": "Let me walk you through pricing."},
]

LEAD_WITH_EMAIL = {
    "lead_name": "Asha Verma",
    "lead_email": "asha@example.com",
    "agent_type": "b2b",
}

LEAD_WITHOUT_EMAIL = {"lead_name": "Asha Verma", "agent_type": "b2b"}


@pytest.fixture(autouse=True)
def records_dir(tmp_path, monkeypatch):
    """Every test writes into a throwaway directory, never the real one."""
    monkeypatch.setattr(post_call, "RECORDS_DIR", tmp_path)
    return tmp_path


def read_records(records_dir: Path, agent_type: str = "b2b") -> list[dict]:
    path = records_dir / f"{agent_type}_records.json"
    return json.loads(path.read_text(encoding="utf-8"))


# --- transcript formatting ---------------------------------------------------


def test_the_system_prompt_is_excluded_from_the_transcript():
    transcript = post_call._transcript_of(HISTORY)

    assert "You are Anisha" not in transcript
    assert "Hi, this is Anisha" in transcript
    assert "What does it cost?" in transcript


def test_an_empty_history_produces_an_empty_transcript():
    assert post_call._transcript_of([]) == ""


# --- the full pipeline --------------------------------------------------------


async def test_a_successful_call_is_scored_synced_emailed_and_recorded(
    records_dir,
):
    services = Services()
    metadata = {"lead_data": LEAD_WITH_EMAIL, "agent_type": "b2b"}

    await post_call.run_post_call_actions(
        services, HISTORY, metadata, "CA1", "completed"
    )

    assert services.openai.calls[0][1] == "Asha Verma"
    assert len(services.salesforce.synced) == 1
    assert len(services.email.sent) == 1
    assert services.email.sent[0][0] == "asha@example.com"

    records = read_records(records_dir)
    assert len(records) == 1
    assert records[0]["call_id"] == "CA1"
    assert records[0]["status"] == "completed"


async def test_no_email_is_sent_when_the_lead_has_none(records_dir):
    services = Services()
    metadata = {"lead_data": LEAD_WITHOUT_EMAIL, "agent_type": "b2b"}

    await post_call.run_post_call_actions(
        services, HISTORY, metadata, "CA2", "completed"
    )

    assert services.email.sent == []
    # The rest of the pipeline still ran.
    assert len(services.salesforce.synced) == 1
    assert len(read_records(records_dir)) == 1


async def test_a_salesforce_failure_does_not_stop_the_email_or_the_record(
    records_dir,
):
    services = Services(salesforce=FakeSalesforce(raises=RuntimeError("down")))
    metadata = {"lead_data": LEAD_WITH_EMAIL, "agent_type": "b2b"}

    await post_call.run_post_call_actions(
        services, HISTORY, metadata, "CA3", "completed"
    )

    assert len(services.email.sent) == 1
    assert len(read_records(records_dir)) == 1


async def test_an_email_failure_does_not_stop_the_record(records_dir):
    services = Services(email=FakeEmail(raises=RuntimeError("smtp down")))
    metadata = {"lead_data": LEAD_WITH_EMAIL, "agent_type": "b2b"}

    await post_call.run_post_call_actions(
        services, HISTORY, metadata, "CA4", "completed"
    )

    assert len(services.salesforce.synced) == 1
    assert len(read_records(records_dir)) == 1


async def test_missing_metadata_still_produces_a_record(records_dir):
    """A status webhook can arrive for a session whose metadata already
    expired. The pipeline should not crash on an empty dict."""
    services = Services()

    await post_call.run_post_call_actions(services, HISTORY, {}, "CA5", "completed")

    records = read_records(records_dir, agent_type="unknown")
    assert records[0]["lead_data"] == {}


# --- local record file ------------------------------------------------------


def test_a_second_call_appends_rather_than_overwrites(records_dir):
    post_call._append_record("CA1", "completed", "b2b", {}, HISTORY, {})
    post_call._append_record("CA2", "completed", "b2b", {}, HISTORY, {})

    records = read_records(records_dir)
    assert [r["call_id"] for r in records] == ["CA1", "CA2"]


def test_a_corrupt_existing_file_is_replaced_rather_than_crashing(records_dir):
    path = records_dir / "b2b_records.json"
    path.write_text("{not valid json", encoding="utf-8")

    post_call._append_record("CA1", "completed", "b2b", {}, HISTORY, {})

    records = read_records(records_dir)
    assert [r["call_id"] for r in records] == ["CA1"]


def test_an_existing_file_that_is_not_a_list_is_replaced(records_dir):
    path = records_dir / "b2b_records.json"
    path.write_text(json.dumps({"unexpected": "object"}), encoding="utf-8")

    post_call._append_record("CA1", "completed", "b2b", {}, HISTORY, {})

    records = read_records(records_dir)
    assert [r["call_id"] for r in records] == ["CA1"]


def test_each_agent_type_gets_its_own_file(records_dir):
    post_call._append_record("CA1", "completed", "b2b", {}, HISTORY, {})
    post_call._append_record("CA2", "completed", "real_estate", {}, HISTORY, {})

    assert len(read_records(records_dir, "b2b")) == 1
    assert len(read_records(records_dir, "real_estate")) == 1
