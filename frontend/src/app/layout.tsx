import type { Metadata } from "next";
import "./globals.css";
import "./workspace-chrome.css";
import "./focus-workspace.css";
import "./glass.css";
import "./calendar-chat.css";
import "./profile-settings.css";
export const metadata: Metadata = {
  title: "AgentBuddy · Your personal workspace",
  description:
    "Your meetings, notes, and next steps. One thoughtful workspace.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ivory">
      <body>{children}</body>
    </html>
  );
}
