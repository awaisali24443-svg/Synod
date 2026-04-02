import asyncio
import httpx
from core.config import settings
from utils.logger import logger

class APIGateway:
    def __init__(self):
        self.providers = ["gemini", "groq", "github"]
        
    async def query_llm(self, prompt: str, providers: list = None) -> str:
        if not providers:
            providers = self.providers
            
        for provider in providers:
            try:
                logger.info(f"Attempting LLM query with provider: {provider}")
                result = await asyncio.wait_for(self._call_provider(provider, prompt), timeout=30.0)
                if result:
                    return result
            except asyncio.TimeoutError:
                logger.warning(f"Provider {provider} timed out.")
            except Exception as e:
                logger.warning(f"Provider {provider} failed: {e}")
                
        raise Exception("All LLM providers failed.")

    async def _call_provider(self, provider: str, prompt: str) -> str:
        # Mock implementation for LLM calls
        if settings.MOCK_MODE:
            await asyncio.sleep(1)
            return f"[{provider}] Mock analysis for: {prompt[:50]}..."
            
        # In a real scenario, implement actual HTTP calls to Gemini, Groq, etc.
        # using httpx.AsyncClient()
        await asyncio.sleep(1)
        return f"[{provider}] Simulated response."

api_gateway = APIGateway()
