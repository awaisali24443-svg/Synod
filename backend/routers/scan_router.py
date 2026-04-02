from fastapi import APIRouter, BackgroundTasks
from models.schemas import ScanRequest, ScanResponse
from agents.orchestrator import orchestrator
from core.task_queue import task_queue

router = APIRouter(prefix="/api/v1", tags=["scan"])

@router.post("/scan", response_model=ScanResponse)
async def start_scan(request: ScanRequest):
    # Enqueue the scan task
    await task_queue.enqueue(orchestrator.run_pipeline, request.target)
    return ScanResponse(scan_id="queued", status="queued", message="Scan task added to queue")
