# VoiceFlow AI — Real-Time Browser Conversation Design

**Date:** 2026-09-18
**Status:** Approved

## Problem

Browser mode does not feel like a conversation. `LiveCallInterface.tsx` uses
the browser's native Web Speech API with `continuous = false`: the caller
presses a mic button to start listening, speaks, then presses a second button
to send what was heard. There is no way to interrupt the agent mid-sentence,
and Web Speech API's transcription quality is noticeably worse than a
dedicated STT model. `docs/architecture.md` already names this gap under
"What is deliberately absent": *"The agent finishes its sentence before
listening again. Real interruption handling needs bidirectional streaming —
… a different architecture from request/response."*

Separately, but found in the same pass: the greeting line in
`app/personas.py` is a hardcoded English string in both personas regardless
of the caller's chosen language — only the system prompt used for turns
*after* the greeting is language-aware.

This design covers browser mode only. Real phone calls currently use
Twilio's `<Gather input="speech">`, which already has server-side ASR and no
button — a real but separate gap (no barge-in there either, since audio is
played fully before listening resumes). Bringing this same real-time
experience to Twilio calls is explicit follow-up work, built once this proves
out in the browser, via Twilio Media Streams (a WebSocket-based transport) —
not part of this design.

## Goals

- No push-to-talk button: the system detects when the caller starts and
  stops speaking.
- The caller can interrupt the agent mid-sentence and be heard immediately.
- Transcription quality measurably better than the browser's native
  recognizer.
- Fix the hardcoded-English-greeting bug.
- Keep the existing REST session lifecycle (`POST /api/phone/call`,
  `POST /api/browser/end`) — this replaces the turn loop only.

## Non-goals

- Twilio phone calls. Out of scope for this pass; the architecture is chosen
  so it transfers, not so it's built twice.
- WebRTC. Considered and rejected for now — lower latency and built-in
  jitter buffering, but SDP negotiation and likely a STUN/TURN server is real
  complexity this project doesn't need yet. WebSocket + raw PCM chunks is
  sufficient for a browser tab on a normal connection.
- True streaming partial-transcript ASR (word-by-word as the caller speaks).
  Considered — it's what Azure OpenAI's Realtime API and dedicated streaming
  STT services (Azure Speech, Deepgram) provide — but adopting it means
  either the GPT-Realtime speech-to-speech rearchitecture already decided
  against ("for now use MURF only as native languages are needed"), or a new
  Azure resource (Azure Speech is a separate product from Azure OpenAI).
  Batch transcription per detected utterance, on top of a real-time
  transport, gets the actual goals (no button, low perceived latency,
  barge-in) without either cost.

## Prior art

Checked `github.com/topics/murf-api` for existing Murf-based projects to
learn from — mostly small hackathon projects (highest is 7 stars), none
doing real-time streaming conversation or barge-in. Not useful as reference.

The broader pattern here (client-side VAD + persistent duplex transport +
server-side cancellation on interrupt) matches how production voice-agent
frameworks are built (Pipecat, LiveKit Agents) — corroboration that this is
the standard shape for the problem, not a reason to adopt either framework
wholesale; both are architecturally invasive relative to this project's
existing FastAPI service-per-provider structure.

## Architecture

```
Browser                                    Backend
┌─────────────────────────┐                ┌──────────────────────────┐
│ Silero VAD (continuous)  │                │                          │
│   │ speech detected       │                │                          │
│   ▼                       │   WS: PCM      │  WS router               │
│ mic → PCM chunks ─────────┼───chunks──────▶│  accumulate per-utterance│
│                           │                │  on speech-end:          │
│                           │                │    → WhisperService      │
│                           │                │    → OpenAIService       │
│                           │                │    → MurfService (stream)│
│ Web Audio playback queue  │◀──WS: audio────┤  push TTS chunks as      │
│   (gapless PCM playback)  │    chunks      │  they're synthesized     │
│                           │                │                          │
│ VAD fires during playback │   WS: cancel   │  cancel current turn's   │
│  → stop playback,         │───────────────▶│  in-flight OpenAI/Murf   │
│    send cancel             │                │  generator, start new   │
└─────────────────────────┘                └──────────────────────────┘
```

**Session start is unchanged**: `POST /api/phone/call` still returns
`session_id`, greeting text, and greeting audio URL exactly as today. Once
the greeting finishes, the client opens a WebSocket to
`/api/ws/browser/{session_id}` for the live turn loop. `POST /api/browser/end`
still ends the session and kicks off the post-call pipeline.

### Turn loop

1. Silero VAD runs continuously on the mic (client-side, via
   `@ricky0123/vad-web`). Silence sends nothing — no audio leaves the browser
   until real speech is detected.
2. On speech start, the client streams 16kHz mono 16-bit PCM chunks over the
   WebSocket as they're captured.
3. On speech end (VAD-detected silence), the backend has already received
   most of the utterance; it wraps the accumulated PCM in a WAV header
   (Whisper's endpoint needs a real audio file, not headerless PCM — the
   curl test that confirmed `whisper1` works used a `.wav`) and sends it to
   `WhisperService`.
4. The transcript goes through the existing persona/OpenAI pipeline
   (`services.openai.generate_response`), unchanged.
5. The reply text streams into `MurfService.create_audio_stream` as today,
   but chunks are pushed over the WebSocket as they're synthesized instead of
   being fetched via the `/api/audio/stream/{id}` polling URL.
6. The client plays chunks through a Web Audio API queue for gapless
   playback (`new Audio(url)` doesn't handle incrementally-arriving raw PCM).

### Barge-in

VAD keeps running on the mic during agent playback, not just while
"listening." If it fires while a reply is still being synthesized or played:

- Client stops local playback immediately and sends `{"type": "cancel"}`.
- Backend cancels the in-flight turn: both `generate_response` and
  `create_audio_stream` are async generators/iterators, so cancelling means
  stopping consumption of them via a per-connection cancellation token (an
  `asyncio.Event` checked between yields, or `asyncio.Task.cancel()` on the
  task driving the turn) — not a special API, just not letting the
  in-progress work finish once nobody will hear it. This avoids paying for
  OpenAI tokens and Murf synthesis on a reply that gets thrown away.
- The new utterance the caller just started becomes the next turn.

## Components

**Backend (new)**
- `app/routers/browser_ws.py` — the WebSocket endpoint. Parses incoming PCM
  frames and control messages, drives the turn loop, pushes audio chunks
  back. No business logic beyond what the existing routers already avoid
  having — delegates to services.
- `app/services/whisper_service.py` — one class, same shape as the other
  providers in `app/services/`. Wraps the Azure OpenAI transcription call.
- Small per-connection turn state (current utterance buffer, cancellation
  token) — lives in the WS connection handler, not `SessionStore` (that
  still holds conversation history and metadata as it does today).

**Frontend (new)**
- A VAD hook wrapping `@ricky0123/vad-web`.
- A WebSocket client for the turn loop.
- A Web Audio playback queue for incoming TTS chunks.
- `LiveCallInterface.tsx` rewritten around this instead of the
  button/Web-Speech-API flow it has today.

**Also in this pass**: fix the hardcoded English greeting in
`app/personas.py`'s `build_agent_profile` — both personas' `greeting` field
needs to vary by `language` the same way the system prompt already does.

## Error handling

- Mic permission denied, or the browser lacks WebSocket/AudioWorklet
  support: surface a clear error state, matching how `LiveCallInterface.tsx`
  already reports "playback was blocked" and unsupported-recognition cases
  today. (Correction from an earlier draft of this section: there is no
  typed-text fallback in the current component to preserve — the existing
  code only ever showed warning banners, never a text input — so this is a
  clear error message, not a fallback input mode.)
- WebSocket disconnects mid-call: surface an error and let the caller
  retry rather than silently hanging in "listening" state forever.
- Whisper fails on one utterance: tell the caller to repeat rather than
  losing the turn with no feedback, consistent with how `MurfService`
  already treats a failed turn as recoverable rather than fatal.

## Testing

No network, no credentials, same as the rest of the suite — providers faked
at the service boundary. FastAPI's `TestClient` supports `websocket_connect`
for synchronous WebSocket testing, so this fits the existing test style
without a new test framework. Blocked, as of this design's approval, on a
Windows Application Control policy refusing to run this machine's project
venv (`uv run` fails); the tests can be written regardless, just not run
until that's resolved.
