import asyncio
from backend.core.config import settings
from backend.utils.logger import WebSocketLogger

async def run_tool(tool_name: str, args: list, logger: WebSocketLogger) -> str:
    if settings.MOCK_MODE:
        await logger.info(f"MOCK_MODE: Simulating {tool_name} {' '.join(args)}")
        await asyncio.sleep(2)
        if tool_name == "subfinder":
            output = "api.example.com\ndev.example.com\nstaging.example.com"
        elif tool_name == "httpx":
            output = "https://api.example.com [200]\nhttps://dev.example.com [403]"
        elif tool_name == "nmap":
            output = "Port 80/tcp open http\nPort 443/tcp open https"
        else:
            output = f"Mock output for {tool_name}"
        
        for line in output.split('\n'):
            await logger.debug(line)
        return output

    command = [tool_name] + args
    await logger.info(f"Executing: {' '.join(command)}")
    
    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout_data = []
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            decoded_line = line.decode().strip()
            stdout_data.append(decoded_line)
            await logger.debug(decoded_line)
            
        await process.wait()
        return '\n'.join(stdout_data)
    except Exception as e:
        await logger.error(f"Tool execution failed: {str(e)}")
        return ""
