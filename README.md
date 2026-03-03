# 🧠 Cognitive Agent Platform (CAP)

An autonomous AI platform combining **NLP**, **Machine Learning**, and **Agentic AI** to understand natural language, plan multi-step tasks, and execute real-world workflows.

> **Vision:** A digital co-worker that doesn't just answer questions — it plans, reasons, remembers, and acts across your tools.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  Chat UI  │  Agent Timeline  │  Memory Explorer  │  Settings │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                   Backend (FastAPI)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Chat API │  │Agent API │  │Memory API│  │Documents API│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │             │               │         │
│  ┌────▼──────────────▼─────────────▼───────────────▼──────┐ │
│  │              Service Layer                              │ │
│  │  LLM Service  │  Embedding  │  Memory  │  RAG Pipeline │ │
│  └──────┬────────────┬────────────┬────────────┬──────────┘ │
│         │            │            │            │             │
│  ┌──────▼────┐ ┌─────▼─────┐ ┌───▼────┐ ┌────▼──────────┐ │
│  │ Gemini    │ │ OpenAI    │ │Pinecone│ │ Agent Engine  │ │
│  │ (Primary) │ │ Embeddings│ │  VecDB │ │ Plan→Execute  │ │
│  │ HF (Back) │ │           │ │        │ │ Safety Guard  │ │
│  └───────────┘ └───────────┘ └────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Cognitive-Agent-Platform/
├── .env                        # API keys (git-ignored)
├── .env.example                # Template for developers
├── .gitignore
├── README.md
│
├── backend/                    # FastAPI + Python
│   ├── main.py                 # App entry point
│   ├── config.py               # Settings (Pydantic)
│   ├── requirements.txt
│   │
│   ├── models/
│   │   └── schemas.py          # Request/response schemas
│   │
│   ├── services/
│   │   ├── embedding_service.py  # OpenAI embeddings
│   │   ├── llm_service.py        # Gemini + HuggingFace
│   │   ├── memory_service.py     # Pinecone vector memory
│   │   └── rag_service.py        # RAG pipeline
│   │
│   ├── agents/
│   │   ├── planner.py           # Task decomposition
│   │   ├── executor.py          # Step execution engine
│   │   └── safety.py            # Safety guardrails
│   │
│   ├── tools/
│   │   ├── browser_tool.py      # Web scraping
│   │   ├── search_tool.py       # Web search
│   │   └── document_tool.py     # PDF/DOCX parsing
│   │
│   └── routers/
│       ├── chat.py              # /api/chat
│       ├── agents.py            # /api/agents
│       ├── memory.py            # /api/memory
│       └── documents.py         # /api/documents
│
└── frontend/                   # Next.js (coming next)
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM (Primary)** | Google Gemini 2.0 Flash |
| **LLM (Fallback)** | HuggingFace Inference |
| **Embeddings** | OpenAI text-embedding-3-large |
| **Vector DB** | Pinecone (cap-memory index) |
| **Backend** | FastAPI + Pydantic + Uvicorn |
| **Agent Framework** | LangGraph + Custom Planner |
| **Frontend** | Next.js (planned) |
| **Tools** | httpx, BeautifulSoup, pypdf |

---

## 🚀 Quick Start

### 1. Setup Environment
```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Start the Backend
```bash
cd backend
python main.py
# → API at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

### 4. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/chat/` | POST | Chat with memory + RAG |
| `/api/agents/run` | POST | Run autonomous agent |
| `/api/agents/tasks` | GET | List all tasks |
| `/api/memory/store` | POST | Store a memory |
| `/api/memory/search` | POST | Semantic memory search |
| `/api/memory/stats` | GET | Memory index stats |
| `/api/documents/upload` | POST | Upload & ingest document |
| `/api/documents/ask` | POST | Ask questions (RAG) |

---

## 🔑 Required API Keys

| Service | Purpose | Get Key |
|---------|---------|---------|
| Google Gemini | Primary LLM | [ai.google.dev](https://ai.google.dev) |
| HuggingFace | Fallback LLM | [huggingface.co](https://huggingface.co/settings/tokens) |
| OpenAI | Embeddings | [platform.openai.com](https://platform.openai.com/api-keys) |
| Pinecone | Vector memory | [app.pinecone.io](https://app.pinecone.io) |

---

## 📊 Project Status

- [x] ✅ API Keys collected (Gemini, HF, OpenAI, Pinecone)
- [x] ✅ Pinecone index created (cap-memory)
- [x] ✅ Environment configuration
- [x] ✅ Backend scaffolding (FastAPI)
- [x] ✅ Core services (Embedding, LLM, Memory, RAG)
- [x] ✅ Agent engine (Planner, Executor, Safety)
- [x] ✅ Tool modules (Browser, Search, Document)
- [x] ✅ API routers (Chat, Agents, Memory, Documents)
- [ ] 🔜 Frontend (Next.js)
- [ ] 🔜 Integration testing
- [ ] 🔜 Production deployment
