"use client";

import { useState, useEffect } from "react";
import { Brain, Search, Trash2, Database, Loader2 } from "lucide-react";
import { memoryApi, type MemoryEntry } from "@/lib/api";

export default function MemoryPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MemoryEntry[]>([]);
    const [namespace, setNamespace] = useState<string>("long_term");
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<{ total_vectors: number; namespaces: Record<string, unknown> } | null>(null);

    // Store new memory
    const [storeText, setStoreText] = useState("");
    const [storeStatus, setStoreStatus] = useState("");

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await memoryApi.stats();
            setStats(res.stats);
        } catch {
            /* silent */
        }
    };

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await memoryApi.search(query, 10, namespace);
            setResults(res.results);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStore = async () => {
        if (!storeText.trim()) return;
        try {
            const res = await memoryApi.store(storeText, namespace);
            setStoreStatus(`✅ Stored as ${res.memory_id}`);
            setStoreText("");
            loadStats();
        } catch {
            setStoreStatus("⚠️ Failed to store");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await memoryApi.delete(id);
            setResults((prev) => prev.filter((r) => r.id !== id));
            loadStats();
        } catch {
            /* silent */
        }
    };

    return (
        <div style={{ maxWidth: "900px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Memory Explorer</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    View, search, and manage vector memory (Pinecone)
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="glass-card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "32px" }}>
                    <div>
                        <div style={{ fontSize: "24px", fontWeight: 700 }} className="text-gradient">{stats.total_vectors}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Vectors</div>
                    </div>
                    <div>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-cyan)" }}>
                            {Object.keys(stats.namespaces).length}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Namespaces</div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
                        {["short_term", "long_term", "episodic"].map((ns) => (
                            <button
                                key={ns}
                                className={namespace === ns ? "btn-primary" : "btn-ghost"}
                                onClick={() => setNamespace(ns)}
                                style={{ fontSize: "11px", padding: "5px 10px" }}
                            >
                                {ns.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        className="input"
                        placeholder="Semantic search across memories..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button className="btn-primary" onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Search
                    </button>
                </div>
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
                {results.map((mem) => (
                    <div key={mem.id} className="glass-card animate-fade-in" style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "14px", marginBottom: "6px", lineHeight: "1.6" }}>{mem.text}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "12px" }}>
                                    <span>ID: {mem.id}</span>
                                    {mem.score !== undefined && (
                                        <span style={{ color: "var(--accent-emerald)" }}>
                                            Score: {(mem.score * 100).toFixed(1)}%
                                        </span>
                                    )}
                                    <span className={`badge badge-${mem.memory_type === "short_term" ? "executing" : "completed"}`}>
                                        {mem.memory_type}
                                    </span>
                                </div>
                            </div>
                            <button
                                className="btn-ghost"
                                onClick={() => handleDelete(mem.id)}
                                style={{ padding: "6px", color: "var(--accent-rose)" }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {results.length === 0 && query && !loading && (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        No results found.
                    </div>
                )}
            </div>

            {/* Store New Memory */}
            <div className="glass-card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Database size={16} />
                    Store New Memory
                </h3>
                <textarea
                    className="input"
                    placeholder="Enter text to store in memory..."
                    value={storeText}
                    onChange={(e) => setStoreText(e.target.value)}
                    rows={3}
                    style={{ resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                    {storeStatus && <span style={{ fontSize: "12px" }}>{storeStatus}</span>}
                    <button className="btn-primary" onClick={handleStore} style={{ marginLeft: "auto" }}>
                        Store
                    </button>
                </div>
            </div>
        </div>
    );
}
