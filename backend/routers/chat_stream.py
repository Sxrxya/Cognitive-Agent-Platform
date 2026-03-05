"""
Cognitive Agent Platform — Streaming Chat Router
Server-Sent Events (SSE) for real-time token streaming.
"""

import uuid
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest
from services.llm_service import get_llm_service
from services.memory_service import get_memory_service, NAMESPACE_SHORT_TERM
from services.rag_service import get_rag_service

router = APIRouter()

SYSTEM_INSTRUCTION = """You are the Cognitive Agent Platform (CAP) — an intelligent AI assistant.

Your capabilities:
- Deep natural language understanding
- Multi-step task planning and execution
- Memory-augmented reasoning (short-term + long-term)
- Document analysis and summarization
- Web research and information synthesis
- Email and calendar management

Be precise, helpful, and transparent about your reasoning process.
When you use retrieved context, cite the source.
If you're unsure, say so honestly."""


async def _stream_chat(request: ChatRequest):
    """Generator that yields SSE events."""
    conversation_id = request.conversation_id or f"conv-{uuid.uuid4().hex[:10]}"
    llm = get_llm_service()
    memory = get_memory_service()
    sources = []
    reasoning_steps = []

    prompt = request.message

    # --- Step 1: Memory retrieval ---
    if request.use_memory:
        yield _sse_event("reasoning", "Searching memory for relevant context...")
        reasoning_steps.append("Searching memory...")

        try:
            memories = memory.search(query=request.message, namespace=NAMESPACE_SHORT_TERM, top_k=3)
            long_memories = memory.search(query=request.message, top_k=3)

            context_parts = []
            for mem in memories + long_memories:
                if mem["score"] > 0.7:
                    context_parts.append(mem["text"])
                    sources.append(mem["id"])

            if context_parts:
                context = "\n".join(context_parts)
                prompt = f"Relevant context from memory:\n{context}\n\nUser message: {request.message}"
                yield _sse_event("reasoning", f"Found {len(context_parts)} relevant memories.")
        except Exception as e:
            yield _sse_event("reasoning", f"Memory search skipped: {str(e)}")

    # --- Step 2: RAG retrieval ---
    if request.use_tools:
        yield _sse_event("reasoning", "Checking knowledge base via RAG...")

        try:
            rag = get_rag_service()
            rag_results = rag.retrieve(request.message, top_k=3)
            if rag_results and rag_results[0].get("score", 0) > 0.75:
                rag_context = "\n".join([r["text"] for r in rag_results])
                prompt += f"\n\nKnowledge base context:\n{rag_context}"
                sources.extend([r.get("metadata", {}).get("document_id", r["id"]) for r in rag_results])
                yield _sse_event("reasoning", f"Retrieved {len(rag_results)} document chunks.")
        except Exception as e:
            yield _sse_event("reasoning", f"RAG lookup skipped: {str(e)}")

    # --- Step 3: Generate and stream response ---
    yield _sse_event("reasoning", "Generating response...")

    try:
        reply = await llm.generate_async(prompt, system_instruction=SYSTEM_INSTRUCTION)

        # Stream the reply in chunks to simulate real-time streaming
        chunk_size = 8
        words = reply.split(" ")
        buffer = ""
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            buffer += (" " if buffer else "") + chunk
            yield _sse_event("token", chunk + " ")
            await asyncio.sleep(0.03)  # Natural typing speed

    except Exception as e:
        yield _sse_event("error", f"Generation failed: {str(e)}")
        return

    # --- Step 4: Store in memory ---
    try:
        memory.store(
            text=f"User: {request.message}\nAssistant: {buffer[:500]}",
            namespace=NAMESPACE_SHORT_TERM,
            metadata={"conversation_id": conversation_id, "type": "conversation"},
        )
    except Exception:
        pass  # Non-critical

    # --- Final event ---
    yield _sse_event("done", json.dumps({
        "conversation_id": conversation_id,
        "sources": list(set(sources)),
        "reasoning_steps": reasoning_steps,
        "timestamp": datetime.utcnow().isoformat(),
    }))


def _sse_event(event: str, data: str) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {data}\n\n"


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream chat response via Server-Sent Events."""
    return StreamingResponse(
        _stream_chat(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
