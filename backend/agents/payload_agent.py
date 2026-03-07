from backend.utils.logger import WebSocketLogger
from backend.core.config import settings

class PayloadAgent:
    def __init__(self, scan_id: str):
        self.logger = WebSocketLogger("PayloadAgent", scan_id)

    async def test_payloads(self, target: str, payloads: str):
        await self.logger.info(f"Preparing to test payloads on {target}")
        if settings.DOCKER_SANDBOX:
            await self.logger.info("Running payloads in Docker Sandbox")
        else:
            await self.logger.warning("Docker sandbox disabled. Skipping payload execution for safety.")
