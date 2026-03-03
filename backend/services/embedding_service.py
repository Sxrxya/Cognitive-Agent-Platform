"""
Cognitive Agent Platform — Embedding Service
Generates vector embeddings using OpenAI text-embedding-3-large.
"""

import structlog
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from config import get_settings

logger = structlog.get_logger(__name__)


class EmbeddingService:
    """Handles all embedding generation via OpenAI."""

    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.embedding_model
        self.dimension = settings.embedding_dimension
        logger.info("EmbeddingService initialized", model=self.model, dim=self.dimension)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text string."""
        response = self.client.embeddings.create(model=self.model, input=text)
        return response.data[0].embedding

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts in one API call."""
        response = self.client.embeddings.create(model=self.model, input=texts)
        return [item.embedding for item in response.data]


# Singleton
_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService()
    return _service


def get_embedding(text: str) -> list[float]:
    """Convenience function for quick embedding."""
    return get_embedding_service().embed_text(text)
