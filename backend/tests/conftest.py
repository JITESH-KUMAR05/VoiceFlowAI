import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

# Every provider credential is set to a syntactically valid dummy before any
# application module is imported. Tests must never reach the network, and an
# import-time provider connection would do exactly that.
os.environ.update(
    {
        "AZURE_OPENAI_API_KEY": "test-key",
        "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com/",
        "AZURE_OPENAI_DEPLOYMENT_NAME": "gpt-4o",
        "AZURE_OPENAI_API_VERSION": "2024-12-01-preview",
        "MURF_API_KEY": "test-murf-key",
        "TWILIO_ACCOUNT_SID": "AC" + "0" * 32,
        "TWILIO_AUTH_TOKEN": "test-twilio-token",
        "TWILIO_PHONE_NUMBER": "+15550000000",
        "BASE_URL": "https://test.example.com",
        "CORS_ORIGINS": "http://localhost:8080",
        "SALESFORCE_USERNAME": "",
        "SMTP_USERNAME": "",
    }
)
