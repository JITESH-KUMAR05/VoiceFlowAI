"""
    Main Backend Application
    - Initializes FastAPI app
    - loads config
    - sets up Routes
"""

from fastapi import FastAPI, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn
from dotenv import load_dotenv



from config import Settings
from models.Schemas import InitiateCallRequest
from services.twilio_service import TwilioService
from services.openai_service import OpenAIService
from services.murf_service import MurfService

load_dotenv()

app = FastAPI(title="VoiceFlow AI Agent")

# Initialize Services
twilio_service = TwilioService()
openai_service = OpenAIService()
murf_service = MurfService()

# In-memory storing conversation histories for simplicity
conversations = {}

call_metadata = {}

# CORS -> Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"Status": "Backend is running", "Service": "VoiceFlow AI Agent"}

# 1. Initiate Call Endpoint
@app.post("/api/phone/call")
async def initiate_call(request: InitiateCallRequest):
    call_id = twilio_service.initiate_call(request.phone_number)

    system
    


if __name__ == "__main__":
    uvicorn.run("main:app",host="0.0.0.0", port=8000, reload=True)
