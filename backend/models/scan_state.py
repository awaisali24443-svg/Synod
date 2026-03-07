from typing import Dict, Any

class ScanState:
    def __init__(self, scan_id: str, target: str):
        self.scan_id = scan_id
        self.target = target
        self.status = "initialized"
        self.findings: Dict[str, Any] = {
            "subdomains": [],
            "open_ports": [],
            "technologies": [],
            "vulnerabilities": []
        }
        self.paused = False
        self.pending_authorization = None

    def update_status(self, new_status: str):
        self.status = new_status
