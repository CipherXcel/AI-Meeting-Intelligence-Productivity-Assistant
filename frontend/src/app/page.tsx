"use client";

import { useSession, useUser } from "@descope/nextjs-sdk/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SignInComponent from "@/components/auth/sign-in";
import { MeetAgentIcon, MeetAgentLogo } from "@/components/brand/logo";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  Video,
  Bot,
  Shield,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const { user } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "briefing" | "reschedule">("schedule");

  useEffect(() => {
    setMounted(true);
  }, []);

  const userEmail = user?.email || user?.name || "User";

  return (
    <div className="relative min-h-svh overflow-hidden app-shell-bg text-foreground">
      {/* Animated background decorative orbs */}
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      {/* Navigation Bar */}
      <nav
        className={`relative z-10 flex items-center justify-between px-6 py-4 md:px-12 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-md p-1.5 backdrop-blur-md">
            <MeetAgentIcon className="size-full" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              MeetAgent AI
            </span>
            <span className="hidden rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary sm:inline-block">
              Intelligence Assistant
            </span>
          </div>
        </div>




        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-[1.02]"
            >
              <span>Dashboard ({userEmail})</span>
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => router.push("/sign-in")}
              className="rounded-full border border-border/70 bg-card/80 px-5 py-2 text-sm font-medium backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Main Hero & Login Area */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-20 md:px-10 md:pt-12">
        <div className="grid items-start gap-12 lg:grid-cols-12">

          {/* Left Column: Product Overview & Current Features */}
          <div
            className={`flex flex-col lg:col-span-7 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
          >
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md">
              <Sparkles className="size-3.5" />
              AI Meeting Intelligence & Calendar Assistant
            </div>

            {/* Headline */}
            <h1 className="mt-5 font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your meetings, calendar & daily routines,{" "}
              <span className="landing-gradient-text">managed by AI</span>
            </h1>

            {/* Subtext */}
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              MeetAgent connects directly with your <strong>Google Calendar</strong> using <strong>Google Gemini AI</strong> and <strong>Mastra agent workflows</strong> to schedule, reschedule, generate Google Meet links, and manage attendee invites naturally.
            </p>

            {/* Live Capabilities Highlights */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-sm">
                <Video className="size-4 shrink-0 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Auto Google Meet Links</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-sm">
                <Users className="size-4 shrink-0 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Smart Attendee Invites</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-sm">
                <Clock className="size-4 shrink-0 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Free/Busy Conflict Check</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-sm">
                <Bot className="size-4 shrink-0 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Gemini 3.6 AI Intelligence</span>
              </div>
            </div>

            {/* Interactive Demo Simulation Box */}
            <div className="mt-8 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Assistant Simulation
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveTab("schedule")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activeTab === "schedule" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => setActiveTab("briefing")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activeTab === "briefing" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    Briefing
                  </button>
                  <button
                    onClick={() => setActiveTab("reschedule")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${activeTab === "reschedule" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    Reschedule
                  </button>
                </div>
              </div>

              {/* Simulated chat preview based on active tab */}
              <div className="mt-4 space-y-3">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-xs text-primary-foreground sm:text-sm">
                    {activeTab === "schedule" && "Create a meeting tomorrow at 10:00 AM for 30m with team@example.com"}
                    {activeTab === "briefing" && "What's on my schedule today?"}
                    {activeTab === "reschedule" && "Move my 2:00 PM sync to 4:00 PM tomorrow"}
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-md rounded-2xl rounded-tl-sm border border-border bg-muted/60 p-3.5 text-xs leading-relaxed text-foreground sm:text-sm">
                    {activeTab === "schedule" && (
                      <div>
                        <p className="font-semibold text-primary mb-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          Meeting created on Google Calendar!
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li>• <strong>Title:</strong> Project Sync</li>
                          <li>• <strong>Time:</strong> Tomorrow, 10:00 AM – 10:30 AM</li>
                          <li>• <strong>Attendees:</strong> team@example.com</li>
                          <li>• <strong>Meet Link:</strong> <span className="text-primary underline">meet.google.com/xyz-abcd-efg</span></li>
                        </ul>
                      </div>
                    )}
                    {activeTab === "briefing" && (
                      <div>
                        <p className="font-semibold text-primary mb-1">Here is your schedule for today:</p>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          <li>• <strong>10:00 AM</strong> — Sprint Planning (Google Meet)</li>
                          <li>• <strong>02:30 PM</strong> — Client Architecture Review</li>
                          <li>• <strong>04:45 PM</strong> — Daily Wrap-up</li>
                        </ul>
                      </div>
                    )}
                    {activeTab === "reschedule" && (
                      <div>
                        <p className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                          <RefreshCw className="size-3.5 text-primary" />
                          Event rescheduled successfully:
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sync moved to <strong>Tomorrow at 4:00 PM</strong>. Updated calendar invitations sent to all participants.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Sign-In & Authentication Card */}
          <div
            className={`flex flex-col lg:col-span-5 transition-all duration-1000 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
          >
            <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-border/50 sm:p-8">
              <div className="mb-5 flex flex-col items-center text-center">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-md p-2 backdrop-blur-md">
                  <MeetAgentIcon className="size-full" />
                </div>
                <h2 className="font-heading text-2xl font-bold tracking-tight">
                  {isAuthenticated ? "Welcome to MeetAgent" : "Get Started / Sign In"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {isAuthenticated
                    ? "You are logged in and ready to manage your calendar."
                    : "Sign in with Descope to link your Google Calendar."}
                </p>
              </div>

              {/* Auth state rendering */}
              {isSessionLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                  Checking session...
                </div>
              ) : isAuthenticated ? (
                <div className="flex flex-col gap-4 py-4">
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Signed in as:</p>
                    <p className="font-semibold text-foreground text-sm mt-0.5">{userEmail}</p>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-[1.01]"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="size-4" />
                  </button>
                  <button
                    onClick={() => router.push("/storage")}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-muted/50 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
                  >
                    <span>📦 Cloud Storage & Image Keeper</span>
                    <ArrowRight className="size-3.5" />
                  </button>

                </div>
              ) : (
                <div className="mt-2 min-h-[300px]">
                  <SignInComponent />
                </div>
              )}

              {/* Security info note */}
              <div className="mt-5 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
                <Shield className="inline size-3.5 text-primary mr-1 -mt-0.5" />
                Protected with enterprise authentication & OAuth 2.0.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-6 text-center text-xs text-muted-foreground backdrop-blur-md">
        © {new Date().getFullYear()} MeetAgent AI. All rights reserved.
      </footer>
    </div>
  );
}
