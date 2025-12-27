import os
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseModel):
    # Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY","")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT","")
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME","")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION","2023-05-15")

    # Murf AI configuration
    MURF_API_KEY: str = os.getenv("MURF_API_KEY","")

    # Twilio 
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID","")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN","")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER","")

    # Application 
    BASE_URL: str = os.getenv("BASE_URL","http://localhost:8000")

    # Salesforce
    SALESFORCE_USERNAME: str = os.getenv("SALESFORCE_USERNAME", "")
    SALESFORCE_PASSWORD: str = os.getenv("SALESFORCE_PASSWORD", "")
    SALESFORCE_TOKEN: str = os.getenv("SALESFORCE_TOKEN", "")
    SALESFORCE_DOMAIN: str = os.getenv("SALESFORCE_DOMAIN", "login")

    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
settings = Settings()
