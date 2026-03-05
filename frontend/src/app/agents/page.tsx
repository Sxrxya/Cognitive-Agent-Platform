"use client";

import { useState } from "react";
import {
    Bot,
    Play,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    ChevronDown,
    ChevronRight,
    Shield,
} from "lucide-react";
import { agentsApi, type AgentTask, type AgentRunResponse } from "@/lib/api";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; badge: string }> = {
    completed: { icon: CheckCircle2, badge: "badge-completed" },
    executing: { icon: Loader2, badge: "badge-executing" },
    failed: { icon: XCircle, badge: "badge-failed" },
    waiting: { icon: Clock, badge: "badge-waiting" },
    planning: { icon: Bot, badge: "badge-planning" },
};

export default function AgentsPage() {
    const [goal, setGoal] = useState("");
    const [autoApprove, setAutoApprove] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState<AgentTask[]>([]);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    const handleRun = async () => {
        if (!goal.trim() || loading) return;
        setLoading(true);
        setMessage("");

        try {
            const res: AgentRunResponse = await agentsApi.run({
                goal: goal.trim(),
                auto_approve: autoApprove,
            });
            setTasks((prev) => [res.task, ...prev]);
            setMessage(res.message);
            setExpandedTask(res.task.task_id);
            setGoal("");
        } catch (err) {
            setMessage(`⚠️ ${err instanceof Error ? err.message : "Failed to run agent"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (taskId: string) => {
        try {
            const res = await agentsApi.approve(taskId);
            setTasks((prev) => prev.map((t) => (t.task_id === taskId ? res.task : t)));
            setMessage(res.message);
        } catch (err) {
            setMessage(`⚠️ ${err instanceof Error ? err.message : "Approval failed"}`);
        }
    };

    const refreshTasks = async () => {
        try {
            const res = await agentsApi.list();
            setTasks(res.tasks);
        } catch {
            /* silent */
        }
    };

    return (
        <div style={{ maxWidth: "900px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Agent Hub</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Plan &amp; execute autonomous multi-step tasks
                </p>
            </div>

            {/* Input */}
            <div className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        className="input"
                        placeholder="Describe a goal, e.g. 'Research and summarize the latest AI agent papers...'"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRun()}
                        disabled={loading}
                    />
                    <button className="btn-primary" onClick={handleRun} disabled={loading || !goal.trim()}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Run
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={autoApprove}
                            onChange={(e) => setAutoApprove(e.target.checked)}
                            style={{ accentColor: "var(--accent)" }}
                        />
                        <Shield size={14} />
                        Auto-approve (skip safety review)
                    </label>

                    <button className="btn-ghost" onClick={refreshTasks} style={{ marginLeft: "auto", fontSize: "12px", padding: "6px 12px" }}>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Status Message */}
            {message && (
                <div className="glass-card animate-fade-in" style={{ padding: "12px 16px", marginBottom: "16px", fontSize: "13px" }}>
                    {message}
                </div>
            )}

            {/* Task List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {tasks.map((task) => {
                    const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.planning;
                    const StatusIcon = config.icon;
                    const isExpanded = expandedTask === task.task_id;

                    return (
                        <div key={task.task_id} className="glass-card animate-fade-in" style={{ overflow: "hidden" }}>
                            {/* Task Header */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "16px 20px",
                                    cursor: "pointer",
                                }}
                                onClick={() => setExpandedTask(isExpanded ? null : task.task_id)}
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{task.goal}</div>
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                        {task.task_id} &middot; {task.steps?.length || 0} steps
                                    </div>
                                </div>
                                <span className={`badge ${config.badge}`}>
                                    <StatusIcon size={12} />
                                    {task.status}
                                </span>
                                {task.status === "waiting" && (
                                    <button
                                        className="btn-primary"
                                        style={{ fontSize: "12px", padding: "6px 12px" }}
                                        onClick={(e) => { e.stopPropagation(); handleApprove(task.task_id); }}
                                    >
                                        Approve
                                    </button>
                                )}
                            </div>

                            {/* Steps Timeline */}
                            {isExpanded && task.steps && (
                                <div style={{ padding: "0 20px 20px 52px", borderTop: "1px solid var(--border)" }}>
                                    {task.steps.map((step) => {
                                        const stepConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.planning;
                                        return (
                                            <div
                                                key={step.step_number}
                                                style={{
                                                    display: "flex",
                                                    gap: "12px",
                                                    padding: "12px 0",
                                                    borderBottom: "1px solid var(--border)",
                                                    fontSize: "13px",
                                                }}
                                            >
                                                <div style={{ color: "var(--text-muted)", minWidth: "24px" }}>
                                                    {step.step_number}.
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div>{step.description}</div>
                                                    {step.tool_used && (
                                                        <div style={{ fontSize: "11px", color: "var(--accent-cyan)", marginTop: "4px" }}>
                                                            🔧 {step.tool_used}
                                                        </div>
                                                    )}
                                                    {step.result && (
                                                        <div style={{
                                                            marginTop: "8px",
                                                            padding: "8px 12px",
                                                            background: "var(--bg-secondary)",
                                                            borderRadius: "var(--radius-sm)",
                                                            fontSize: "12px",
                                                            color: "var(--text-secondary)",
                                                            maxHeight: "100px",
                                                            overflowY: "auto",
                                                        }}>
                                                            {step.result}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`badge ${stepConfig.badge}`} style={{ alignSelf: "flex-start" }}>
                                                    {step.status}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {tasks.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                        <Bot size={48} style={{ marginBottom: "12px", opacity: 0.3 }} />
                        <div>No tasks yet. Describe a goal above to get started.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
