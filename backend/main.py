"""
Cognitive Agent Platform — FastAPI Application (Production)
"""

import uuid
import time
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from config import get_settings
from routers import chat, agents, memory, documents
from routers import chat_stream

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    settings = get_settings()
    print(f"""
╔══════════════════════════════════════════════════╗
║       Cognitive Agent Platform v{settings.app_version}           ║
╠══════════════════════════════════════════════════╣
║  LLM Primary   : Gemini ({settings.gemini_model})     ║
║  LLM Fallback  : HuggingFace (Mistral 7B)       ║
║  Embeddings    : Local ({settings.embedding_model}) ║
║  Vector DB     : Pinecone ({settings.pinecone_index})       ║
║  Database      : SQLite (local)                  ║
║  Tools         : Browser, Search, Gmail, Calendar║
╠══════════════════════════════════════════════════╣
║  API Docs : http://localhost:{settings.backend_port}/docs          ║
║  Health   : http://localhost:{settings.backend_port}/health        ║
╚══════════════════════════════════════════════════╝
""")
    print("🚀 All systems online. Cost: $0/month.\n")
    yield
    print("\n🛑 Shutting down Cognitive Agent Platform...\n")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Production NLP + Agentic AI platform. Autonomous multi-step task execution "
            "with persistent memory, RAG, Gmail/Calendar integration, and tool use."
        ),
        lifespan=lifespan,
    )

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Request ID + Logging Middleware ---
    @app.middleware("http")
    async def request_middleware(request: Request, call_next):
        request_id = str(uuid.uuid4().hex[:8])
        start_time = time.time()

        # Bind request ID to all structured logs
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)

        duration_ms = round((time.time() - start_time) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        if request.url.path != "/health":
            logger.info(
                "request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=duration_ms,
            )

        return response

    # --- Global Exception Handler ---
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc) if settings.debug else "An unexpected error occurred.",
                "request_id": request.headers.get("X-Request-ID", "unknown"),
            },
        )

    # --- Routers ---
    app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
    app.include_router(chat_stream.router, prefix="/api/chat", tags=["Chat Streaming"])
    app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
    app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])
    app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])

    # --- Health Check ---
    @app.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "ok",
            "app": settings.app_name,
            "version": settings.app_version,
            "services": {
                "llm": "gemini + huggingface",
                "embeddings": settings.embedding_model,
                "vector_db": settings.pinecone_index,
                "tools": ["browser", "search", "gmail", "calendar", "document"],
            },
        }

    # --- Status Endpoint ---
    @app.get("/api/status", tags=["System"])
    async def system_status():
        """Detailed system status with all service health."""
        status = {"services": {}}

        # Test LLM
        try:
            from services.llm_service import get_llm_service
            get_llm_service()
            status["services"]["llm"] = {"status": "ok", "provider": "gemini"}
        except Exception as e:
            status["services"]["llm"] = {"status": "error", "error": str(e)}

        # Test Embeddings
        try:
            from services.embedding_service import get_embedding_service
            svc = get_embedding_service()
            status["services"]["embeddings"] = {
                "status": "ok",
                "model": settings.embedding_model,
                "dimension": svc.dimension,
            }
        except Exception as e:
            status["services"]["embeddings"] = {"status": "error", "error": str(e)}

        # Test Memory
        try:
            from services.memory_service import get_memory_service
            mem = get_memory_service()
            stats = mem.get_stats()
            status["services"]["memory"] = {"status": "ok", **stats}
        except Exception as e:
            status["services"]["memory"] = {"status": "error", "error": str(e)}

        return status

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.debug,
    )
