"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    MessageSquare,
    Bot,
    Brain,
    FileText,
    Settings,
    Activity,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/", label: "Chat", icon: MessageSquare },
    { href: "/agents", label: "Agents", icon: Bot },
    { href: "/memory", label: "Memory", icon: Brain },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside
            style={{
                width: "260px",
                minHeight: "100vh",
                padding: "24px 16px",
                borderRight: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
            }}
        >
            {/* Logo */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    marginBottom: "24px",
                }}
            >
                <div
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--radius-md)",
                        background: "linear-gradient(135deg, var(--accent), var(--accent-cyan))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Activity size={20} color="white" />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: "16px" }} className="text-gradient">
                        CAP
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                        Cognitive Agent
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 14px",
                                borderRadius: "var(--radius-md)",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: isActive ? 600 : 500,
                                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                                background: isActive ? "var(--bg-hover)" : "transparent",
                                borderLeft: isActive
                                    ? "3px solid var(--accent)"
                                    : "3px solid transparent",
                                transition: "all 0.15s ease",
                            }}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: "12px 14px",
                    borderTop: "1px solid var(--border)",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                }}
            >
                v0.1.0 &middot; Connected
                <div
                    style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--accent-emerald)",
                        display: "inline-block",
                        marginLeft: "6px",
                    }}
                />
            </div>
        </aside>
    );
}
