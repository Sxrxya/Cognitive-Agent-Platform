"""
Cognitive Agent Platform — FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from routers import chat, agents, memory, documents


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    settings = get_settings()
    print(f"\n🚀 {settings.app_name} v{settings.app_version} starting...")
    print(f"   LLM Provider : Gemini ({settings.gemini_model})")
    print(f"   Embeddings   : OpenAI ({settings.embedding_model})")
    print(f"   Vector DB    : Pinecone ({settings.pinecone_index})")
    print(f"   CORS Origins : {settings.cors_origins_list}")
    print(f"   Docs at      : http://localhost:{settings.backend_port}/docs\n")
    yield
    print("\n🛑 Shutting down Cognitive Agent Platform...\n")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "NLP + Agentic AI platform for autonomous multi-step task execution. "
            "Combines deep language understanding, persistent memory, and tool use."
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

    # --- Routers ---
    app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
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
        }

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
