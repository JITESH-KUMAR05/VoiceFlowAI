"""Create the nine custom Lead fields this project depends on.

Run once against a fresh Salesforce org (after signup, or after an org gets
wiped and recreated — which is exactly why this script exists rather than a
one-time manual walkthrough). Idempotent: fields that already exist are
skipped rather than re-created or errored on, so it's safe to re-run.

Usage (from backend/, with a real .env in place):
    uv run python scripts/setup_salesforce_fields.py
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from simple_salesforce import Salesforce  # noqa: E402

from app.config import Settings  # noqa: E402

# Long Text Area fields require visibleLines; 5 is Salesforce's own default
# for a modestly sized text block. The transcript field needs the maximum
# length Salesforce allows for this type, matching MAX_TRANSCRIPT_CHARS in
# salesforce_service.py.
LONG_TEXT_AREA_MAX_LENGTH = 131_072
DEFAULT_VISIBLE_LINES = 5

FIELDS: list[dict] = [
    {
        "fullName": "Lead.AI_Lead_Score__c",
        "label": "AI Lead Score",
        "type": "Number",
        "precision": 3,
        "scale": 0,
    },
    {
        "fullName": "Lead.AI_Sentiment__c",
        "label": "AI Sentiment",
        "type": "Picklist",
        "picklist_values": ["Interested", "Neutral", "Not Interested", "Angry"],
    },
    {
        "fullName": "Lead.AI_Summary__c",
        "label": "AI Summary",
        "type": "LongTextArea",
        "length": 32_768,
        "visibleLines": DEFAULT_VISIBLE_LINES,
    },
    {
        "fullName": "Lead.AI_Transcript__c",
        "label": "AI Transcript",
        "type": "LongTextArea",
        "length": LONG_TEXT_AREA_MAX_LENGTH,
        "visibleLines": 10,
    },
    {
        "fullName": "Lead.Client_Company_Type__c",
        "label": "Client Company Type",
        "type": "Text",
        "length": 255,
    },
    {
        "fullName": "Lead.Client_Lifestyle__c",
        "label": "Client Lifestyle",
        "type": "LongTextArea",
        "length": 32_768,
        "visibleLines": DEFAULT_VISIBLE_LINES,
    },
    {
        "fullName": "Lead.Key_Pain_Points__c",
        "label": "Key Pain Points",
        "type": "LongTextArea",
        "length": 32_768,
        "visibleLines": DEFAULT_VISIBLE_LINES,
    },
    {
        "fullName": "Lead.Agent_Conversion_Verdict__c",
        "label": "Agent Conversion Verdict",
        "type": "LongTextArea",
        "length": 32_768,
        "visibleLines": DEFAULT_VISIBLE_LINES,
    },
    {
        "fullName": "Lead.Last_AI_Call__c",
        "label": "Last AI Call",
        "type": "DateTime",
    },
]


def build_custom_field(sf: Salesforce, spec: dict):
    """Turn one field spec into the zeep object the Metadata API expects."""
    kwargs = {k: v for k, v in spec.items() if k != "picklist_values"}

    if spec["type"] == "Picklist":
        values = [
            sf.mdapi.CustomValue(fullName=value, default=False, label=value)
            for value in spec["picklist_values"]
        ]
        kwargs["valueSet"] = sf.mdapi.ValueSet(
            valueSetDefinition=sf.mdapi.ValueSetValuesDefinition(
                sorted=False, value=values
            )
        )

    return sf.mdapi.CustomField(**kwargs)


def existing_lead_field_names(sf: Salesforce) -> set[str]:
    describe = sf.Lead.describe()
    return {field["name"] for field in describe["fields"]}


def main() -> int:
    settings = Settings()
    if not settings.salesforce_configured:
        print("SALESFORCE_USERNAME / SALESFORCE_PASSWORD not set in .env.")
        return 1

    # Two genuinely different login modes: OAuth Client Credentials Flow
    # (consumer key + secret only, authenticating as the app's configured
    # "Run As" user) or the legacy SOAP username+password+token login.
    # See SalesforceService._login_kwargs for the same logic in the app
    # itself, and why Client Credentials rather than OAuth's password grant:
    # newer orgs increasingly disable password-based login outright, a
    # restriction that doesn't apply to a flow with no password in it.
    if settings.salesforce_oauth_configured:
        sf = Salesforce(
            consumer_key=settings.SALESFORCE_CONSUMER_KEY,
            consumer_secret=settings.SALESFORCE_CONSUMER_SECRET,
            domain=settings.SALESFORCE_DOMAIN,
        )
        print("Connected via OAuth Client Credentials Flow")
    else:
        sf = Salesforce(
            username=settings.SALESFORCE_USERNAME,
            password=settings.SALESFORCE_PASSWORD,
            security_token=settings.SALESFORCE_TOKEN,
            domain=settings.SALESFORCE_DOMAIN,
        )
        print(f"Connected via SOAP login as {settings.SALESFORCE_USERNAME}")

    already_there = existing_lead_field_names(sf)

    to_create = []
    for spec in FIELDS:
        api_name = spec["fullName"].split(".", 1)[1]
        if api_name in already_there:
            print(f"  skip   {api_name} (already exists)")
        else:
            to_create.append(spec)

    if not to_create:
        print("\nAll nine fields already exist. Nothing to do.")
        return 0

    print(f"\nCreating {len(to_create)} field(s)...")
    failures = []
    for spec in to_create:
        api_name = spec["fullName"].split(".", 1)[1]
        try:
            sf.mdapi.CustomField.create([build_custom_field(sf, spec)])
            print(f"  created {api_name}")
        except Exception as error:  # noqa: BLE001 - report and continue
            print(f"  FAILED  {api_name}: {error}")
            failures.append(api_name)

    if failures:
        print(f"\n{len(failures)} field(s) failed: {', '.join(failures)}")
        return 1

    print("\nDone. Verify with: uv run pytest tests_integration/test_salesforce_live.py -v")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
