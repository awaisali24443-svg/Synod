import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GITHUB_MODELS_API_KEY: Optional[str] = None
    
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    NEO4J_URI: Optional[str] = "bolt://localhost:7687"
    NEO4J_USER: Optional[str] = "neo4j"
    NEO4J_PASSWORD: Optional[str] = "password"
    
    USE_DOCKER_SANDBOX: bool = True
    MOCK_MODE: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
