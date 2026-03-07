from backend.services.tool_runner import run_tool
from backend.services.parser_service import parse_subfinder, parse_httpx, parse_nmap
from backend.utils.logger import WebSocketLogger

class ReconAgent:
    def __init__(self, scan_id: str):
        self.logger = WebSocketLogger("ReconAgent", scan_id)

    async def run_subfinder(self, domain: str) -> list:
        await self.logger.info(f"Starting subfinder for {domain}")
        output = await run_tool("subfinder", ["-d", domain, "-silent"], self.logger)
        return parse_subfinder(output)

    async def run_httpx(self, subdomains: list) -> list:
        if not subdomains:
            return []
        await self.logger.info(f"Starting httpx for {len(subdomains)} subdomains")
        output = await run_tool("httpx", ["-silent", "-status-code", "-title"], self.logger)
        return parse_httpx(output)

    async def run_nmap(self, target: str) -> list:
        await self.logger.info(f"Starting nmap for {target}")
        output = await run_tool("nmap", ["-p-", "-T4", target], self.logger)
        return parse_nmap(output)
