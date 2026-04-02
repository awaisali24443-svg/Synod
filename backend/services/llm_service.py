from core.api_gateway import api_gateway
import json

class LLMService:
    async def analyze_vulnerabilities(self, data: str) -> str:
        prompt = f"Analyze the following recon data for vulnerabilities:\n{data}"
        return await api_gateway.query_llm(prompt)
        
    async def batch_analyze(self, tasks: list) -> str:
        prompt = "Perform the following analysis tasks and return structured JSON:\n"
        for i, task in enumerate(tasks):
            prompt += f"Task {i+1}: {task}\n"
        return await api_gateway.query_llm(prompt)

llm_service = LLMService()
