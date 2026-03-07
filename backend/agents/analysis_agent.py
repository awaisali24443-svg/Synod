from backend.services.llm_service import analyze_findings
from backend.utils.logger import WebSocketLogger

class AnalysisAgent:
    def __init__(self, scan_id: str):
        self.logger = WebSocketLogger("AnalysisAgent", scan_id)

    async def analyze(self, findings: dict) -> str:
        await self.logger.info("Starting AI analysis of findings")
        analysis = await analyze_findings(findings)
        await self.logger.info("AI analysis complete")
        return analysis
