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


def main():
    print("Hello from backend!")


if __name__ == "__main__":
    main()
