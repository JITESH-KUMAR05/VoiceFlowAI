"""
    Main Backend Application
    - Handles Streaming Audio for Ultra-Low Latency
"""

from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse # <--- Added StreamingResponse
from fastapi.staticfiles import StaticFiles 
import uvicorn
import os
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

# Mount static (still useful for assets, though we use streaming now)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Services
twilio_service = TwilioService()
openai_service = OpenAIService()
murf_service = MurfService()

# In-memory storage
conversations = {}
call_metadata = {}

# [NEW] Audio Request Cache (Stores text to be spoken)
audio_request_cache = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER: Generate Stream URL ---
def get_stream_url(text: str, voice_id: str):
    """
    Creates a temporary ID for the audio and returns a URL 
    that will stream the audio when accessed.
    """
    request_id = str(uuid.uuid4())
    # Store the details in RAM
    audio_request_cache[request_id] = {
        "text": text, 
        "voice_id": voice_id
    }
    return f"{settings.BASE_URL}/api/audio/stream/{request_id}"

# --- NEW: Streaming Endpoint ---
@app.get("/api/audio/stream/{request_id}")
async def stream_audio(request_id: str):
    """
    Streams audio chunks directly to the client (Browser/Twilio).
    """
    # 1. Retrieve text from cache (Pop to clean up memory)
    data = audio_request_cache.pop(request_id, None)
    if not data:
        return Response(status_code=404)

    # 2. Get Generator from Murf
    generator = murf_service.create_audio_stream(data["text"], data["voice_id"])
    if not generator:
         return Response(status_code=500)

    # 3. Stream Response (Chunked Transfer)
    return StreamingResponse(generator, media_type="audio/wav")


@app.get("/")
async def root():
    return {"Status": "Backend is running", "Service": "VoiceFlow AI Agent"}

# 1. Unified Initiate Endpoint
@app.post("/api/phone/call")
async def initiate_call(request: InitiateCallRequest):
    session_id = str(uuid.uuid4())
    status = "browser_session_started"
    greeting_audio_url = None

    # A. Construct Context
    details_text = ""
    if request.details:
        details_text = ", ".join([f"{k.replace('_', ' ').title()}: {v}" for k, v in request.details.items() if v])

    # B. Define Persona
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
        session_id = twilio_service.initiate_call(request.phone_number)
        status = "call_initiated"
    else:
        # [FIX] Use Streaming URL
        greeting_audio_url = get_stream_url(greeting, request.voice_id)

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
        "greeting_audio_url": greeting_audio_url 
    }

# --- BROWSER CHAT ---
@app.post("/api/browser/chat")
async def browser_chat(request: BrowserChatRequest):
    sid = request.session_id
    
    history = conversations.get(sid, [])
    history.append({"role": "user", "content": request.message})
    
    ai_text = await openai_service.generate_response(history)
    
    history.append({"role": "assistant", "content": ai_text})
    conversations[sid] = history
    
    meta = call_metadata.get(sid, {})
    voice_id = meta.get("voice_id", "en-US-cooper")
    
    # [FIX] Use Streaming URL
    audio_url = get_stream_url(ai_text, voice_id)
    
    return {
        "text": ai_text,
        "audio_url": audio_url
    }

# --- PHONE ROUTES ---
@app.post("/api/phone/twiml/start")
async def call_start(CallSid: str = Form(...)):
    metadata = call_metadata.get(CallSid, {})
    greeting_text = metadata.get("greeting", "Hello.")
    voice_id = metadata.get("voice_id", "en-US-cooper")
    language = metadata.get("language", "en-IN")
    
    if CallSid in conversations:
        conversations[CallSid].append({"role": "assistant", "content": greeting_text})
    
    # [FIX] Use Streaming URL
    audio_url = get_stream_url(greeting_text, voice_id)
    
    return Response(
        content=twilio_service.create_response(audio_url, language=language), 
        media_type="application/xml"
    )

@app.post("/api/phone/twiml/process")
async def process_speech(CallSid: str = Form(...), SpeechResult: str = Form(None)):
    metadata = call_metadata.get(CallSid, {})
    voice_id = metadata.get("voice_id", "en-US-cooper")
    language = metadata.get("language", "en-IN")

    if not SpeechResult:
        return Response(
            content=twilio_service.create_response(None, language=language), 
            media_type="application/xml"
        )

    history = conversations.get(CallSid, [])
    history.append({"role": "user", "content": SpeechResult})
    
    ai_text = await openai_service.generate_response(history)
    
    history.append({"role": "assistant", "content": ai_text})
    conversations[CallSid] = history 
    
    # [FIX] Use Streaming URL
    audio_url = get_stream_url(ai_text, voice_id)
    
    return Response(
        content=twilio_service.create_response(audio_url, language=language), 
        media_type="application/xml"
    )

# --- END OF CALL ---
@app.post("/api/phone/status")
async def call_status(CallSid: str = Form(...), CallStatus: str = Form(...)):
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
        except Exception as e:
            print(f"Error saving record: {e}")

    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)