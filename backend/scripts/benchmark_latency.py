"""Measure real latency for every provider and the end-to-end call turn.

Not a test — nothing here asserts pass/fail, it just times real calls to
whatever's configured in .env and prints a report. Skips a section cleanly
when its provider isn't configured, same as the integration test suite.

Usage (from backend/):
    uv run python scripts/benchmark_latency.py

Cost: same as running the live integration suite once — a handful of real
Azure OpenAI and Murf calls, one Salesforce Lead created and deleted. No
phone call is placed.
"""

from __future__ import annotations

import asyncio
import sys
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

import httpx  # noqa: E402

from app.config import Settings  # noqa: E402
from app.services.murf_service import MurfService  # noqa: E402
from app.services.openai_service import OpenAIService  # noqa: E402
from app.services.salesforce_service import SalesforceService  # noqa: E402

TEST_MARKER = "example.com"  # IANA-reserved, guaranteed non-deliverable.


@dataclass
class Report:
    """Collects (label, seconds, note) rows for the final printout."""

    rows: list[tuple[str, float, str]] = field(default_factory=list)

    def add(self, label: str, seconds: float, note: str = "") -> None:
        self.rows.append((label, seconds, note))

    def skip(self, label: str, reason: str) -> None:
        self.rows.append((label, float("nan"), f"skipped — {reason}"))

    def print(self) -> None:
        width = max(len(label) for label, _, _ in self.rows)
        print()
        print(f"{'Measurement'.ljust(width)}  {'Time':>10}  Note")
        print(f"{'-' * width}  {'-' * 10}  {'-' * 30}")
        for label, seconds, note in self.rows:
            time_str = "—" if seconds != seconds else f"{seconds * 1000:7.0f} ms"
            print(f"{label.ljust(width)}  {time_str:>10}  {note}")
        print()


@contextmanager
def timed():
    start = time.perf_counter()
    box: dict[str, float] = {}
    yield box
    box["elapsed"] = time.perf_counter() - start


CANNED_HISTORY = [
    {
        "role": "system",
        "content": (
            "You are Anisha, a Solutions Consultant at VoiceFlow. Keep "
            "replies under two sentences."
        ),
    },
    {"role": "assistant", "content": "Hi, this is Anisha from VoiceFlow."},
    {
        "role": "user",
        "content": (
            "We're a 20-person startup and our sales team is drowning in "
            "manual follow-ups."
        ),
    },
]

GREETING_TEXT = (
    "Hi there, this is Anisha from VoiceFlow. I noticed you're looking to "
    "improve sales efficiency. Do you have a minute?"
)


def benchmark_azure_openai(settings: Settings, report: Report) -> None:
    if not settings.AZURE_OPENAI_API_KEY:
        report.skip("Azure OpenAI: reply", "AZURE_OPENAI_API_KEY not set")
        report.skip("Azure OpenAI: analysis", "AZURE_OPENAI_API_KEY not set")
        return

    service = OpenAIService(settings)

    with timed() as t:
        reply = asyncio.run(service.generate_response(CANNED_HISTORY))
    report.add("Azure OpenAI: reply", t["elapsed"], f"{len(reply)} chars back")

    with timed() as t:
        analysis = asyncio.run(service.analyze_call(CANNED_HISTORY, "Test Lead"))
    report.add(
        "Azure OpenAI: post-call analysis",
        t["elapsed"],
        f"score {analysis['sentiment_score']}",
    )


def benchmark_murf(settings: Settings, report: Report) -> None:
    if not settings.MURF_API_KEY:
        report.skip("Murf: time to first chunk", "MURF_API_KEY not set")
        report.skip("Murf: full synthesis", "MURF_API_KEY not set")
        return

    service = MurfService(settings)

    start = time.perf_counter()
    chunks = []
    first_chunk_at = None
    for chunk in service.create_audio_stream(
        GREETING_TEXT, voice_id="en-IN-anisha", language="en-IN"
    ):
        if first_chunk_at is None:
            first_chunk_at = time.perf_counter()
        chunks.append(chunk)
    total_elapsed = time.perf_counter() - start

    audio = b"".join(chunks)
    if first_chunk_at is not None:
        report.add(
            "Murf: time to first chunk",
            first_chunk_at - start,
            "when playback could start",
        )
    report.add(
        "Murf: full synthesis",
        total_elapsed,
        f"{len(audio):,} bytes, {len(GREETING_TEXT)} chars",
    )


def benchmark_salesforce(settings: Settings, report: Report) -> None:
    if not settings.salesforce_configured:
        report.skip("Salesforce: connect (cold)", "not configured")
        report.skip("Salesforce: sync_call_data", "not configured")
        return

    service = SalesforceService(settings)

    with timed() as t:
        ok = service.connect()
    report.add(
        "Salesforce: connect (cold)",
        t["elapsed"],
        "OAuth Client Credentials" if settings.salesforce_oauth_configured else "SOAP",
    )
    if not ok:
        report.skip("Salesforce: sync_call_data", "connect() failed")
        return

    test_email = f"qa-{uuid.uuid4().hex[:8]}@{TEST_MARKER}"
    lead_id = None
    try:
        with timed() as t:
            lead_id = service.sync_call_data(
                {"lead_name": "Benchmark Lead", "lead_email": test_email, "agent_type": "b2b"},
                {"sentiment_score": 70, "summary": "Benchmark run."},
                "assistant: Hi\nuser: Sure, tell me more.",
            )
        report.add(
            "Salesforce: sync_call_data",
            t["elapsed"],
            "create Lead + update AI fields + log Task",
        )
    finally:
        if lead_id:
            service._client().Lead.delete(lead_id)  # noqa: SLF001


def benchmark_end_to_end(settings: Settings, report: Report, base_url: str) -> None:
    """Hits a real, already-running server over HTTP.

    Deliberately not FastAPI's TestClient: TestClient runs BackgroundTasks
    synchronously before the response returns, which would make
    POST /api/browser/end look like it takes as long as the entire post-call
    pipeline. Under a real ASGI server that endpoint returns almost
    immediately and the background work happens after - measuring against a
    real server is the only way to report that honestly.
    """
    if not (settings.AZURE_OPENAI_API_KEY and settings.MURF_API_KEY):
        report.skip("End-to-end: full browser turn", "Azure OpenAI or Murf not set")
        return

    try:
        httpx.get(f"{base_url}/health", timeout=3)
    except httpx.HTTPError:
        report.skip(
            "End-to-end: full browser turn",
            f"no server reachable at {base_url} - start one first "
            "(uv run uvicorn app.main:app)",
        )
        return

    test_email = f"qa-{uuid.uuid4().hex[:8]}@{TEST_MARKER}"
    lead_id = None

    with httpx.Client(base_url=base_url, timeout=30) as client:
        with timed() as t:
            started = client.post(
                "/api/phone/call",
                json={
                    "lead_name": "Benchmark Lead",
                    "lead_email": test_email,
                    "agent_type": "b2b",
                },
            )
        report.add(
            "End-to-end: POST /api/phone/call",
            t["elapsed"],
            "registers greeting, no synthesis yet",
        )
        session = started.json()
        call_sid = session["call_sid"]
        audio_path = "/api/" + session["greeting_audio_url"].split("/api/")[1]

        with timed() as t:
            client.get(audio_path)
        report.add(
            "End-to-end: GET greeting audio",
            t["elapsed"],
            "real Murf synthesis happens here",
        )

        with timed() as t:
            client.post(
                "/api/browser/chat",
                json={
                    "session_id": call_sid,
                    "message": "We're struggling to follow up on leads fast enough.",
                },
            )
        report.add(
            "End-to-end: POST /api/browser/chat",
            t["elapsed"],
            "real GPT-4o reply + audio registration",
        )

        with timed() as t:
            client.post(
                "/api/browser/end", json={"session_id": call_sid, "message": "end"}
            )
        report.add(
            "End-to-end: POST /api/browser/end",
            t["elapsed"],
            "hands off to background task",
        )

        # Deliberately not named `client` - that name is already the
        # TestClient bound by the `with` statement above, and shadowing it
        # here would silently break any later call on it in this scope.
        sf = SalesforceService(settings) if settings.salesforce_configured else None
        if sf is not None:
            sf_client = sf._client()  # noqa: SLF001 - one connection, reused below
            start = time.perf_counter()
            record = None
            for _ in range(15):
                result = sf_client and sf_client.query(
                    f"SELECT Id FROM Lead WHERE Email = '{test_email}' LIMIT 1"
                )
                if result and result["totalSize"] > 0:
                    record = result["records"][0]
                    break
                time.sleep(1)
            elapsed = time.perf_counter() - start
            if record:
                lead_id = record["Id"]
                report.add(
                    "End-to-end: background pipeline (analysis + sync)",
                    elapsed,
                    "time from hangup to Lead visible in Salesforce",
                )
            else:
                report.skip(
                    "End-to-end: background pipeline", "Lead never appeared within 15s"
                )

    if lead_id and sf is not None:
        sf_client = sf._client()  # noqa: SLF001 - already connected above
        if sf_client:
            sf_client.Lead.delete(lead_id)


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

    settings = Settings()
    report = Report()

    print("VoiceFlow AI — live latency benchmark")
    print(
        f"Providers: Azure OpenAI={bool(settings.AZURE_OPENAI_API_KEY)}  "
        f"Murf={bool(settings.MURF_API_KEY)}  "
        f"Salesforce={settings.salesforce_configured}"
    )
    print(f"End-to-end target: {base_url}")

    benchmark_azure_openai(settings, report)
    benchmark_murf(settings, report)
    benchmark_salesforce(settings, report)
    benchmark_end_to_end(settings, report, base_url)

    report.print()
    print(
        "Note: end-to-end numbers depend on network conditions to Azure/Murf/\n"
        "Salesforce at the moment this ran, not just this codebase — expect\n"
        "variance between runs, especially for the analysis and Salesforce\n"
        "sync steps."
    )


if __name__ == "__main__":
    main()
