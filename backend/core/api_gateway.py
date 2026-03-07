import asyncio
import httpx
from backend.core.config import settings

async def query_llm(prompt: str, providers: list = ["gemini", "groq", "github"]) -> str:
    for provider in providers:
        try:
            if settings.MOCK_MODE:
                await asyncio.sleep(1)
                return f"[{provider.upper()}] Mock response for: {prompt[:20]}..."
            
            async with httpx.AsyncClient() as client:
                await asyncio.sleep(0.5)
                return f"Response from {provider}"
        except asyncio.TimeoutError:
            continue
        except Exception as e:
            continue
    return "Error: All providers failed."
