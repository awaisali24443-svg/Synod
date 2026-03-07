import logging
import asyncio
from backend.core.websocket_manager import manager

class WebSocketLogger:
    def __init__(self, agent_name: str, process_id: str):
        self.agent_name = agent_name
        self.process_id = process_id

    async def log(self, level: str, message: str):
        print(f"[{level}] {self.agent_name} ({self.process_id}): {message}")
        await manager.broadcast_log(self.agent_name, self.process_id, level, message)

    async def info(self, message: str):
        await self.log("INFO", message)

    async def warning(self, message: str):
        await self.log("WARNING", message)

    async def error(self, message: str):
        await self.log("ERROR", message)

    async def debug(self, message: str):
        await self.log("DEBUG", message)
