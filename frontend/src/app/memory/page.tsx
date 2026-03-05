"use client";

import { useState, useEffect } from "react";
import { Brain, Search, Trash2, Database, Loader2, Save, BarChart3 } from "lucide-react";
import { memoryApi, type MemoryEntry } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function MemoryPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MemoryEntry[]>([]);
    const [searching, setSearching] = useState(false);
    const [namespace, setNamespace] = useState("long_term");
    const [stats, setStats] = useState<{ total_vectors: number; namespaces: Record<string, unknown> } | null>(null);
    const [storeText, setStoreText] = useState("");
    const [storing, setStoring] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await memoryApi.stats();
            setStats(res.stats);
        } catch { /* silent */ }
    };

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setResults([]);
        try {
            const res = await memoryApi.search(query, 10, namespace);
            setResults(res.results);
            toast(`Found ${res.total_found} results`, "success");
        } catch (err) {
            toast(`Search failed: ${err instanceof Error ? err.message : "Error"}`, "error");
        } finally {
            setSearching(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await memoryApi.delete(id);
            setResults((prev) => prev.filter((r) => r.id !== id));
            toast("Memory deleted", "success");
            loadStats();
        } catch {
            toast("Delete failed", "error");
        }
    };

    const handleStore = async () => {
        if (!storeText.trim()) return;
        setStoring(true);
        try {
            const res = await memoryApi.store(storeText, namespace);
            toast(`Stored as ${res.memory_id}`, "success");
            setStoreText("");
            loadStats();
        } catch (err) {
            toast(`Store failed: ${err instanceof Error ? err.message : "Error"}`, "error");
        } finally {
            setStoring(false);
        }
    };

    const NAMESPACES = [
        { key: "short_term", label: "Short-term", color: "var(--accent-cyan)" },
        { key: "long_term", label: "Long-term", color: "var(--accent-light)" },
        { key: "episodic", label: "Episodic", color: "var(--accent-amber)" },
    ];

    const getScoreColor = (score: number) => {
        if (score >= 0.8) return "var(--accent-emerald)";
        if (score >= 0.6) return "var(--accent-amber)";
        return "var(--accent-rose)";
    };

    return (
        <div style={{ maxWidth: "900px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Memory Explorer</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Semantic search, store, and manage your AI&apos;s memory
                </p>
            </div>

            {/* Stats + Namespace */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }} className="stagger-children">
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-light)" }}>
                        {stats?.total_vectors?.toLocaleString() || "—"}
                    </div>
                    <div className="stat-label">Total Vectors</div>
                </div>
                {NAMESPACES.map((ns) => {
                    const nsData = stats?.namespaces?.[ns.key] as Record<string, number> | undefined;
                    const count = nsData?.vector_count ?? 0;
                    return (
                        <div
                            key={ns.key}
                            className="stat-card"
                            style={{
                                cursor: "pointer",
                                borderColor: namespace === ns.key ? ns.color : undefined,
                                boxShadow: namespace === ns.key ? `0 0 15px ${ns.color}33` : undefined,
                            }}
                            onClick={() => setNamespace(ns.key)}
                        >
                            <div className="stat-value" style={{ color: ns.color }}>{count}</div>
                            <div className="stat-label">{ns.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Search */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Search size={16} />
                    Semantic Search
                </h3>

                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        className="input"
                        placeholder="Search memories by meaning..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        disabled={searching}
                    />
                    <button className="btn-primary" onClick={handleSearch} disabled={searching || !query.trim()}>
                        {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        Search
                    </button>
                </div>

                {/* Namespace Tabs */}
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    {NAMESPACES.map((ns) => (
                        <button
                            key={ns.key}
                            className={namespace === ns.key ? "btn-primary" : "btn-ghost"}
                            onClick={() => setNamespace(ns.key)}
                            style={{ fontSize: "12px", padding: "6px 14px" }}
                        >
                            {ns.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Results */}
            {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>
                        <BarChart3 size={13} style={{ display: "inline", verticalAlign: "middle" }} /> {results.length} results
                    </div>
                    {results.map((entry) => (
                        <div key={entry.id} className="glass-card animate-fade-in" style={{ padding: "16px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <code style={{ fontSize: "11px", color: "var(--accent-light)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "4px" }}>
                                        {entry.id}
                                    </code>
                                    <span className={`badge badge-${namespace === "short_term" ? "executing" : namespace === "episodic" ? "waiting" : "planning"}`} style={{ fontSize: "10px" }}>
                                        {entry.memory_type}
                                    </span>
                                </div>
                                <button className="btn-icon" onClick={() => handleDelete(entry.id)} title="Delete">
                                    <Trash2 size={14} style={{ color: "var(--accent-rose)" }} />
                                </button>
                            </div>

                            {/* Score bar */}
                            {entry.score !== undefined && (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                    <div style={{ flex: 1, height: "6px", background: "var(--bg-secondary)", borderRadius: "3px", overflow: "hidden" }}>
                                        <div style={{
                                            width: `${Math.round(entry.score * 100)}%`,
                                            height: "100%",
                                            background: `linear-gradient(90deg, ${getScoreColor(entry.score)}, ${getScoreColor(entry.score)}88)`,
                                            borderRadius: "3px",
                                            transition: "width 0.5s ease",
                                        }} />
                                    </div>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: getScoreColor(entry.score), minWidth: "40px" }}>
                                        {(entry.score * 100).toFixed(1)}%
                                    </span>
                                </div>
                            )}

                            <div style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                                {entry.text.substring(0, 400)}
                                {entry.text.length > 400 && "..."}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Store Memory */}
            <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Database size={16} />
                    Store New Memory
                </h3>

                <textarea
                    className="input"
                    placeholder="Type knowledge, facts, or context to remember..."
                    value={storeText}
                    onChange={(e) => setStoreText(e.target.value)}
                    rows={3}
                    style={{ resize: "vertical", fontSize: "13px", marginBottom: "10px" }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Storing to: <strong>{NAMESPACES.find((n) => n.key === namespace)?.label}</strong>
                    </span>
                    <button className="btn-primary" onClick={handleStore} disabled={storing || !storeText.trim()} style={{ fontSize: "13px" }}>
                        {storing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Store Memory
                    </button>
                </div>
            </div>
        </div>
    );
}
