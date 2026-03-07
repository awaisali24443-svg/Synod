import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    NEO4J_URI: str = os.getenv("NEO4J_URI", "")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "")
    
    DOCKER_SANDBOX: bool = os.getenv("DOCKER_SANDBOX", "True").lower() in ("true", "1", "t")
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "True").lower() in ("true", "1", "t")

settings = Settings()
