"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, BookOpen, Cpu } from "lucide-react";
import { chatApi, type ChatResponse } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  reasoning?: string[];
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [useMemory, setUseMemory] = useState(true);
  const [useTools, setUseTools] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: ChatResponse = await chatApi.send({
        message: userMsg.content,
        conversation_id: conversationId || undefined,
        use_memory: useMemory,
        use_tools: useTools,
      });

      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.reply,
          sources: res.sources,
          reasoning: res.reasoning_steps,
          timestamp: new Date(res.timestamp),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Error: ${err instanceof Error ? err.message : "Connection failed"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
          <span className="text-gradient">Chat</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          Talk to your Cognitive Agent — powered by memory &amp; RAG
        </p>
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <button
          className={useMemory ? "btn-primary" : "btn-ghost"}
          onClick={() => setUseMemory(!useMemory)}
          style={{ fontSize: "12px", padding: "6px 14px" }}
        >
          <BookOpen size={14} />
          Memory {useMemory ? "ON" : "OFF"}
        </button>
        <button
          className={useTools ? "btn-primary" : "btn-ghost"}
          onClick={() => setUseTools(!useTools)}
          style={{ fontSize: "12px", padding: "6px 14px" }}
        >
          <Cpu size={14} />
          Tools {useTools ? "ON" : "OFF"}
        </button>
      </div>

      {/* Messages */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "16px",
              color: "var(--text-muted)",
            }}
          >
            <Sparkles size={48} style={{ color: "var(--accent-light)" }} />
            <div style={{ fontSize: "18px", fontWeight: 600 }}>What can I help you with?</div>
            <div style={{ fontSize: "13px", maxWidth: "400px", textAlign: "center" }}>
              I can plan multi-step tasks, search your documents, browse the web,
              and remember our conversations.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="animate-fade-in"
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "14px 18px",
                borderRadius:
                  msg.role === "user"
                    ? "var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)"
                    : "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, var(--accent), #6d28d9)"
                    : "var(--bg-card)",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                fontSize: "14px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--border)",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  Sources: {msg.sources.join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="animate-fade-in" style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--text-muted)" }}>
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontSize: "13px" }}>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "16px",
        }}
      >
        <input
          className="input"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ minWidth: "48px", justifyContent: "center", padding: "12px" }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
