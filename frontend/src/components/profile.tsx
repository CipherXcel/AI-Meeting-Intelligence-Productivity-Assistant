import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Check,
  CalendarDays,
  LogOut,
  Link2,
  Palette,
  Clock3,
  UserRound,
  Sparkle,
  HardDrive,
  ArrowUpRight,
  RefreshCw,
  MessageSquare,
  CheckCheck,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { type Row, defaults, profileOf, themes, api } from "../lib/workspace";
import { Avatar, Heading } from "./ui";
import { AccountSecurity } from "./account-security";
type Props = {
  user: Row;
  tasks: Row[];
  docs: Row[];
  threads: Row[];
  busy: boolean;
  save: (u: Row) => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  logout: () => void;
  notify: (s: string) => void;
  openAssistant: () => void;
  openCalendar: () => void;
};
export function Profile({
  user,
  tasks,
  docs,
  threads,
  busy,
  save,
  connect,
  disconnect,
  logout,
  notify,
  openAssistant,
  openCalendar,
}: Props) {
  const [draft, setDraft] = useState<Row>({
      ...user,
      profile: profileOf(user),
    }),
    [saving, setSaving] = useState(false);
  const [section, setSection] = useState("personal");
  const [checking, setChecking] = useState(false),
    [connectionFeedback, setConnectionFeedback] = useState("");
  async function checkConnection() {
    setChecking(true);
    setConnectionFeedback("");
    try {
      const start = new Date().toISOString(),
        end = new Date(Date.now() + 86400000).toISOString();
      await api(
        `/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      );
      setConnectionFeedback(
        "Connection verified. Your calendar is responding.",
      );
    } catch (e: any) {
      setConnectionFeedback(e.message);
    } finally {
      setChecking(false);
    }
  }

  const file = useRef<HTMLInputElement>(null);
  const usedBytes = docs.reduce((sum, d) => sum + (Number(d.size) || 0), 0);
  const usedMB = usedBytes / 1024 / 1024;
  const storageLabel =
    usedMB < 1
      ? `${Math.ceil(usedBytes / 1024)} KB`
      : `${usedMB.toFixed(1)} MB`;
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      profile: { ...d.profile, theme: profileOf(user).theme },
    }));
  }, [user.profile?.theme]);
  const p = draft.profile;
  const savedPreferences = useRef(profileOf(user));
  savedPreferences.current = profileOf(user);
  useEffect(() => {
    document.documentElement.dataset.theme = p.theme;
    document.documentElement.dataset.density = p.density;
    return () => {
      document.documentElement.dataset.theme = savedPreferences.current.theme;
      document.documentElement.dataset.density =
        savedPreferences.current.density;
    };
  }, [p.theme, p.density]);
  const change = (key: string, value: unknown) =>
    setDraft({ ...draft, profile: { ...p, [key]: value } });
  async function photo(f?: File) {
    if (!f) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
      f.size > 5 * 1024 * 1024
    ) {
      notify("Choose a PNG, JPEG or WebP image under 5 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(f);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256,
      );
      bitmap.close();
      change("avatar", canvas.toDataURL("image/jpeg", 0.85));
    } catch {
      notify("This image could not be opened. Please choose another.");
    }
  }
  return (
    <div className="page profile-page">
      <Heading
        eyebrow="ACCOUNT"
        title="Profile & settings"
        action={
          <button
            className="secondary"
            onClick={() =>
              document
                .getElementById("calendar-connection")
                ?.scrollIntoView({ block: "center", behavior: "instant" })
            }
          >
            <Link2 size={14} /> Connections
          </button>
        }
      >
        Manage your details and workspace preferences.
      </Heading>
      <div className="profile-settings-layout">
        <div className="profile-editor">
          <section className="profile-banner">
            <div className="profile-identity">
              <Avatar user={draft} large />
              <div>
                <span className="eyebrow">PERSONAL WORKSPACE</span>
                <h2>{user.name}</h2>
                <p>
                  {user.profile?.role || "Personal account"}
                  {user.profile?.organisation
                    ? ` · ${user.profile.organisation}`
                    : ""}
                </p>
                <small>{user.email}</small>
              </div>
            </div>
            <div className="profile-summary-meta">
              <span>
                <Clock3 size={14} />
                {user.timezone}
              </span>
              <span>
                <CalendarDays size={14} />
                {user.duration} min meetings
              </span>
            </div>
          </section>
          <div
            className="profile-metrics"
            aria-label="Your workspace at a glance"
          >
            {[
              {
                label: "Conversations",
                value: threads.length,
                detail: "Saved chat history",
                icon: MessageSquare,
                tone: "purple",
              },
              {
                label: "Tasks completed",
                value: tasks.filter((t) => t.status === "done").length,
                detail: `Across ${tasks.length} tasks`,
                icon: CheckCheck,
                tone: "cyan",
              },
              {
                label: "Saved notes",
                value: docs.length,
                detail: `${storageLabel} of documents`,
                icon: FileText,
                tone: "neutral",
              },
            ].map(({ label, value, detail, icon: Icon, tone }) => (
              <article className={`profile-metric ${tone}`} key={label}>
                <div className="profile-metric-heading">
                  <span>{label}</span>
                  <Icon size={17} aria-hidden="true" />
                </div>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <nav className="profile-sections" aria-label="Profile sections">
            {[
              { id: "personal", label: "Personal", icon: UserRound },
              { id: "preferences", label: "Preferences", icon: Clock3 },
              { id: "appearance", label: "Appearance", icon: Palette },
              { id: "security", label: "Security", icon: ShieldCheck },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={section === id ? "page" : undefined}
                className={section === id ? "selected" : ""}
                onClick={() => setSection(id)}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          {section === "security" ? (
            <AccountSecurity />
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  await save(draft);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div className="profile-grid">
                {section === "personal" && (
                  <div className="panel">
                    <div className="section-head">
                      <h2>
                        <UserRound size={18} />
                        Personal details
                      </h2>
                    </div>
                    <div className="photo-controls">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => file.current?.click()}
                      >
                        <Camera size={16} />
                        Change photo
                      </button>
                      {p.avatar && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => change("avatar", "")}
                        >
                          Remove
                        </button>
                      )}
                      <input
                        ref={file}
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => photo(e.target.files?.[0])}
                      />
                    </div>
                    <label>
                      Display name
                      <input
                        required
                        maxLength={80}
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Account email
                      <input value={draft.email} readOnly />
                      <small>Your sign-in email</small>
                    </label>
                    <div className="form-grid">
                      <label>
                        Role
                        <input
                          maxLength={80}
                          value={p.role}
                          placeholder="What do you do?"
                          onChange={(e) => change("role", e.target.value)}
                        />
                      </label>
                      <label>
                        Organisation
                        <input
                          maxLength={100}
                          value={p.organisation}
                          placeholder="Where you do it"
                          onChange={(e) =>
                            change("organisation", e.target.value)
                          }
                        />
                      </label>
                    </div>
                    <label>
                      A little about you
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={p.bio}
                        placeholder="Your focus, interests, or what you’re working on…"
                        onChange={(e) => change("bio", e.target.value)}
                      />
                      <small>{p.bio.length}/500</small>
                    </label>
                  </div>
                )}
                {section === "preferences" && (
                  <div className="panel">
                    <div className="section-head">
                      <h2>
                        <Clock3 size={18} />
                        Working preferences
                      </h2>
                    </div>
                    <label>
                      Timezone
                      <input
                        required
                        list="timezones"
                        value={draft.timezone}
                        onChange={(e) =>
                          setDraft({ ...draft, timezone: e.target.value })
                        }
                      />
                      <datalist id="timezones">
                        {[
                          "Asia/Kolkata",
                          "Asia/Dubai",
                          "Asia/Singapore",
                          "Europe/London",
                          "Europe/Berlin",
                          "America/New_York",
                          "America/Los_Angeles",
                          "Australia/Sydney",
                          "UTC",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </datalist>
                    </label>
                    <div className="form-grid">
                      <label>
                        Default meeting
                        <select
                          value={draft.duration}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              duration: Number(e.target.value),
                            })
                          }
                        >
                          {Array.from(
                            new Set([
                              15,
                              20,
                              30,
                              45,
                              60,
                              90,
                              120,
                              draft.duration,
                            ]),
                          )
                            .sort((a, b) => a - b)
                            .map((n) => (
                              <option key={n} value={n}>
                                {n} minutes
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Time format
                        <select
                          value={p.timeFormat}
                          onChange={(e) => change("timeFormat", e.target.value)}
                        >
                          <option value="12">12 hour · 2:30 PM</option>
                          <option value="24">24 hour · 14:30</option>
                        </select>
                      </label>
                    </div>
                    <label>Working days</label>
                    <div className="weekdays">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <button
                          type="button"
                          key={i}
                          aria-label={
                            [
                              "Sunday",
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                            ][i]
                          }
                          aria-pressed={p.workingDays.includes(i)}
                          className={
                            p.workingDays.includes(i) ? "selected" : ""
                          }
                          onClick={() =>
                            change(
                              "workingDays",
                              p.workingDays.includes(i)
                                ? p.workingDays.filter((n: number) => n !== i)
                                : [...p.workingDays, i],
                            )
                          }
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <div className="form-grid">
                      <label>
                        Start of day
                        <input
                          type="time"
                          required
                          value={p.workStart}
                          onChange={(e) => change("workStart", e.target.value)}
                        />
                      </label>
                      <label>
                        End of day
                        <input
                          type="time"
                          required
                          value={p.workEnd}
                          onChange={(e) => change("workEnd", e.target.value)}
                        />
                      </label>
                    </div>
                    <p className="muted small-copy">
                      Saarthi uses your timezone, meeting length and working
                      preferences when suggesting a schedule.
                    </p>
                    <label>
                      Display density
                      <select
                        value={p.density}
                        onChange={(e) => change("density", e.target.value)}
                      >
                        <option value="comfortable">
                          Comfortable · room to breathe
                        </option>
                        <option value="compact">Compact · more in view</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
              {section === "appearance" && (
                <section className="panel appearance">
                  <div className="section-head">
                    <div>
                      <h2>
                        <Palette size={18} />
                        Workspace theme
                      </h2>
                      <p className="muted small-copy">
                        Choose the colours you work best in.
                      </p>
                    </div>
                  </div>
                  <div className="theme-grid">
                    {themes.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className={`theme-option ${p.theme === t.id ? "chosen" : ""}`}
                        onClick={() => change("theme", t.id)}
                        aria-pressed={p.theme === t.id}
                      >
                        <span className={`theme-preview ${t.id}`}>
                          <i />
                          <i />
                          <b />
                          <em />
                        </span>
                        <span className="section-head">
                          <strong>{t.name}</strong>
                          {p.theme === t.id && <Check size={16} />}
                        </span>
                        <small>{t.detail}</small>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="save-bar">
                <p className="muted">Preferences are saved to your account.</p>
                <button className="primary" disabled={busy || saving}>
                  {saving ? "Saving…" : "Save changes"}
                  <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
        <aside
          className="profile-connections"
          aria-label="Connections and account"
        >
          <div className="connections-heading">
            <Link2 size={15} />
            <span>Connected services</span>
          </div>
          <section className="connection-card" id="calendar-connection">
            <div className="connection-card-title">
              <span className="integration-icon">
                <CalendarDays size={23} />
              </span>
              <div>
                <h2>Google Calendar</h2>
                <span
                  className={`connection-state ${user.calendarConnected ? "connected" : user.calendarConfigured === false ? "setup" : "disconnected"}`}
                >
                  <i />
                  {user.calendarConnected
                    ? "Connected"
                    : user.calendarConfigured === false
                      ? "Setup needed"
                      : "Not connected"}
                </span>
              </div>
            </div>
            <p>
              View your meetings, find free time, and create meetings with
              Google Meet links.
            </p>
            <ul className="connection-details">
              <li>Uses your primary Google calendar</li>
              <li>Calendar changes require your approval</li>
              <li>Focus sessions are saved in AgentBuddy</li>
            </ul>
            {user.calendarConfigured === false && (
              <p className="connection-note">
                Google Calendar setup is required before you can connect. You
                can still use tasks and focus.
              </p>
            )}
            <div className="connection-actions">
              {user.calendarConnected ? (
                <>
                  <button
                    className="secondary connection-primary"
                    onClick={openCalendar}
                  >
                    Open calendar <ArrowUpRight size={14} />
                  </button>
                  <button
                    className="secondary"
                    disabled={checking || busy}
                    onClick={checkConnection}
                  >
                    <RefreshCw
                      size={14}
                      className={checking ? "checking-icon" : ""}
                    />
                    {checking ? "Checking…" : "Check connection"}
                  </button>
                  <button
                    className="text-button connection-disconnect"
                    disabled={busy}
                    onClick={disconnect}
                  >
                    <Link2 size={13} />
                    Disconnect calendar
                  </button>
                </>
              ) : (
                <button
                  className="primary"
                  disabled={busy || user.calendarConfigured === false}
                  onClick={connect}
                >
                  <Link2 size={14} />
                  Connect Google Calendar
                </button>
              )}
            </div>
            {connectionFeedback && (
              <p className="connection-note" role="status">
                {connectionFeedback}
              </p>
            )}
          </section>
          <section className="connection-card">
            <div className="connection-card-title">
              <span className="integration-icon ai">
                <Sparkle size={23} />
              </span>
              <div>
                <h2>Saarthi</h2>
                <span
                  className={`connection-state ${user.aiConfigured ? "configured" : "setup"}`}
                >
                  <i />
                  {user.aiConfigured ? "Key configured" : "Setup needed"}
                </span>
              </div>
            </div>
            <p>
              Plan meetings, search your notes, and turn conversations into next
              steps.
            </p>
            <p className="connection-note">
              {user.aiConfigured
                ? "An AI key is saved on the server. Provider access is checked when you send a message."
                : "An AI provider key is needed before Saarthi can respond."}
            </p>
            <button className="text-button" onClick={openAssistant}>
              Open Saarthi <ArrowUpRight size={14} />
            </button>
          </section>
          <section className="connection-card">
            <div className="connection-card-title">
              <span className="integration-icon storage">
                <HardDrive size={21} />
              </span>
              <div>
                <h2>Workspace storage</h2>
                <span className="connection-state configured">
                  <i />
                  {user.storage}
                </span>
              </div>
            </div>
            <div className="storage-summary">
              <strong>{storageLabel}</strong>
              <span>of 500 MB document storage</span>
            </div>
            <div
              className="storage-meter"
              role="meter"
              aria-label="Document storage used in megabytes"
              aria-valuemin={0}
              aria-valuemax={500}
              aria-valuenow={Math.min(usedMB, 500)}
            >
              <span style={{ width: `${Math.min(100, usedMB / 5)}%` }} />
            </div>
            <p>
              {docs.length} saved file{docs.length === 1 ? "" : "s"}
            </p>
            <p className="connection-note">
              Notes, conversations and focus history are saved to your account.
            </p>
          </section>
          <section className="connection-card account-session">
            <div className="session-caption">
              <ShieldCheck size={17} />
              <strong>Your account</strong>
            </div>
            <p>Manage your password or sign out. Your workspace stays saved.</p>
            <button
              className="text-button"
              onClick={() => {
                setSection("security");
                document
                  .querySelector(".profile-sections")
                  ?.scrollIntoView({ block: "start", behavior: "instant" });
              }}
            >
              <LockKeyhole size={14} />
              Change password
            </button>
            <button className="text-button" disabled={busy} onClick={logout}>
              <LogOut size={14} /> Sign out
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
