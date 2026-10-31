import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://cipherxcel.dev"),
  title: {
    default: "AgentBuddy — AI Calendar, Notes & Focus Assistant",
    template: "%s | AgentBuddy",
  },
  description:
    "Plan your day with AgentBuddy and Saarthi. Search saved notes, manage tasks, track focus sessions, and approve Google Calendar changes in one workspace.",
  applicationName: "AgentBuddy",
  icons: {
    icon: [{ url: "/favicon.png", sizes: "192x192", type: "image/png" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  authors: [{ name: "Priyanshu Raj" }],
  creator: "Priyanshu Raj",
  verification: {
    // Public site-ownership token; keep it available across deployments.
    google:
      process.env.GOOGLE_SITE_VERIFICATION ||
      "EsvA6T8P_NVNVuWPkGKpv9hTbHk-g_lH-GIQ2oojKw4",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ivory">
      <body>{children}</body>
    </html>
  );
}
