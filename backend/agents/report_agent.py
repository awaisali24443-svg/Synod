from services.report_service import report_service
from models.scan_state import ScanState
from core.websocket_manager import manager

class ReportAgent:
    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        self.agent_name = "ReportAgent"

    async def generate(self, state: ScanState) -> str:
        await manager.broadcast_log(self.agent_name, self.scan_id, "INFO", "Generating final report")
        report = report_service.generate_report(state)
        await manager.broadcast_log(self.agent_name, self.scan_id, "INFO", "Report generated successfully")
        return report
