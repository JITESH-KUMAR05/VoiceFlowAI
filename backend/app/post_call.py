"""What happens after a call ends.

Score the transcript, write it to Salesforce, send the follow-up, keep a local
record. Runs as a background task so none of it delays the response to Twilio's
status webhook.

Salesforce and SMTP are both blocking clients, so each is pushed to a worker
thread. Calling them directly from this coroutine would stall the event loop -
and with the Salesforce retry backoff that is several seconds during which no
other call can be served.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from anyio import to_thread

from app.services.container import Services

logger = logging.getLogger(__name__)

RECORDS_DIR = Path("database")


def _transcript_of(history: list[dict[str, str]]) -> str:
    return "\n".join(
        f"{turn['role']}: {turn['content']}"
        for turn in history
        if turn["role"] != "system"
    )


async def run_post_call_actions(
    services: Services,
    history: list[dict[str, str]],
    metadata: dict[str, Any],
    call_sid: str,
    status_label: str,
) -> None:
    """Score, sync, notify, record. Each step failing is survivable."""
    lead_data = metadata.get("lead_data", {})
    lead_name = lead_data.get("lead_name", "the caller")
    agent_type = metadata.get("agent_type", "unknown")

    logger.info("Post-call processing for %s (%s)", call_sid, status_label)

    analysis = await services.openai.analyze_call(history, lead_name)
    logger.info(
        "Call %s scored %s", call_sid, analysis.get("sentiment_score")
    )

    transcript = _transcript_of(history)

    try:
        await to_thread.run_sync(
            services.salesforce.sync_call_data, lead_data, analysis, transcript
        )
    except Exception:
        logger.exception("Salesforce sync failed for %s", call_sid)

    if lead_data.get("lead_email"):
        subject = (
            f"Summary of our conversation - {agent_type.replace('_', ' ').title()}"
        )
        try:
            await to_thread.run_sync(
                services.email.send_followup,
                lead_data["lead_email"],
                subject,
                analysis.get("email_body", ""),
            )
        except Exception:
            logger.exception("Follow-up email failed for %s", call_sid)

    await to_thread.run_sync(
        _append_record, call_sid, status_label, agent_type, lead_data, history, analysis
    )


def _append_record(
    call_sid: str,
    status_label: str,
    agent_type: str,
    lead_data: dict[str, Any],
    history: list[dict[str, str]],
    analysis: dict[str, Any],
) -> None:
    """Append the call to the local JSON record.

    A development convenience, not a database: it is rewritten whole on every
    call and would not survive concurrent writers. Records contain real
    transcripts and contact details, so the directory is gitignored.
    """
    record = {
        "call_id": call_sid,
        "status": status_label,
        "agent_type": agent_type,
        "lead_data": lead_data,
        "conversation": history,
        "analysis": analysis,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    RECORDS_DIR.mkdir(exist_ok=True)
    path = RECORDS_DIR / f"{agent_type}_records.json"

    try:
        existing = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        if not isinstance(existing, list):
            logger.warning("%s was not a list; starting a new record file", path)
            existing = []
    except (json.JSONDecodeError, OSError):
        logger.exception("Could not read %s; starting a new record file", path)
        existing = []

    existing.append(record)

    try:
        path.write_text(json.dumps(existing, indent=2), encoding="utf-8")
    except OSError:
        logger.exception("Could not write call record to %s", path)
