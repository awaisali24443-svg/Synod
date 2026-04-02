from services.tool_runner import tool_runner
from utils.helpers import sanitize_input

class ReconAgent:
    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        self.agent_name = "ReconAgent"

    async def run_subfinder(self, domain: str) -> str:
        safe_domain = sanitize_input(domain)
        return await tool_runner.execute("subfinder", ["-d", safe_domain], self.scan_id, self.agent_name)

    async def run_httpx(self, subdomains: list) -> str:
        # In a real scenario, we might write subdomains to a file and pass -l
        # For mock/simplicity, passing a few as args or simulating
        safe_domains = [sanitize_input(d) for d in subdomains[:5]] # limit for cmdline
        return await tool_runner.execute("httpx", safe_domains, self.scan_id, self.agent_name)

    async def run_nmap(self, target: str) -> str:
        safe_target = sanitize_input(target)
        return await tool_runner.execute("nmap", ["-sV", safe_target], self.scan_id, self.agent_name)
