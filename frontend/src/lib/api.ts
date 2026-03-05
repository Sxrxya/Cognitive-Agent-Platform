/**
 * Cognitive Agent Platform — API Service Layer
 * All backend API calls go through here.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API Error ${res.status}: ${err}`);
    }
    return res.json();
}

/* ─── Chat ─────────────────────────────────────────────── */
export interface ChatRequest {
    message: string;
    conversation_id?: string;
    use_memory?: boolean;
    use_tools?: boolean;
}
export interface ChatResponse {
    reply: string;
    conversation_id: string;
    sources: string[];
    reasoning_steps: string[];
    timestamp: string;
}

export const chatApi = {
    send: (body: ChatRequest) =>
        request<ChatResponse>("/api/chat/", { method: "POST", body: JSON.stringify(body) }),
    history: (id: string) =>
        request<{ messages: unknown[] }>(`/api/chat/history/${id}`),
};

/* ─── Agents ───────────────────────────────────────────── */
export interface AgentRunRequest {
    goal: string;
    priority?: string;
    auto_approve?: boolean;
}
export interface AgentTask {
    task_id: string;
    goal: string;
    status: string;
    priority: string;
    steps: { step_number: number; description: string; tool_used?: string; status: string; result?: string }[];
    created_at: string;
    completed_at?: string;
}
export interface AgentRunResponse {
    task: AgentTask;
    message: string;
}

export const agentsApi = {
    run: (body: AgentRunRequest) =>
        request<AgentRunResponse>("/api/agents/run", { method: "POST", body: JSON.stringify(body) }),
    list: () =>
        request<{ tasks: AgentTask[]; total: number }>("/api/agents/tasks"),
    get: (id: string) =>
        request<{ task: AgentTask }>(`/api/agents/tasks/${id}`),
    approve: (id: string) =>
        request<AgentRunResponse>(`/api/agents/tasks/${id}/approve`, { method: "POST" }),
};

/* ─── Memory ───────────────────────────────────────────── */
export interface MemoryEntry {
    id: string;
    text: string;
    memory_type: string;
    metadata: Record<string, unknown>;
    score?: number;
}

export const memoryApi = {
    store: (text: string, memory_type = "long_term", metadata?: Record<string, unknown>) =>
        request<{ memory_id: string }>("/api/memory/store", {
            method: "POST",
            body: JSON.stringify({ text, memory_type, metadata }),
        }),
    search: (query: string, top_k = 5, memory_type?: string) =>
        request<{ results: MemoryEntry[]; query: string; total_found: number }>("/api/memory/search", {
            method: "POST",
            body: JSON.stringify({ query, top_k, memory_type }),
        }),
    delete: (id: string) =>
        request<{ status: string }>(`/api/memory/${id}`, { method: "DELETE" }),
    stats: () =>
        request<{ stats: { total_vectors: number; namespaces: Record<string, unknown> } }>("/api/memory/stats"),
};

/* ─── Documents ────────────────────────────────────────── */
export const documentsApi = {
    upload: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        return fetch(`${API_BASE}/api/documents/upload`, { method: "POST", body: form }).then((r) => r.json());
    },
    ask: (question: string) =>
        request<{ answer: string; sources: string[]; context_chunks: number }>("/api/documents/ask", {
            method: "POST",
            body: JSON.stringify(question),
        }),
};

/* ─── Health ───────────────────────────────────────────── */
export const healthApi = {
    check: () => request<{ status: string; timestamp: string }>("/health"),
};
