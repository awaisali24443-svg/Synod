import json
from datetime import datetime
from typing import List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_log(self, agent: str, process_id: str, level: str, message: str):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent": agent,
            "processId": process_id,
            "level": level,
            "message": message
        }
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(log_entry))
            except Exception:
                pass

manager = ConnectionManager()
