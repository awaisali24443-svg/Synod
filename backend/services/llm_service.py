from backend.core.api_gateway import query_llm

async def analyze_findings(findings: dict) -> str:
    prompt = f"Analyze the following recon findings and suggest potential vulnerabilities:\n{findings}"
    response = await query_llm(prompt)
    return response

async def generate_payloads(target: str, tech_stack: list) -> str:
    prompt = f"Generate safe testing payloads for {target} running {tech_stack}"
    response = await query_llm(prompt)
    return response
