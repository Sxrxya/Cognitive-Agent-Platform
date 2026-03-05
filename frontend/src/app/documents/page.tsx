"use client";

import { useState } from "react";
import { FileText, Upload, MessageSquare, Loader2, FileUp } from "lucide-react";
import { documentsApi } from "@/lib/api";

export default function DocumentsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<string>("");
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState<{ answer: string; sources: string[]; context_chunks: number } | null>(null);
    const [asking, setAsking] = useState(false);

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

    return (
        <div style={{ maxWidth: "900px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Documents</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Upload documents to the knowledge base and ask questions
                </p>
            </div>

            {/* Upload Section */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Upload size={18} />
                    Upload Document
                </h3>

                <div
                    style={{
                        border: "2px dashed var(--border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "40px",
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
                    <FileUp size={36} style={{ color: "var(--accent-light)", marginBottom: "12px" }} />
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>
                        {file ? file.name : "Drop a file here or click to browse"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                        Supports PDF, DOCX, TXT, MD
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Ingest
                        </button>
                    </div>
                )}

                {uploadResult && (
                    <div className="animate-fade-in" style={{ marginTop: "12px", fontSize: "13px", padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                        {uploadResult}
                    </div>
                )}
            </div>

            {/* Ask Section */}
            <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <MessageSquare size={18} />
                    Ask Documents (RAG)
                </h3>

                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        className="input"
                        placeholder="Ask a question about your uploaded documents..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                        disabled={asking}
                    />
                    <button className="btn-primary" onClick={handleAsk} disabled={asking || !question.trim()}>
                        {asking ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                        Ask
                    </button>
                </div>

                {answer && (
                    <div className="animate-fade-in" style={{ marginTop: "20px" }}>
                        <div style={{ fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                            {answer.answer}
                        </div>
                        {answer.sources.length > 0 && (
                            <div style={{ marginTop: "12px", padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-muted)" }}>
                                <span style={{ fontWeight: 600 }}>Sources:</span> {answer.sources.join(", ")}
                                &nbsp;&middot;&nbsp; {answer.context_chunks} context chunks used
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
