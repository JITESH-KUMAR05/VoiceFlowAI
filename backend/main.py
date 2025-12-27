"""
    Main Backend Application
    - Handles Streaming Audio for Ultra-Low Latency
"""

import time
from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse 
from fastapi.staticfiles import StaticFiles 
import uvicorn
import os
import uuid
from dotenv import load_dotenv
from datetime import datetime
import json

from config import settings
from models.Schemas import InitiateCallRequest, BrowserChatRequest
from services.twilio_service import TwilioService
from services.openai_service import OpenAIService
from services.murf_service import MurfService
# [NEW] Import new services
from services.salesforce_service import SalesforceService
from services.email_service import EmailService

load_dotenv()

app = FastAPI(title="VoiceFlow AI Agent")

# Mount static (still useful for assets, though we use streaming now)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Services
twilio_service = TwilioService()
openai_service = OpenAIService()
murf_service = MurfService()
# [NEW] Initialize
sf_service = SalesforceService()
email_service = EmailService()

# In-memory storage
conversations = {}
call_metadata = {}

# [NEW] Audio Request Cache (Stores text to be spoken)
audio_request_cache = {}

# [NEW] Voice ID to Persona Mapping
VOICE_PERSONA_MAP = {
    # English - India
    "en-IN-anisha": ("Anisha", "Female"),
    "en-IN-anusha": ("Anusha", "Female"),
    "en-IN-nikhil": ("Nikhil", "Male"),
    "en-IN-samar": ("Samar", "Male"),
    "en-IN-tanushree": ("Tanushree", "Female"),
    
    # Hindi - India
    "hi-IN-aman": ("Aman", "Male"),
    "hi-IN-karan": ("Karan", "Male"),
    "hi-IN-khyati": ("Khyati", "Female"),
    "hi-IN-namrita": ("Namrita", "Female"),
    "hi-IN-sunaina": ("Sunaina", "Female"),
    
    # US / Global Voices (used for other languages)
    "en-US-ronnie": ("Ronnie", "Male"),
    "en-US-zion": ("Zion", "Male"),
    "en-US-josie": ("Josie", "Female"),
    "en-US-alicia": ("Alicia", "Female"),
    "en-US-lia": ("Lia", "Female"),
    
    # Punjabi
    "pa-IN-harman": ("Harman", "Male"),
}

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
    start_time = time.time()
    generator = murf_service.create_audio_stream(data["text"], data["voice_id"])
    if not generator:
         return Response(status_code=500)
    
    print(f"Murf TTS Init Latency: {time.time() - start_time:.4f}s")

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

    # [FIX] 1. Determine Persona dynamically
    persona_name, persona_gender = VOICE_PERSONA_MAP.get(request.voice_id, ("Alex", "Male"))
    
    # [FIX] 2. Build Rich System Prompt
    lang_instruction = f"You are speaking in {request.language}."
    
    if request.agent_type == "real_estate":
        company_name = "JK Real Estates"
        system_prompt = (
            f"You are {persona_name}, a {persona_gender} Real Estate Assistant at {company_name}. "
            f"You are calling {request.lead_name}. "
            f"{lang_instruction} "
            f"Context: {details_text}. "
            "Your goal: Qualify them for a property. "
            "Be professional, warm, and helpful. "
            "Keep responses concise (under 2 sentences) to maintain conversation flow."
        )
        greeting = f"Hello {request.lead_name}, this is {persona_name} from {company_name}. I received your inquiry regarding a property. Is this a good time?"
    else:
        # B2B Context
        company_name = "VoiceFlow"
        product_desc = "AI agents that help organizations with sales, marketing, and lead qualification"
        target_company = request.lead_company or "their company"
        
        system_prompt = (
            f"You are {persona_name}, a {persona_gender} Sales Representative at {company_name}. "
            f"We build {product_desc}. "
            f"You are calling {request.lead_name} at {target_company}. "
            f"{lang_instruction} "
            f"Context: {details_text}. "
            "Your goal: Book a demo to show how our AI agents can help their sales team. "
            "Be persuasive but respectful of their time. "
            "Keep responses concise (under 2 sentences)."
        )
        greeting = f"Hi {request.lead_name}, this is {persona_name} from {company_name}. We help companies automate their sales with AI. Do you have a minute?"

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
    
    
    audio_url = get_stream_url(ai_text, voice_id)
    
    return Response(
        content=twilio_service.create_response(audio_url, language=language), 
        media_type="application/xml"
    )

# --- END OF CALL ---
@app.post("/api/phone/status")
async def call_status(background_tasks: BackgroundTasks,CallSid: str = Form(...), CallStatus: str = Form(...)):
    if CallStatus in ['completed', 'failed', 'busy', 'no-answer']:
        print(f"Call {CallSid} ended: {CallStatus}")
        
        # Retrieve and remove session data
        history = conversations.pop(CallSid, []) 
        metadata = call_metadata.pop(CallSid, {}) 
        
        if not history:
            return {"status": "no_history"}
        
        # [NEW] Define the background processing function
        async def process_post_call_actions(history, metadata):
            lead_data = metadata.get("lead_data", {})
            lead_name = lead_data.get("lead_name", "Valued Customer")
            
            print("Starting Post-Call Analysis...")
            
            # 1. AI Analysis (Sentiment + Email Writing)
            analysis = await openai_service.analyze_call(history, lead_name)
            print(f"Analysis Complete. Score: {analysis.get('sentiment_score')}")
            
            # 2. Sync to Salesforce
            transcript = "\n".join([f"{m['role']}: {m['content']}" for m in history])
            sf_service.sync_call_data(lead_data, analysis, transcript)
            
            # 3. Send Personalized Email
            if lead_data.get("lead_email"):
                subject = f"Summary of our conversation - {metadata.get('agent_type', 'VoiceFlow')}"
                email_body = analysis.get("email_body")
                email_service.send_followup(lead_data["lead_email"], subject, email_body)

            # 4. Save to Local DB
            record = {
                "call_id": CallSid,
                "status": CallStatus,
                "agent_type": metadata.get("agent_type"),
                "lead_data": lead_data,
                "conversation": history,
                "analysis": analysis, # Save the analysis
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

        # [NEW] Add to background tasks (Non-blocking)
        background_tasks.add_task(process_post_call_actions, history, metadata)

    return {"status": "processing_started"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)