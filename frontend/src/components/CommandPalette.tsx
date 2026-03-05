"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    MessageSquare,
    Bot,
    Brain,
    FileText,
    Settings,
    Search,
    Mail,
    Calendar,
    Globe,
    Command,
} from "lucide-react";

interface CmdItem {
    id: string;
    label: string;
    icon: typeof MessageSquare;
    action: () => void;
    shortcut?: string;
    section: string;
}

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const items: CmdItem[] = [
        { id: "chat", label: "Go to Chat", icon: MessageSquare, action: () => router.push("/"), shortcut: "G C", section: "Navigation" },
        { id: "agents", label: "Go to Agents", icon: Bot, action: () => router.push("/agents"), shortcut: "G A", section: "Navigation" },
        { id: "memory", label: "Go to Memory", icon: Brain, action: () => router.push("/memory"), shortcut: "G M", section: "Navigation" },
        { id: "docs", label: "Go to Documents", icon: FileText, action: () => router.push("/documents"), shortcut: "G D", section: "Navigation" },
        { id: "settings", label: "Go to Settings", icon: Settings, action: () => router.push("/settings"), shortcut: "G S", section: "Navigation" },

        { id: "search-web", label: "Search the Web", icon: Globe, action: () => { router.push("/"); }, section: "Actions" },
        { id: "check-email", label: "Check Email", icon: Mail, action: () => { router.push("/"); }, section: "Actions" },
        { id: "check-calendar", label: "Check Calendar", icon: Calendar, action: () => { router.push("/"); }, section: "Actions" },
        { id: "new-agent", label: "Run New Agent Task", icon: Bot, action: () => router.push("/agents"), section: "Actions" },
        { id: "search-memory", label: "Search Memory", icon: Search, action: () => router.push("/memory"), section: "Actions" },
    ];

    const filtered = items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = useCallback(
        (item: CmdItem) => {
            item.action();
            setOpen(false);
            setQuery("");
        },
        []
    );

    // Keyboard handlers
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((prev) => !prev);
                setQuery("");
                setActiveIndex(0);
            }
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    // Arrow keys + enter inside palette
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && filtered[activeIndex]) {
                handleSelect(filtered[activeIndex]);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, filtered, activeIndex, handleSelect]);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    if (!open) return null;

    // Group by section
    const sections: Record<string, CmdItem[]> = {};
    for (const item of filtered) {
        if (!sections[item.section]) sections[item.section] = [];
        sections[item.section].push(item);
    }

    return (
        <div className="cmd-overlay" onClick={() => setOpen(false)}>
            <div className="cmd-palette animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 20px" }}>
                    <Command size={16} style={{ color: "var(--text-muted)" }} />
                    <input
                        ref={inputRef}
                        className="cmd-input"
                        placeholder="Type a command..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                    />
                </div>

                <div className="cmd-list">
                    {Object.entries(sections).map(([section, sectionItems]) => (
                        <div key={section}>
                            <div style={{ padding: "8px 14px 4px", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                                {section}
                            </div>
                            {sectionItems.map((item) => {
                                const isActive = filtered.indexOf(item) === activeIndex;
                                return (
                                    <div
                                        key={item.id}
                                        className={`cmd-item ${isActive ? "cmd-item-active" : ""}`}
                                        onClick={() => handleSelect(item)}
                                        onMouseEnter={() => setActiveIndex(filtered.indexOf(item))}
                                    >
                                        <item.icon size={16} className="cmd-item-icon" />
                                        <span className="cmd-item-label">{item.label}</span>
                                        {item.shortcut && <span className="cmd-item-shortcut">{item.shortcut}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                            No commands found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
