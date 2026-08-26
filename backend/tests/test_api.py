"""HTTP contract for the API.

Providers are replaced with fakes at the service boundary, so these run with
no network and no credentials.
"""

from __future__ import annotations

import pytest
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
        return {
            "sentiment_score": 82,
            "sentiment_label": "Interested",
            "summary": "Asked about pricing.",
            "email_body": "Thanks for your time.",
        }


class FakeMurf:
    def create_audio_stream(self, text, voice_id, language="en-US"):
        yield b"RIFF-fake-wav-bytes"


class FakeTwilio:
    configured = True

    def __init__(self):
        self.calls: list[str] = []

    def initiate_call(self, to_number: str) -> str:
        self.calls.append(to_number)
        return "CA" + "1" * 32

    def create_response(self, audio_url, language="en-IN") -> str:
        play = f"<Play>{audio_url}</Play>" if audio_url else ""
        return f"<Response>{play}<Gather/></Response>"

    def is_valid_request(self, url, form, signature) -> bool:
        return signature == "valid-signature"


class FakeSalesforce:
    enabled = True

    def __init__(self, rows=None):
        self.rows = rows if rows is not None else []
        self.synced: list[tuple] = []

    def sync_call_data(self, lead_data, analysis, transcript):
        self.synced.append((lead_data, analysis, transcript))
        return "00Q000000000000"

    def get_crm_data(self, agent_type=None):
        return self.rows


class FakeEmail:
    enabled = True

    def __init__(self):
        self.sent: list[tuple] = []

    def send_followup(self, to_email, subject, body):
        self.sent.append((to_email, subject, body))


@pytest.fixture
def services():
    return Services(
        openai=FakeOpenAI(),
        murf=FakeMurf(),
        twilio=FakeTwilio(),
        salesforce=FakeSalesforce(),
        email=FakeEmail(),
        sessions=SessionStore(
            session_ttl=3600, session_max=100, audio_ttl=300, audio_max=100
        ),
    )


@pytest.fixture
def client(services):
    app = create_app(services=services)
    with TestClient(app) as test_client:
        yield test_client


# --- Health -----------------------------------------------------------------


def test_health_reports_which_providers_are_configured(client):
    body = client.get("/health").json()

    assert body["status"] == "ok"
    assert set(body["providers"]) >= {"twilio", "salesforce", "email"}


# --- Starting a call --------------------------------------------------------


def test_browser_mode_returns_a_greeting_and_playable_audio_url(client):
    response = client.post(
        "/api/phone/call",
        json={"lead_name": "Asha", "agent_type": "real-estate"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "Asha" in body["greeting"]
    assert body["greeting_audio_url"].startswith("http")
    assert body["call_sid"]


def test_browser_mode_does_not_place_a_phone_call(client, services):
    client.post("/api/phone/call", json={"lead_name": "Asha", "agent_type": "b2b"})

    assert services.twilio.calls == []


def test_supplying_a_phone_number_places_a_call(client, services):
    response = client.post(
        "/api/phone/call",
        json={
            "lead_name": "Asha",
            "agent_type": "b2b",
            "phone_number": "+15551234567",
        },
    )

    assert services.twilio.calls == ["+15551234567"]
    assert response.json()["status"] == "call_initiated"


def test_a_malformed_phone_number_is_rejected(client):
    response = client.post(
        "/api/phone/call",
        json={"lead_name": "Asha", "agent_type": "b2b", "phone_number": "not-a-number"},
    )

    assert response.status_code == 422


def test_a_missing_lead_name_is_rejected(client):
    response = client.post("/api/phone/call", json={"agent_type": "b2b"})

    assert response.status_code == 422


# --- Browser conversation ---------------------------------------------------


def test_the_reply_continues_the_session_history(client, services):
    started = client.post(
        "/api/phone/call", json={"lead_name": "Asha", "agent_type": "b2b"}
    ).json()

    response = client.post(
        "/api/browser/chat",
        json={"session_id": started["call_sid"], "message": "What does it cost?"},
    )

    assert response.status_code == 200
    assert response.json()["text"] == "Sure, tell me more."
    # System prompt, then the caller turn.
    last_prompt = services.openai.prompts[-1]
    assert last_prompt[0]["role"] == "system"
    assert last_prompt[-1] == {"role": "user", "content": "What does it cost?"}


def test_chatting_on_an_unknown_session_is_a_404(client):
    response = client.post(
        "/api/browser/chat",
        json={"session_id": "does-not-exist", "message": "hello"},
    )

    assert response.status_code == 404


# --- Audio streaming --------------------------------------------------------


def test_an_unknown_audio_request_is_a_404(client):
    assert client.get("/api/audio/stream/no-such-id").status_code == 404


def test_a_greeting_audio_url_streams_wav_bytes(client):
    started = client.post(
        "/api/phone/call", json={"lead_name": "Asha", "agent_type": "b2b"}
    ).json()
    path = started["greeting_audio_url"].split("/api/")[1]

    response = client.get(f"/api/{path}")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/")
    assert response.content == b"RIFF-fake-wav-bytes"


# --- Twilio webhooks --------------------------------------------------------


def test_an_unsigned_twilio_webhook_is_rejected(client):
    response = client.post(
        "/api/phone/twiml/start", data={"CallSid": "CA" + "1" * 32}
    )

    assert response.status_code == 403


def test_a_forged_twilio_signature_is_rejected(client):
    response = client.post(
        "/api/phone/twiml/start",
        data={"CallSid": "CA" + "1" * 32},
        headers={"X-Twilio-Signature": "forged"},
    )

    assert response.status_code == 403


def test_a_correctly_signed_webhook_returns_twiml(client):
    response = client.post(
        "/api/phone/twiml/start",
        data={"CallSid": "CA" + "1" * 32},
        headers={"X-Twilio-Signature": "valid-signature"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert "<Response>" in response.text


# --- CRM --------------------------------------------------------------------


def test_crm_leads_are_returned_from_salesforce(client, services):
    services.salesforce.rows = [{"id": "00Q1", "name": "Asha", "score": 74}]

    body = client.get("/api/crm/leads").json()

    assert body == [{"id": "00Q1", "name": "Asha", "score": 74}]


def test_crm_returns_an_empty_list_when_salesforce_is_unavailable(client, services):
    services.salesforce.rows = []

    assert client.get("/api/crm/leads").json() == []


# --- CORS -------------------------------------------------------------------


def test_cors_does_not_allow_every_origin(client):
    response = client.get("/health", headers={"Origin": "https://evil.example"})

    assert response.headers.get("access-control-allow-origin") != "*"
