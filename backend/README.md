# VoiceFlow AI — Backend

FastAPI service behind the voice agent. Places outbound calls through Twilio,
runs the conversation on Azure OpenAI, speaks with streamed Murf synthesis, and
syncs the scored result to Salesforce.

## Running

```sh
uv sync
cp .env.example .env          # fill in at least the Azure OpenAI and Murf keys
uv run uvicorn app.main:app --reload
```

Interactive API docs at `http://localhost:8000/docs`.

Only Azure OpenAI and Murf are required. Twilio, Salesforce and SMTP are
optional — without them the service starts and browser mode runs the full
pipeline, which is how the project is demonstrated without a provisioned
number. `GET /health` reports which providers this instance has credentials
for.

### Taking real calls

Twilio reaches the webhooks from the internet, so the service needs a public
address:

```sh
ngrok http 8000
# put the HTTPS URL in BASE_URL, then restart
```

Webhook requests are signature-checked against the Twilio auth token. If you
are testing the telephony routes without a tunnel, set
`VERIFY_TWILIO_SIGNATURE=false` — locally only, never in a deployment.

## Tests

```sh
uv run pytest
```

No network and no credentials: providers are faked at the service boundary, and
`tests/conftest.py` sets dummy environment values before any app module is
imported.

## Layout

| Path                  | Responsibility                                        |
| --------------------- | ----------------------------------------------------- |
| `app/main.py`         | App factory, CORS, router registration, lifespan       |
| `app/config.py`       | Settings, validated at startup                         |
| `app/personas.py`     | Voice table and prompt construction                    |
| `app/session.py`      | TTL- and size-bounded conversation and audio stores    |
| `app/post_call.py`    | Scoring, Salesforce sync, follow-up email, local record |
| `app/routers/`        | HTTP surface — parse, delegate, shape the response      |
| `app/services/`       | One class per external provider                        |
| `app/models/schemas.py` | Request and response models                          |

Routers hold no business logic, and services never import from routers.

## Call flow

```
POST /api/phone/call
  └─ build persona + prompt
     ├─ phone_number given ──> Twilio dials ──> POST /api/phone/twiml/start
     │                                            └─ <Play> audio stream URL
     │                                               <Gather> caller speech
     │                                                 └─ POST /twiml/process
     │                                                    (loops per turn)
     └─ no phone_number ─────> browser session
                                 └─ POST /api/browser/chat (loops per turn)

call ends ──> POST /api/phone/status  (or /api/browser/end)
                └─ background: score ──> Salesforce ──> follow-up email
                                                    └─> local JSON record
```

## Known limitations

These are deliberate scope choices for a demo, not oversights.

- **Sessions live in process memory.** Restarting drops in-flight calls, and
  running more than one worker breaks them, because a webhook may land on a
  worker that does not hold the session. Redis is the fix.
- **No authentication.** Every endpoint is public. The Twilio webhooks are
  signature-verified; nothing else is.
- **Local records are a JSON file.** Rewritten whole on each call and unsafe
  under concurrent writers. Nothing reads it back — it is a development
  convenience.
- **Salesforce sync is best-effort.** Three attempts, then the call is logged
  and dropped rather than queued for retry.
