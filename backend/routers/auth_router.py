from fastapi import APIRouter
from backend.models.schemas import AuthRequest
from backend.agents.orchestrator import active_scans
from backend.utils.logger import WebSocketLogger

router = APIRouter(prefix="/api/v1", tags=["auth"])

@router.post("/authorize")
async def authorize_action(request: AuthRequest):
    scan = active_scans.get(request.scan_id)
    if not scan:
        return {"error": "Scan not found"}
    
    logger = WebSocketLogger("AuthSystem", request.scan_id)
    
    if request.approved:
        scan.pending_authorization = True
        scan.paused = False
        await logger.info("Human authorization GRANTED. Resuming pipeline.")
        return {"status": "approved"}
    else:
        scan.pending_authorization = False
        scan.paused = False
        await logger.warning("Human authorization REJECTED. Skipping payload execution.")
        return {"status": "rejected"}
