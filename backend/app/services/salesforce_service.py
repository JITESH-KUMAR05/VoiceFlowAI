"""Salesforce Lead sync.

Writes each completed call onto the Lead record: the AI score, sentiment
picklist, transcript and call timestamp, plus a Task so the activity shows up
on the record timeline. The custom field API names this depends on are listed
in the root README.

Everything here is blocking. simple-salesforce is a synchronous SOAP/REST
client, so callers must run these methods in a worker thread rather than
awaiting them on the event loop.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from simple_salesforce import Salesforce

from app.config import Settings

logger = logging.getLogger(__name__)

MAX_TRANSCRIPT_CHARS = 131_000
TASK_TRANSCRIPT_CHARS = 3_000
SYNC_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 2

INTERESTED_THRESHOLD = 70
NEUTRAL_THRESHOLD = 40


def soql_escape(value: str) -> str:
    r"""Escape a string for use inside a SOQL string literal.

    The lead lookup previously interpolated a caller-supplied email directly
    into its WHERE clause. ``lead_email`` arrives from the public
    call-initiation endpoint, so an address containing a quote could close the
    literal early and change which records the query matched.

    Backslash is escaped first; doing it second would re-escape the backslashes
    introduced when escaping quotes.
    """
    return value.replace("\\", "\\\\").replace("'", "\\'")


def sentiment_for_score(score: int) -> str:
    """Map a 0-100 score onto the Lead AI_Sentiment__c picklist."""
    if score >= INTERESTED_THRESHOLD:
        return "Interested"
    if score >= NEUTRAL_THRESHOLD:
        return "Neutral"
    return "Not Interested"


def split_name(full_name: str) -> tuple[str, str]:
    """Split a display name into Salesforce's FirstName / LastName.

    LastName is required on Lead and FirstName is not, so a single-word name
    becomes the last name.
    """
    parts = full_name.strip().split()
    if not parts:
        return "", "Unknown Lead"
    if len(parts) == 1:
        return "", parts[0]
    return parts[0], " ".join(parts[1:])


class SalesforceService:
    """Lead sync client. Connects lazily on first use.

    The previous version connected in ``__init__`` at module import, which
    meant an expired Salesforce password stopped the entire API from starting
    even though every other feature was unaffected.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._sf: Salesforce | None = None

    @property
    def enabled(self) -> bool:
        return self._settings.salesforce_configured

    def connect(self) -> bool:
        """Open a session. Returns whether a usable connection now exists."""
        if not self.enabled:
            logger.info("Salesforce not configured; lead sync disabled")
            return False
        try:
            self._sf = Salesforce(
                username=self._settings.SALESFORCE_USERNAME,
                password=self._settings.SALESFORCE_PASSWORD,
                security_token=self._settings.SALESFORCE_TOKEN,
                domain=self._settings.SALESFORCE_DOMAIN,
            )
            logger.info("Salesforce connected")
            return True
        except Exception:
            logger.exception("Salesforce connection failed")
            self._sf = None
            return False

    def _client(self) -> Salesforce | None:
        if self._sf is None:
            self.connect()
        return self._sf

    def find_lead_id(self, email: str) -> str | None:
        """Look up an existing Lead by email address."""
        sf = self._client()
        if sf is None or not email:
            return None

        query = (
            f"SELECT Id FROM Lead WHERE Email = '{soql_escape(email)}' LIMIT 1"
        )
        result = sf.query(query)
        if result["totalSize"] > 0:
            return result["records"][0]["Id"]
        return None

    def sync_call_data(
        self,
        lead_data: dict[str, Any],
        analysis: dict[str, Any],
        transcript: str,
    ) -> str | None:
        """Upsert the Lead and attach the call outcome. Returns the Lead id."""
        if not self.enabled:
            logger.info("Salesforce not configured; skipping sync")
            return None

        for attempt in range(1, SYNC_ATTEMPTS + 1):
            try:
                return self._sync_once(lead_data, analysis, transcript)
            except Exception:
                logger.exception(
                    "Salesforce sync attempt %d/%d failed", attempt, SYNC_ATTEMPTS
                )
                self._sf = None
                if attempt < SYNC_ATTEMPTS:
                    time.sleep(RETRY_BACKOFF_SECONDS)

        logger.error("Salesforce sync gave up after %d attempts", SYNC_ATTEMPTS)
        return None

    def _sync_once(
        self,
        lead_data: dict[str, Any],
        analysis: dict[str, Any],
        transcript: str,
    ) -> str | None:
        sf = self._client()
        if sf is None:
            raise RuntimeError("no Salesforce connection")

        email = lead_data.get("lead_email") or ""
        first_name, last_name = split_name(lead_data.get("lead_name") or "")
        agent_type = lead_data.get("agent_type", "unknown")

        lead_id = self.find_lead_id(email)
        if lead_id is None:
            created = sf.Lead.create(
                {
                    "FirstName": first_name,
                    "LastName": last_name,
                    "Company": lead_data.get("lead_company") or "Not Specified",
                    "Email": email or None,
                    "Phone": lead_data.get("phone_number"),
                    "LeadSource": "VoiceFlow",
                    "Description": f"Created by VoiceFlow AI Agent ({agent_type})",
                }
            )
            lead_id = created["id"]
            logger.info("Created Lead %s", lead_id)

        score = int(analysis.get("sentiment_score", 50))
        sentiment = sentiment_for_score(score)
        safe_transcript = transcript or "No transcript available."

        try:
            sf.Lead.update(
                lead_id,
                {
                    "AI_Transcript__c": safe_transcript[:MAX_TRANSCRIPT_CHARS],
                    "AI_Lead_Score__c": score,
                    "AI_Sentiment__c": sentiment,
                    "Last_AI_Call__c": datetime.now(timezone.utc).isoformat(),
                },
            )
            logger.info("Updated Lead %s (score %d, %s)", lead_id, score, sentiment)
        except Exception:
            # The custom AI fields may not exist on a fresh org. The Task
            # written below carries the same information, so a missing field
            # should degrade the record rather than fail the sync.
            logger.exception("Could not write AI fields on Lead %s", lead_id)

        sf.Task.create(
            {
                "WhoId": lead_id,
                "Subject": f"AI Call: {agent_type} - Score: {score}/100",
                "Status": "Completed",
                "Priority": "High" if score > INTERESTED_THRESHOLD else "Normal",
                "Description": (
                    f"Intent Score: {score}/100\n"
                    f"Sentiment: {sentiment}\n"
                    f"Summary: {analysis.get('summary')}\n\n"
                    f"--- Full Transcript ---\n"
                    f"{safe_transcript[:TASK_TRANSCRIPT_CHARS]}"
                ),
            }
        )
        logger.info("Logged call activity for Lead %s", lead_id)
        return lead_id

    def get_crm_data(self, agent_type: str | None = None) -> list[dict[str, Any]]:
        """Read back leads this agent created, newest first."""
        if not self.enabled:
            return []

        sf = self._client()
        if sf is None:
            return []

        query = """
            SELECT Id, FirstName, LastName, Company, Email, Phone, Status,
                   CreatedDate, Description, LeadSource,
                   AI_Lead_Score__c, AI_Summary__c, AI_Sentiment__c,
                   Last_AI_Call__c, AI_Transcript__c,
                   Client_Company_Type__c, Client_Lifestyle__c,
                   Key_Pain_Points__c, Agent_Conversion_Verdict__c,
                   (SELECT Subject, Description, CreatedDate FROM Tasks
                    ORDER BY CreatedDate DESC LIMIT 1)
            FROM Lead
            ORDER BY CreatedDate DESC
            LIMIT 50
        """
        try:
            results = sf.query(query)
        except Exception:
            logger.exception("Could not read CRM data")
            return []

        return [
            mapped
            for record in results["records"]
            if (mapped := _map_lead(record, agent_type)) is not None
        ]


def _map_lead(
    record: dict[str, Any], agent_type: str | None
) -> dict[str, Any] | None:
    """Shape one Lead row for the frontend, or None if it should be excluded."""
    description = record.get("Description") or ""

    if "VoiceFlow" not in description and record.get("LeadSource") != "VoiceFlow":
        return None

    if agent_type and agent_type != "all":
        wanted = agent_type.replace("-", "").replace("_", "")
        found = description.replace("-", "").replace("_", "")
        if wanted not in found:
            return None

    tasks = record.get("Tasks")
    last_task = tasks["records"][0] if tasks and tasks["records"] else {}
    task_description = last_task.get("Description", "") or ""

    score = record.get("AI_Lead_Score__c")
    summary = record.get("AI_Summary__c")
    transcript = record.get("AI_Transcript__c")

    # Leads written before the custom fields existed only carry their data in
    # the Task body, so fall back to parsing it out.
    if score is None and "Intent Score:" in task_description:
        try:
            score = int(task_description.split("Intent Score:")[1].split("/")[0])
        except (IndexError, ValueError):
            logger.debug("Could not parse score from task on %s", record["Id"])
            score = 0

    if not summary and task_description:
        parts = task_description.split("--- Full Transcript ---")
        summary = parts[0].replace(f"Intent Score: {score}/100", "").strip()
        if not transcript and len(parts) > 1:
            transcript = parts[1].strip()

    last_contact = (
        record.get("Last_AI_Call__c")
        or last_task.get("CreatedDate")
        or record["CreatedDate"]
    )

    return {
        "id": record["Id"],
        "name": f"{record['FirstName'] or ''} {record['LastName']}".strip(),
        "email": record["Email"],
        "company": record["Company"],
        "status": record["Status"],
        "score": score or 0,
        "sentiment": record.get("AI_Sentiment__c") or "Neutral",
        "last_contact": last_contact,
        "summary": summary or "Processing...",
        "transcript": transcript or "No transcript available",
        "company_type": record.get("Client_Company_Type__c") or "N/A",
        "lifestyle": record.get("Client_Lifestyle__c") or "N/A",
        "pain_points": record.get("Key_Pain_Points__c") or "N/A",
        "verdict": record.get("Agent_Conversion_Verdict__c") or "Analysis pending",
    }
