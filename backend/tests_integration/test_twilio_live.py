"""Twilio credential and number checks. No call is placed here.

initiate_call() is deliberately not exercised: calling it would ring a real
phone number and spend real call minutes. What's checkable without doing
that is whether the account SID and auth token actually authenticate, and
whether TWILIO_PHONE_NUMBER is a number this account actually owns - a
typo'd number is the single most common way this integration silently fails,
since Twilio would otherwise only report it when a real call attempt errors.
"""

from __future__ import annotations

from twilio.rest import Client

from app.config import Settings


def test_the_account_credentials_authenticate(require_twilio: Settings):
    client = Client(require_twilio.TWILIO_ACCOUNT_SID, require_twilio.TWILIO_AUTH_TOKEN)

    account = client.api.accounts(require_twilio.TWILIO_ACCOUNT_SID).fetch()

    assert account.status == "active"


def test_the_configured_number_belongs_to_this_account(require_twilio: Settings):
    client = Client(require_twilio.TWILIO_ACCOUNT_SID, require_twilio.TWILIO_AUTH_TOKEN)

    owned = client.incoming_phone_numbers.list(
        phone_number=require_twilio.TWILIO_PHONE_NUMBER, limit=1
    )

    assert owned, (
        f"{require_twilio.TWILIO_PHONE_NUMBER} is not an incoming number on "
        "this Twilio account - initiate_call would fail with this configured"
    )
