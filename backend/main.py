"""
    Main Backend Application
    - Initializes FastAPI app
    - Loads config
    - Sets up Routes
    - Handles Phone & Browser Agents
"""

from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn
import os
import json
import uuid
from dotenv import load_dotenv
from datetime import datetime

from config import settings
from models.Schemas import InitiateCallRequest, BrowserChatRequest
from services.twilio_service import TwilioService
from services.openai_service import OpenAIService
from services.murf_service import MurfService

load_dotenv()

app = FastAPI(title="VoiceFlow AI Agent")

# Initialize Services
twilio_service = TwilioService()
openai_service = OpenAIService()
murf_service = MurfService()

# In-memory storage
conversations = {}
call_metadata = {}

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

# 1. Unified Initiate Endpoint (Phone + Browser)
@app.post("/api/phone/call")
async def initiate_call(request: InitiateCallRequest):
    session_id = str(uuid.uuid4())
    status = "browser_session_started"
    greeting_audio_url = None

    # A. Construct Context
    details_text = ""
    if request.details:
        details_text = ", ".join([f"{k.replace('_', ' ').title()}: {v}" for k, v in request.details.items() if v])

    # B. Define Persona & Greeting
    lang_instruction = f"You are speaking in {request.language}."
    
    if request.agent_type == "real_estate":
        system_prompt = (
            f"You are Sarah, a Real Estate Assistant calling {request.lead_name}. "
            f"{lang_instruction} "
            f"Context: {details_text}. "
            "Your goal: Qualify them for a property. "
            "Keep responses under 2 sentences. Be polite and professional."
        )
        greeting = f"Hello {request.lead_name}, this is Sarah. I received your inquiry regarding property in {request.details.get('location', 'our area')}. Is this a good time?"
    else:
        system_prompt = (
            f"You are Alex, a B2B Sales Rep calling {request.lead_name} from {request.lead_company or 'their company'}. "
            f"{lang_instruction} "
            f"Context: {details_text}. "
            "Your goal: Book a demo for our AI agent. "
            "Keep responses under 2 sentences. Be persuasive."
        )
        greeting = f"Hi {request.lead_name}, this is Alex from VoiceFlow. Do you have a minute?"

    # C. Handle Modes
    if request.phone_number:
        # --- PHONE MODE ---
        session_id = twilio_service.initiate_call(request.phone_number)
        status = "call_initiated"
    else:
        # --- BROWSER MODE ---
        # Generate greeting audio immediately so the browser can play it
        greeting_audio_url = murf_service.generate_audio_url(greeting, voice_id=request.voice_id)

    # D. Store in RAM
    conversations[session_id] = [{"role": "system", "content": system_prompt}]
    call_metadata[session_id] = {
        "greeting": greeting, 
        "agent_type": request.agent_type,
        "language": request.language,
        "voice_id": request.voice_id,
        "start_time": datetime.now().isoformat(),
        "lead_data": request.dict()
    }
    
    return {
        "status": status, 
        "call_sid": session_id, 
        "greeting": greeting,
        "greeting_audio_url": greeting_audio_url # Frontend plays this on load
    }
# --- BROWSER TESTING ROUTES ---

@app.post("/api/browser/chat")
async def browser_chat(request: BrowserChatRequest):
    """
    Endpoint for Browser-based testing (No Twilio).
    Frontend sends text -> Backend returns AI Text + Audio URL.
    """
    sid = request.session_id
    
    # 1. Update History
    history = conversations.get(sid, [])
    history.append({"role": "user", "content": request.message})
    
    # 2. Get AI Response
    ai_text = await openai_service.generate_response(history)
    
    # 3. Update History
    history.append({"role": "assistant", "content": ai_text})
    conversations[sid] = history
    
    # 4. Generate Audio (Using the selected voice from metadata)
    meta = call_metadata.get(sid, {})
    voice_id = meta.get("voice_id", "en-US-cooper")
    
    audio_url = murf_service.generate_audio_url(ai_text, voice_id=voice_id)
    
    return {
        "text": ai_text,
        "audio_url": audio_url
    }

# --- PHONE (TWILIO) ROUTES ---

@app.post("/api/phone/twiml/start")
async def call_start(CallSid: str = Form(...)):
    metadata = call_metadata.get(CallSid, {})
    greeting_text = metadata.get("greeting", "Hello.")
    voice_id = metadata.get("voice_id", "en-US-cooper")
    language = metadata.get("language", "en-IN") # <--- Get Language
    
    if CallSid in conversations:
        conversations[CallSid].append({"role": "assistant", "content": greeting_text})
    
    audio_url = murf_service.generate_audio_url(greeting_text, voice_id=voice_id)
    
    # [FIX] Pass language to Twilio
    return Response(
        content=twilio_service.create_response(audio_url, language=language), 
        media_type="application/xml"
    )

@app.post("/api/phone/twiml/process")
async def process_speech(CallSid: str = Form(...), SpeechResult: str = Form(None)):
    # Get metadata for language/voice
    metadata = call_metadata.get(CallSid, {})
    voice_id = metadata.get("voice_id", "en-US-cooper")
    language = metadata.get("language", "en-IN") # <--- Get Language

    if not SpeechResult:
        # If silence, listen again in the correct language
        return Response(
            content=twilio_service.create_response(None, language=language), 
            media_type="application/xml"
        )

    # 1. Update History
    history = conversations.get(CallSid, [])
    history.append({"role": "user", "content": SpeechResult})
    
    # 2. Get AI Response
    ai_text = await openai_service.generate_response(history)
    
    # 3. Update History
    history.append({"role": "assistant", "content": ai_text})
    conversations[CallSid] = history 
    
    # 4. Generate Audio
    audio_url = murf_service.generate_audio_url(ai_text, voice_id=voice_id)
    
    # [FIX] Pass language to Twilio
    return Response(
        content=twilio_service.create_response(audio_url, language=language), 
        media_type="application/xml"
    )

# --- END OF CALL & CRM ---

@app.post("/api/phone/status")
async def call_status(CallSid: str = Form(...), CallStatus: str = Form(...)):
    """
    Twilio calls this when the call ends.
    """
    if CallStatus in ['completed', 'failed', 'busy', 'no-answer']:
        print(f"Call {CallSid} ended: {CallStatus}")
        
        history = conversations.pop(CallSid, []) 
        metadata = call_metadata.pop(CallSid, {}) 
        
        if not history:
            return
            
        record = {
            "call_id": CallSid,
            "status": CallStatus,
            "agent_type": metadata.get("agent_type"),
            "lead_data": metadata.get("lead_data"),
            "conversation": history,
            "timestamp": datetime.now().isoformat()
        }
        
        # --- CRM INTEGRATION POINT ---
        # In the future, we will call Salesforce API here.
        # Example:
        # crm_service.update_lead(
        #     email=metadata['lead_data']['lead_email'], 
        #     status="Qualified" if len(history) > 4 else "Attempted",
        #     notes=json.dumps(history)
        # )
        # -----------------------------
        
        # Save to Local JSON
        filename = f"database/{metadata.get('agent_type', 'general')}_records.json"
        os.makedirs("database", exist_ok=True)
        
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)