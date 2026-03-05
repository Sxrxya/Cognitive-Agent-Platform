"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, BookOpen, Cpu, Zap, Mail, Calendar, Globe, Copy, RotateCcw } from "lucide-react";
import { useToast } from "@/components/Toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  reasoning?: string[];
  timestamp: Date;
  streaming?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const QUICK_ACTIONS = [
  { label: "Check my email", icon: Mail },
  { label: "What's on my calendar?", icon: Calendar },
  { label: "Search latest AI news", icon: Globe },
  { label: "Summarize our conversation", icon: Sparkles },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [useMemory, setUseMemory] = useState(true);
  const [useTools, setUseTools] = useState(true);
  const [useStreaming, setUseStreaming] = useState(true);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (overrideMessage?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setReasoningSteps([]);

    if (useStreaming) {
      await handleStreamingResponse(msg);
    } else {
      await handleRegularResponse(msg);
    }

    setLoading(false);
  };

  const handleStreamingResponse = async (message: string) => {
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date(), streaming: true },
    ]);

    try {
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId || undefined,
          use_memory: useMemory,
          use_tools: useTools,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (eventType === "token") {
              fullContent += data;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
              );
            } else if (eventType === "reasoning") {
              setReasoningSteps((prev) => [...prev, data]);
            } else if (eventType === "done") {
              try {
                const meta = JSON.parse(data);
                setConversationId(meta.conversation_id);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, streaming: false, sources: meta.sources } : m
                  )
                );
              } catch { /* ignore */ }
            } else if (eventType === "error") {
              fullContent += `\n⚠️ ${data}`;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent, streaming: false } : m))
              );
            }
          }
        }
      }
      toast("Response complete", "success");
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `⚠️ ${err instanceof Error ? err.message : "Connection failed"}`, streaming: false }
            : m
        )
      );
      toast("Connection failed", "error");
    }
  };

  const handleRegularResponse = async (message: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId || undefined,
          use_memory: useMemory,
          use_tools: useTools,
        }),
      });
      const data = await res.json();
      setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
          sources: data.sources,
          reasoning: data.reasoning_steps,
          timestamp: new Date(data.timestamp),
        },
      ]);
      toast("Response complete", "success");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ ${err instanceof Error ? err.message : "Connection failed"}`,
          timestamp: new Date(),
        },
      ]);
      toast("Connection failed", "error");
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard", "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
              <span className="text-gradient">Chat</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
              Powered by memory, RAG, Gmail &amp; Calendar
            </p>
          </div>
          <kbd style={{ fontSize: "11px" }}>Ctrl+K</kbd>
        </div>
      </div>

      {/* Toggle chips */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        <button className={useMemory ? "btn-primary" : "btn-ghost"} onClick={() => setUseMemory(!useMemory)} style={{ fontSize: "12px", padding: "6px 14px" }}>
          <BookOpen size={13} /> Memory {useMemory ? "ON" : "OFF"}
        </button>
        <button className={useTools ? "btn-primary" : "btn-ghost"} onClick={() => setUseTools(!useTools)} style={{ fontSize: "12px", padding: "6px 14px" }}>
          <Cpu size={13} /> Tools {useTools ? "ON" : "OFF"}
        </button>
        <button className={useStreaming ? "btn-primary" : "btn-ghost"} onClick={() => setUseStreaming(!useStreaming)} style={{ fontSize: "12px", padding: "6px 14px" }}>
          <Zap size={13} /> Stream {useStreaming ? "ON" : "OFF"}
        </button>
      </div>

      {/* Reasoning Steps */}
      {reasoningSteps.length > 0 && loading && (
        <div className="glass-card animate-fade-in" style={{ padding: "10px 16px", marginBottom: "12px", fontSize: "12px", color: "var(--accent-cyan)", display: "flex", flexDirection: "column", gap: "4px" }}>
          {reasoningSteps.map((step, i) => (
            <div key={i} className="animate-fade-in">🔍 {step}</div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="glass-card" style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "20px" }}>
            <Sparkles size={48} style={{ color: "var(--accent-light)" }} className="animate-pulse-glow" />
            <div style={{ fontSize: "20px", fontWeight: 700 }} className="text-gradient">What can I help you with?</div>
            <div style={{ fontSize: "13px", maxWidth: "440px", textAlign: "center", color: "var(--text-muted)" }}>
              I can plan tasks, search the web, browse documents, read your email, check your calendar, and remember everything.
            </div>

            {/* Quick Action Chips */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }} className="stagger-children">
              {QUICK_ACTIONS.map((action) => (
                <button key={action.label} className="chip" onClick={() => handleSend(action.label)}>
                  <action.icon size={13} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "75%", position: "relative" }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: msg.role === "user"
                    ? "var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)"
                    : "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, var(--accent), #6d28d9)"
                    : "var(--bg-card)",
                  border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
                {msg.streaming && (
                  <span className="animate-pulse-glow" style={{ display: "inline-block", width: "8px", height: "16px", background: "var(--accent-light)", marginLeft: "2px", borderRadius: "2px" }} />
                )}
              </div>

              {/* Message actions */}
              {msg.role === "assistant" && !msg.streaming && msg.content && (
                <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                  <button className="btn-icon" onClick={() => copyMessage(msg.content)} title="Copy">
                    <Copy size={13} />
                  </button>
                  <button className="btn-icon" onClick={() => handleSend(messages.find((m) => m.role === "user" && parseInt(m.id) < parseInt(msg.id))?.content || "")} title="Regenerate">
                    <RotateCcw size={13} />
                  </button>
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-muted)", padding: "6px 10px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                  📎 Sources: {msg.sources.join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && !messages.some((m) => m.streaming) && (
          <div className="animate-fade-in" style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--text-muted)" }}>
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontSize: "13px" }}>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <input
          className="input"
          placeholder="Ask anything... try 'check my email' or 'search for AI news'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
        />
        <button className="btn-primary" onClick={() => handleSend()} disabled={loading || !input.trim()} style={{ minWidth: "48px", justifyContent: "center", padding: "12px" }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
