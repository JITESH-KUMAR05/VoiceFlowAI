# VoiceFlow AI

[![CI](https://github.com/JITESH-KUMAR05/VoiceFlowAI/actions/workflows/ci.yml/badge.svg)](https://github.com/JITESH-KUMAR05/VoiceFlowAI/actions/workflows/ci.yml)

An outbound voice agent. It places a real phone call, holds a consultative
sales conversation, scores the lead against fixed criteria, and writes the
result to Salesforce with a drafted follow-up email.

Two agent personas ship — B2B SaaS qualification and real-estate lead
qualification. Both run the same pipeline and differ only in system prompt,
greeting, and voice.

Built as a final-year project. It is a working demo, not a product, and the
[limitations](#limitations) below are real ones rather than a disclaimer.

---

## How a call runs

```
EVERY TURN
  caller speaks
      └─> Twilio            speech recognition, posts to the webhook
            └─> FastAPI     appends to session history
                  └─> Azure OpenAI (gpt-4o)     the reply
                        └─> Murf                streamed WAV
                              └─> back to the caller, playing as it arrives

ONCE, ON HANGUP  (background task)
  transcript
      └─> Azure OpenAI      weighted 0-100 score, summary, drafted email
            ├─> Salesforce  Lead custom fields + a call Task
            ├─> SMTP        follow-up email to the lead
            └─> local JSON  development record
```

Without a phone number the same pipeline runs in the browser: same prompt,
same model, same synthesis, different transport. That is how the project is
demonstrated without spending call credit.

## Stack

| Component     | Role                                          |
| ------------- | --------------------------------------------- |
| FastAPI       | Session state, webhooks, audio streaming      |
| Twilio        | Outbound PSTN calls and speech recognition    |
| Azure OpenAI  | In-call replies and post-call scoring         |
| Murf          | Streamed text-to-speech, six Indian locales   |
| Salesforce    | Lead records and call activity                |
| React + Vite  | Operations console                            |

---

## Setup

### 1. Salesforce custom fields

The sync writes to custom fields on the **Lead** object. Create them under
`Setup > Object Manager > Lead > Fields & Relationships` before running:

| Field label              | API name                      | Type                                                        |
| ------------------------ | ----------------------------- | ----------------------------------------------------------- |
| AI Lead Score            | `AI_Lead_Score__c`            | Number (3,0)                                                |
| AI Sentiment             | `AI_Sentiment__c`             | Picklist — Interested, Neutral, Not Interested, Angry        |
| AI Summary               | `AI_Summary__c`               | Long Text Area                                              |
| AI Transcript            | `AI_Transcript__c`            | Long Text Area                                              |
| Client Company Type      | `Client_Company_Type__c`      | Text (255)                                                  |
| Client Lifestyle         | `Client_Lifestyle__c`         | Long Text Area                                              |
| Key Pain Points          | `Key_Pain_Points__c`          | Long Text Area                                              |
| Agent Conversion Verdict | `Agent_Conversion_Verdict__c` | Long Text Area                                              |
| Last AI Call             | `Last_AI_Call__c`             | Date/Time                                                   |

If a field is missing the sync logs it and still writes the call Task, so the
outcome is recorded either way.

### 2. Backend

Requires Python 3.12+.

```sh
cd backend
uv sync                       # or: pip install -r requirements.txt
cp .env.example .env          # fill in the keys below
uv run uvicorn app.main:app --reload
```

**Required:** `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`,
`AZURE_OPENAI_DEPLOYMENT_NAME`, `MURF_API_KEY`. The app refuses to start
without them.

**Optional:** Twilio, Salesforce and SMTP. Leave them blank and the service
still starts — browser mode runs the whole conversation, and each missing
provider is skipped with a log line. `GET /health` reports which are
configured.

API docs at `http://localhost:8000/docs`.

### 3. Frontend

Requires Node 18+.

```sh
cd voiceflowFrontend
npm install
cp .env.example .env          # VITE_API_BASE_URL, default http://localhost:8000
npm run dev                   # http://localhost:8080
```

### 4. Taking real phone calls

Twilio reaches the webhooks from the internet, so the backend needs a public
address:

```sh
ngrok http 8000
# put the HTTPS URL in BASE_URL, then restart the backend
```

Webhooks are rejected unless the Twilio signature verifies. When testing the
telephony routes without a tunnel, set `VERIFY_TWILIO_SIGNATURE=false` —
locally only.

---

## Tests

```sh
cd backend && uv run pytest          # 79 tests, no network, no credentials
```

Providers are faked at the service boundary. Coverage targets the logic that
belongs to this project rather than to a vendor SDK: persona and prompt
construction, the scoring contract, session eviction, webhook signature
rejection, SOQL escaping, settings validation, the post-call pipeline's
failure isolation, and the HTTP contract of every route.

Frontend:

```sh
cd voiceflowFrontend
npm run lint             # 0 errors
npx tsc -b                # 0 type errors, strict mode
npm run test              # 25 tests — lib/api.ts, lib/status.ts, useLeads.ts
npm run format:check
npm run build
```

Both suites run in CI on every push and pull request, alongside a scan that
fails the build on a tracked `.env`, tracked call records, or a
credential-shaped string anywhere in the tree.

**Live integration tests**, against real Azure OpenAI, Murf, and Salesforce
(never a real phone call), live in `backend/tests_integration/` — excluded
from CI and from a bare `pytest` by `testpaths`. Run them manually once
credentials are in:

```sh
cd backend && uv run pytest tests_integration -v
```

See [`backend/tests_integration/README.md`](backend/tests_integration/README.md)
for what each one costs and how cleanup works.

**Manual QA**: [`docs/manual-test-checklist.md`](docs/manual-test-checklist.md)
covers what neither suite can — audio quality, real telephony, both themes
across every page, and browser failure paths (denied mic, blocked autoplay,
a backend that goes down mid-call).

---

## Design decisions

Covered in full in [docs/architecture.md](docs/architecture.md). In short:

- **Speech is streamed, not rendered.** Murf audio is forwarded chunk by chunk
  rather than written to a file and then served. Waiting for a complete WAV
  adds the whole synthesis time to every turn, and on a phone call that is
  audible silence.
- **Sessions are in-process and bounded.** A TTL cache, not a database. Fast
  and right-sized for a demo; the cost is that it pins the service to one
  worker.
- **Scoring uses fixed weights.** The prompt states what each criterion is
  worth and the result is validated against a schema before it reaches
  Salesforce, because an unprompted score drifts between calls.
- **Webhooks are signature-verified.** They have to be publicly reachable, so
  authenticity comes from Twilio's request signature.

## Limitations

Deliberate scope choices, not oversights.

- **Sessions do not survive a restart** and the service cannot run more than
  one worker — a webhook may land on a worker that does not hold the session.
  Redis is the fix.
- **No authentication.** Twilio webhooks are signature-verified; nothing else
  is. There are no user accounts and no tenancy.
- **Local call records are a JSON file**, rewritten whole per call and unsafe
  under concurrent writers. Nothing reads it back.
- **Salesforce sync is best-effort** — three attempts, then the failure is
  logged and dropped rather than queued.
- **The post-call pipeline isn't durable.** Scoring, Salesforce sync and the
  follow-up email run as a FastAPI `BackgroundTask` — in-process, in-memory.
  If the server is killed between the webhook response and the task
  finishing, that call's outcome is silently lost; nothing retries it. A
  durable queue (Celery, RQ, or similar) is the fix.
- **Browser mode needs Chromium.** It relies on the Web Speech API, which is
  not a standard.
- **No call recording or barge-in.** The agent finishes its sentence before it
  listens again.

## Repository layout

```
backend/
  app/
    main.py         app factory, CORS, routers, lifespan
    config.py       settings, validated at startup
    personas.py     voice table and prompt construction
    session.py      TTL- and size-bounded conversation stores
    post_call.py    scoring, Salesforce sync, follow-up, local record
    routers/        HTTP surface
    services/       one class per external provider
  tests/            pytest, no network

voiceflowFrontend/
  src/
    lib/api.ts      every backend call
    pages/agent/    screens, parameterised by agent
    components/     feature components and shadcn primitives
```

Working conventions for this repository are in [CLAUDE.md](CLAUDE.md).
