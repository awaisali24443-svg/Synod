import asyncio
import uuid
from backend.models.scan_state import ScanState
from backend.agents.recon_agent import ReconAgent
from backend.agents.analysis_agent import AnalysisAgent
from backend.agents.payload_agent import PayloadAgent
from backend.agents.report_agent import ReportAgent
from backend.utils.logger import WebSocketLogger
from backend.utils.helpers import sanitize_input

active_scans = {}

class Orchestrator:
    def __init__(self, target: str):
        self.scan_id = str(uuid.uuid4())
        self.target = sanitize_input(target)
        self.state = ScanState(self.scan_id, self.target)
        self.logger = WebSocketLogger("Orchestrator", self.scan_id)
        active_scans[self.scan_id] = self.state

    async def run_pipeline(self):
        try:
            await self.logger.info(f"Starting SYNOD pipeline for {self.target}")
            self.state.update_status("recon")
            
            recon = ReconAgent(self.scan_id)
            subdomains = await recon.run_subfinder(self.target)
            self.state.findings["subdomains"] = subdomains
            
            alive_hosts = await recon.run_httpx(subdomains)
            self.state.findings["alive_hosts"] = alive_hosts
            
            ports = await recon.run_nmap(self.target)
            self.state.findings["open_ports"] = ports
            
            self.state.update_status("analysis")
            analysis = AnalysisAgent(self.scan_id)
            ai_report = await analysis.analyze(self.state.findings)
            self.state.findings["analysis"] = ai_report
            
            self.state.update_status("pending_authorization")
            self.state.paused = True
            await self.logger.warning("AI proposes potentially intrusive payloads. Pausing for Human-in-the-Loop authorization.")
            
            while self.state.paused:
                await asyncio.sleep(1)
                
            if not self.state.pending_authorization:
                await self.logger.error("Authorization rejected. Aborting payload testing.")
            else:
                self.state.update_status("payload_testing")
                payload_agent = PayloadAgent(self.scan_id)
                await payload_agent.test_payloads(self.target, "mock_payloads")
                
            self.state.update_status("reporting")
            report_agent = ReportAgent(self.scan_id)
            final_report = await report_agent.generate(self.state)
            
            self.state.update_status("completed")
            await self.logger.info("Pipeline completed successfully.")
            
        except Exception as e:
            await self.logger.error(f"Pipeline failed: {str(e)}")
            self.state.update_status("failed")
