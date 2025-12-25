"""
    Main Backend Application
    - Initializes FastAPI app
    - loads config
    - sets up Routes
"""

from fastapi import FastAPI, Request, Form , BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn
import os
import json
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

    # 2. Define Persona based on agent_type
    if request.agent_type == "real_estate":
        # Real Estate Persona
        system_prompt = (
            f"You are a professional Real Estate Assistant named Sarah. "
            f"You are calling {request.lead_name}. "
            "Your goal is to qualify the lead for a property investment. "
            "Ask about their budget, preferred location (e.g., Mumbai, Bangalore), and timeline. "
            "Keep your responses short, polite, and conversational."
        )
        greeting = f"Hello {request.lead_name}, this is Sarah calling regarding your property inquiry. Is this a good time to talk?"
    
    else:
        # Default: B2B Sales Persona
        system_prompt = (
            f"You are a B2B Sales Representative named Alex from VoiceFlow. "
            f"You are calling {request.lead_name} from {request.lead_company or 'their company'}. "
            "Your goal is to schedule a quick demo for our AI phone agent solution. "
            "Highlight features like ultra-low latency and human-like voices. "
            "Keep your responses concise (under 2 sentences) and persuasive."
        )
        greeting = f"Hi {request.lead_name}, this is Alex from VoiceFlow. I noticed you were interested in AI solutions. Do you have a minute?"
    
    conversations[call_id] = [{"role": "system", "content": system_prompt}]
    call_metadata[call_id] = {"greeting": greeting, "agent_type": request.agent_type}
    
    return {
        "status": "initiated", 
        "call_sid": call_id, 
        "agent": request.agent_type
    }
    
# 2. Twilio Start Webhook (Called when customer answers)
@app.post("/api/phone/twiml/start")
async def call_start(CallSid: str = Form(...)):
    # 1. Retrieve the specific greeting for this call
    metadata = call_metadata.get(CallSid, {})
    greeting_text = metadata.get("greeting", "Hello! I am calling from VoiceFlow.")
    
    # 2. Add greeting to history so AI knows it spoke
    if CallSid in conversations:
        conversations[CallSid].append({"role": "assistant", "content": greeting_text})
    
    # 3. Generate Audio URL directly from Murf (Fastest method)
    audio_url = murf_service.generate_audio_url(greeting_text)
    
    # 4. Return TwiML to play audio
    xml_response = twilio_service.create_response(audio_url)
    return Response(content=xml_response, media_type="application/xml")

# 3. Process Speech Webhook (Called when customer speaks)
@app.post("/api/phone/twiml/process")
async def process_speech(CallSid: str = Form(...), SpeechResult: str = Form(None)):
    # If silence, just listen again
    if not SpeechResult:
        return Response(content=twilio_service.create_response(None), media_type="application/xml")

    # 1. Update History with User Speech
    history = conversations.get(CallSid, [])
    history.append({"role": "user", "content": SpeechResult})
    
    # 2. Get Smart Response from OpenAI
    ai_text = await openai_service.generate_response(history)
    
    # 3. Update History with AI Response
    history.append({"role": "assistant", "content": ai_text})
    conversations[CallSid] = history 
    
    # 4. Generate Audio URL from Murf
    audio_url = murf_service.generate_audio_url(ai_text)
    
    # 5. Return TwiML
    xml_response = twilio_service.create_response(audio_url)
    return Response(content=xml_response, media_type="application/xml")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)