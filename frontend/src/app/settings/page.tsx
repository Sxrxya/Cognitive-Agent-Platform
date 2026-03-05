"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Server, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { healthApi } from "@/lib/api";

export default function SettingsPage() {
    const [apiUrl, setApiUrl] = useState("http://localhost:8000");
    const [healthStatus, setHealthStatus] = useState<"unknown" | "connected" | "error">("unknown");
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        checkHealth();
    }, []);

    const checkHealth = async () => {
        setChecking(true);
        try {
            await healthApi.check();
            setHealthStatus("connected");
        } catch {
            setHealthStatus("error");
        } finally {
            setChecking(false);
        }
    };

    return (
        <div style={{ maxWidth: "700px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Settings</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Configure your Cognitive Agent Platform
                </p>
            </div>

            {/* Connection */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Server size={18} />
                    Backend Connection
                </h3>

                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                    <input
                        className="input"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="http://localhost:8000"
                    />
                    <button className="btn-primary" onClick={checkHealth} disabled={checking}>
                        {checking ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                        Test
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    {healthStatus === "connected" && (
                        <>
                            <CheckCircle2 size={16} style={{ color: "var(--accent-emerald)" }} />
                            <span style={{ color: "var(--accent-emerald)" }}>Connected to backend</span>
                        </>
                    )}
                    {healthStatus === "error" && (
                        <>
                            <XCircle size={16} style={{ color: "var(--accent-rose)" }} />
                            <span style={{ color: "var(--accent-rose)" }}>
                                Cannot reach backend. Make sure it&apos;s running at {apiUrl}
                            </span>
                        </>
                    )}
                    {healthStatus === "unknown" && (
                        <span style={{ color: "var(--text-muted)" }}>Checking connection...</span>
                    )}
                </div>
            </div>

            {/* API Keys Info */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
                    🔑 API Keys
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                    API keys are configured server-side in the <code style={{ background: "var(--bg-hover)", padding: "2px 6px", borderRadius: "4px" }}>.env</code> file.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                        { name: "Google Gemini", env: "GEMINI_API_KEY", desc: "Primary LLM" },
                        { name: "HuggingFace", env: "HUGGINGFACE_API_KEY", desc: "Fallback LLM" },
                        { name: "OpenAI", env: "OPENAI_API_KEY", desc: "Embeddings" },
                        { name: "Pinecone", env: "PINECONE_API_KEY", desc: "Vector Memory" },
                        { name: "Cohere", env: "COHERE_API_KEY", desc: "Multilingual Embeddings" },
                        { name: "SerpAPI", env: "SERPAPI_KEY", desc: "Web Search" },
                    ].map((key) => (
                        <div
                            key={key.env}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 14px",
                                background: "var(--bg-secondary)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "13px",
                            }}
                        >
                            <div>
                                <span style={{ fontWeight: 600 }}>{key.name}</span>
                                <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>— {key.desc}</span>
                            </div>
                            <code style={{ fontSize: "11px", color: "var(--accent-light)" }}>{key.env}</code>
                        </div>
                    ))}
                </div>
            </div>

            {/* About */}
            <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                    About CAP
                </h3>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.7" }}>
                    <p>
                        <strong>Cognitive Agent Platform</strong> is an autonomous AI platform combining NLP,
                        agentic reasoning, and retrieval-augmented memory.
                    </p>
                    <p style={{ marginTop: "8px" }}>
                        <strong>Version:</strong> 0.1.0<br />
                        <strong>Stack:</strong> FastAPI · Next.js · Pinecone · Gemini · LangGraph
                    </p>
                </div>
            </div>
        </div>
    );
}
