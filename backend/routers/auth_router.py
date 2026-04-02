from fastapi import APIRouter, HTTPException
from models.schemas import AuthRequest
from agents.orchestrator import active_scans
from core.websocket_manager import manager

router = APIRouter(prefix="/api/v1", tags=["auth"])

@router.post("/authorize")
async def authorize_scan(request: AuthRequest):
    scan_id = request.scan_id
    if scan_id not in active_scans:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    state = active_scans[scan_id]
    if not state.pending_authorization:
        raise HTTPException(status_code=400, detail="Scan is not pending authorization")
        
    if request.action == "approve":
        state.pending_authorization = False
        state.status = "approved"
        await manager.broadcast_log("AuthRouter", scan_id, "INFO", "Human authorization approved.")
        return {"status": "approved"}
    elif request.action == "reject":
        state.pending_authorization = False
        state.status = "rejected"
        await manager.broadcast_log("AuthRouter", scan_id, "WARNING", "Human authorization rejected.")
        return {"status": "rejected"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
