"""A real Azure OpenAI call, end to end.

Confirms the deployment name, API version, and key actually work together —
none of that is checkable without a live request, and a typo in any one of
the three fails in a way the unit suite cannot see.
"""

from __future__ import annotations

import time

from app.config import Settings
from app.services.openai_service import OpenAIService


async def test_generate_response_returns_real_text(require_azure_openai: Settings):
    service = OpenAIService(require_azure_openai)
    history = [
        {"role": "system", "content": "You are a terse assistant."},
        {"role": "user", "content": "Reply with the single word: pong"},
    ]

    started = time.perf_counter()
    reply = await service.generate_response(history)
    elapsed = time.perf_counter() - started

    assert isinstance(reply, str)
    assert reply.strip()
    # Generous ceiling — this is a real network call, not a latency
    # benchmark, but a reply that takes minutes signals something is wrong
    # with the deployment rather than the network.
    assert elapsed < 30


async def test_analyze_call_returns_a_schema_shaped_result(
    require_azure_openai: Settings,
):
    service = OpenAIService(require_azure_openai)
    history = [
        {"role": "system", "content": "You are Anisha from VoiceFlow."},
        {"role": "assistant", "content": "Hi, do you have a minute?"},
        {
            "role": "user",
            "content": (
                "Sure. We're struggling with lead follow-up, our team is too "
                "small. If this works we'd want a demo next week."
            ),
        },
    ]

    analysis = await service.analyze_call(history, "Test Lead")

    assert 0 <= analysis["sentiment_score"] <= 100
    assert analysis["sentiment_label"] in ("Interested", "Neutral", "Not Interested")
    assert analysis["summary"]
    assert analysis["email_body"]
