"""
Cognitive Agent Platform — Pydantic Models
Request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class AgentStatus(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    WAITING = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


class MemoryType(str, Enum):
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    EPISODIC = "episodic"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ──────────────────────────────────────────────
# Chat
# ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[str] = None
    use_memory: bool = True
    use_tools: bool = True


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    sources: list[str] = []
    tools_used: list[str] = []
    reasoning_steps: list[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────
# Memory
# ──────────────────────────────────────────────

class MemoryEntry(BaseModel):
    id: str
    text: str
    memory_type: MemoryType
    metadata: dict = {}
    score: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MemoryStoreRequest(BaseModel):
    text: str = Field(..., min_length=1)
    memory_type: MemoryType = MemoryType.LONG_TERM
    metadata: dict = {}


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    memory_type: Optional[MemoryType] = None
    top_k: int = Field(default=5, ge=1, le=50)


class MemorySearchResponse(BaseModel):
    results: list[MemoryEntry]
    query: str
    total_found: int


# ──────────────────────────────────────────────
# Agents
# ──────────────────────────────────────────────

class TaskStep(BaseModel):
    step_number: int
    description: str
    status: AgentStatus = AgentStatus.IDLE
    tool_used: Optional[str] = None
    result: Optional[str] = None


class AgentTask(BaseModel):
    task_id: str
    goal: str
    priority: TaskPriority = TaskPriority.MEDIUM
    status: AgentStatus = AgentStatus.IDLE
    steps: list[TaskStep] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class AgentRunRequest(BaseModel):
    goal: str = Field(..., min_length=1, max_length=5000)
    priority: TaskPriority = TaskPriority.MEDIUM
    auto_approve: bool = False


class AgentRunResponse(BaseModel):
    task: AgentTask
    message: str


# ──────────────────────────────────────────────
# Documents
# ──────────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_created: int
    total_tokens: int
    message: str


class DocumentSummaryResponse(BaseModel):
    document_id: str
    summary: str
    key_topics: list[str]
