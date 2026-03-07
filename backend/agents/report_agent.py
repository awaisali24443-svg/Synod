from backend.services.report_service import generate_markdown_report
from backend.utils.logger import WebSocketLogger

class ReportAgent:
    def __init__(self, scan_id: str):
        self.logger = WebSocketLogger("ReportAgent", scan_id)

    async def generate(self, scan_state) -> str:
        await self.logger.info("Generating final report")
        report = generate_markdown_report(scan_state)
        await self.logger.info("Report generation complete")
        return report
