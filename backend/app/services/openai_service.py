"""Azure OpenAI: in-call replies and post-call analysis."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from openai import AsyncAzureOpenAI, OpenAIError

from app.config import Settings
from app.models.schemas import CallAnalysis

logger = logging.getLogger(__name__)

# Replies are spoken aloud, so they must stay short. This ceiling is a
# backstop; the system prompt does the real work of keeping them brief.
MAX_REPLY_TOKENS = 150

# Every second here is a second of silence on a live call.
REPLY_TIMEOUT_SECONDS = 15.0

# Nobody is waiting on the line for this one.
ANALYSIS_TIMEOUT_SECONDS = 60.0

FALLBACK_REPLY = "Sorry, could you say that again?"

ANALYSIS_INSTRUCTIONS = """\
Analyse the following call transcript with {lead_name}.

Return a JSON object with exactly these keys:

- sentiment_score: integer 0-100, scored strictly against these weights:
    demo scheduled or next steps agreed  +30
    budget or authority confirmed        +20
    friendly, engaged tone               +20
    pain points clearly stated           +15
    correct target audience              +15
- sentiment_label: "Interested" (70-100), "Neutral" (40-69),
  or "Not Interested" (0-39)
- summary: a brief summary for the CRM record
- company_type: inferred industry and size, e.g. "SaaS startup"
- client_lifestyle: inferred persona, e.g. "Busy, tech-savvy"
- pain_points: the specific problems the caller raised
- agent_verdict: conversion probability and the reasoning behind it
- email_body: a follow-up email body, with no subject line

Transcript:
{transcript}
"""


class OpenAIService:
    """Wraps the Azure deployment.

    Both methods degrade rather than raise. A model failure mid-call should
    produce a recoverable spoken line, not a 500 that drops the caller.
    """

    def __init__(self, settings: Settings) -> None:
        self._deployment = settings.AZURE_OPENAI_DEPLOYMENT_NAME
        self._client = AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            timeout=REPLY_TIMEOUT_SECONDS,
        )

    async def generate_response(self, history: list[dict[str, str]]) -> str:
        """Produce the agent's next spoken line."""
        started = time.perf_counter()
        try:
            response = await self._client.chat.completions.create(
                model=self._deployment,
                messages=history,
                max_tokens=MAX_REPLY_TOKENS,
                temperature=0.7,
                timeout=REPLY_TIMEOUT_SECONDS,
            )
        except OpenAIError:
            logger.exception("Reply generation failed")
            return FALLBACK_REPLY

        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.info("Model reply in %.0f ms", elapsed_ms)

        content = response.choices[0].message.content
        return content.strip() if content else FALLBACK_REPLY

    async def analyze_call(
        self, history: list[dict[str, str]], lead_name: str
    ) -> dict[str, Any]:
        """Score a finished call and draft the follow-up email.

        Returns a dict shaped like CallAnalysis. On failure it returns the
        neutral defaults, so a scoring outage cannot lose the CRM write.
        """
        transcript = "\n".join(
            f"{turn['role']}: {turn['content']}"
            for turn in history
            if turn["role"] != "system"
        )
        if not transcript.strip():
            logger.info("No transcript to analyse")
            return CallAnalysis().model_dump()

        try:
            response = await self._client.chat.completions.create(
                model=self._deployment,
                messages=[
                    {
                        "role": "user",
                        "content": ANALYSIS_INSTRUCTIONS.format(
                            lead_name=lead_name, transcript=transcript
                        ),
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.4,
                timeout=ANALYSIS_TIMEOUT_SECONDS,
            )
            raw = json.loads(response.choices[0].message.content or "{}")
            # Validating rather than trusting the model: a missing or
            # out-of-range score would otherwise reach Salesforce as-is.
            return CallAnalysis.model_validate(raw).model_dump()
        except (OpenAIError, json.JSONDecodeError, ValueError):
            logger.exception("Call analysis failed for %s", lead_name)
            return CallAnalysis().model_dump()
