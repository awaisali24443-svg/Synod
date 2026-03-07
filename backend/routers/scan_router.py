from fastapi import APIRouter
from backend.models.schemas import ScanRequest
from backend.agents.orchestrator import Orchestrator, active_scans
from backend.core.task_queue import task_queue

router = APIRouter(prefix="/api/v1", tags=["scan"])

@router.post("/scan")
async def start_scan(request: ScanRequest):
    orchestrator = Orchestrator(request.target)
    await task_queue.enqueue(orchestrator.run_pipeline)
    return {"status": "queued", "scan_id": orchestrator.scan_id}

@router.get("/scan/{scan_id}")
async def get_scan_status(scan_id: str):
    scan = active_scans.get(scan_id)
    if not scan:
        return {"error": "Scan not found"}
    return {"scan_id": scan.scan_id, "status": scan.status, "target": scan.target}
