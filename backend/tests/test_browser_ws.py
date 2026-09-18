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
