import asyncio
from core.websocket_manager import manager
from core.config import settings
from utils.logger import logger

class ToolRunner:
    async def execute(self, tool_name: str, args: list, process_id: str, agent: str) -> str:
        if settings.MOCK_MODE:
            return await self._mock_execute(tool_name, args, process_id, agent)
            
        command = [tool_name] + args
        logger.info(f"Executing: {' '.join(command)}")
        await manager.broadcast_log(agent, process_id, "INFO", f"Started {tool_name} {' '.join(args)}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            output = []
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                decoded_line = line.decode().strip()
                output.append(decoded_line)
                await manager.broadcast_log(agent, process_id, "DEBUG", decoded_line)
                
            await process.wait()
            await manager.broadcast_log(agent, process_id, "INFO", f"Finished {tool_name}")
            return "\n".join(output)
            
        except Exception as e:
            logger.error(f"Error running {tool_name}: {e}")
            await manager.broadcast_log(agent, process_id, "ERROR", f"Failed to run {tool_name}: {e}")
            return ""

    async def _mock_execute(self, tool_name: str, args: list, process_id: str, agent: str) -> str:
        await manager.broadcast_log(agent, process_id, "INFO", f"Started {tool_name} (MOCK)")
        await asyncio.sleep(1)
        
        mock_output = ""
        if tool_name == "subfinder":
            mock_output = "api.example.com\ndev.example.com\nstaging.example.com"
        elif tool_name == "httpx":
            mock_output = "https://api.example.com [200]\nhttps://dev.example.com [403]"
        elif tool_name == "nmap":
            mock_output = "Port 80/tcp open http\nPort 443/tcp open https"
        else:
            mock_output = f"Mock output for {tool_name}"
            
        for line in mock_output.split('\n'):
            await manager.broadcast_log(agent, process_id, "DEBUG", line)
            await asyncio.sleep(0.5)
            
        await manager.broadcast_log(agent, process_id, "INFO", f"Finished {tool_name} (MOCK)")
        return mock_output

tool_runner = ToolRunner()
