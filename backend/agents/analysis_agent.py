from services.llm_service import llm_service
from core.websocket_manager import manager

class AnalysisAgent:
    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        self.agent_name = "AnalysisAgent"

    async def analyze(self, parsed_data: dict) -> dict:
        await manager.broadcast_log(self.agent_name, self.scan_id, "INFO", "Starting AI analysis on recon data")
        
        # Batch tasks
        tasks = [
            f"Analyze javascript endpoints from {parsed_data.get('urls', [])}",
            "Review parameters for injection",
            "Summarize attack surface"
        ]
        
        result = await llm_service.batch_analyze(tasks)
        await manager.broadcast_log(self.agent_name, self.scan_id, "INFO", "AI analysis complete")
        
        # Mock structured return
        return {"vulnerabilities": [{"title": "Potential XSS", "description": result}]}
