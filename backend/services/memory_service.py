"""
Cognitive Agent Platform — Memory Service (Pinecone)
Manages vector memory: upsert, query, delete across namespaces.
"""

import uuid
import structlog
from datetime import datetime
from pinecone import Pinecone
from config import get_settings
from services.embedding_service import get_embedding_service

logger = structlog.get_logger(__name__)

# Memory namespaces
NAMESPACE_SHORT_TERM = "short_term"
NAMESPACE_LONG_TERM = "long_term"
NAMESPACE_EPISODIC = "episodic"


class MemoryService:
    """Pinecone-backed vector memory with namespace separation."""

    def __init__(self):
        settings = get_settings()
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index = self.pc.Index(settings.pinecone_index)
        self.embedder = get_embedding_service()
        logger.info("MemoryService initialized", index=settings.pinecone_index)

    def store(
        self,
        text: str,
        namespace: str = NAMESPACE_LONG_TERM,
        metadata: dict | None = None,
        memory_id: str | None = None,
    ) -> str:
        """Embed text and store in Pinecone."""
        vector = self.embedder.embed_text(text)
        doc_id = memory_id or f"mem-{uuid.uuid4().hex[:12]}"

        meta = {
            "text": text,
            "namespace": namespace,
            "timestamp": datetime.utcnow().isoformat(),
            **(metadata or {}),
        }

        self.index.upsert(
            vectors=[{"id": doc_id, "values": vector, "metadata": meta}],
            namespace=namespace,
        )
        logger.info("Memory stored", id=doc_id, namespace=namespace)
        return doc_id

    def search(
        self,
        query: str,
        namespace: str = NAMESPACE_LONG_TERM,
        top_k: int = 5,
        filter_dict: dict | None = None,
    ) -> list[dict]:
        """Semantic search over memory."""
        query_vector = self.embedder.embed_text(query)

        results = self.index.query(
            vector=query_vector,
            namespace=namespace,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict,
        )

        memories = []
        for match in results.get("matches", []):
            memories.append({
                "id": match["id"],
                "score": match["score"],
                "text": match.get("metadata", {}).get("text", ""),
                "metadata": match.get("metadata", {}),
            })

        logger.info("Memory search", query=query[:50], namespace=namespace, results=len(memories))
        return memories

    def delete(self, memory_id: str, namespace: str = NAMESPACE_LONG_TERM) -> bool:
        """Delete a specific memory by ID."""
        self.index.delete(ids=[memory_id], namespace=namespace)
        logger.info("Memory deleted", id=memory_id, namespace=namespace)
        return True

    def get_stats(self) -> dict:
        """Get index statistics."""
        stats = self.index.describe_index_stats()
        return {
            "total_vectors": stats.get("total_vector_count", 0),
            "namespaces": dict(stats.get("namespaces", {})),
        }


# Singleton
_service: MemoryService | None = None


def get_memory_service() -> MemoryService:
    global _service
    if _service is None:
        _service = MemoryService()
    return _service


def get_index_stats() -> dict:
    """Convenience function for quick stats check."""
    return get_memory_service().get_stats()
