import type { Metadata } from "next";
import WorkspaceApp from "../../components/workspace-app";
import "../workspace-chrome.css";
import "../focus-workspace.css";
import "../glass.css";
import "../calendar-chat.css";
import "../profile-settings.css";

export const metadata: Metadata = {
  title: "Your workspace",
  description: "Sign in to your AgentBuddy workspace.",
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return <WorkspaceApp />;
}
