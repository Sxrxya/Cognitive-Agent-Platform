"""
Cognitive Agent Platform — Memory Router
Manage vector memory: store, search, delete, and view stats.
"""

from fastapi import APIRouter
from models.schemas import (
    MemoryStoreRequest,
    MemorySearchRequest,
    MemorySearchResponse,
    MemoryEntry,
    MemoryType,
)
from services.memory_service import get_memory_service

router = APIRouter()


@router.post("/store")
async def store_memory(request: MemoryStoreRequest):
    """Store a new memory entry."""
    memory = get_memory_service()
    memory_id = memory.store(
        text=request.text,
        namespace=request.memory_type.value,
        metadata=request.metadata,
    )
    return {"memory_id": memory_id, "status": "stored", "namespace": request.memory_type.value}


@router.post("/search", response_model=MemorySearchResponse)
async def search_memory(request: MemorySearchRequest):
    """Search memory by semantic similarity."""
    memory = get_memory_service()
    namespace = request.memory_type.value if request.memory_type else "long_term"

    results = memory.search(query=request.query, namespace=namespace, top_k=request.top_k)

    entries = [
        MemoryEntry(
            id=r["id"],
            text=r["text"],
            memory_type=MemoryType(r.get("metadata", {}).get("namespace", "long_term")),
            metadata=r.get("metadata", {}),
            score=r.get("score"),
        )
        for r in results
    ]

    return MemorySearchResponse(results=entries, query=request.query, total_found=len(entries))


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, namespace: str = "long_term"):
    """Delete a specific memory by ID."""
    memory = get_memory_service()
    memory.delete(memory_id=memory_id, namespace=namespace)
    return {"status": "deleted", "memory_id": memory_id}


@router.get("/stats")
async def memory_stats():
    """Get memory index statistics."""
    memory = get_memory_service()
    stats = memory.get_stats()
    return {"stats": stats}
