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
    Activity,
    Zap,
    Brain,
    Globe,
    Mail,
    Calendar,
    FileText,
} from "lucide-react";
import { agentsApi, type AgentTask, type AgentRunResponse } from "@/lib/api";
import { useToast } from "@/components/Toast";

const TOOL_ICONS: Record<string, typeof Globe> = {
    browser: Globe,
    scrape: Globe,
    search: Globe,
    email: Mail,
    gmail: Mail,
    send_email: Mail,
    calendar: Calendar,
    document: FileText,
    summarize: FileText,
    memory: Brain,
};

export default function AgentsPage() {
    const [goal, setGoal] = useState("");
    const [autoApprove, setAutoApprove] = useState(true);
    const [running, setRunning] = useState(false);
    const [tasks, setTasks] = useState<AgentTask[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const handleRun = async () => {
        if (!goal.trim()) return;
        setRunning(true);
        try {
            const res: AgentRunResponse = await agentsApi.run({
                goal: goal.trim(),
                priority: "medium",
                auto_approve: autoApprove,
            });
            setTasks((prev) => [res.task, ...prev]);
            setExpanded((prev) => ({ ...prev, [res.task.task_id]: true }));
            setGoal("");
            toast(res.message, res.task.status === "completed" ? "success" : "info");
        } catch (err) {
            toast(`Agent failed: ${err instanceof Error ? err.message : "Error"}`, "error");
        } finally {
            setRunning(false);
        }
    };

    const handleRefresh = async () => {
        try {
            const res = await agentsApi.list();
            setTasks(res.tasks);
            toast(`Loaded ${res.total} tasks`, "info");
        } catch {
            toast("Failed to load tasks", "error");
        }
    };

    const handleApprove = async (taskId: string) => {
        try {
            const res = await agentsApi.approve(taskId);
            setTasks((prev) => prev.map((t) => (t.task_id === taskId ? res.task : t)));
            toast("Task approved and executed", "success");
        } catch {
            toast("Approval failed", "error");
        }
    };

    const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; badge: string }> = {
        completed: { icon: CheckCircle2, color: "var(--accent-emerald)", badge: "badge-completed" },
        executing: { icon: Loader2, color: "var(--accent-cyan)", badge: "badge-executing" },
        failed: { icon: XCircle, color: "var(--accent-rose)", badge: "badge-failed" },
        waiting_approval: { icon: Clock, color: "var(--accent-amber)", badge: "badge-waiting" },
        planning: { icon: Activity, color: "var(--accent-light)", badge: "badge-planning" },
        idle: { icon: Clock, color: "var(--text-muted)", badge: "badge-idle" },
    };

    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const totalSteps = tasks.reduce((a, t) => a + t.steps.length, 0);
    const failedCount = tasks.filter((t) => t.status === "failed").length;

    return (
        <div style={{ maxWidth: "900px" }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
                    <span className="text-gradient">Agent Hub</span>
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    Autonomous task planning, execution, and reflection
                </p>
            </div>

            {/* Hero Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }} className="stagger-children">
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-light)" }}>{tasks.length}</div>
                    <div className="stat-label">Total Tasks</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-emerald)" }}>{completedCount}</div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-cyan)" }}>{totalSteps}</div>
                    <div className="stat-label">Steps Run</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: failedCount > 0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                        {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
                    </div>
                    <div className="stat-label">Success Rate</div>
                </div>
            </div>

            {/* Run Agent */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Zap size={16} style={{ color: "var(--accent-amber)" }} />
                    New Agent Task
                </h3>

                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <input
                        className="input"
                        placeholder="Describe a goal... e.g. 'Research and email summary of latest AI funding news'"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRun()}
                        disabled={running}
                    />
                    <button className="btn-primary" onClick={handleRun} disabled={running || !goal.trim()}>
                        {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Run
                    </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <input
                            type="checkbox"
                            checked={autoApprove}
                            onChange={(e) => setAutoApprove(e.target.checked)}
                            style={{ accentColor: "var(--accent)" }}
                        />
                        <Shield size={13} />
                        Auto-approve (skip safety review)
                    </label>
                    <button className="btn-ghost" onClick={handleRefresh} style={{ fontSize: "12px", padding: "6px 14px" }}>
                        Refresh Tasks
                    </button>
                </div>
            </div>

            {/* Task List with Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {tasks.length === 0 && (
                    <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                        <Bot size={40} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                            No tasks yet. Enter a goal and hit <strong>Run</strong> to start.
                        </div>
                    </div>
                )}

                {tasks.map((task) => {
                    const config = statusConfig[task.status] || statusConfig.idle;
                    const StatusIcon = config.icon;
                    const isOpen = expanded[task.task_id];

                    return (
                        <div key={task.task_id} className="glass-card animate-slide-up" style={{ overflow: "hidden" }}>
                            {/* Task header */}
                            <div
                                style={{
                                    padding: "16px 20px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    cursor: "pointer",
                                }}
                                onClick={() => setExpanded((prev) => ({ ...prev, [task.task_id]: !prev[task.task_id] }))}
                            >
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <StatusIcon size={16} style={{ color: config.color }} className={task.status === "executing" ? "animate-spin" : ""} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{task.goal}</div>
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                        {task.task_id} · {task.steps.length} steps · {new Date(task.created_at).toLocaleTimeString()}
                                    </div>
                                </div>
                                <span className={`badge ${config.badge}`}>{task.status.replace("_", " ")}</span>

                                {task.status === "waiting_approval" && (
                                    <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleApprove(task.task_id); }} style={{ fontSize: "12px", padding: "6px 14px" }}>
                                        Approve
                                    </button>
                                )}
                            </div>

                            {/* Timeline Steps */}
                            {isOpen && (
                                <div style={{ padding: "0 20px 20px 20px" }}>
                                    <div className="timeline">
                                        {task.steps.map((step) => {
                                            const stepConfig = statusConfig[step.status] || statusConfig.idle;
                                            const ToolIcon = step.tool_used ? (TOOL_ICONS[step.tool_used.toLowerCase()] || Bot) : Bot;

                                            return (
                                                <div key={step.step_number} className="timeline-item animate-fade-in">
                                                    <div className={`timeline-dot timeline-dot-${step.status}`} />
                                                    <div style={{
                                                        padding: "10px 14px",
                                                        background: "var(--bg-secondary)",
                                                        borderRadius: "var(--radius-sm)",
                                                        borderLeft: `3px solid ${stepConfig.color}`,
                                                    }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
                                                                <ToolIcon size={14} style={{ color: stepConfig.color }} />
                                                                Step {step.step_number}
                                                                {step.tool_used && (
                                                                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>
                                                                        ({step.tool_used})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`badge ${stepConfig.badge}`} style={{ fontSize: "10px", padding: "2px 8px" }}>
                                                                {step.status}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                                            {step.description}
                                                        </div>
                                                        {step.result && (
                                                            <div style={{ marginTop: "8px", padding: "8px 10px", background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-muted)", maxHeight: "120px", overflow: "auto", whiteSpace: "pre-wrap" }}>
                                                                {step.result.substring(0, 500)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
