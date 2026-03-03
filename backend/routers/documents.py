"""
Cognitive Agent Platform — Documents Router
Document ingestion, summarization, and topic extraction.
"""

import uuid
from fastapi import APIRouter, UploadFile, File
from models.schemas import DocumentUploadResponse, DocumentSummaryResponse
from services.rag_service import get_rag_service
from tools.document_tool import summarize_text, extract_key_topics, parse_pdf

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload and ingest a document into the knowledge base."""
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")

    # Handle PDF files
    if file.filename and file.filename.lower().endswith(".pdf"):
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        text = parse_pdf(tmp_path)
        os.unlink(tmp_path)

    doc_id = f"doc-{uuid.uuid4().hex[:10]}"
    rag = get_rag_service()
    result = rag.ingest_document(text=text, document_id=doc_id, metadata={"filename": file.filename})

    return DocumentUploadResponse(
        document_id=result["document_id"],
        filename=file.filename or "unknown",
        chunks_created=result["chunks_created"],
        total_tokens=result["total_characters"] // 4,  # rough estimate
        message=f"Document '{file.filename}' ingested with {result['chunks_created']} chunks.",
    )


@router.post("/ingest-text")
async def ingest_text(text: str, title: str = "Untitled"):
    """Ingest raw text into the knowledge base."""
    doc_id = f"doc-{uuid.uuid4().hex[:10]}"
    rag = get_rag_service()
    result = rag.ingest_document(text=text, document_id=doc_id, metadata={"title": title})
    return {
        "document_id": result["document_id"],
        "chunks_created": result["chunks_created"],
        "message": f"Text ingested as '{title}' with {result['chunks_created']} chunks.",
    }


@router.post("/summarize", response_model=DocumentSummaryResponse)
async def summarize_document(text: str):
    """Summarize given text."""
    doc_id = f"sum-{uuid.uuid4().hex[:8]}"
    summary = summarize_text(text)
    topics = extract_key_topics(text)

    return DocumentSummaryResponse(
        document_id=doc_id,
        summary=summary,
        key_topics=topics,
    )


@router.post("/ask")
async def ask_documents(question: str):
    """Ask a question against the ingested knowledge base (RAG)."""
    rag = get_rag_service()
    result = rag.generate_with_context(query=question)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "context_chunks": result["context_chunks"],
    }
