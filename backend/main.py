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
# Import new services
from services.salesforce_service import SalesforceService
from services.email_service import EmailService

# Define the Voice Persona Map
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

load_dotenv()

app = FastAPI(title="VoiceFlow AI Agent")

# Add CORS Middleware immediately after creating the app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (localhost:8080, ngrok, etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (POST, GET, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Mount static (still useful for assets, though we use streaming now)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Services
twilio_service = TwilioService()
openai_service = OpenAIService()
murf_service = MurfService()
# Initialize
sf_service = SalesforceService()
email_service = EmailService()

# In-memory storage
conversations = {}
call_metadata = {}

# Global Cache
audio_request_cache = {}

# Update definition to accept base_url
def get_stream_url(text: str, voice_id: str, language: str = "en-US", base_url: str = None):
    import uuid
    request_id = str(uuid.uuid4())
    audio_request_cache[request_id] = {
        "text": text, 
        "voice_id": voice_id,
        "language": language 
    }
    # Use provided base_url (for browser) or fallback to settings (for Twilio)
    root_url = base_url if base_url else settings.BASE_URL
    return f"{root_url}/api/audio/stream/{request_id}"

# Streaming Endpoint ---
@app.get("/api/audio/stream/{request_id}")
async def stream_audio(request_id: str):
    """
    Streams audio chunks directly to the client (Browser/Twilio).
    """
    data = audio_request_cache.get(request_id) 
    
    if not data:
        return Response(status_code=404)

    generator = murf_service.create_audio_stream(
        data["text"], 
        data["voice_id"], 
        data.get("language", "en-US")
    )
    
    if not generator:
        return Response(status_code=500)

    return StreamingResponse(generator, media_type="audio/wav")


@app.get("/")
async def root():
    return {"Status": "Backend is running", "Service": "VoiceFlow AI Agent"}

# 1. Unified Initiate Endpoint
@app.post("/api/phone/call")
async def initiate_call(request: InitiateCallRequest, req: Request):
    session_id = str(uuid.uuid4())
    status = "browser_session_started"
    greeting_audio_url = None

    # 1. Determine Persona
    persona_name, persona_gender = VOICE_PERSONA_MAP.get(request.voice_id, ("Alex", "Male"))
    lang_instruction = f"You are speaking in {request.language}."
    
    # Handle both hyphen and underscore for agent type
    agent_type_normalized = request.agent_type.replace("-", "_")

    if agent_type_normalized == "real_estate":
        company_name = "JK Real Estates"
        # Consultative Real Estate Prompt
        system_prompt = (
            f"You are {persona_name}, a {persona_gender} Senior Property Consultant at {company_name}. "
            f"You are calling {request.lead_name}. {lang_instruction} "
            f"Context: {request.lead_company or 'Interested in property'}. "
            "Your Goal: Have a natural conversation to understand their needs before pitching. "
            "Step 1: Build rapport and ask if they are looking for investment or self-use. "
            "Step 2: Ask about their preferred location and budget range. "
            "Step 3: Only after understanding needs, suggest a site visit or demo. "
            "Be professional, warm, and empathetic. Do NOT rush to the close. "
            "Keep responses concise (under 2 sentences)."
        )
        greeting = f"Hello {request.lead_name}, this is {persona_name} from {company_name}. I received your inquiry regarding a property. Is this a good time to talk?"
    else:
        # Consultative B2B Prompt
        company_name = "VoiceFlow"
        system_prompt = (
            f"You are {persona_name}, a {persona_gender} Solutions Consultant at {company_name}. "
            f"We help businesses automate sales using AI agents. "
            f"You are calling {request.lead_name}. {lang_instruction} "
            "Your Goal: Consultative selling. "
            "Step 1: Ask about their current sales process challenges. "
            "Step 2: Listen to their pain points (high volume, low conversion, etc.). "
            "Step 3: Explain how our AI can solve that specific problem. "
            "Step 4: Gently propose a demo to show the solution in action. "
            "Be helpful and curious, not pushy. Keep responses concise."
        )
        greeting = f"Hi {request.lead_name}, this is {persona_name} from {company_name}. I noticed you're looking to improve sales efficiency. Do you have a minute?"

    # C. Handle Modes
    if request.phone_number:
        session_id = twilio_service.initiate_call(request.phone_number)
        status = "call_initiated"
    else:
        # Browser Mode: Use the Request's Base URL (localhost:8000)
        # This ensures the browser gets a URL it can actually reach
        local_base_url = str(req.base_url).rstrip("/")
        greeting_audio_url = get_stream_url(greeting, request.voice_id, request.language, local_base_url)

    # D. Store in RAM
    conversations[session_id] = [{"role": "system", "content": system_prompt}]
    call_metadata[session_id] = {
        "greeting": greeting, 
        "agent_type": request.agent_type, # Keep original for consistency
        "language": request.language,
        "voice_id": request.voice_id,
        "start_time": datetime.now().isoformat(),
        "lead_data": request.dict()
    }
    
    return {
        "status": status, 
        "call_sid": session_id, 
        "greeting": greeting,
        "greeting_audio_url": greeting_audio_url,
        "language": request.language 
    }

# --- BROWSER CHAT ---
@app.post("/api/browser/chat")
async def browser_chat(request: BrowserChatRequest, req: Request): 
    sid = request.session_id
    
    history = conversations.get(sid, [])
    history.append({"role": "user", "content": request.message})
    
    ai_text = await openai_service.generate_response(history)
    
    history.append({"role": "assistant", "content": ai_text})
    conversations[sid] = history
    
    meta = call_metadata.get(sid, {})
    voice_id = meta.get("voice_id", "en-US-cooper")
    language = meta.get("language", "en-IN")
    
    # Browser Mode: Use Localhost URL
    local_base_url = str(req.base_url).rstrip("/")
    audio_url = get_stream_url(ai_text, voice_id, language, local_base_url)
    
    return {
        "text": ai_text,
        "audio_url": audio_url
    }

# --- PHONE ROUTES ---
@app.post("/api/phone/twiml/start")
async def call_start(CallSid: str = Form(...)):
    metadata = call_metadata.get(CallSid, {})
    greeting_text = metadata.get("greeting", "Hello.")
    
    language = metadata.get("language", "en-IN")
    default_voice = "en-IN-anisha" if language == "en-IN" else "en-US-cooper"
    
    voice_id = metadata.get("voice_id", default_voice)
    
    if CallSid in conversations:
        conversations[CallSid].append({"role": "assistant", "content": greeting_text})
    
    
    audio_url = get_stream_url(greeting_text, voice_id, language)
    
    return Response(
        content=twilio_service.create_response(audio_url, language=language), 
        media_type="application/xml"
    )

@app.post("/api/phone/twiml/process")
async def process_speech(CallSid: str = Form(...), SpeechResult: str = Form(None)):
    metadata = call_metadata.get(CallSid, {})
    
    # [FIX] Smart Default here too
    language = metadata.get("language", "en-IN")
    default_voice = "en-IN-anisha" if language == "en-IN" else "en-US-cooper"
    
    voice_id = metadata.get("voice_id", default_voice)

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
    
    
    audio_url = get_stream_url(ai_text, voice_id, language)
    
    return Response(
        content=twilio_service.create_response(audio_url, language=language), 
        media_type="application/xml"
    )

# --- END OF CALL ---
@app.post("/api/phone/status")
async def call_status(background_tasks: BackgroundTasks, CallSid: str = Form(...), CallStatus: str = Form(...)):
    if CallStatus in ['completed', 'failed', 'busy', 'no-answer']:
        print(f"Twilio Call {CallSid} ended: {CallStatus}")
        
        history = conversations.pop(CallSid, []) 
        metadata = call_metadata.pop(CallSid, {}) 
        
        if history:
            background_tasks.add_task(run_post_call_actions, history, metadata, CallSid, CallStatus)

    return {"status": "ok"}


async def run_post_call_actions(history, metadata, call_sid, status_label):
    lead_data = metadata.get("lead_data", {})
    lead_name = lead_data.get("lead_name", "Valued Customer")
    agent_type = metadata.get("agent_type", "general")
    
    print(f"Starting Post-Call Analysis for {call_sid}...")
    
    # 1. AI Analysis (Sentiment + Email Writing)
    analysis = await openai_service.analyze_call(history, lead_name)
    print(f"Analysis Complete. Score: {analysis.get('sentiment_score')}")
    
    # 2. Sync to Salesforce
    transcript = "\n".join([f"{m['role']}: {m['content']}" for m in history])
    sf_service.sync_call_data(lead_data, analysis, transcript)
    
    # 3. Send Personalized Email
    if lead_data.get("lead_email"):
        subject = f"Summary of our conversation - {agent_type.replace('_', ' ').title()}"
        email_body = analysis.get("email_body")
        email_service.send_followup(lead_data["lead_email"], subject, email_body)

    # 4. Save to Local DB
    record = {
        "call_id": call_sid,
        "status": status_label,
        "agent_type": agent_type,
        "lead_data": lead_data,
        "conversation": history,
        "analysis": analysis,
        "timestamp": datetime.now().isoformat()
    }
    
    filename = f"database/{agent_type}_records.json"
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

# --- BROWSER END CALL ---
@app.post("/api/browser/end")
async def browser_end_call(request: BrowserChatRequest, background_tasks: BackgroundTasks):
    sid = request.session_id
    print(f"Browser Call Ended: {sid}")
    
    history = conversations.pop(sid, [])
    metadata = call_metadata.pop(sid, {})
    
    if not history:
        return {"status": "no_history"}
        
    # Trigger Post-Call Actions
    background_tasks.add_task(run_post_call_actions, history, metadata, sid, "completed")
    
    return {"status": "processing_started"}

# Endpoint to Fetch CRM Data from Salesforce
@app.get("/api/crm/leads")
async def get_crm_leads(agent_type: str = "all"):
    data = sf_service.get_crm_data(agent_type)
    return data

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)