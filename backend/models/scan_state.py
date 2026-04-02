from typing import Dict, Any, List
from pydantic import BaseModel

class ScanState(BaseModel):
    scan_id: str
    target: str
    status: str = "initialized"
    recon_data: Dict[str, Any] = {}
    parsed_data: Dict[str, Any] = {}
    vulnerabilities: List[Dict[str, Any]] = []
    pending_authorization: bool = False
    payloads_to_test: List[Dict[str, Any]] = []
    report: str = ""
