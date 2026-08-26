# Architecture

How VoiceFlow is put together, and why. This document exists to be argued
with — each decision is stated with the cost it carries, not only the benefit.

## The problem shape

A voice agent is a latency problem wearing an LLM costume.

In a text chat, a second of thinking is invisible. On a phone call it is dead
air, and dead air makes the caller talk over the agent, which corrupts the next
turn's speech recognition, which corrupts the reply. Everything below follows
from trying to keep one turn short.

A turn costs, roughly:

```
caller stops speaking
  → Twilio finalises the transcript      (Twilio's, not ours)
  → webhook to our API                   network
  → gpt-4o generates a reply             ~600-900 ms observed
  → Murf synthesises speech              the part we control
  → audio reaches the caller
```

The model call is largely fixed — a shorter reply is the only real lever, which
is why the system prompts say "keep replies under two sentences" and
`max_tokens` is capped at 150. Synthesis is where the design choice lives.

## Decision: stream speech instead of rendering it

**What.** `MurfService.create_audio_stream` returns a generator. The audio
route wraps it in a `StreamingResponse` and forwards chunks as they arrive.
Nothing is written to disk.

**Why.** The obvious implementation synthesises to a WAV file, saves it under
`/static`, and hands Twilio the URL. That serialises two waits: synthesise
*fully*, then begin playing. Streaming overlaps them, so playback starts after
the first chunk rather than the last. For a two-sentence reply that is the
difference between a natural pause and a conspicuous one.

**Cost.** Errors get worse. A failure partway through a stream cannot become a
clean 500 — the response has already begun — so it truncates a sentence
instead. `create_audio_stream` catches and logs mid-stream failures and stops
yielding; the caller hears a cut-off sentence and the conversation continues.
That is the right failure for a phone call, but it is a real downgrade from an
atomic response.

**What this replaced.** The seven `.wav` files that used to sit in
`backend/static/audio/` are artifacts of the earlier file-based version.

## Decision: sessions in process memory, bounded twice

**What.** `app/session.py` holds three `TTLCache` instances — conversation
history, call metadata, pending audio requests. Entries expire on a TTL and the
oldest is evicted when the cache is full.

**Why bounded.** The original code used plain module-level dicts. Entries were
removed only when a call ended cleanly, so an abandoned browser session or a
status webhook that never arrived leaked its transcript for the life of the
process. Under any real traffic that is an unbounded memory leak holding
personal data.

Why *two* bounds rather than one: a TTL alone still permits unbounded growth
inside the TTL window, and a size cap alone keeps dead sessions alive
indefinitely when traffic is light. Audio requests get a much shorter TTL —
five minutes against an hour — because a stream URL is fetched seconds after it
is issued, so anything older is certainly dead.

**Cost, and it is the significant one.** State is per-process. The service
cannot run more than one worker: Twilio load-balances webhooks across workers,
and a worker that does not hold the session cannot continue the call. A restart
drops every call in flight.

**Why not fix it.** Moving to Redis is maybe an hour of work and would remove
the limitation entirely. It is not done because the project is deployed as a
single process for demonstration, and adding a stateful dependency to a demo
that does not need one is its own kind of overengineering. The tradeoff is
recorded here rather than hidden.

## Decision: score against stated weights, then validate

**What.** The analysis prompt in `openai_service.py` enumerates what each
criterion is worth — a booked demo is 30 points, confirmed budget or authority
20, engaged tone 20, stated pain points 15, correct audience 15. The reply is
requested as JSON and parsed into the `CallAnalysis` model before use.

**Why weights.** Asking a model to "rate this lead 0-100" produces a number
that drifts between calls and cannot be defended to anyone. Publishing the
rubric makes two calls comparable and makes a score explainable to the
salesperson looking at it: 65 means specific things were and were not present.

**Why validate.** The model is not trusted to honour the contract. Without
validation, a missing key or a score of 150 would flow into
`AI_Lead_Score__c` — a Number(3,0) — and fail at the Salesforce boundary,
during a background task, after the call has ended. `CallAnalysis` clamps the
score to 0-100 and supplies neutral defaults for anything absent, so a bad
analysis degrades the record instead of losing it.

**Cost.** The weights are asserted, not calibrated. They were chosen because
they are reasonable, not because they were validated against outcomes — there
is no outcome data. The bands (70 / 40) match
`salesforce_service.sentiment_for_score` and the frontend's `scoreColor`, and
those three have to be changed together.

## Decision: verify Twilio's signature

**What.** `verify_twilio_signature` is a dependency on all three telephony
routes. It recomputes Twilio's HMAC over the full request URL and posted form
using the account auth token, and returns 403 on a mismatch or a missing
header.

**Why.** These routes cannot be authenticated conventionally: Twilio calls them
from the internet with no session and no bearer token. Before this check, the
tunnel URL *was* the credential. Anyone who found it — and ngrok URLs turn up
in logs, screenshots, and browser history — could POST a `CallSid` and drive
the call flow, spending model and synthesis credit on someone else's behalf.

**Cost.** Local testing of telephony routes needs a real signature, which is
awkward. `VERIFY_TWILIO_SIGNATURE=false` exists for that, which is itself a
risk: an env var that disables authentication is a foot-gun if it reaches a
deployment. It is documented as local-only and defaults to on.

## Decision: blocking providers run in a worker thread

**What.** `post_call.py` pushes Salesforce and SMTP calls through
`anyio.to_thread.run_sync`.

**Why.** `simple-salesforce` and `smtplib` are synchronous. They were being
called directly from an `async def`, which blocks the event loop for the whole
duration — and `sync_call_data` retries three times with a two-second sleep
between attempts. A single failing sync stalled *every other call on the
server* for six seconds plus network time. This is the classic async bug and it
does not show up until something is slow.

**Cost.** Thread-pool slots are finite. Under enough concurrent hangups the
pool becomes the bottleneck. A task queue is the real answer at volume.

## Decision: one app factory, services injected

**What.** `create_app(settings=None, services=None)` builds the FastAPI app.
Routers reach providers through a `Services` container resolved by dependency
injection.

**Why.** The original built each service at module import as a global, which
made the backend untestable in the strict sense — importing `main` opened a
Salesforce connection. It also meant an expired Salesforce password stopped the
entire API from starting, even though nothing else depended on it. The 35 tests
exist because the app can now be constructed with fakes.

**Cost.** More indirection to read through. Following a request means passing
through the container rather than seeing `openai_service` at the top of the
file.

## What is deliberately absent

- **Authentication and tenancy.** Every endpoint except the Twilio webhooks is
  open. Adding real auth is not hard; pretending a demo has it would be
  dishonest, and it is out of scope.
- **Barge-in.** The agent finishes its sentence before listening again. Real
  interruption handling needs bidirectional streaming — Twilio Media Streams
  over a WebSocket — which is a different architecture from request/response
  TwiML.
- **A datastore.** Call records are appended to a JSON file, rewritten whole,
  unsafe under concurrent writers, and read by nothing. It is a debugging
  convenience and is labelled as one.
- **Call recording.** Never enabled. Recording someone requires consent that
  this project has no mechanism to collect.

## Data handling

Transcripts contain whatever the caller said, and lead records contain names,
email addresses and phone numbers. `backend/database/` and
`backend/static/audio/` are gitignored, and `.env` has never been committed.

An earlier version of this repository did commit call records containing third
parties' contact details. They were removed from the working tree and from git
history with `git-filter-repo`. Anything resembling real contact data belongs
in neither.
