"""
Cognitive Agent Platform — Embedding Service (FREE)
Uses sentence-transformers locally — no API key, no cost.
Model: all-MiniLM-L6-v2 (384 dims, fast, accurate)
"""

import structlog
from sentence_transformers import SentenceTransformer

logger = structlog.get_logger(__name__)

# Lightweight model — runs locally, free, 384 dimensions
DEFAULT_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384


class EmbeddingService:
    """Generates embeddings using local sentence-transformers (100% free)."""

    def __init__(self, model_name: str = DEFAULT_MODEL):
        logger.info("Loading embedding model locally...", model=model_name)
        self.model = SentenceTransformer(model_name)
        self.dimension = EMBEDDING_DIMENSION
        logger.info("EmbeddingService ready (FREE — local)", model=model_name, dim=self.dimension)

    def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text string."""
        return self.model.encode(text, normalize_embeddings=True).tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts in one call."""
        embeddings = self.model.encode(texts, normalize_embeddings=True, batch_size=32)
        return [emb.tolist() for emb in embeddings]


# Singleton
_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService()
    return _service


def get_embedding(text: str) -> list[float]:
    """Convenience function."""
    return get_embedding_service().embed_text(text)
