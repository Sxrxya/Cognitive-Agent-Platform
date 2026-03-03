"""
Cognitive Agent Platform — First Document Ingestion Script
Usage: python scripts/ingest.py path/to/document.pdf
"""

import sys
import os

# Ensure backend can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

import structlog
from services.rag_service import get_rag_service

logger = structlog.get_logger(__name__)

def ingest_file(file_path: str):
    if not os.path.exists(file_path):
        logger.error("File not found", path=file_path)
        sys.exit(1)

    logger.info("Starting ingestion...", path=file_path)
    
    # Read text
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Ingest via RAG Pipeline (which handles chunking + embedding + Pinecone upsert)
    rag = get_rag_service()
    result = rag.ingest_document(
        text=text,
        metadata={"source_file": os.path.basename(file_path), "ingest_script": True}
    )

    logger.info("Ingestion complete!", 
                document_id=result["document_id"], 
                chunks=result["chunks_created"])

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <path-to-text-file>")
        sys.exit(1)
    
    ingest_file(sys.argv[1])
