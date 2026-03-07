from pydantic import BaseModel
from typing import List, Optional

class ScanRequest(BaseModel):
    target: str
    mode: str = "Passive Recon"

class AuthRequest(BaseModel):
    scan_id: str
    action: str
    approved: bool

class ToolOutput(BaseModel):
    tool: str
    raw_output: str
    parsed_data: Optional[dict] = None
