"use client";

import { useState } from "react";
import { FileText, Upload, MessageSquare, Loader2, FileUp, Type, Sparkles } from "lucide-react";
import { documentsApi } from "@/lib/api";

export default function DocumentsPage() {
    // Upload state
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<string>("");

    // Text ingestion state
    const [rawText, setRawText] = useState("");
    const [textTitle, setTextTitle] = useState("");
    const [ingesting, setIngesting] = useState(false);
    const [ingestResult, setIngestResult] = useState("");

    // Question state
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState<{ answer: string; sources: string[]; context_chunks: number } | null>(null);
    const [asking, setAsking] = useState(false);

    // Summarize state
    const [sumText, setSumText] = useState("");
    const [summary, setSummary] = useState<{ summary: string; key_topics: string[] } | null>(null);
    const [summarizing, setSummarizing] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setUploadResult("");
        try {
            const res = await documentsApi.upload(file);
            setUploadResult(`✅ Ingested "${res.filename}" — ${res.chunks_created} chunks created`);
            setFile(null);
        } catch (err) {
            setUploadResult(`⚠️ ${err instanceof Error ? err.message : "Upload failed"}`);
        } finally {
            setUploading(false);
        }
    };

    const handleIngestText = async () => {
        if (!rawText.trim()) return;
        setIngesting(true);
        setIngestResult("");
        try {
            const res = await documentsApi.ingestText(rawText, textTitle || "Untitled");
            setIngestResult(`✅ ${res.message}`);
            setRawText("");
            setTextTitle("");
        } catch (err) {
            setIngestResult(`⚠️ ${err instanceof Error ? err.message : "Ingestion failed"}`);
        } finally {
            setIngesting(false);
        }
    };

    const handleAsk = async () => {
        if (!question.trim()) return;
        setAsking(true);
        setAnswer(null);
        try {
            const res = await documentsApi.ask(question);
            setAnswer(res);
        } catch (err) {
            setAnswer({ answer: `⚠️ ${err instanceof Error ? err.message : "Failed"}`, sources: [], context_chunks: 0 });
        } finally {
            setAsking(false);
        }
    };

    const handleSummarize = async () => {
        if (!sumText.trim()) return;
        setSummarizing(true);
        setSummary(null);
        try {
            const res = await documentsApi.summarize(sumText);
            setSummary(res);
        } catch (err) {
            setSummary({ summary: `⚠️ ${err instanceof Error ? err.message : "Failed"}`, key_topics: [] });
        } finally {
            setSummarizing(false);
        }
    };

    return (
        <div style={{ maxWidth: "900px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Documents</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Upload, ingest, summarize, and query your knowledge base
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                {/* File Upload */}
                <div className="glass-card" style={{ padding: "24px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Upload size={16} />
                        Upload File
                    </h3>

                    <div
                        style={{
                            border: "2px dashed var(--border)",
                            borderRadius: "var(--radius-md)",
                            padding: "30px",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "border-color 0.2s",
                        }}
                        onClick={() => document.getElementById("file-input")?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
                        }}
                    >
                        <FileUp size={28} style={{ color: "var(--accent-light)", marginBottom: "8px" }} />
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>
                            {file ? file.name : "Drop file or click"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            PDF, DOCX, TXT, MD
                        </div>
                        <input
                            id="file-input"
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            style={{ display: "none" }}
                        />
                    </div>

                    {file && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                            <button className="btn-primary" onClick={handleUpload} disabled={uploading} style={{ fontSize: "12px", padding: "6px 14px" }}>
                                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                Ingest
                            </button>
                        </div>
                    )}

                    {uploadResult && (
                        <div className="animate-fade-in" style={{ marginTop: "10px", fontSize: "12px", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                            {uploadResult}
                        </div>
                    )}
                </div>

                {/* Text Ingestion */}
                <div className="glass-card" style={{ padding: "24px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Type size={16} />
                        Ingest Text
                    </h3>

                    <input
                        className="input"
                        placeholder="Title (optional)"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        style={{ marginBottom: "8px", fontSize: "13px", padding: "8px 12px" }}
                    />
                    <textarea
                        className="input"
                        placeholder="Paste text content to add to knowledge base..."
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={4}
                        style={{ resize: "vertical", fontSize: "13px" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                        {ingestResult && <span style={{ fontSize: "11px" }}>{ingestResult}</span>}
                        <button className="btn-primary" onClick={handleIngestText} disabled={ingesting || !rawText.trim()} style={{ marginLeft: "auto", fontSize: "12px", padding: "6px 14px" }}>
                            {ingesting ? <Loader2 size={12} className="animate-spin" /> : <Type size={12} />}
                            Ingest
                        </button>
                    </div>
                </div>
            </div>

            {/* Ask + Summarize side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Ask Documents */}
                <div className="glass-card" style={{ padding: "24px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <MessageSquare size={16} />
                        Ask (RAG)
                    </h3>

                    <div style={{ display: "flex", gap: "8px" }}>
                        <input
                            className="input"
                            placeholder="Ask about your documents..."
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                            disabled={asking}
                            style={{ fontSize: "13px" }}
                        />
                        <button className="btn-primary" onClick={handleAsk} disabled={asking || !question.trim()} style={{ fontSize: "12px", padding: "6px 14px" }}>
                            {asking ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                        </button>
                    </div>

                    {answer && (
                        <div className="animate-fade-in" style={{ marginTop: "14px" }}>
                            <div style={{ fontSize: "13px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                                {answer.answer}
                            </div>
                            {answer.sources.length > 0 && (
                                <div style={{ marginTop: "8px", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "11px", color: "var(--text-muted)" }}>
                                    Sources: {answer.sources.join(", ")} · {answer.context_chunks} chunks
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Summarize */}
                <div className="glass-card" style={{ padding: "24px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Sparkles size={16} />
                        Summarize
                    </h3>

                    <textarea
                        className="input"
                        placeholder="Paste text to summarize..."
                        value={sumText}
                        onChange={(e) => setSumText(e.target.value)}
                        rows={3}
                        style={{ resize: "vertical", fontSize: "13px" }}
                    />
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                        <button className="btn-primary" onClick={handleSummarize} disabled={summarizing || !sumText.trim()} style={{ fontSize: "12px", padding: "6px 14px" }}>
                            {summarizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Summarize
                        </button>
                    </div>

                    {summary && (
                        <div className="animate-fade-in" style={{ marginTop: "12px" }}>
                            <div style={{ fontSize: "13px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                                {summary.summary}
                            </div>
                            {summary.key_topics.length > 0 && (
                                <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {summary.key_topics.map((topic, i) => (
                                        <span key={i} className="badge badge-planning">{topic}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
