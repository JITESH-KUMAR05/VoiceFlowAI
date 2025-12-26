from pydantic import BaseModel
from typing import Dict,Any, List, Optional

class InitiateCallRequest(BaseModel):
    phone_number: Optional[str] = None  # Made Optional for Browser Mode
    lead_name: str
    lead_email: Optional[str] = None
    lead_company: Optional[str] = None
    agent_type: str
    language: str = "en-IN"             # Added with default
    voice_id: str = "en-IN-anisha"      # Added with default
    details: Optional[Dict[str, Any]] = {}

class BrowserChatRequest(BaseModel):
    session_id: str
    message: str
class CallRecord(BaseModel):
    call_id:str
    phone_number:Optional[str] = None
    lead_name:str
    lead_email:Optional[str] = None
    lead_company:Optional[str] = None
    agent_type:str
    duration: Optional[int] = 0
    conversation_summary: Optional[str] = None
    timestamp: float