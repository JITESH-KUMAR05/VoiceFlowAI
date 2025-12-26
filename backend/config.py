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
    MURFAI_API_KEY: str = os.getenv("MURF_API_KEY","")

    # Twilio 
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID","")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN","")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER","")

    # Application 
    BASE_URL: str = os.getenv("BASE_URL","http://localhost:8000")
settings = Settings()
