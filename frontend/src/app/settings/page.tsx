"use client";

import { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    Server,
    CheckCircle2,
    XCircle,
    Loader2,
    Activity,
    Brain,
    Cpu,
    Globe,
    Mail,
    Calendar,
    FileText,
} from "lucide-react";
import { systemApi, type ServiceStatus } from "@/lib/api";

export default function SettingsPage() {
    const [healthStatus, setHealthStatus] = useState<"unknown" | "connected" | "error">("unknown");
    const [checking, setChecking] = useState(false);
    const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null);
    const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceStatus> | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);

    useEffect(() => {
        checkHealth();
        checkServiceStatus();
    }, []);

    const checkHealth = async () => {
        setChecking(true);
        try {
            const data = await systemApi.health();
            setHealthStatus("connected");
            setHealthData(data);
        } catch {
            setHealthStatus("error");
        } finally {
            setChecking(false);
        }
    };

    const checkServiceStatus = async () => {
        setLoadingStatus(true);
        try {
            const data = await systemApi.status();
            setServiceStatuses(data.services);
        } catch {
            /* silent */
        } finally {
            setLoadingStatus(false);
        }
    };

    const SERVICE_ICONS: Record<string, typeof Brain> = {
        llm: Cpu,
        embeddings: Brain,
        memory: Activity,
    };

    return (
        <div style={{ maxWidth: "700px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Settings</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Monitor services and configure your Cognitive Agent Platform
                </p>
            </div>

            {/* Connection Status */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Server size={18} />
                    Backend Connection
                </h3>

                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                    <div
                        className="input"
                        style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)" }}
                    >
                        http://localhost:8000
                    </div>
                    <button className="btn-primary" onClick={() => { checkHealth(); checkServiceStatus(); }} disabled={checking}>
                        {checking ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                        Test
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    {healthStatus === "connected" && (
                        <>
                            <CheckCircle2 size={16} style={{ color: "var(--accent-emerald)" }} />
                            <span style={{ color: "var(--accent-emerald)" }}>
                                Connected — {(healthData as Record<string, string>)?.app} v{(healthData as Record<string, string>)?.version}
                            </span>
                        </>
                    )}
                    {healthStatus === "error" && (
                        <>
                            <XCircle size={16} style={{ color: "var(--accent-rose)" }} />
                            <span style={{ color: "var(--accent-rose)" }}>Cannot reach backend</span>
                        </>
                    )}
                    {healthStatus === "unknown" && (
                        <span style={{ color: "var(--text-muted)" }}>Checking connection...</span>
                    )}
                </div>
            </div>

            {/* Live Service Status */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Activity size={18} />
                        Service Health (Live)
                    </h3>
                    <button className="btn-ghost" onClick={checkServiceStatus} disabled={loadingStatus} style={{ fontSize: "12px", padding: "6px 12px" }}>
                        {loadingStatus ? <Loader2 size={12} className="animate-spin" /> : "Refresh"}
                    </button>
                </div>

                {serviceStatuses ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {Object.entries(serviceStatuses).map(([name, svc]) => {
                            const Icon = SERVICE_ICONS[name] || Server;
                            const isOk = svc.status === "ok";
                            return (
                                <div
                                    key={name}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px 14px",
                                        background: "var(--bg-secondary)",
                                        borderRadius: "var(--radius-sm)",
                                        borderLeft: `3px solid ${isOk ? "var(--accent-emerald)" : "var(--accent-rose)"}`,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <Icon size={16} style={{ color: isOk ? "var(--accent-emerald)" : "var(--accent-rose)" }} />
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: 600, textTransform: "capitalize" }}>{name}</div>
                                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                                {svc.provider && `Provider: ${svc.provider}`}
                                                {svc.model && ` · Model: ${svc.model}`}
                                                {svc.dimension && ` · ${svc.dimension}d`}
                                                {svc.total_vectors !== undefined && ` · ${svc.total_vectors} vectors`}
                                                {svc.error && `Error: ${svc.error}`}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`badge ${isOk ? "badge-completed" : "badge-failed"}`}>
                                        {svc.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                        {loadingStatus ? "Loading service status..." : "Connect to backend to see service health"}
                    </div>
                )}
            </div>

            {/* Integrated Tools */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
                    🔧 Integrated Tools
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                        { icon: Globe, name: "Web Browser", desc: "httpx + BeautifulSoup", status: "active" },
                        { icon: Globe, name: "Web Search", desc: "DuckDuckGo (free)", status: "active" },
                        { icon: Mail, name: "Gmail", desc: "OAuth2 API", status: "active" },
                        { icon: Calendar, name: "Calendar", desc: "OAuth2 API", status: "active" },
                        { icon: FileText, name: "Documents", desc: "PDF, DOCX, TXT", status: "active" },
                        { icon: Brain, name: "Memory", desc: "Pinecone vectors", status: "active" },
                    ].map((tool) => (
                        <div
                            key={tool.name}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "10px 14px",
                                background: "var(--bg-secondary)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "13px",
                            }}
                        >
                            <tool.icon size={16} style={{ color: "var(--accent-emerald)" }} />
                            <div>
                                <div style={{ fontWeight: 600 }}>{tool.name}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tool.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* API Keys */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
                    🔑 API Keys
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                    Configured server-side in <code style={{ background: "var(--bg-hover)", padding: "2px 6px", borderRadius: "4px" }}>.env</code>
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                        { name: "Google Gemini", env: "GEMINI_API_KEY", cost: "Free" },
                        { name: "HuggingFace", env: "HUGGINGFACE_API_KEY", cost: "Free" },
                        { name: "Pinecone", env: "PINECONE_API_KEY", cost: "Free tier" },
                        { name: "Cohere", env: "COHERE_API_KEY", cost: "Free tier" },
                        { name: "Google OAuth", env: "credentials.json", cost: "Free" },
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
                                <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>— {key.cost}</span>
                            </div>
                            <code style={{ fontSize: "11px", color: "var(--accent-light)" }}>{key.env}</code>
                        </div>
                    ))}
                </div>
            </div>

            {/* About */}
            <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>About CAP</h3>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.7" }}>
                    <p>
                        <strong>Cognitive Agent Platform</strong> — Autonomous AI combining NLP,
                        agentic reasoning, RAG memory, Gmail/Calendar, and real-time streaming.
                    </p>
                    <p style={{ marginTop: "8px" }}>
                        <strong>Version:</strong> 0.1.0<br />
                        <strong>Stack:</strong> FastAPI · Next.js · Pinecone · Gemini · LangGraph<br />
                        <strong>Cost:</strong> $0/month
                    </p>
                </div>
            </div>
        </div>
    );
}
