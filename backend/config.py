"""
Cognitive Agent Platform — Configuration
Loads environment variables and provides typed settings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # --- Project ---
    app_name: str = "Cognitive Agent Platform"
    app_version: str = "0.1.0"
    debug: bool = True

    # --- LLM: Primary (Google Gemini) ---
    gemini_api_key: str = Field(..., description="Google Gemini API key")
    gemini_model: str = "gemini-2.0-flash"

    # --- LLM: Fallback (HuggingFace) ---
    huggingface_api_key: str = Field(..., description="HuggingFace API key")

    # --- Embeddings (OpenAI) ---
    openai_api_key: str = Field(..., description="OpenAI API key for embeddings")
    embedding_model: str = "text-embedding-3-large"
    embedding_dimension: int = 3072

    # --- Vector DB (Pinecone) ---
    pinecone_api_key: str = Field(..., description="Pinecone API key")
    pinecone_index: str = "cap-memory"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"

    # --- Backend Server ---
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
