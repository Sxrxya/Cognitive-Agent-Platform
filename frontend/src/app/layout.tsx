import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import CommandPalette from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "CAP — Cognitive Agent Platform",
  description: "Autonomous AI platform combining NLP, agentic reasoning, and persistent memory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="gradient-bg">
        <ToastProvider>
          <CommandPalette />
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main style={{ flex: 1, padding: "24px 32px", overflow: "auto" }}>{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
