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
from datetime import datetime



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


@app.post("/api/phone/call")
async def initiate_call(request: InitiateCallRequest):
    # 1. Initiate Call
    call_sid = twilio_service.initiate_call(request.phone_number)

    # 2. Construct Context from Frontend Data
    details_text = ""
    if request.details:
        # Converts {budget: "50k", location: "Mumbai"} -> "Budget: 50k, Location: Mumbai"
        details_text = ", ".join([f"{k.replace('_', ' ').title()}: {v}" for k, v in request.details.items() if v])

    # 3. Define Persona & Inject Context
    if request.agent_type == "real_estate":
        system_prompt = (
            f"You are Sarah, a Real Estate Assistant calling {request.lead_name}. "
            f"Context: {details_text}. "
            "Your goal: Qualify them for a property. "
            "If they provided a budget/location, confirm it. If not, ask for it. "
            "Keep responses under 2 sentences. Be polite and professional."
        )
        greeting = f"Hello {request.lead_name}, this is Sarah. I received your inquiry regarding property in {request.details.get('location', 'our area')}. Is this a good time?"
    else:
        system_prompt = (
            f"You are Alex, a B2B Sales Rep calling {request.lead_name} from {request.lead_company or 'their company'}. "
            f"Context: {details_text}. "
            "Your goal: Book a demo for our AI agent. "
            "Keep responses under 2 sentences. Be persuasive."
        )
        greeting = f"Hi {request.lead_name}, this is Alex from VoiceFlow. Do you have a minute?"

    # 4. Store in RAM (Instant)
    conversations[call_sid] = [{"role": "system", "content": system_prompt}]
    call_metadata[call_sid] = {
        "greeting": greeting, 
        "agent_type": request.agent_type,
        "start_time": datetime.now().isoformat(),
        "lead_data": request.dict()
    }
    
    return {"status": "initiated", "call_sid": call_sid}

@app.post("/api/phone/twiml/start")
async def call_start(CallSid: str = Form(...)):
    metadata = call_metadata.get(CallSid, {})
    greeting_text = metadata.get("greeting", "Hello.")
    
    if CallSid in conversations:
        conversations[CallSid].append({"role": "assistant", "content": greeting_text})
    
    audio_url = murf_service.generate_audio_url(greeting_text)
    return Response(content=twilio_service.create_response(audio_url), media_type="application/xml")

@app.post("/api/phone/twiml/process")
async def process_speech(CallSid: str = Form(...), SpeechResult: str = Form(None)):
    if not SpeechResult:
        return Response(content=twilio_service.create_response(None), media_type="application/xml")

    # 1. Update RAM History (Instant)
    history = conversations.get(CallSid, [])
    history.append({"role": "user", "content": SpeechResult})
    
    # 2. Get AI Response
    ai_text = await openai_service.generate_response(history)
    
    # 3. Update RAM History (Instant)
    history.append({"role": "assistant", "content": ai_text})
    conversations[CallSid] = history 
    
    # 4. Generate Audio
    audio_url = murf_service.generate_audio_url(ai_text)
    
    return Response(content=twilio_service.create_response(audio_url), media_type="application/xml")

# --- Handle End of Call ---
@app.post("/api/phone/status")
async def call_status(CallSid: str = Form(...), CallStatus: str = Form(...)):
    """
    Twilio calls this when the call ends (completed, busy, failed).
    This is where we do the heavy lifting: Saving to DB/File.
    """
    if CallStatus in ['completed', 'failed', 'busy', 'no-answer']:
        print(f"Call {CallSid} ended: {CallStatus}")
        
        # 1. Get Data
        history = conversations.pop(CallSid, []) # Remove from RAM
        metadata = call_metadata.pop(CallSid, {}) # Remove from RAM
        
        if not history:
            return
            
        # 2. Prepare Record
        record = {
            "call_id": CallSid,
            "status": CallStatus,
            "agent_type": metadata.get("agent_type"),
            "lead_data": metadata.get("lead_data"),
            "conversation": history,
            "timestamp": datetime.now().isoformat()
        }
        
        # 3. Save to JSON File (Simulating DB)
        filename = f"database/{metadata.get('agent_type', 'general')}_records.json"
        os.makedirs("database", exist_ok=True)
        
        # Append to list in file (Simple implementation)
        try:
            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    data = json.load(f)
            else:
                data = []
            
            data.append(record)
            
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
                
            print(f"Saved record to {filename}")
        except Exception as e:
            print(f"Error saving record: {e}")

    return {"status": "ok"}