"use client";
import {
  Sparkle,
  LayoutDashboard,
  ListTodo,
  FileText,
  CalendarDays,
  ShieldCheck,
  Plus,
  Search,
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Square,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SaarthiDiary } from "./saarthi-diary";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWorkspace } from "../lib/use-workspace";
import { type Row } from "../lib/workspace";
import { AmbientGlow } from "../components/ambient-glow";
import { Brand } from "../components/ui";
import { Proposals } from "../components/proposals";
import { WorkspaceViews } from "../components/workspace-views";
import { FocusIndicator } from "../components/focus";
import { ProfileMenu } from "../components/profile-menu";
import { FloatingDock } from "./floating-dock";
import { WorkspaceDialogs } from "../components/workspace-dialogs";
export default function WorkspaceApp() {
  const w = useWorkspace();
  const [diaryChat, setDiaryChat] = useState(false);
  useEffect(() => {
    setDiaryChat(false);
  }, [w.view, w.thread, w.user?.id]);
  const {
    status,
    user,
    view,
    threads,
    thread,
    messages,
    proposals,
    pending,
    busy,
    chatBusy,
    threadLoading,
    progress,
    input,
    toast,
    signup,
  } = w;
  const showQueue = w.queue && !!thread;
  const actionPanel = useRef<HTMLElement>(null),
    actionToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const textarea = w.composer.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [input, view, status]);
  useEffect(() => {
    if (!showQueue) return;
    const outside = (e: PointerEvent) => {
      if (
        !actionPanel.current?.contains(e.target as Node) &&
        !actionToggle.current?.contains(e.target as Node)
      )
        w.setQueue(false);
    };
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        w.setQueue(false);
        actionToggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [showQueue]);
  const notification = toast && (
    <div className="toast" role="status">
      {toast}
      <button aria-label="Dismiss notification" onClick={() => w.setToast("")}>
        <X size={16} />
      </button>
    </div>
  );
  if (status === "loading")
    return (
      <div className="boot">
        <Brand />
        <span className="loader" />
        <p>Opening your private workspace…</p>
      </div>
    );
  if (status === "out" || !user)
    return (
      <main className="auth-page auth-glass-page">
        <AmbientGlow enabled sparkle />
        <section className="auth-form-wrap">
          <div className="auth-form">
            <div className="auth-brand">
              <Brand />
              <span>Your daily workspace.</span>
            </div>
            <span className="pill">
              <LockKeyhole size={13} /> Your own space
            </span>
            <h2>{signup ? "Create an account" : "Sign in"}</h2>
            <p>
              {signup
                ? "Create an account to start your workspace."
                : "Sign in to your AgentBuddy workspace."}
            </p>
            {w.bootError && (
              <div className="error-box">
                {w.bootError}
                <button onClick={w.boot} className="text-button">
                  <RefreshCw size={14} />
                  Retry connection
                </button>
              </div>
            )}
            <form onSubmit={w.login}>
              {signup && (
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={80}
                    placeholder="How should we call you?"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  minLength={10}
                  maxLength={128}
                  required
                  placeholder={
                    signup ? "At least 10 characters" : "Enter your password"
                  }
                />
              </label>
              <button className="primary auth-submit" disabled={busy}>
                {busy
                  ? "Signing in..."
                  : signup
                    ? "Create account"
                    : "Sign in to AgentBuddy"}
                <ArrowRight size={18} />
              </button>
            </form>
            <p className="auth-toggle">
              {signup ? "Already have an account?" : "New around here?"}{" "}
              <button onClick={() => w.setSignup(!signup)}>
                {signup ? "Sign in" : "Create an account"}
              </button>
            </p>
            <div className="auth-footnote">
              <ShieldCheck size={17} />
              Calendar changes always wait for your approval.
            </div>
            <p className="auth-credit">
              <a href="/">About AgentBuddy</a>
              <span>Created by Priyanshu Raj</span>
            </p>
          </div>
        </section>
        {notification}
      </main>
    );
  const visibleThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(w.historySearch.toLowerCase()),
  );
  const groupName = (t: Row) => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: user.timezone,
    });
    const date = new Date(t.updated_at || t.created_at).toLocaleDateString(
      "en-CA",
      { timeZone: user.timezone },
    );
    return date === today
      ? "Today"
      : Date.now() - new Date(t.updated_at || t.created_at).getTime() <
          7 * 86400000
        ? "Previous 7 days"
        : "Earlier";
  };
  const currentTitle = threads.find((t) => t.id === thread)?.title || "Saarthi";
  return (
    <div
      className={`shell ${view === "Saarthi" ? "assistant-view" : "full-workspace"} ${w.collapsed ? "history-collapsed" : ""}`}
    >
      <AmbientGlow enabled />
      {view === "Saarthi" && w.sidebar && (
        <button
          className="sidebar-backdrop"
          aria-label="Close conversations"
          onClick={() => w.setSidebar(false)}
        />
      )}
      {view === "Saarthi" && (
        <aside className={`history-sidebar ${w.sidebar ? "mobile-open" : ""}`}>
          <div className="sidebar-brand">
            <Brand />
            <button
              className="icon-button"
              aria-label="Close conversation panel"
              onClick={() => {
                w.setCollapsed(true);
                w.setSidebar(false);
              }}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          <p className="workspace-label">YOUR CONVERSATIONS</p>
          <button className="new-chat" disabled={chatBusy} onClick={w.newChat}>
            <Plus size={17} />
            New chat<span>↗</span>
          </button>
          <label className="search-field">
            <Search size={15} />
            <input
              aria-label="Search conversations"
              placeholder="Find a conversation"
              value={w.historySearch}
              onChange={(e) => w.setHistorySearch(e.target.value)}
            />
          </label>
          <div className="history-list">
            {visibleThreads.map((t, i) => (
              <div key={t.id}>
                {(i === 0 ||
                  groupName(t) !== groupName(visibleThreads[i - 1])) && (
                  <p className="history-group">{groupName(t)}</p>
                )}
                <div
                  className={`history-row ${thread === t.id ? "active" : ""}`}
                >
                  <button
                    disabled={chatBusy}
                    className="history-link"
                    onClick={() => w.openThread(t.id)}
                  >
                    <MessageSquare size={15} />
                    <span>{t.title}</span>
                  </button>
                  <div className="history-actions">
                    <button
                      disabled={chatBusy}
                      aria-label={`Rename ${t.title}`}
                      onClick={() => {
                        w.setSelected(t);
                        w.setModal("rename");
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      disabled={chatBusy}
                      aria-label={`Delete ${t.title}`}
                      onClick={() => w.remove("threads", t)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!visibleThreads.length && (
              <p className="history-empty">
                {w.historySearch
                  ? "No conversations match."
                  : "Your conversations will find a home here."}
              </p>
            )}
          </div>
          <div className="sidebar-connection">
            <div className="sidebar-connection-identity">
              <span
                className={`sidebar-calendar-icon ${user.calendarConnected ? "connected" : ""}`}
              >
                <CalendarDays size={18} />
              </span>
              <span
                className={`status-light ${user.calendarConnected ? "connected" : user.calendarConfigured === false ? "setup" : "disconnected"}`}
              />
              <span>
                Google Calendar
                <small>
                  {user.calendarConnected
                    ? "Connected"
                    : user.calendarConfigured === false
                      ? "Setup needed"
                      : "Not connected"}
                </small>
              </span>
            </div>
            <button
              className="text-button"
              aria-label="Inspect Google Calendar connection"
              onClick={() => {
                w.navigate("Profile");
                requestAnimationFrame(() =>
                  document
                    .getElementById("calendar-connection")
                    ?.scrollIntoView({ block: "center", behavior: "instant" }),
                );
              }}
            >
              Inspect <ArrowUpRight size={12} />
            </button>
          </div>
        </aside>
      )}
      <div className="workspace-main">
        <ProfileMenu w={w} />
        <FocusIndicator w={w} />
        {view !== "Saarthi" && (
          <button
            className="workspace-brand"
            onClick={() => w.navigate("Saarthi")}
            aria-label="AgentBuddy home"
          >
            <Brand />
          </button>
        )}
        {view === "Saarthi" && (
          <button
            className="icon-button history-toggle"
            aria-label="Open conversations"
            onClick={() => {
              w.setCollapsed(false);
              w.setSidebar(true);
            }}
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
        <FloatingDock
          userId={user.id}
          view={view}
          navigate={w.navigate}
          pending={pending.length}
        />
        {view === "Saarthi" ? (
          <div className="chat-layout queue-hidden">
            <section className="chat-main">
              {diaryChat ? (
                <SaarthiDiary
                  onClose={() => setDiaryChat(false)}
                  openDiary={() => w.navigate("Personal Diary")}
                />
              ) : (
                <>
                  <div className="chat-heading">
                    <div className="inline">
                      <span className="chat-symbol">
                        <Sparkle size={18} />
                      </span>
                      <div>
                        <h2>{currentTitle}</h2>
                        <small>
                          {messages.some((message) => message.privateDiary)
                            ? "Private diary replies are not saved"
                            : thread
                              ? "Saved conversation"
                              : "Your workspace assistant"}
                        </small>
                      </div>
                    </div>
                    {thread && (
                      <button
                        className={`queue-toggle ${w.queue ? "active" : ""}`}
                        ref={actionToggle}
                        aria-label="Conversation actions"
                        aria-controls="conversation-actions"
                        aria-expanded={w.queue}
                        onClick={() => w.setQueue(!w.queue)}
                      >
                        <ShieldCheck size={17} />
                        <span>Actions</span>
                        <b>
                          {
                            proposals.filter(
                              (p) =>
                                p.thread_id === thread &&
                                p.status === "pending",
                            ).length
                          }
                        </b>
                        <ChevronDown size={13} className="actions-chevron" />
                      </button>
                    )}
                  </div>
                  {showQueue && (
                    <aside
                      ref={actionPanel}
                      id="conversation-actions"
                      className="conversation-actions"
                      aria-label="Conversation actions"
                    >
                      <Proposals
                        key={thread}
                        items={proposals.filter((p) => p.thread_id === thread)}
                        user={user}
                        busy={busy}
                        act={w.proposalAction}
                        compact
                      />
                      <button
                        className="text-button"
                        onClick={() => w.navigate("All proposals")}
                      >
                        All proposals <ArrowUpRight size={13} />
                      </button>
                    </aside>
                  )}
                  <div className="messages">
                    {threadLoading ? (
                      <div className="empty">
                        <span className="loader" />
                        <p>Opening conversation…</p>
                      </div>
                    ) : !messages.length ? (
                      <div className="chat-welcome">
                        <span className="welcome-mark">
                          <Sparkle
                            size={38}
                            strokeWidth={1}
                            fill="currentColor"
                          />
                        </span>
                        <span className="eyebrow">
                          SAARTHI · YOUR AI ASSISTANT
                        </span>
                        <h1>
                          How can I help,
                          <br />
                          <em>{user.name.split(" ")[0]}?</em>
                        </h1>
                        <p>
                          Plan meetings, work with your notes, and keep track of
                          next steps.
                        </p>
                        <div className="suggestions">
                          {[
                            {
                              icon: CalendarDays,
                              title: "Plan a meeting",
                              text: "Help me find a free slot for a meeting during my working hours.",
                            },
                            {
                              icon: FileText,
                              title: "Explore my notes",
                              text: "Help me find decisions and action items in my saved notes.",
                            },
                            {
                              icon: ListTodo,
                              title: "Review my tasks",
                              text: "Show my pending tasks and help me decide what to work on next.",
                            },
                            {
                              icon: MessageSquare,
                              title: "Prepare an agenda",
                              text: "Help me prepare an agenda for my next meeting.",
                            },
                          ].map((s) => (
                            <button
                              key={s.title}
                              disabled={chatBusy}
                              onClick={() => {
                                w.setInput(s.text);
                                w.composer.current?.focus();
                              }}
                            >
                              <s.icon size={18} />
                              <span>{s.title}</span>
                              <ArrowUpRight size={15} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((m, i) => (
                        <article
                          className={`message ${m.role}`}
                          key={m.id || i}
                        >
                          <div className="message-content">
                            <span className="message-author">
                              {m.role === "user" ? "You" : "Saarthi"}
                              {m.privateDiary
                                ? " · Private diary · not saved"
                                : ""}
                            </span>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ href, children }) =>
                                  href?.startsWith("#note-") ? (
                                    <button
                                      className="text-button"
                                      onClick={() =>
                                        w.readDoc({ id: href.slice(6) })
                                      }
                                    >
                                      {children}
                                    </button>
                                  ) : (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {children}
                                    </a>
                                  ),
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        </article>
                      ))
                    )}
                    {chatBusy && (
                      <div className="thinking" role="status">
                        <span className="loader" />
                        {progress}
                      </div>
                    )}
                    <div ref={w.bottom} />
                  </div>
                  <div className="composer-wrap">
                    <form
                      className="composer"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void w.send();
                      }}
                    >
                      <textarea
                        ref={w.composer}
                        aria-label="Message Saarthi"
                        placeholder="Ask, plan, or untangle a thought…"
                        value={input}
                        maxLength={5000}
                        rows={2}
                        disabled={threadLoading}
                        onChange={(e) => w.setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            void w.send();
                          }
                        }}
                      />
                      <div className="composer-tools">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Upload a note"
                          disabled={busy || chatBusy}
                          onClick={() => w.upload.current?.click()}
                        >
                          <Plus size={20} />
                        </button>
                        <span>
                          <Sparkle size={13} />
                          Saarthi
                        </span>
                        {input.length > 4500 && (
                          <small>{input.length}/5000</small>
                        )}
                        {chatBusy ? (
                          <button
                            type="button"
                            className="send-button"
                            aria-label="Stop response"
                            onClick={() => w.abort.current?.abort()}
                          >
                            <Square size={16} />
                          </button>
                        ) : (
                          <button
                            className="send-button"
                            aria-label="Send message"
                            disabled={!input.trim() || threadLoading}
                          >
                            <ArrowUp size={20} />
                          </button>
                        )}
                      </div>
                    </form>
                    <p className="composer-caption">
                      <ShieldCheck size={12} />
                      You’re in control. Calendar changes need your approval.
                      <button
                        className="diary-chat-link"
                        onClick={() => setDiaryChat(true)}
                      >
                        Diary with Saarthi ↗
                      </button>
                      <span>↵ send · shift ↵ new line</span>
                    </p>
                  </div>
                </>
              )}
            </section>
          </div>
        ) : (
          <WorkspaceViews w={w} />
        )}
      </div>
      <input
        ref={w.upload}
        hidden
        type="file"
        accept=".pdf,.txt,.md,.srt,.vtt"
        onChange={(e) => w.uploadFile(e.target.files?.[0])}
      />
      {notification}
      <WorkspaceDialogs w={w} />
    </div>
  );
}
