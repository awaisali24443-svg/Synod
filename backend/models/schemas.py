from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ScanRequest(BaseModel):
    target: str = Field(..., description="Target domain or IP")
    options: Optional[Dict[str, Any]] = None

class AuthRequest(BaseModel):
    scan_id: str
    action: str = Field(..., description="approve or reject")

class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str
