"""
Cognitive Agent Platform — Chat Router
Handles conversational interactions with memory and RAG.
"""

import uuid
from fastapi import APIRouter
from datetime import datetime
from models.schemas import ChatRequest, ChatResponse
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

Be precise, helpful, and transparent about your reasoning process.
When you use retrieved context, cite the source.
If you're unsure, say so honestly."""


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message with optional memory and RAG."""
    conversation_id = request.conversation_id or f"conv-{uuid.uuid4().hex[:10]}"

    llm = get_llm_service()
    memory = get_memory_service()
    sources = []
    reasoning_steps = []

    prompt = request.message

    # Step 1: Retrieve relevant memory context
    if request.use_memory:
        reasoning_steps.append("Searching memory for relevant context...")
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
            reasoning_steps.append(f"Found {len(context_parts)} relevant memory entries.")

    # Step 2: Use RAG for document-grounded answers if needed
    if request.use_tools:
        reasoning_steps.append("Checking knowledge base via RAG...")
        rag = get_rag_service()
        rag_results = rag.retrieve(request.message, top_k=3)
        if rag_results and rag_results[0].get("score", 0) > 0.75:
            rag_context = "\n".join([r["text"] for r in rag_results])
            prompt += f"\n\nKnowledge base context:\n{rag_context}"
            sources.extend([r.get("metadata", {}).get("document_id", r["id"]) for r in rag_results])
            reasoning_steps.append(f"Retrieved {len(rag_results)} relevant document chunks.")

    # Step 3: Generate response
    reasoning_steps.append("Generating response...")
    reply = await llm.generate_async(prompt, system_instruction=SYSTEM_INSTRUCTION)

    # Step 4: Store in short-term memory
    memory.store(
        text=f"User: {request.message}\nAssistant: {reply[:500]}",
        namespace=NAMESPACE_SHORT_TERM,
        metadata={"conversation_id": conversation_id, "type": "conversation"},
    )
    reasoning_steps.append("Stored conversation in short-term memory.")

    return ChatResponse(
        reply=reply,
        conversation_id=conversation_id,
        sources=list(set(sources)),
        reasoning_steps=reasoning_steps,
        timestamp=datetime.utcnow(),
    )


@router.get("/history/{conversation_id}")
async def get_chat_history(conversation_id: str):
    """Retrieve chat history for a conversation."""
    memory = get_memory_service()
    results = memory.search(
        query=conversation_id,
        namespace=NAMESPACE_SHORT_TERM,
        top_k=20,
        filter_dict={"conversation_id": conversation_id},
    )
    return {"conversation_id": conversation_id, "messages": results}
