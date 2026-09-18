# Real-Time Browser Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser mode's push-to-talk/Web-Speech-API turn loop with continuous voice-activity detection, a persistent WebSocket, Whisper transcription, and true barge-in — per
`docs/superpowers/specs/2026-09-18-realtime-browser-conversation-design.md`.

**Architecture:** Client-side Silero VAD (`@ricky0123/vad-web`) records one utterance at a time and hands back its complete audio on speech-end; a persistent WebSocket (`/api/ws/browser/{session_id}`) carries that audio to the backend and carries the synthesized reply back as raw PCM chunks for gapless Web Audio playback. Barge-in cancels the in-flight OpenAI/Murf work server-side rather than just discarding it client-side.

**Tech Stack:** FastAPI WebSocket (backend), `openai` Azure Whisper deployment `whisper1`, Murf `format="PCM"` streaming, `@ricky0123/vad-web` + native Web Audio API (frontend, no new frontend framework).

## Global Constraints

- No network, no credentials in backend tests — providers faked at the service boundary (CLAUDE.md, "Testing").
- Frontend automated tests cover pure logic only — no component-rendering test setup exists; browser-API-integration code (VAD, WebSocket wiring, Web Audio playback orchestration) is verified by running the dev server and using the feature in a real Chromium browser, not by a fabricated automated test (CLAUDE.md, "Testing" + "Before claiming work is done").
- Conventional Commits, imperative subject, under 72 characters. One logical change per commit.
- `uv add`/`uv run` for all backend Python work; `npm` for frontend.
- **Known environment blocker**: this machine's Windows Application Control policy currently refuses to run the backend venv's `python.exe` (`uv run` fails with `os error 4551`). Every backend task below assumes this is resolved before execution — if it still fails when a task's steps are run, stop and report it rather than working around it with system Python or a different interpreter (mixing interpreters against a `uv`-managed venv will corrupt the environment).
- Backend deployment name for transcription is **`whisper1`**, not `whisper` — confirmed live against the `BuddyAgentsTest` Azure OpenAI resource. Don't rename it in config without re-confirming the deployment name in Azure AI Foundry.

---

## Task 1: Fix the hardcoded-English greeting

Small, independent, unrelated to everything else here — worth clearing first.

**Files:**
- Modify: `backend/app/personas.py`
- Test: `backend/tests/test_personas.py`

**Interfaces:**
- Produces: `build_agent_profile(...).greeting` now varies by `language`, same as `.system_prompt` already does.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_personas.py`:

```python
@pytest.mark.parametrize("agent_type", ["b2b", "real-estate"])
def test_the_greeting_is_english_by_default(agent_type):
    profile = build_agent_profile(
        agent_type=agent_type, lead_name="Sam", voice_id="en-IN-anisha"
    )

    assert profile.greeting.isascii()


@pytest.mark.parametrize("agent_type", ["b2b", "real-estate"])
def test_the_greeting_is_hindi_when_the_call_is_in_hindi(agent_type):
    profile = build_agent_profile(
        agent_type=agent_type,
        lead_name="Sam",
        voice_id="hi-IN-khyati",
        language="hi-IN",
    )

    assert not profile.greeting.isascii()
    assert "Sam" in profile.greeting


def test_the_hindi_greeting_agrees_with_the_personas_gender():
    female = build_agent_profile(
        agent_type="b2b", lead_name="Sam", voice_id="hi-IN-khyati", language="hi-IN"
    )
    male = build_agent_profile(
        agent_type="b2b", lead_name="Sam", voice_id="hi-IN-aman", language="hi-IN"
    )

    assert "रही" in female.greeting
    assert "रहा" in male.greeting
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_personas.py -v`
Expected: the three new tests FAIL — `test_the_greeting_is_english_by_default` actually passes already (the bug is only visible in Hindi), but both Hindi tests FAIL because the greeting is still English ("Hello Sam, this is..." is ASCII, so `not profile.greeting.isascii()` is false).

- [ ] **Step 3: Make the greeting language-aware**

In `backend/app/personas.py`, add above `_real_estate_prompt`:

```python
def _greeting_verb(gender: str) -> str:
    """Hindi first-person present-continuous verb agreement: बोल रहा/रही हूँ."""
    return "रही" if gender.lower() == "female" else "रहा"


def _real_estate_greeting(persona: Persona, lead_name: str, language: str) -> str:
    if language.lower().startswith("hi"):
        verb = _greeting_verb(persona.gender)
        return (
            f"नमस्ते {lead_name} जी, मैं {persona.name} बोल {verb} हूँ "
            f"{REAL_ESTATE_COMPANY} से। आपने प्रॉपर्टी के बारे में पूछताछ की थी। "
            "क्या अभी बात करने का सही समय है?"
        )
    return (
        f"Hello {lead_name}, this is {persona.name} from "
        f"{REAL_ESTATE_COMPANY}. I received your inquiry regarding a "
        "property. Is this a good time to talk?"
    )


def _b2b_greeting(persona: Persona, lead_name: str, language: str) -> str:
    if language.lower().startswith("hi"):
        verb = _greeting_verb(persona.gender)
        return (
            f"नमस्ते {lead_name} जी, मैं {persona.name} बोल {verb} हूँ "
            f"{B2B_COMPANY} से। मैंने देखा कि आप अपनी सेल्स प्रक्रिया को बेहतर "
            "बनाना चाहते हैं। क्या आपके पास एक मिनट है?"
        )
    return (
        f"Hi {lead_name}, this is {persona.name} from {B2B_COMPANY}. "
        "I noticed you're looking to improve sales efficiency. "
        "Do you have a minute?"
    )
```

Then in `build_agent_profile`, replace the two inline `greeting=f"..."` blocks:

```python
    if normalised == "real_estate":
        return AgentProfile(
            persona=persona,
            company_name=REAL_ESTATE_COMPANY,
            system_prompt=_real_estate_prompt(
                persona, lead_name, lead_company, language, details
            ),
            greeting=_real_estate_greeting(persona, lead_name, language),
        )

    return AgentProfile(
        persona=persona,
        company_name=B2B_COMPANY,
        system_prompt=_b2b_prompt(persona, lead_name, language, details),
        greeting=_b2b_greeting(persona, lead_name, language),
    )
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_personas.py -v`
Expected: PASS, all of `test_personas.py`.

- [ ] **Step 5: Run the full backend suite and commit**

Run: `cd backend && uv run pytest -q`
Expected: all tests pass (was 98, still 98 — these are new assertions on existing behavior, not new test count from this task... note: 3 new tests were added, so expect 101 passing).

```bash
git add backend/app/personas.py backend/tests/test_personas.py
git commit -m "fix(personas): speak the greeting in the caller's language

The system prompt already said \"You are speaking in {language}\", but the
greeting spoken before the model ever runs was a hardcoded English string
in both personas regardless of language."
```

---

## Task 2: Config — the Whisper deployment name

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`
- Test: `backend/tests/test_config.py`

**Interfaces:**
- Produces: `Settings.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME: str`, default `"whisper1"`.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_config.py`:

```python
def test_the_whisper_deployment_name_defaults_to_whisper1():
    settings = build(**REQUIRED)

    assert settings.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME == "whisper1"


def test_the_whisper_deployment_name_is_overridable():
    settings = build(**REQUIRED, AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME="whisper-eu")

    assert settings.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME == "whisper-eu"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest tests/test_config.py -v -k whisper`
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME'`.

- [ ] **Step 3: Add the setting**

In `backend/app/config.py`, in the `# --- Azure OpenAI` block:

```python
    AZURE_OPENAI_API_VERSION: str = "2024-12-01-preview"
    # Deployment name for Whisper transcription. Confirmed live: this Azure
    # OpenAI resource's Whisper deployment is named "whisper1", not "whisper"
    # (the UI auto-suffixed it when the "whisper" model landed in a
    # different region than the resource's other deployments).
    AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME: str = "whisper1"
```

- [ ] **Step 4: Document it in `.env.example`**

In `backend/.env.example`, after the existing `AZURE_OPENAI_API_VERSION` line:

```
AZURE_OPENAI_API_VERSION=2024-12-01-preview
# Deployment name for Whisper transcription, used by the real-time browser
# turn loop (app/routers/browser_ws.py). Whisper may land in a different
# Azure region than your other deployments and the console may auto-suffix
# the name you gave it - check the actual deployment name in Azure AI
# Foundry rather than assuming it matches what you typed.
AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME=whisper1
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_config.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/config.py backend/.env.example backend/tests/test_config.py
git commit -m "feat(config): add the Whisper deployment name setting"
```

---

## Task 3: `pcm_to_wav` — wrap raw mic PCM for Whisper

**Files:**
- Create: `backend/app/audio_utils.py`
- Test: `backend/tests/test_audio_utils.py`

**Interfaces:**
- Produces: `pcm_to_wav(pcm_bytes: bytes) -> bytes`, `PCM_SAMPLE_RATE_HZ = 16_000`, `PCM_SAMPLE_WIDTH_BYTES = 2`, `PCM_CHANNELS = 1`.
- Consumed by: Task 6 (`browser_ws.py`), which wraps accumulated mic PCM before calling `WhisperService.transcribe`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_audio_utils.py`:

```python
"""pcm_to_wav: wrapping headerless mic PCM in a WAV container for Whisper.

Whisper's transcription endpoint needs a real audio file, not headerless
PCM - the browser sends the smallest possible wire format (raw samples,
no header), so this adds the header back on before transcription.
"""

from __future__ import annotations

import io
import wave

from app.audio_utils import (
    PCM_CHANNELS,
    PCM_SAMPLE_RATE_HZ,
    PCM_SAMPLE_WIDTH_BYTES,
    pcm_to_wav,
)


def test_pcm_to_wav_produces_a_valid_wav_with_the_expected_format():
    pcm = b"\x00\x01" * 100

    wav_bytes = pcm_to_wav(pcm)

    with wave.open(io.BytesIO(wav_bytes)) as wav_file:
        assert wav_file.getnchannels() == PCM_CHANNELS
        assert wav_file.getsampwidth() == PCM_SAMPLE_WIDTH_BYTES
        assert wav_file.getframerate() == PCM_SAMPLE_RATE_HZ
        assert wav_file.readframes(wav_file.getnframes()) == pcm


def test_pcm_to_wav_of_empty_bytes_is_still_a_valid_empty_wav():
    wav_bytes = pcm_to_wav(b"")

    with wave.open(io.BytesIO(wav_bytes)) as wav_file:
        assert wav_file.getnframes() == 0
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest tests/test_audio_utils.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.audio_utils'`.

- [ ] **Step 3: Write the implementation**

Create `backend/app/audio_utils.py`:

```python
"""Small audio format helpers shared by the real-time browser pipeline."""

from __future__ import annotations

import io
import wave

# What the browser is told to record at: mono, 16-bit signed, 16kHz. Small
# enough to send over a WebSocket without meaningful delay, and the rate
# Whisper-class models are built around.
PCM_SAMPLE_RATE_HZ = 16_000
PCM_SAMPLE_WIDTH_BYTES = 2
PCM_CHANNELS = 1


def pcm_to_wav(pcm_bytes: bytes) -> bytes:
    """Wrap headerless PCM samples in a WAV container."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(PCM_CHANNELS)
        wav_file.setsampwidth(PCM_SAMPLE_WIDTH_BYTES)
        wav_file.setframerate(PCM_SAMPLE_RATE_HZ)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_audio_utils.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/audio_utils.py backend/tests/test_audio_utils.py
git commit -m "feat(audio): add pcm_to_wav for wrapping mic audio before transcription"
```

---

## Task 4: `WhisperService`

**Files:**
- Create: `backend/app/services/whisper_service.py`
- Test: `backend/tests/test_whisper_service.py`

**Interfaces:**
- Consumes: `Settings.AZURE_OPENAI_API_KEY`, `.AZURE_OPENAI_ENDPOINT`, `.AZURE_OPENAI_API_VERSION`, `.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME` (Task 2).
- Produces: `WhisperService(settings).transcribe(wav_bytes: bytes) -> str` (async), empty string on failure.
- Consumed by: Task 6 (`browser_ws.py`).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_whisper_service.py`:

```python
"""WhisperService: batch transcription of one recorded utterance.

Follows the same fake-the-client-after-construction pattern as
test_murf_service.py - real credentials are never touched.
"""

from __future__ import annotations

from openai import OpenAIError

from app.services.whisper_service import WhisperService


class FakeTranscriptionResult:
    def __init__(self, text: str) -> None:
        self.text = text


class FakeTranscriptions:
    def __init__(self, result_text: str = "hello there", raise_error=None):
        self.calls: list[dict] = []
        self._result_text = result_text
        self._raise = raise_error

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self._raise:
            raise self._raise
        return FakeTranscriptionResult(self._result_text)


class FakeAudio:
    def __init__(self, transcriptions: FakeTranscriptions):
        self.transcriptions = transcriptions


class FakeClient:
    def __init__(self, transcriptions: FakeTranscriptions):
        self.audio = FakeAudio(transcriptions)


def build_service(transcriptions: FakeTranscriptions) -> WhisperService:
    service = WhisperService.__new__(WhisperService)
    service._deployment = "whisper1"
    service._client = FakeClient(transcriptions)
    return service


async def test_transcribe_returns_the_stripped_transcript_text():
    service = build_service(FakeTranscriptions(result_text="  hi there  "))

    text = await service.transcribe(b"RIFF-fake-wav")

    assert text == "hi there"


async def test_transcribe_sends_the_configured_deployment_and_a_named_wav_file():
    transcriptions = FakeTranscriptions()
    service = build_service(transcriptions)

    await service.transcribe(b"RIFF-fake-wav")

    assert len(transcriptions.calls) == 1
    call = transcriptions.calls[0]
    assert call["model"] == "whisper1"
    filename, content, content_type = call["file"]
    assert filename == "utterance.wav"
    assert content == b"RIFF-fake-wav"
    assert content_type == "audio/wav"


async def test_a_transcription_failure_returns_an_empty_string_rather_than_raising():
    service = build_service(FakeTranscriptions(raise_error=OpenAIError("boom")))

    text = await service.transcribe(b"RIFF-fake-wav")

    assert text == ""
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest tests/test_whisper_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.whisper_service'`.

- [ ] **Step 3: Write the implementation**

Create `backend/app/services/whisper_service.py`:

```python
"""Azure OpenAI Whisper: transcribing one caller utterance at a time.

Batch transcription of an already-finished utterance, not a streaming or
partial-transcript API - the caller (app/routers/browser_ws.py) decides an
utterance is finished via client-side voice activity detection, then hands
the whole thing to transcribe() at once.
"""

from __future__ import annotations

import logging

from openai import AsyncAzureOpenAI, OpenAIError

from app.config import Settings

logger = logging.getLogger(__name__)

TRANSCRIPTION_TIMEOUT_SECONDS = 10.0


class WhisperService:
    def __init__(self, settings: Settings) -> None:
        self._deployment = settings.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME
        self._client = AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            timeout=TRANSCRIPTION_TIMEOUT_SECONDS,
        )

    async def transcribe(self, wav_bytes: bytes) -> str:
        """Transcribe one WAV utterance. Empty string on failure.

        Empty rather than raising: a failed transcription should prompt the
        caller to repeat themselves, not drop the WebSocket connection.
        """
        try:
            response = await self._client.audio.transcriptions.create(
                model=self._deployment,
                file=("utterance.wav", wav_bytes, "audio/wav"),
            )
        except OpenAIError:
            logger.exception("Transcription failed")
            return ""

        return response.text.strip()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_whisper_service.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/whisper_service.py backend/tests/test_whisper_service.py
git commit -m "feat(services): add WhisperService for real-time transcription"
```

---

## Task 5: Wire `WhisperService` into the `Services` container

**Files:**
- Modify: `backend/app/services/container.py`
- Modify: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `WhisperService` (Task 4).
- Produces: `Services.whisper` field, populated in both `build_services` (real) and every test fixture that constructs `Services` directly.

- [ ] **Step 1: Update the container**

In `backend/app/services/container.py`:

```python
@dataclass
class Services:
    openai: Any
    murf: Any
    whisper: Any
    salesforce: Any
    email: Any
    sessions: SessionStore
    twilio: SupportsTwilio | None = None
```

And in `build_services`:

```python
    from app.services.email_service import EmailService
    from app.services.murf_service import MurfService
    from app.services.openai_service import OpenAIService
    from app.services.salesforce_service import SalesforceService
    from app.services.whisper_service import WhisperService

    ...

    return Services(
        openai=OpenAIService(settings),
        murf=MurfService(settings),
        whisper=WhisperService(settings),
        salesforce=SalesforceService(settings),
        email=EmailService(settings),
        sessions=SessionStore(
            session_ttl=settings.SESSION_TTL_SECONDS,
            session_max=settings.SESSION_MAX_ENTRIES,
            audio_ttl=settings.AUDIO_TTL_SECONDS,
            audio_max=settings.AUDIO_MAX_ENTRIES,
        ),
        twilio=twilio,
    )
```

- [ ] **Step 2: Run the full backend suite to see it break**

Run: `cd backend && uv run pytest -q`
Expected: FAIL — `tests/test_api.py`'s `services` fixture now raises `TypeError: Services.__init__() missing 1 required positional argument: 'whisper'` for every test that uses it. This is expected; fixing it is the next step.

- [ ] **Step 3: Add `FakeWhisper` and wire it into the fixture**

In `backend/tests/test_api.py`, add near the other fakes (after `FakeMurf`):

```python
class FakeWhisper:
    def __init__(self, transcript: str = "What does it cost?"):
        self.transcript = transcript
        self.calls: list[bytes] = []

    async def transcribe(self, wav_bytes: bytes) -> str:
        self.calls.append(wav_bytes)
        return self.transcript
```

And in the `services` fixture, add `whisper=FakeWhisper(),`:

```python
@pytest.fixture
def services():
    return Services(
        openai=FakeOpenAI(),
        murf=FakeMurf(),
        whisper=FakeWhisper(),
        twilio=FakeTwilio(),
        salesforce=FakeSalesforce(),
        email=FakeEmail(),
        sessions=SessionStore(
            session_ttl=3600, session_max=100, audio_ttl=300, audio_max=100
        ),
    )
```

- [ ] **Step 4: Run the full backend suite to verify it passes**

Run: `cd backend && uv run pytest -q`
Expected: all tests pass (101 from Task 1, unchanged count here - this task adds no new tests, just keeps existing ones green).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/container.py backend/tests/test_api.py
git commit -m "feat(services): wire WhisperService into the services container"
```

---

## Task 6: `MurfService` — raw PCM output for the real-time path

The existing REST path (phone calls, the browser greeting) keeps using WAV, unchanged. The new WebSocket path needs raw PCM instead, so the client can schedule it directly in the Web Audio API without decoding a file.

**Files:**
- Modify: `backend/app/services/murf_service.py`
- Modify: `backend/tests/test_murf_service.py`

**Interfaces:**
- Produces: `MurfService.create_audio_stream(text, voice_id, language="en-IN", audio_format="WAV")` — new optional `audio_format` parameter; every existing call site is unaffected since it defaults to `"WAV"`.
- Consumed by: Task 7 (`browser_ws.py`), which passes `audio_format="PCM"`.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_murf_service.py`:

```python
def test_create_audio_stream_can_request_raw_pcm_for_the_realtime_path():
    stream_client = FakeStreamClient()
    service = build_service(stream_client)

    list(
        service.create_audio_stream(
            "Hello there", "en-IN-anisha", "en-IN", audio_format="PCM"
        )
    )

    assert stream_client.calls[0]["format"] == "PCM"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest tests/test_murf_service.py -v -k realtime_path`
Expected: FAIL — `TypeError: create_audio_stream() got an unexpected keyword argument 'audio_format'`.

- [ ] **Step 3: Add the parameter**

In `backend/app/services/murf_service.py`, change the method signature and the one line inside it that builds the `format` kwarg:

```python
    def create_audio_stream(
        self,
        text: str,
        voice_id: str,
        language: str = "en-IN",
        audio_format: str = "WAV",
    ) -> Iterator[bytes]:
        """Yield audio chunks for ``text``.

        ``audio_format`` is "WAV" for the REST path (Twilio's <Play> and the
        browser's <audio> element both need a self-contained file) and "PCM"
        for the real-time WebSocket path, where the client schedules raw
        samples directly in the Web Audio API instead of decoding a file.

        Yields nothing if synthesis fails. Callers stream this straight to
        Twilio or the browser, so raising here would surface as a broken
        response body rather than a handleable error.
        """
        name = voice_name(voice_id)
        logger.info("Synthesising with voice=%s language=%s", name, language)

        try:
            stream = self._client.text_to_speech.stream(
                text=text,
                voice_id=name,
                model=MODEL,
                locale=language,
                format=audio_format,
                sample_rate=SAMPLE_RATE_HZ,
            )
        except Exception:
            logger.exception("Murf synthesis failed for voice=%s", name)
            return

        try:
            yield from stream
        except Exception:
            # A mid-stream failure truncates the audio. The caller hears a cut
            # sentence, which is recoverable; the turn continues.
            logger.exception("Murf stream interrupted for voice=%s", name)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_murf_service.py -v`
Expected: PASS, including the existing tests (they don't pass `audio_format`, so they still get `"WAV"`).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/murf_service.py backend/tests/test_murf_service.py
git commit -m "feat(murf): support raw PCM output for the real-time WebSocket path"
```

- [ ] **Step 6: Flag for live verification (not automated - no credentials in tests)**

Note for whoever runs this against the real Murf account: confirm the actual byte layout of `format="PCM"` output (16-bit signed, little-endian, matching `SAMPLE_RATE_HZ = 24_000` mono is assumed here based on Murf's SDK docstring, but hasn't been confirmed against a live response the way falcon-2's latency was). Do this once Python is unblocked, before relying on it in a real conversation — same empirical-verification approach used earlier in this project for the Murf model and Whisper deployment choices.

---

## Task 7: `browser_ws.py` — the WebSocket turn loop

The core of this plan. Everything before this was a prerequisite; everything after this is the frontend that talks to it.

**Files:**
- Create: `backend/app/routers/browser_ws.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_browser_ws.py`

**Interfaces:**
- Consumes: `Services.whisper.transcribe(wav_bytes) -> str` (Task 4/5), `Services.openai.generate_response(history) -> str` (existing), `Services.murf.create_audio_stream(text, voice_id, language, audio_format="PCM")` (Task 6), `Services.sessions.metadata.get(session_id)` / `.conversations.get/set` (existing `SessionStore`), `pcm_to_wav` (Task 3), `DEFAULT_VOICE_ID` from `app.personas` (existing).
- Produces: `GET`-upgraded WebSocket endpoint `/api/ws/browser/{session_id}`. Wire protocol documented in the module docstring below - this is the authoritative version (the design doc describes the shape; this is the exact contract).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_browser_ws.py`:

```python
"""The real-time browser turn loop: WebSocket, VAD-driven, no push-to-talk.

Providers are faked at the boundary, same as test_api.py - this proves the
wire protocol and the cancellation behaviour, not the real providers.
"""

from __future__ import annotations

import threading

from fastapi.testclient import TestClient

from app.main import create_app
from app.services.container import Services
from app.session import SessionStore


class FakeOpenAI:
    def __init__(self, reply: str = "Sure, tell me more."):
        self.reply = reply
        self.prompts: list[list[dict]] = []

    async def generate_response(self, history):
        self.prompts.append(list(history))
        return self.reply

    async def analyze_call(self, history, lead_name):
        return {}


class FakeMurf:
    def __init__(self, chunks=(b"chunk-a", b"chunk-b")):
        self.chunks = chunks
        self.calls: list[tuple] = []

    def create_audio_stream(self, text, voice_id, language="en-US", audio_format="WAV"):
        self.calls.append((text, voice_id, language, audio_format))
        for chunk in self.chunks:
            yield chunk


class SlowFakeMurf:
    """Yields one chunk, then blocks until the test releases it - used to
    make the barge-in test deterministic instead of racing a fast fake."""

    def __init__(self):
        self.release = threading.Event()
        self.calls: list[tuple] = []

    def create_audio_stream(self, text, voice_id, language="en-US", audio_format="WAV"):
        self.calls.append((text, voice_id, language, audio_format))
        yield b"chunk-a"
        self.release.wait(timeout=5)
        yield b"chunk-b"


class FakeWhisper:
    def __init__(self, transcript: str = "What does it cost?"):
        self.transcript = transcript
        self.calls: list[bytes] = []

    async def transcribe(self, wav_bytes: bytes) -> str:
        self.calls.append(wav_bytes)
        return self.transcript


class FakeSalesforce:
    enabled = True

    def sync_call_data(self, lead_data, analysis, transcript):
        return "00Q000000000000"

    def get_crm_data(self, agent_type=None):
        return []


class FakeEmail:
    enabled = True

    def send_followup(self, to_email, subject, body):
        pass


def build_services(murf, whisper=None) -> Services:
    return Services(
        openai=FakeOpenAI(),
        murf=murf,
        whisper=whisper or FakeWhisper(),
        salesforce=FakeSalesforce(),
        email=FakeEmail(),
        sessions=SessionStore(
            session_ttl=3600, session_max=100, audio_ttl=300, audio_max=100
        ),
    )


def _start_browser_session(client) -> str:
    response = client.post(
        "/api/phone/call", json={"lead_name": "Asha", "agent_type": "b2b"}
    )
    return response.json()["call_sid"]


def test_connecting_to_an_unknown_session_gets_an_error_then_closes():
    services = build_services(FakeMurf())
    app = create_app(services=services)

    with TestClient(app) as client:
        with client.websocket_connect("/api/ws/browser/does-not-exist") as ws:
            message = ws.receive_json()

    assert message == {"type": "error", "detail": "Session not found or expired"}


def test_a_full_turn_transcribes_replies_and_streams_audio_then_turn_end():
    services = build_services(FakeMurf())
    app = create_app(services=services)

    with TestClient(app) as client:
        session_id = _start_browser_session(client)

        with client.websocket_connect(f"/api/ws/browser/{session_id}") as ws:
            ws.send_bytes(b"\x00\x01" * 100)
            ws.send_json({"type": "utterance_end"})

            assert ws.receive_json() == {
                "type": "user_transcript",
                "text": "What does it cost?",
            }
            assert ws.receive_json() == {
                "type": "agent_reply",
                "text": "Sure, tell me more.",
            }
            assert ws.receive_bytes() == b"chunk-a"
            assert ws.receive_bytes() == b"chunk-b"
            assert ws.receive_json() == {"type": "turn_end"}

    assert services.whisper.calls
    assert services.openai.prompts[-1][-1] == {
        "role": "user",
        "content": "What does it cost?",
    }
    assert services.murf.calls[0][0] == "Sure, tell me more."
    assert services.murf.calls[0][3] == "PCM"


def test_an_empty_transcript_reports_an_error_instead_of_a_silent_turn():
    services = build_services(FakeMurf(), whisper=FakeWhisper(transcript=""))
    app = create_app(services=services)

    with TestClient(app) as client:
        session_id = _start_browser_session(client)

        with client.websocket_connect(f"/api/ws/browser/{session_id}") as ws:
            ws.send_bytes(b"\x00\x01")
            ws.send_json({"type": "utterance_end"})

            message = ws.receive_json()

    assert message == {"type": "error", "detail": "Didn't catch that - try again."}


def test_barge_in_cancels_the_in_flight_turn_before_it_finishes():
    slow_murf = SlowFakeMurf()
    services = build_services(slow_murf)
    app = create_app(services=services)

    with TestClient(app) as client:
        session_id = _start_browser_session(client)

        with client.websocket_connect(f"/api/ws/browser/{session_id}") as ws:
            ws.send_bytes(b"\x00\x01")
            ws.send_json({"type": "utterance_end"})

            assert ws.receive_json()["type"] == "user_transcript"
            assert ws.receive_json()["type"] == "agent_reply"
            assert ws.receive_bytes() == b"chunk-a"

            ws.send_json({"type": "cancel"})
            assert ws.receive_json() == {"type": "cancelled"}

    # Let the blocked generator thread finish so it doesn't leak past the test.
    slow_murf.release.set()
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest tests/test_browser_ws.py -v`
Expected: FAIL — `404 Not Found` / connection errors, since `/api/ws/browser/{session_id}` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `backend/app/routers/browser_ws.py`:

```python
"""Real-time browser conversation: the WebSocket turn loop.

Replaces the push-to-talk REST turn loop (POST /api/browser/chat) with a
persistent connection. The client runs voice activity detection locally and
sends one complete utterance at a time; this endpoint transcribes it, runs
it through the same persona/OpenAI pipeline as every other transport, and
streams the spoken reply back as it's synthesized.

Wire protocol, once connected:

Client -> server:
    binary frame                - the caller's utterance: raw 16kHz mono
                                   16-bit PCM, no header (see
                                   app/audio_utils.py)
    {"type": "utterance_end"}   - the audio just sent is a complete
                                   utterance; transcribe and reply to it
    {"type": "cancel"}          - the caller started speaking again while
                                   the agent's reply was still being
                                   generated or played; abandon it

Server -> client:
    {"type": "user_transcript", "text": "..."}  - what Whisper heard
    {"type": "agent_reply", "text": "..."}      - the model's reply, before
                                                   its audio starts arriving
    binary frames                - the reply's audio: raw PCM chunks, as
                                    Murf produces them (see
                                    MurfService.create_audio_stream's
                                    audio_format="PCM")
    {"type": "turn_end"}         - every chunk for this reply has been sent
    {"type": "cancelled"}        - acknowledges a cancel
    {"type": "error", "detail": "..."}  - the turn failed; the caller should
                                    just try speaking again
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, WebSocket
from starlette.concurrency import iterate_in_threadpool

from app.audio_utils import pcm_to_wav
from app.personas import DEFAULT_VOICE_ID
from app.services.container import Services, get_services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ws", tags=["realtime"])

SESSION_NOT_FOUND_CLOSE_CODE = 4404


@router.websocket("/browser/{session_id}")
async def browser_turn_loop(
    websocket: WebSocket,
    session_id: str,
    services: Services = Depends(get_services),
) -> None:
    await websocket.accept()

    metadata = services.sessions.metadata.get(session_id)
    if metadata is None:
        await websocket.send_json(
            {"type": "error", "detail": "Session not found or expired"}
        )
        await websocket.close(code=SESSION_NOT_FOUND_CLOSE_CODE)
        return

    voice_id = metadata.get("voice_id", DEFAULT_VOICE_ID)
    language = metadata.get("language", "en-IN")

    pcm_buffer = bytearray()
    current_turn: asyncio.Task | None = None

    while True:
        message = await websocket.receive()
        if message["type"] == "websocket.disconnect":
            break

        data = message.get("bytes")
        if data is not None:
            pcm_buffer.extend(data)
            continue

        text = message.get("text")
        if text is None:
            continue

        try:
            control = json.loads(text)
        except json.JSONDecodeError:
            continue

        control_type = control.get("type")

        if control_type == "utterance_end":
            if current_turn is not None and not current_turn.done():
                current_turn.cancel()
            pcm_bytes = bytes(pcm_buffer)
            pcm_buffer.clear()
            current_turn = asyncio.create_task(
                _run_turn(
                    websocket, services, session_id, voice_id, language, pcm_bytes
                )
            )
        elif control_type == "cancel":
            if current_turn is not None and not current_turn.done():
                current_turn.cancel()
            await websocket.send_json({"type": "cancelled"})

    if current_turn is not None and not current_turn.done():
        current_turn.cancel()


async def _run_turn(
    websocket: WebSocket,
    services: Services,
    session_id: str,
    voice_id: str,
    language: str,
    pcm_bytes: bytes,
) -> None:
    """Transcribe one utterance, get a reply, and stream it back as speech."""
    try:
        wav_bytes = pcm_to_wav(pcm_bytes)
        transcript = await services.whisper.transcribe(wav_bytes)

        if not transcript:
            await websocket.send_json(
                {"type": "error", "detail": "Didn't catch that - try again."}
            )
            return

        await websocket.send_json({"type": "user_transcript", "text": transcript})

        history = services.sessions.conversations.get(session_id, [])
        history = [*history, {"role": "user", "content": transcript}]
        reply = await services.openai.generate_response(history)
        history.append({"role": "assistant", "content": reply})
        services.sessions.conversations.set(session_id, history)

        await websocket.send_json({"type": "agent_reply", "text": reply})

        async for chunk in iterate_in_threadpool(
            services.murf.create_audio_stream(
                reply, voice_id, language, audio_format="PCM"
            )
        ):
            await websocket.send_bytes(chunk)

        await websocket.send_json({"type": "turn_end"})
    except asyncio.CancelledError:
        logger.info("Turn cancelled for session %s (barge-in)", session_id)
        raise
```

- [ ] **Step 4: Wire the router into the app**

In `backend/app/main.py`:

```python
from app.routers import audio, browser_ws, calls, crm, health, telephony
```

```python
    app.include_router(health.router)
    app.include_router(calls.router)
    app.include_router(telephony.router)
    app.include_router(audio.router)
    app.include_router(crm.router)
    app.include_router(browser_ws.router)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_browser_ws.py -v`
Expected: PASS, all four tests.

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && uv run pytest -q`
Expected: all tests pass (101 from Task 1 + 2 from Task 2 + 2 from Task 3 + 3 from Task 4 + 1 from Task 6 + 4 from this task = 113).

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/browser_ws.py backend/app/main.py backend/tests/test_browser_ws.py
git commit -m "feat(realtime): add the WebSocket turn loop for browser calls

VAD-driven (no push-to-talk), Whisper transcription per utterance, and
true cancellation of the in-flight OpenAI/Murf work on barge-in rather
than just discarding it client-side."
```

Backend is done and independently testable/deployable at this point — the frontend tasks below are what actually uses it.

---

## Task 8: Frontend — add `@ricky0123/vad-web`

**Files:**
- Modify: `voiceflowFrontend/package.json`

- [ ] **Step 1: Install**

Run: `cd voiceflowFrontend && npm install @ricky0123/vad-web@^0.0.31`
Expected: `package.json` and `package-lock.json` gain `@ricky0123/vad-web` and its dependency `onnxruntime-web`.

- [ ] **Step 2: Verify the build still works**

Run: `cd voiceflowFrontend && npm run build`
Expected: builds cleanly (this task adds a dependency but doesn't use it yet, so nothing should change functionally).

- [ ] **Step 3: Commit**

```bash
git add voiceflowFrontend/package.json voiceflowFrontend/package-lock.json
git commit -m "chore(frontend): add @ricky0123/vad-web for client-side voice detection"
```

---

## Task 9: Frontend — `RealtimeAudioPlayer` (gapless PCM playback)

**Files:**
- Create: `voiceflowFrontend/src/lib/realtimeAudioPlayer.ts`
- Test: `voiceflowFrontend/src/lib/realtimeAudioPlayer.test.ts`

**Interfaces:**
- Produces: `RealtimeAudioPlayer` class — `enqueue(pcm: Int16Array): void`, `stop(): void`. Constructor takes an `AudioContextLike` (a real `AudioContext` in the browser, a fake in tests).
- Produces: `AGENT_AUDIO_SAMPLE_RATE_HZ = 24_000` (must match `backend/app/services/murf_service.py`'s `SAMPLE_RATE_HZ`).

- [ ] **Step 1: Write the failing tests**

Create `voiceflowFrontend/src/lib/realtimeAudioPlayer.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  RealtimeAudioPlayer,
  type AudioContextLike,
} from "./realtimeAudioPlayer";

class FakeBufferSource {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  started: number[] = [];
  stopped = false;

  connect() {
    /* no-op */
  }

  start(when: number) {
    this.started.push(when);
  }

  stop() {
    this.stopped = true;
  }
}

function fakeContext(
  currentTime = 0,
): AudioContextLike & { sources: FakeBufferSource[] } {
  const sources: FakeBufferSource[] = [];
  return {
    currentTime,
    destination: {} as AudioDestinationNode,
    sources,
    createBuffer(_channels: number, length: number, sampleRate: number) {
      return {
        duration: length / sampleRate,
        getChannelData: () => new Float32Array(length),
      } as unknown as AudioBuffer;
    },
    createBufferSource() {
      const source = new FakeBufferSource();
      sources.push(source);
      return source as unknown as AudioBufferSourceNode;
    },
  };
}

describe("RealtimeAudioPlayer", () => {
  it("schedules the first chunk to start immediately", () => {
    const context = fakeContext(1.5);
    const player = new RealtimeAudioPlayer(context);

    player.enqueue(new Int16Array([0, 100, -100]));

    expect(context.sources[0].started).toEqual([1.5]);
  });

  it("schedules the second chunk right after the first ends, not at currentTime", () => {
    const context = fakeContext(0);
    const player = new RealtimeAudioPlayer(context);

    // 24000 samples at 24kHz = exactly 1 second of audio.
    player.enqueue(new Int16Array(24_000));
    player.enqueue(new Int16Array(12_000));

    expect(context.sources[0].started).toEqual([0]);
    expect(context.sources[1].started).toEqual([1]);
  });

  it("stop() halts every scheduled source and resets the queue clock", () => {
    const context = fakeContext(2);
    const player = new RealtimeAudioPlayer(context);
    player.enqueue(new Int16Array(24_000));

    player.stop();

    expect(context.sources[0].stopped).toBe(true);

    player.enqueue(new Int16Array(100));
    expect(context.sources[1].started).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd voiceflowFrontend && npx vitest run src/lib/realtimeAudioPlayer.test.ts`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `voiceflowFrontend/src/lib/realtimeAudioPlayer.ts`:

```typescript
/**
 * Gapless playback of raw 16-bit PCM chunks as they arrive over the
 * WebSocket, instead of waiting for a complete audio file. Chunks are
 * scheduled back-to-back on the Web Audio API's own clock, so there's no
 * gap between them even though each one is a separate buffer.
 */

// Must match backend/app/services/murf_service.py's SAMPLE_RATE_HZ - the
// backend requests raw PCM at this rate for the real-time path.
export const AGENT_AUDIO_SAMPLE_RATE_HZ = 24_000;

/** The subset of AudioContext this class needs - narrowed so tests can
 * supply a fake instead of a real one (jsdom has no Web Audio API). */
export interface AudioContextLike {
  currentTime: number;
  destination: AudioDestinationNode;
  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode;
}

export class RealtimeAudioPlayer {
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor(private readonly context: AudioContextLike) {}

  /** Queue one chunk of PCM samples to play right after whatever is
   * already queued - not necessarily right now. */
  enqueue(pcm: Int16Array): void {
    const buffer = this.context.createBuffer(
      1,
      pcm.length,
      AGENT_AUDIO_SAMPLE_RATE_HZ,
    );
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = pcm[i] / 32768;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    const startAt = Math.max(this.nextStartTime, this.context.currentTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
    };
  }

  /** Barge-in: stop everything queued or playing immediately. */
  stop(): void {
    for (const source of this.activeSources) {
      source.stop();
    }
    this.activeSources = [];
    this.nextStartTime = this.context.currentTime;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd voiceflowFrontend && npx vitest run src/lib/realtimeAudioPlayer.test.ts`
Expected: PASS, all three tests.

- [ ] **Step 5: Commit**

```bash
git add voiceflowFrontend/src/lib/realtimeAudioPlayer.ts voiceflowFrontend/src/lib/realtimeAudioPlayer.test.ts
git commit -m "feat(frontend): add RealtimeAudioPlayer for gapless PCM playback"
```

---

## Task 10: Frontend — `realtimeCall.ts` (WebSocket transport)

**Files:**
- Create: `voiceflowFrontend/src/lib/realtimeCall.ts`
- Test: `voiceflowFrontend/src/lib/realtimeCall.test.ts`

**Interfaces:**
- Produces: `toWebSocketUrl(httpBaseUrl: string): string` (pure), `realtimeCallUrl(sessionId: string): string`, `RealtimeServerMessage` type, `RealtimeCallClient` class with `sendUtterance(pcm: Int16Array)`, `cancel()`, `close()`.
- Consumed by: Task 11 (`useRealtimeVoiceCall`).

- [ ] **Step 1: Write the failing test**

Create `voiceflowFrontend/src/lib/realtimeCall.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { toWebSocketUrl } from "./realtimeCall";

describe("toWebSocketUrl", () => {
  it("turns http into ws", () => {
    expect(toWebSocketUrl("http://127.0.0.1:8000")).toBe(
      "ws://127.0.0.1:8000",
    );
  });

  it("turns https into wss", () => {
    expect(toWebSocketUrl("https://api.example.com")).toBe(
      "wss://api.example.com",
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd voiceflowFrontend && npx vitest run src/lib/realtimeCall.test.ts`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `voiceflowFrontend/src/lib/realtimeCall.ts`:

```typescript
/**
 * The real-time browser turn loop's WebSocket transport.
 *
 * Wraps the raw WebSocket in typed callbacks so callers don't parse frame
 * types themselves. Binary frames are the agent's synthesized speech (raw
 * PCM - see realtimeAudioPlayer.ts); text frames are JSON control messages.
 * Protocol matches backend/app/routers/browser_ws.py's module docstring.
 */

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

/** http(s):// -> ws(s):// - same host, same port, different scheme. */
export function toWebSocketUrl(httpBaseUrl: string): string {
  return httpBaseUrl.replace(/^http/, "ws");
}

export function realtimeCallUrl(sessionId: string): string {
  return `${toWebSocketUrl(BASE_URL)}/api/ws/browser/${encodeURIComponent(sessionId)}`;
}

export type RealtimeServerMessage =
  | { type: "user_transcript"; text: string }
  | { type: "agent_reply"; text: string }
  | { type: "turn_end" }
  | { type: "cancelled" }
  | { type: "error"; detail: string };

export interface RealtimeCallHandlers {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onServerMessage: (message: RealtimeServerMessage) => void;
  onClose: () => void;
}

export class RealtimeCallClient {
  private readonly socket: WebSocket;

  constructor(sessionId: string, handlers: RealtimeCallHandlers) {
    this.socket = new WebSocket(realtimeCallUrl(sessionId));
    this.socket.binaryType = "arraybuffer";

    this.socket.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        handlers.onAudioChunk(event.data);
      } else {
        handlers.onServerMessage(
          JSON.parse(event.data as string) as RealtimeServerMessage,
        );
      }
    };
    this.socket.onclose = () => handlers.onClose();
  }

  private send(data: ArrayBufferLike | string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data as ArrayBuffer);
    }
  }

  /** Send one complete utterance: the audio, then the end-of-utterance
   * marker that tells the backend to transcribe and reply to it. */
  sendUtterance(pcm: Int16Array): void {
    this.send(pcm.buffer);
    this.send(JSON.stringify({ type: "utterance_end" }));
  }

  /** Barge-in: abandon whatever reply is currently in flight. */
  cancel(): void {
    this.send(JSON.stringify({ type: "cancel" }));
  }

  close(): void {
    this.socket.close();
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd voiceflowFrontend && npx vitest run src/lib/realtimeCall.test.ts`
Expected: PASS, both tests.

- [ ] **Step 5: Commit**

```bash
git add voiceflowFrontend/src/lib/realtimeCall.ts voiceflowFrontend/src/lib/realtimeCall.test.ts
git commit -m "feat(frontend): add the real-time WebSocket transport client"
```

---

## Task 11: Frontend — `useRealtimeVoiceCall` hook

Integration glue: VAD + WebSocket client + audio player, combined into the turn-taking state machine. No automated test — this depends on `getUserMedia`, `AudioContext`, and `AudioWorklet`, none of which exist in the jsdom test environment, and CLAUDE.md is explicit that browser-API integration like this is verified by running the dev server in a real browser, not simulated in vitest.

**Files:**
- Create: `voiceflowFrontend/src/hooks/useRealtimeVoiceCall.ts`

**Interfaces:**
- Consumes: `RealtimeAudioPlayer` (Task 9), `RealtimeCallClient`, `RealtimeServerMessage` (Task 10).
- Produces: `useRealtimeVoiceCall({ sessionId, onError }) -> { state, messages }`, where `state` is `"connecting" | "listening" | "speaking" | "agent_speaking"` and `messages` is `{ id: string; role: "user" | "agent"; text: string }[]`.
- Consumed by: Task 12 (`LiveCallInterface.tsx`).

- [ ] **Step 1: Before writing this, check the installed library's actual API**

`@ricky0123/vad-web`'s exact export names and callback options can drift between versions. Before writing the code below, read `voiceflowFrontend/node_modules/@ricky0123/vad-web/dist/index.d.ts` (installed in Task 8) and confirm: the export is `MicVAD` with a static `.new(options)` returning a promise of an object with `.start()`/`.destroy()`, and the options include `onSpeechStart: () => void` and `onSpeechEnd: (audio: Float32Array) => void`. If anything differs, adjust the code below to match what's actually installed rather than what's written here.

- [ ] **Step 2: Write the implementation**

Create `voiceflowFrontend/src/hooks/useRealtimeVoiceCall.ts`:

```typescript
import { useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";

import { RealtimeAudioPlayer } from "@/lib/realtimeAudioPlayer";
import {
  RealtimeCallClient,
  type RealtimeServerMessage,
} from "@/lib/realtimeCall";

export type RealtimeCallState =
  | "connecting"
  | "listening"
  | "speaking"
  | "agent_speaking";

export interface RealtimeMessage {
  id: string;
  role: "user" | "agent";
  text: string;
}

interface UseRealtimeVoiceCallOptions {
  sessionId: string;
  /** Called once the greeting has finished and it's safe to start
   * listening - the caller controls when that is. */
  enabled: boolean;
  onError: (message: string) => void;
}

let messageCounter = 0;
const nextId = () => `rm${++messageCounter}`;

/** Float32 samples in [-1, 1] -> 16-bit signed PCM, matching what
 * backend/app/audio_utils.py expects. */
function floatTo16BitPCM(audio: Float32Array): Int16Array {
  const pcm = new Int16Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    const sample = Math.max(-1, Math.min(1, audio[i]));
    pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return pcm;
}

/**
 * Drives one browser call's turn loop: continuous voice-activity detection,
 * a persistent WebSocket to the backend, and gapless playback of the
 * agent's streamed reply - with barge-in, so speaking over the agent
 * interrupts it instead of queuing behind it.
 */
export function useRealtimeVoiceCall({
  sessionId,
  enabled,
  onError,
}: UseRealtimeVoiceCallOptions) {
  const [state, setState] = useState<RealtimeCallState>("connecting");
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const isAgentSpeakingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const audioContext = new AudioContext();
    const player = new RealtimeAudioPlayer(audioContext);

    const client = new RealtimeCallClient(sessionId, {
      onAudioChunk: (chunk) => {
        isAgentSpeakingRef.current = true;
        setState("agent_speaking");
        player.enqueue(new Int16Array(chunk));
      },
      onServerMessage: (message: RealtimeServerMessage) => {
        if (message.type === "user_transcript") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "user", text: message.text },
          ]);
        } else if (message.type === "agent_reply") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "agent", text: message.text },
          ]);
        } else if (message.type === "turn_end") {
          isAgentSpeakingRef.current = false;
          setState("listening");
        } else if (message.type === "error") {
          isAgentSpeakingRef.current = false;
          onError(message.detail);
          setState("listening");
        }
        // "cancelled" needs no UI reaction - the barge-in already stopped
        // playback locally the moment speech was detected.
      },
      onClose: () => {
        if (!cancelled) onError("The connection to the agent was lost.");
      },
    });

    let vad: Awaited<ReturnType<typeof MicVAD.new>> | null = null;

    MicVAD.new({
      onSpeechStart: () => {
        if (isAgentSpeakingRef.current) {
          player.stop();
          isAgentSpeakingRef.current = false;
          client.cancel();
        }
        setState("speaking");
      },
      onSpeechEnd: (audio: Float32Array) => {
        client.sendUtterance(floatTo16BitPCM(audio));
        setState("listening");
      },
    })
      .then((instance) => {
        if (cancelled) {
          instance.destroy();
          return;
        }
        vad = instance;
        vad.start();
        setState("listening");
      })
      .catch(() => {
        onError("Microphone access is needed for a live conversation.");
      });

    return () => {
      cancelled = true;
      vad?.destroy();
      client.close();
      player.stop();
      void audioContext.close();
    };
  }, [sessionId, enabled, onError]);

  return { state, messages };
}
```

- [ ] **Step 3: Manual verification (no automated test)**

This is checked by Task 12's manual verification step, once the hook is actually wired into a real page — verifying the hook in isolation without a UI to drive it isn't meaningful. Don't skip Task 12's browser check.

- [ ] **Step 4: Commit**

```bash
git add voiceflowFrontend/src/hooks/useRealtimeVoiceCall.ts
git commit -m "feat(frontend): add useRealtimeVoiceCall (VAD + WS + playback)"
```

---

## Task 12: Frontend — rewrite `LiveCallInterface.tsx`

**Files:**
- Modify: `voiceflowFrontend/src/components/call/LiveCallInterface.tsx`

**Interfaces:**
- Consumes: `useRealtimeVoiceCall` (Task 11).
- Produces: same external props as before (`session`, `onEnded`) — `voiceflowFrontend/src/pages/agent/AgentTest.tsx` needs no changes.

- [ ] **Step 1: Replace the component**

Replace the entire contents of `voiceflowFrontend/src/components/call/LiveCallInterface.tsx`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, PhoneOff, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, describeError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRealtimeVoiceCall } from "@/hooks/useRealtimeVoiceCall";

interface LiveCallInterfaceProps {
  session: {
    call_sid: string;
    greeting: string;
    greeting_audio_url: string | null;
    lead_name: string;
    language?: string;
  };
  /** Called once the post-call pipeline has been handed off. */
  onEnded?: () => void;
}

type Phase = "greeting" | "live" | "ended";

const STATE_LABEL: Record<string, string> = {
  connecting: "Connecting",
  listening: "Listening",
  speaking: "You're speaking",
  agent_speaking: "Agent speaking",
};

export function LiveCallInterface({
  session,
  onEnded,
}: LiveCallInterfaceProps) {
  const [phase, setPhase] = useState<Phase>("greeting");
  const [error, setError] = useState<string | null>(null);
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const handleError = useCallback((message: string) => setError(message), []);

  const { state, messages } = useRealtimeVoiceCall({
    sessionId: session.call_sid,
    enabled: phase === "live",
    onError: handleError,
  });

  // Play the greeting once, then switch into the live turn loop.
  useEffect(() => {
    if (!session.greeting_audio_url) {
      setPhase("live");
      return;
    }
    const audio = new Audio(session.greeting_audio_url);
    greetingAudioRef.current = audio;
    audio.onended = () => setPhase("live");
    audio.onerror = () => {
      setError("The greeting could not be played, starting the call anyway.");
      setPhase("live");
    };
    audio.play().catch(() => {
      setError("Playback was blocked - tap anywhere to start the call.");
    });

    return () => audio.pause();
    // Intentionally session-scoped: re-running would replay the greeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.call_sid]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const endCall = async () => {
    greetingAudioRef.current?.pause();
    setPhase("ended");
    setError(null);

    try {
      await api.endCall(session.call_sid);
    } catch (cause) {
      setError(
        `The call ended, but the follow-up could not be started: ${describeError(cause)}`,
      );
    }
    onEnded?.();
  };

  const displayState = phase === "greeting" ? "agent_speaking" : phase === "ended" ? "ended" : state;
  const isLive = phase !== "ended";

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Controls */}
      <div className="panel flex flex-col items-center p-6">
        <div className="mb-6 flex w-full items-center gap-2">
          <span
            className={cn(
              "status-dot",
              displayState === "listening" && "bg-live animate-on-air",
              displayState === "agent_speaking" && "bg-primary",
              displayState === "speaking" && "bg-live",
              displayState === "connecting" && "bg-muted-foreground",
              displayState === "ended" && "bg-border",
            )}
          />
          <span className="label-caps" aria-live="polite">
            {phase === "ended" ? "Call ended" : STATE_LABEL[displayState]}
          </span>
        </div>

        <div
          className={cn(
            "mb-6 flex h-24 w-24 items-center justify-center rounded-full border transition-colors",
            displayState === "agent_speaking"
              ? "border-primary/40 bg-primary/10"
              : "border-border bg-muted",
          )}
        >
          {phase === "connecting" ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Volume2
              className={cn(
                "h-8 w-8",
                displayState === "agent_speaking"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
          )}
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={endCall}
          disabled={!isLive}
          aria-label="End the call"
        >
          <PhoneOff />
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {phase === "ended"
            ? "Scoring and CRM sync are running in the background"
            : "Just talk - no button needed. You can interrupt the agent."}
        </p>
      </div>

      {/* Transcript */}
      <div className="panel flex h-[28rem] flex-col p-4">
        <h2 className="label-caps mb-3">
          Transcript &middot;{" "}
          <span className="font-mono normal-case">
            {session.call_sid.slice(0, 8)}
          </span>
        </h2>

        {error && (
          <p
            className="mb-3 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-md px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted",
                )}
              >
                <span className="label-caps mb-0.5 block opacity-70">
                  {message.role === "user" ? session.lead_name : "Agent"}
                </span>
                {message.text}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd voiceflowFrontend && npx tsc -b --force`
Expected: no new type errors. Fix any that surface from the rewrite before continuing.

- [ ] **Step 3: Lint**

Run: `cd voiceflowFrontend && npm run lint`
Expected: no new lint errors (the removed `MicOff`/`Mic` icon imports and the old `Message`/`CallState` types are gone with the old code, so nothing should be left dangling).

- [ ] **Step 4: Manual verification in a real browser - this is the real test**

1. `cd backend && uv run uvicorn app.main:app --reload` (needs the WDAC blocker resolved)
2. `cd voiceflowFrontend && npm run dev`
3. Open the app, start a browser-mode call (either agent type).
4. Confirm: the greeting plays, then the mic starts listening **with no button to press**.
5. Speak a sentence, stop - confirm the agent replies without you pressing anything, and the transcript panel shows both your transcribed line and the agent's reply.
6. While the agent is talking, start speaking over it - confirm playback stops immediately and your new utterance is what gets a reply (barge-in).
7. Test a Hindi-language call end-to-end and confirm the greeting itself is now in Hindi (Task 1's fix).
8. Check the browser console for any errors from `@ricky0123/vad-web` (wasm/model loading, since it fetches its model from a CDN by default - if this is flaky, note it as a follow-up to self-host the model assets rather than silently ignoring it).

Do not report this task complete without actually doing this - CLAUDE.md is explicit that a UI change isn't verified until it's been used in a real browser.

- [ ] **Step 5: Update the "browser needs a Chromium browser / Web Speech API" copy**

In `voiceflowFrontend/src/pages/agent/AgentTest.tsx`, the aside currently says:

```
Browser mode needs microphone access and speech recognition, which
currently means a Chromium-based browser.
```

This is still roughly true (VAD/WebSocket audio works broadly, but is best-tested on Chromium) - leave as-is unless manual testing in Step 4 finds a specific browser that doesn't work, in which case update this line to say so honestly.

- [ ] **Step 6: Run the full frontend check suite**

Run: `cd voiceflowFrontend && npm run lint && npx tsc -b --force && npm run test && npm run build`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add voiceflowFrontend/src/components/call/LiveCallInterface.tsx
git commit -m "feat(frontend): replace push-to-talk with real-time VAD turn-taking

No mic button, no send button - the agent listens continuously and
replies as soon as you stop talking, and you can interrupt it mid-
sentence. Uses useRealtimeVoiceCall (Silero VAD + WebSocket + gapless
Web Audio playback) instead of the browser's native Web Speech API."
```

---

## After this plan

- Update `CLAUDE.md`'s architecture/testing sections and the test-count baseline (backend: 113 after this plan; frontend: 25 existing + 5 new = 30) once everything above is green.
- `docs/architecture.md`'s "What is deliberately absent" section currently lists "Barge-in" as absent for phone calls specifically (browser mode's old absence isn't separately called out there) - worth a pass to reflect that browser mode now has it, and that phone calls are the next target via Twilio Media Streams.
- Bringing the same experience to real Twilio calls (Media Streams) is explicit follow-up work per the design doc's non-goals, not part of this plan.
