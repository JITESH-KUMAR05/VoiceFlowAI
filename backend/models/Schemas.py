from pydantic import BaseModel
from typing import Dict,Any, List, Optional, Optional

class InitiateCallRequest(BaseModel):
    phone_number:str
    lead_name:str
    lead_email:str
    lead_company:Optional[str] = None
    agent_type:str
    details: Optional[Dict[str, Any]] = {} 

class CallRecord(BaseModel):
    call_id:str
    phone_number:str
    lead_name:str
    lead_email:str
    lead_company:Optional[str] = None
    agent_type:str
    duration: Optional[int] = 0
    conversation_summary: Optional[str] = None
    timestamp: float