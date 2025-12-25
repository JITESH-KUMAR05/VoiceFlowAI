"""
    Main Backend Application
    - Initializes FastAPI app
    - loads config
    - sets up Routes
"""

from fastapi import FastAPI, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv
import os

load_dotenv()

from config import Settings
from models.Schemas import InitiateCallRequest

app = FastAPI(title="VoiceFlow AI Agent")

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

# Placeholder for additional routes and logic
@app.post("/api/phone/call")
async def initiate_call(request: InitiateCallRequest):
    """
    Endpoint to start an outbound call
    
    """

    # twilio logic will come here

    return {
        "status": "Call initiated",
        "message": f"calling {request.lead_name} at {request.lead_phone_number}...",
        "agent": request.agent_type
    }
    


if __name__ == "__main__":
    uvicorn.run("main:app",host="0.0.0.0", port=8000, reload=True)
