import uuid
import asyncio
from models.scan_state import ScanState
from agents.recon_agent import ReconAgent
from agents.analysis_agent import AnalysisAgent
from agents.payload_agent import PayloadAgent
from agents.report_agent import ReportAgent
from services.parser_service import parser_service
from core.websocket_manager import manager

# In-memory store for scan states
active_scans = {}

class Orchestrator:
    async def run_pipeline(self, target: str):
        scan_id = f"scan-{uuid.uuid4().hex[:8]}"
        state = ScanState(scan_id=scan_id, target=target)
        active_scans[scan_id] = state
        
        await manager.broadcast_log("Orchestrator", scan_id, "INFO", f"Started pipeline for {target}")
        
        try:
            # 1. Recon
            state.status = "recon"
            recon_agent = ReconAgent(scan_id)
            subfinder_out = await recon_agent.run_subfinder(target)
            
            # 2. Parsing
            domains = parser_service.parse_subfinder(subfinder_out)
            state.recon_data['domains'] = domains
            
            if domains:
                httpx_out = await recon_agent.run_httpx(domains)
                urls = parser_service.parse_httpx(httpx_out)
                state.recon_data['urls'] = urls
            
            # 3. AI Analysis
            state.status = "analysis"
            analysis_agent = AnalysisAgent(scan_id)
            analysis_result = await analysis_agent.analyze(state.recon_data)
            state.vulnerabilities = analysis_result.get("vulnerabilities", [])
            
            # 4. Human Authorization
            state.status = "pending_auth"
            state.pending_authorization = True
            await manager.broadcast_log("Orchestrator", scan_id, "WARNING", "Pipeline paused. Waiting for human authorization.")
            
            # Wait for authorization (mocking wait loop)
            while state.pending_authorization:
                await asyncio.sleep(1)
                
            if state.status == "rejected":
                await manager.broadcast_log("Orchestrator", scan_id, "ERROR", "Pipeline rejected by human.")
                return
                
            # 5. Payload Testing
            state.status = "payload_testing"
            payload_agent = PayloadAgent(scan_id)
            await payload_agent.test_payloads([{"type": "xss", "target": target}])
            
            # 6. Report Generation
            state.status = "reporting"
            report_agent = ReportAgent(scan_id)
            state.report = await report_agent.generate(state)
            
            state.status = "completed"
            await manager.broadcast_log("Orchestrator", scan_id, "INFO", "Pipeline completed successfully.")
            
        except Exception as e:
            state.status = "failed"
            await manager.broadcast_log("Orchestrator", scan_id, "ERROR", f"Pipeline failed: {e}")

orchestrator = Orchestrator()
