"""
Cognitive Agent Platform — RAG Service
Retrieval-Augmented Generation pipeline: chunk → embed → retrieve → augment.
"""

import uuid
import structlog
from services.embedding_service import get_embedding_service
from services.memory_service import get_memory_service, NAMESPACE_LONG_TERM
from services.llm_service import get_llm_service

logger = structlog.get_logger(__name__)

# Chunking config
DEFAULT_CHUNK_SIZE = 500  # characters
DEFAULT_CHUNK_OVERLAP = 50


def chunk_text(text: str, chunk_size: int = DEFAULT_CHUNK_SIZE, overlap: int = DEFAULT_CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


class RAGService:
    """Full RAG pipeline: ingest documents, retrieve context, generate answers."""

    def __init__(self):
        self.embedder = get_embedding_service()
        self.memory = get_memory_service()
        self.llm = get_llm_service()
        logger.info("RAGService initialized")

    def ingest_document(
        self,
        text: str,
        document_id: str | None = None,
        metadata: dict | None = None,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
    ) -> dict:
        """Chunk a document, embed chunks, and store in Pinecone."""
        doc_id = document_id or f"doc-{uuid.uuid4().hex[:10]}"
        chunks = chunk_text(text, chunk_size=chunk_size)

        for i, chunk in enumerate(chunks):
            chunk_meta = {
                "document_id": doc_id,
                "chunk_index": i,
                "total_chunks": len(chunks),
                **(metadata or {}),
            }
            self.memory.store(
                text=chunk,
                namespace=NAMESPACE_LONG_TERM,
                metadata=chunk_meta,
                memory_id=f"{doc_id}-chunk-{i}",
            )

        logger.info("Document ingested", doc_id=doc_id, chunks=len(chunks))
        return {
            "document_id": doc_id,
            "chunks_created": len(chunks),
            "total_characters": len(text),
        }

    def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        """Retrieve relevant chunks from memory."""
        return self.memory.search(query=query, namespace=NAMESPACE_LONG_TERM, top_k=top_k)

    def generate_with_context(self, query: str, top_k: int = 5) -> dict:
        """Full RAG: retrieve context → augment prompt → generate answer."""
        # Step 1: Retrieve
        retrieved = self.retrieve(query, top_k=top_k)
        context_texts = [r["text"] for r in retrieved]

        # Step 2: Build augmented prompt
        context_block = "\n\n---\n\n".join(context_texts) if context_texts else "No relevant context found."

        augmented_prompt = f"""You are a Cognitive Agent with access to a knowledge base.
Use the following context to answer the user's question accurately.
If the context doesn't contain the answer, say so honestly.

CONTEXT:
{context_block}

USER QUESTION:
{query}

ANSWER:"""

        # Step 3: Generate
        answer = self.llm.generate(augmented_prompt)

        sources = [r.get("metadata", {}).get("document_id", r["id"]) for r in retrieved]

        logger.info("RAG generation complete", query=query[:50], sources=len(sources))
        return {
            "answer": answer,
            "sources": list(set(sources)),
            "context_chunks": len(retrieved),
        }


# Singleton
_service: RAGService | None = None


def get_rag_service() -> RAGService:
    global _service
    if _service is None:
        _service = RAGService()
    return _service
