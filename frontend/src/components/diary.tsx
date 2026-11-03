"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookHeart,
  BookOpenText,
  Minimize2,
  Maximize2,
  PenLine,
  LayoutGrid,
  List,
  LockKeyhole,
  UnlockKeyhole,
  Plus,
  Search,
  Heart,
  Sparkles,
  Trash2,
  ArrowLeft,
  Check,
  Settings2,
  X,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { createPortal } from "react-dom";
import { DiaryDayCover } from "./diary-day-cover";
import { DiaryBook } from "./diary-book";
import { DiaryCanvas } from "./diary-canvas";
import type { DiaryImage } from "../lib/diary-images";
import type { TextBox } from "../lib/diary-canvas";
import {
  dailyPages,
  diaryDays,
  nextPagePosition,
  type Stroke,
} from "../lib/diary-pages";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/workspace";

type Sticker = { id: string; kind: string; x: number; y: number; size: number };
type Entry = {
  id: string;
  title: string;
  body: string;
  date: string;
  mood: string | null;
  tags: string[];
  favourite: boolean;
  stickers: Sticker[];
  trashed?: boolean;
  updatedAt?: string;
  createdAt?: string;
  position?: number;
  drawing?: Stroke[];
  images?: DiaryImage[];
  textBoxes?: TextBox[];
};
type Status = {
  configured: boolean;
  unlocked: boolean;
  remember: boolean;
  aiAllowed: boolean;
};
const onlineArt: Record<string, string> = {
  laugh: "😂",
  love: "😍",
  party: "🥳",
  cool: "😎",
  cry: "😭",
  think: "🤔",
  sleep: "😴",
  wave: "👋",
  clap: "👏",
  fire: "🔥",
  cat: "😺",
  celebrate: "🎉",
};
const art: Record<string, string> = {
  ...onlineArt,
  sun: "☀️",
  cloud: "☁️",
  flower: "🌷",
  coffee: "☕",
  heart: "💜",
  moon: "🌙",
  sparkle: "✨",
  butterfly: "🦋",
};
function StickerArt({ kind }: { kind: string }) {
  return (
    <span
      className={`diary-sticker-art ${kind} ${onlineArt[kind] ? "noto-sticker" : ""}`}
    >
      {onlineArt[kind] && (
        <img
          src={`/stickers/${kind}.webp`}
          width={192}
          height={192}
          alt=""
          loading="lazy"
          draggable={false}
        />
      )}
      <span className="sticker-fallback">{art[kind]}</span>
    </span>
  );
}
const moods = [
  { id: "radiant", icon: "☀", label: "Radiant" },
  { id: "good", icon: "☺", label: "Good" },
  { id: "okay", icon: "◡", label: "Okay" },
  { id: "low", icon: "☁", label: "Low" },
  { id: "heavy", icon: "☂", label: "Heavy" },
];
const prompts = [
  "One small thing I’m grateful for…",
  "Something I’d like to let go of…",
  "A moment I want to remember…",
  "What would make tomorrow a little better?",
];
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function payload(e: Entry) {
  const { id, trashed, updatedAt, createdAt, ...data } = e;
  return { ...data, tags: data.tags.map((t) => t.trim()).filter(Boolean) };
}
function Toggle({
  checked,
  change,
  children,
}: {
  checked: boolean;
  change: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="diary-toggle">
      <span>{children}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => change(e.target.checked)}
      />
      <span className="diary-switch" aria-hidden="true" />
    </label>
  );
}
export function Diary({ userId }: { userId: string }) {
  const restoreDiary = useRef(true);
  const [bookIndex, setBookIndex] = useState(0);
  const [bookReveal, setBookReveal] = useState(false);
  const [book, setBook] = useState(false),
    [expanded, setExpanded] = useState(false);
  function closeFullscreen() {
    setExpanded(false);
  }
  function toggleFullscreen() {
    setExpanded((value) => !value);
  }
  useEffect(() => {
    if (!expanded && !book) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expanded) setExpanded(false);
        else setBook(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [expanded, book]);
  const [collectionView, setCollectionView] = useState<"grid" | "list">("grid");
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [remember, setRemember] = useState(false),
    [consent, setConsent] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]),
    [draft, setDraft] = useState<Entry | null>(null),
    [saved, setSaved] = useState(""),
    [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"),
    [date, setDate] = useState(""),
    [month, setMonth] = useState(today().slice(0, 7));
  const [stickerSearch, setStickerSearch] = useState(""),
    [stickerPack, setStickerPack] = useState("all");
  const [stickersOpen, setStickersOpen] = useState(false),
    [selectedSticker, setSelectedSticker] = useState("");
  const [settings, setSettings] = useState(false),
    [newPassword, setNewPassword] = useState(""),
    [newConfirm, setNewConfirm] = useState(""),
    [preview, setPreview] = useState(false);
  const [assistant, setAssistant] = useState(false),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [chosen, setChosen] = useState<string[]>([]),
    [asking, setAsking] = useState(false);
  const state = useRef(status),
    current = useRef(draft),
    dirty = useRef(false),
    alive = useRef(true),
    serial = useRef(Promise.resolve()),
    revision = useRef(0),
    generation = useRef(0);
  state.current = status;
  current.current = draft;
  function clear() {
    generation.current++;
    restoreDiary.current = true;
    setBook(false);
    setBookReveal(false);
    setBookIndex(0);
    closeFullscreen();
    setStatus((s) => (s ? { ...s, unlocked: false, aiAllowed: false } : s));
    setEntries([]);
    setDraft(null);
    current.current = null;
    dirty.current = false;
    setAnswer("");
    setQuestion("");
    setChosen([]);
    setPassword("");
    setConfirm("");
    setNewPassword("");
    setNewConfirm("");
    setAssistant(false);
    setSettings(false);
    setSaved("");
    setSearch("");
    setDate("");
    setSelectedSticker("");
  }
  async function check() {
    const gen = generation.current;
    const value: Status = await api("/diary/status");
    if (!alive.current || gen !== generation.current) return;
    if (!value.unlocked && state.current?.unlocked) clear();
    setStatus(value);
    return value;
  }
  async function handleError(e: unknown) {
    if (!alive.current) return;
    setError(e instanceof Error ? e.message : "Something went wrong.");
    await check().catch(() => {});
  }
  async function refresh() {
    const gen = generation.current;
    const rows = await api("/diary/entries");
    if (
      alive.current &&
      gen === generation.current &&
      state.current?.unlocked
    ) {
      setEntries(rows);
      if (restoreDiary.current) {
        restoreDiary.current = false;
        try {
          const position = JSON.parse(
            localStorage.getItem(`diary:position:${userId}`) || "{}",
          );
          const page = rows.find(
            (e: Entry) => e.id === position.page && !e.trashed,
          );
          if (page) {
            current.current = page;
            setDraft(page);
            setPreview(position.preview !== false);
          }
          setBook(position.book === true);
          setBookIndex(
            Number.isInteger(position.index) ? Math.max(0, position.index) : 0,
          );
          setCollectionView(position.layout === "list" ? "list" : "grid");
        } catch {
          /* A missing or older preference simply opens the collection. */
        }
      }
    }
  }
  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    void (async () => {
      try {
        let s: Status = await api("/diary/status");
        if (!alive.current || cancelled) return;
        if (s.unlocked && !s.remember) {
          await api("/diary/lock", "POST");
          s = { ...s, unlocked: false, aiAllowed: false };
        }
        if (!alive.current || cancelled) return;
        state.current = s;
        setStatus(s);
        if (s.unlocked) await refresh();
      } catch (e) {
        if (alive.current) setError("Cannot reach your diary. Please retry.");
      }
    })();
    return () => {
      cancelled = true;
      alive.current = false;
      generation.current++;
      if (state.current?.unlocked && !state.current.remember)
        void api("/diary/lock", "POST").catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!status?.unlocked) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      if (!status.remember)
        timer = setTimeout(() => {
          clear();
          void api("/diary/lock", "POST").catch(() => {});
        }, 10 * 60_000);
    };
    const onPageHide = () => {
      if (!status.remember) clear();
    };
    reset();
    window.addEventListener("keydown", reset);
    window.addEventListener("pointerdown", reset);
    window.addEventListener("pagehide", onPageHide);
    const poll = setInterval(() => void check().catch(() => {}), 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [status?.unlocked, status?.remember]);
  useEffect(() => {
    if (!status?.unlocked || restoreDiary.current) return;
    localStorage.setItem(
      `diary:position:${userId}`,
      JSON.stringify({
        page: draft?.id,
        book,
        index: bookIndex,
        preview,
        layout: collectionView,
      }),
    );
  }, [
    status?.unlocked,
    draft?.id,
    book,
    bookIndex,
    preview,
    collectionView,
    userId,
  ]);
  function edit(patch: Partial<Entry>) {
    if (!current.current || current.current.trashed) return;
    const next = { ...current.current, ...patch };
    current.current = next;
    revision.current++;
    dirty.current = true;
    setDraft(next);
    setSaved("Unsaved changes");
  }
  function flush() {
    const work = serial.current.then(async () => {
      const e = current.current;
      if (!e || !dirty.current) return;
      const rev = revision.current,
        gen = generation.current;
      setSaved("Saving…");
      await api(`/diary/entries/${e.id}`, "PUT", payload(e));
      if (!alive.current || generation.current !== gen) return;
      setEntries((list) => [e, ...list.filter((x) => x.id !== e.id)]);
      if (revision.current === rev) {
        dirty.current = false;
        setSaved("Saved securely");
      }
    });
    serial.current = work.catch(() => {});
    return work;
  }
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => void flush().catch(handleError), 900);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    const leave = (event: Event) => {
      if (!state.current?.unlocked) return;
      event.preventDefault();
      void action(async () => {
        await flush();
        if (!state.current?.remember) {
          await api("/diary/lock", "POST");
          clear();
        }
        (event as CustomEvent<() => void>).detail();
      });
    };
    window.addEventListener("diary-before-leave", leave);
    return () => window.removeEventListener("diary-before-leave", leave);
  }, []);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      await handleError(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function unlock(e: FormEvent) {
    e.preventDefault();
    if (!status?.configured && password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }
    await action(async () => {
      const s = await api(
        `/diary/${status?.configured ? "unlock" : "setup"}`,
        "POST",
        { password, remember, aiAllowed: consent },
      );
      const next = { ...s, configured: true };
      state.current = next;
      setStatus(next);
      setPassword("");
      setConfirm("");
      await refresh();
    });
  }
  async function pick(e: Entry | null, editing = false) {
    await action(async () => {
      const latest = e?.id === current.current?.id ? current.current : e;
      await flush();
      current.current = latest;
      setDraft(latest);
      setSaved("");
      setSelectedSticker("");
      setStickersOpen(false);
      setPreview(!editing);
    });
  }
  async function create(targetDate?: string, append = false, afterId?: string) {
    const day = targetDate || date || today();
    const existing = dailyPages(
      entries.filter((e) => !e.trashed && e.date === day),
    )[0];
    if (existing && !append) {
      await pick(existing);
      return;
    }
    await action(async () => {
      await flush();
      const e: Entry = {
        id: crypto.randomUUID(),
        title: "",
        body: "",
        date: day,
        createdAt: new Date().toISOString(),
        position: nextPagePosition(
          entries.filter((p) => !p.trashed && p.date === day),
          afterId,
        ),
        drawing: [],
        mood: null,
        tags: [],
        favourite: false,
        stickers: [],
      };
      current.current = e;
      setDraft(e);
      dirty.current = true;
      revision.current++;
      setSaved("Your page is ready");
      setFilter("all");
      setSearch("");
      setPreview(false);
    });
  }
  async function favouriteDay() {
    if (!current.current || current.current.trashed) return;
    await action(async () => {
      await flush();
      const date = current.current!.date;
      const favourite =
        !entries.some((e) => !e.trashed && e.date === date && e.favourite) &&
        !current.current!.favourite;
      await api(`/diary/days/${date}/favourite`, "PATCH", { favourite });
      setEntries((rows) =>
        rows.map((e) =>
          !e.trashed && e.date === date ? { ...e, favourite } : e,
        ),
      );
      if (current.current?.date === date) {
        current.current = { ...current.current, favourite };
        setDraft(current.current);
      }
    });
  }
  async function lock() {
    await action(async () => {
      await flush();
      await api("/diary/lock", "POST");
      clear();
    });
  }
  async function trash(e: Entry, trashed: boolean) {
    await action(async () => {
      await flush();
      await api(`/diary/entries/${e.id}`, "PATCH", { trashed });
      current.current = null;
      setDraft(null);
      await refresh();
    });
  }
  async function allow(v: boolean) {
    await action(async () => {
      await api("/diary/access", "PATCH", { aiAllowed: v });
      setStatus((s) => s && { ...s, aiAllowed: v });
      if (!v) {
        setAnswer("");
        setQuestion("");
      }
    });
  }
  async function ask(e: FormEvent) {
    e.preventDefault();
    setAsking(true);
    setError("");
    setAnswer("");
    const gen = generation.current;
    try {
      await flush();
      const result = await api("/diary/ask", "POST", {
        question,
        entryIds: chosen,
      });
      if (alive.current && gen === generation.current) setAnswer(result.answer);
    } catch (e) {
      await handleError(e);
    } finally {
      if (alive.current) setAsking(false);
    }
  }
  const active = entries.filter((e) => !e.trashed),
    visible = entries.filter(
      (e) =>
        (filter === "trash" ? e.trashed : !e.trashed) &&
        (filter !== "favourites" ||
          active.some((p) => p.date === e.date && p.favourite)) &&
        (!date || e.date === date) &&
        entries.some(
          (p) =>
            p.date === e.date &&
            !!p.trashed === !!e.trashed &&
            `${p.title} ${p.body} ${p.tags.join(" ")} ${(p.textBoxes || []).map((b) => b.text).join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        ),
    );
  const [year, mon] = month.split("-").map(Number),
    first = (new Date(year, mon - 1, 1).getDay() + 6) % 7,
    days = new Date(year, mon, 0).getDate();
  const moveMonth = (delta: number) => {
    const d = new Date(year, mon - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const ordered = dailyPages(visible).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const daysInView = diaryDays(visible);
  const orderedAll = dailyPages(active);
  const dayPages = draft
    ? dailyPages([
        ...entries.filter(
          (e) =>
            e.date === draft.date &&
            !!e.trashed === !!draft.trashed &&
            e.id !== draft.id,
        ),
        draft,
      ])
    : [];
  const dayPageIndex = dayPages.findIndex((e) => e.id === draft?.id);
  const pageNumber = (e: Entry) =>
    orderedAll
      .filter((p) => p.date === e.date)
      .findIndex((p) => p.id === e.id) + 1 ||
    orderedAll.filter((p) => p.date === e.date).length + 1;
  const errorBox = error && (
    <div className="diary-error" role="alert">
      {error}
      <button onClick={() => setError("")} aria-label="Dismiss error">
        <X size={15} />
      </button>
    </div>
  );
  if (!status)
    return (
      <section className="diary diary-loading">
        <BookHeart size={32} />
        <p>Opening your diary…</p>
        {errorBox}
        {error && (
          <button onClick={() => void check().catch(handleError)}>Retry</button>
        )}
      </section>
    );
  if (!status.unlocked)
    return (
      <section className="diary diary-gate">
        <div className="diary-gate-orb orb-one" />
        <div className="diary-gate-orb orb-two" />
        <form className="diary-lock-card" onSubmit={unlock}>
          <div className="diary-book-art">
            <BookHeart size={42} strokeWidth={1.2} />
            <span>✦</span>
          </div>
          <span className="diary-eyebrow">A LITTLE SPACE, JUST FOR YOU</span>
          <h1>
            Your thoughts.
            <br />
            <em>Your own space.</em>
          </h1>
          <p>
            {status.configured
              ? "Your account is signed in. Unlock your personal diary to continue."
              : "Create a separate password for the moments you want to keep close."}
          </p>
          {errorBox}
          <label className="diary-field">
            Diary password
            <input
              autoFocus
              type="password"
              autoComplete={status.configured ? "off" : "new-password"}
              minLength={10}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 10 characters"
            />
          </label>
          {!status.configured && (
            <label className="diary-field">
              Confirm diary password
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}
          <Toggle checked={remember} change={setRemember}>
            Remember access on this device
            <small>Up to 30 days, while this account stays signed in.</small>
          </Toggle>
          <Toggle checked={consent} change={setConsent}>
            Allow Saarthi in my diary
            <small>
              Only entries you select are shared with Gemini when you ask.
            </small>
          </Toggle>
          {remember && (
            <p className="diary-notice">
              Anyone using this signed-in session can open your diary. Use only
              on a private device.
            </p>
          )}
          <button className="diary-primary" disabled={busy}>
            <UnlockKeyhole size={17} />
            {busy
              ? "Opening…"
              : status.configured
                ? "Unlock my diary"
                : "Create my private diary"}
          </button>
          <div className="diary-security-note">
            <ShieldCheck size={14} />
            <span>
              Encrypted entries · Separate password · No automatic AI access
            </span>
          </div>
          {!status.configured && (
            <small>
              Keep this password safe. Your account password cannot reset or
              unlock the diary.
            </small>
          )}
        </form>
      </section>
    );
  const content = (
    <section
      aria-label="Personal diary"
      className={`diary ${expanded ? "diary-expanded" : ""} ${preview ? "diary-page-preview" : ""} ${book ? "diary-book-open" : ""} ${draft ? "diary-has-entry" : ""}`}
    >
      <header className="diary-header">
        <div>
          <span className="diary-eyebrow">YOUR PRIVATE CORNER</span>
          <h1>
            Personal diary<span>✦</span>
          </h1>
          <p>A place for the little things. And the big ones.</p>
        </div>
        <div className="diary-header-actions">
          <button
            aria-label="Diary privacy and password"
            onClick={() => setSettings(!settings)}
          >
            <Settings2 size={18} />
          </button>
          <button disabled={busy} onClick={lock}>
            <LockKeyhole size={15} /> Lock diary
          </button>
        </div>
      </header>
      <div className="diary-summary-strip" aria-label="Diary overview">
        <span>
          <BookHeart size={16} />
          <strong>{diaryDays(active).length}</strong> days
        </span>
        <span>
          <Heart size={16} />
          <strong>
            {diaryDays(active).filter((e) => e.favourite).length}
          </strong>{" "}
          favourite days
        </span>
        <span>
          <span className="diary-summary-dot" /> Auto-save on
        </span>
        <span>
          <LockKeyhole size={14} /> Private & encrypted
        </span>
      </div>
      {errorBox}
      {settings && (
        <section className="diary-settings">
          <header>
            <h2>Privacy, on your terms</h2>
            <button
              aria-label="Close settings"
              onClick={() => setSettings(false)}
            >
              <X size={18} />
            </button>
          </header>
          <Toggle checked={status.aiAllowed} change={(v) => void allow(v)}>
            Allow Saarthi access
            <small>
              Selected entries go to Gemini only when you send a question.
              Replies are not saved in chat history.
            </small>
          </Toggle>
          <p>
            {status.remember
              ? "Access is remembered on this signed-in device. Lock diary to revoke it."
              : "Locks when you leave this menu or after 10 minutes without activity."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword !== newConfirm) {
                setError("New passwords don’t match.");
                return;
              }
              void action(async () => {
                await flush();
                await api("/diary/password", "POST", {
                  currentPassword: password,
                  newPassword,
                });
                clear();
              });
            }}
          >
            <h3>Change diary password</h3>
            <input
              type="password"
              aria-label="Current diary password"
              placeholder="Current diary password"
              autoComplete="off"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              aria-label="New diary password"
              placeholder="New password · 10+ characters"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              aria-label="Confirm new diary password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              minLength={10}
              value={newConfirm}
              onChange={(e) => setNewConfirm(e.target.value)}
            />
            <button className="diary-primary" disabled={busy}>
              Update password & lock all devices
            </button>
          </form>
        </section>
      )}
      {expanded && !book && (
        <button
          className="diary-exit-fullscreen"
          aria-label="Exit fullscreen"
          title="Exit fullscreen (Esc)"
          onClick={closeFullscreen}
        >
          <Minimize2 size={19} />
        </button>
      )}
      {book ? (
        <DiaryBook
          expanded={expanded}
          onFullscreen={toggleFullscreen}
          pageIndex={bookIndex}
          onPageChange={setBookIndex}
          entries={entries}
          motion={true}
          onClose={() => {
            setBook(false);
            setExpanded(false);
          }}
          onEdit={(id) => {
            const e = entries.find((e) => e.id === id);
            if (e) {
              setBook(false);
              setExpanded(false);
              void pick(e).then(() => setPreview(false));
            }
          }}
        />
      ) : (
        <div className="diary-layout">
          <aside className="diary-library">
            <button
              className="diary-primary"
              disabled={busy}
              onClick={() => void create()}
            >
              <Plus size={17} /> Open today
            </button>
            <label className="diary-search">
              <Search size={16} />
              <input
                aria-label="Search diary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a thought…"
              />
            </label>
            <nav className="diary-tabs" aria-label="Diary collections">
              {[
                ["all", "All days"],
                ["favourites", "Favourites"],
                ["trash", "Trash"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="diary-calendar">
              <header>
                <button
                  aria-label="Previous month"
                  onClick={() => moveMonth(-1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <strong>
                  {new Date(year, mon - 1).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                <button aria-label="Next month" onClick={() => moveMonth(1)}>
                  <ChevronRight size={16} />
                </button>
              </header>
              <div className="diary-days">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <small key={i}>{d}</small>
                ))}
                {Array.from({ length: first }, (_, i) => (
                  <span key={`blank${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const day = `${month}-${String(i + 1).padStart(2, "0")}`,
                    rows = active.filter((e) => e.date === day);
                  return (
                    <button
                      key={day}
                      title={`${day} · ${rows.length} entries`}
                      aria-label={`${day}, ${rows.length} entries`}
                      aria-pressed={date === day}
                      data-today={day === today()}
                      disabled={busy}
                      onClick={() => {
                        setDate(day);
                        setFilter("all");
                        const firstPage = dailyPages(rows)[0];
                        if (firstPage) void pick(firstPage);
                        else void pick(null);
                      }}
                    >
                      {i + 1}
                      {rows.length > 0 && (
                        <i className={rows[0].mood || "okay"} />
                      )}
                    </button>
                  );
                })}
              </div>
              {date && (
                <button
                  className="diary-clear-date"
                  onClick={() => setDate("")}
                >
                  Clear date filter · {date} <X size={12} />
                </button>
              )}
            </div>
            <div className="diary-list">
              {daysInView.map((day) => (
                <button
                  key={day.date}
                  className={`diary-entry-card ${draft?.date === day.date ? "selected" : ""}`}
                  disabled={busy}
                  onClick={() => void pick(day.pages[0])}
                >
                  <span className="diary-entry-date">
                    {new Date(day.date + "T12:00:00").toLocaleDateString(
                      undefined,
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                    {day.favourite && <Heart size={13} fill="currentColor" />}
                  </span>
                  <strong>{day.title}</strong>
                  <small>
                    {day.pages.length}{" "}
                    {day.pages.length === 1 ? "page" : "pages"}
                  </small>
                </button>
              ))}
              {!visible.length && (
                <p className="diary-list-empty">
                  {filter === "trash"
                    ? "No deleted entries."
                    : "No pages here yet. Start with one small thought."}
                </p>
              )}
            </div>
            <footer className="diary-library-footer">
              <ShieldCheck size={14} /> Only yours, until you choose to share.
            </footer>
          </aside>
          <main className="diary-main">
            {draft ? (
              <article key={draft.id} className="diary-paper">
                <div className="diary-paper-toolbar">
                  <button
                    className="diary-back"
                    aria-label="Back to entries"
                    onClick={() => void pick(null)}
                  >
                    <ArrowLeft size={17} /> All days
                  </button>
                  <span className="diary-save-state" role="status">
                    {saved === "Saved securely" && <Check size={13} />}
                    {saved || (draft.trashed ? "In trash" : "Private entry")}
                  </span>
                  <div>
                    {!preview && !draft.trashed && (
                      <button
                        className="diary-explicit-save"
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await flush();
                            setSaved("Saved securely");
                          })
                        }
                      >
                        <Check size={15} /> Save
                      </button>
                    )}
                    <div
                      className="diary-segmented"
                      role="group"
                      aria-label="Editor view"
                    >
                      <button
                        aria-pressed={!preview}
                        aria-label="Edit diary page"
                        onClick={() => setPreview(false)}
                      >
                        <PenLine size={17} />
                      </button>
                      <button
                        aria-pressed={preview}
                        aria-label="Preview diary page"
                        onClick={() => setPreview(true)}
                      >
                        <BookOpenText size={17} />
                      </button>
                    </div>
                    <button
                      aria-label="Favourite entry"
                      aria-pressed={dayPages.some((p) => p.favourite)}
                      disabled={draft.trashed || preview || busy}
                      onClick={() => void favouriteDay()}
                    >
                      <Heart
                        size={17}
                        fill={
                          dayPages.some((p) => p.favourite)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                    {draft.trashed ? (
                      <button
                        disabled={busy}
                        onClick={() => void trash(draft, false)}
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        aria-label="Move entry to trash"
                        disabled={
                          busy || !entries.some((e) => e.id === draft.id)
                        }
                        onClick={() => void trash(draft, true)}
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="diary-page-content">
                  <div className="diary-date-row">
                    <input
                      type="date"
                      aria-label="Entry date"
                      disabled={draft.trashed || preview || busy}
                      value={draft.date}
                      onChange={(e) => {
                        if (e.target.value) edit({ date: e.target.value });
                      }}
                    />
                    <span>
                      PAGE {pageNumber(draft)} · YOUR STORY, YOUR PACE
                    </span>
                  </div>
                  <input
                    className="diary-title"
                    aria-label="Entry title"
                    maxLength={150}
                    disabled={draft.trashed || preview || busy}
                    placeholder="Give this moment a name…"
                    value={draft.title}
                    onChange={(e) => edit({ title: e.target.value })}
                  />
                  <div className="diary-moods">
                    <span>How does today feel?</span>
                    {moods.map((m) => (
                      <button
                        key={m.id}
                        disabled={draft.trashed || preview || busy}
                        aria-pressed={draft.mood === m.id}
                        onClick={() =>
                          edit({ mood: draft.mood === m.id ? null : m.id })
                        }
                      >
                        <b>{m.icon}</b>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {preview && (
                    <div
                      className="diary-preview-corners"
                      role="toolbar"
                      aria-label="Page preview controls"
                    >
                      <button
                        className="preview-back"
                        title="All days"
                        aria-label="Back to all days"
                        onClick={() => void pick(null)}
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <button
                        className="preview-edit"
                        title="Edit page"
                        aria-label="Edit this diary page"
                        disabled={busy || draft.trashed}
                        onClick={() => setPreview(false)}
                      >
                        <PenLine size={18} />
                      </button>
                      <button
                        className="preview-fullscreen"
                        title="Fullscreen page"
                        aria-label="Fullscreen page"
                        onClick={toggleFullscreen}
                      >
                        <Maximize2 size={17} />
                      </button>
                      {draft.trashed && (
                        <button
                          className="preview-restore"
                          aria-label="Restore this page"
                          onClick={() => void trash(draft, false)}
                        >
                          Restore
                        </button>
                      )}
                      <button
                        className="preview-prev"
                        title="Previous page"
                        aria-label="Previous page"
                        disabled={busy || dayPageIndex <= 0}
                        onClick={() => void pick(dayPages[dayPageIndex - 1])}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        className="preview-next"
                        title="Next page"
                        aria-label="Next page"
                        disabled={busy || dayPageIndex >= dayPages.length - 1}
                        onClick={() => void pick(dayPages[dayPageIndex + 1])}
                      >
                        <ChevronRight size={20} />
                      </button>
                      {!draft.trashed && (
                        <button
                          className="preview-add"
                          title="Add page after this one"
                          aria-label="Add page after this one"
                          disabled={busy}
                          onClick={() =>
                            void create(draft.date, true, draft.id)
                          }
                        >
                          <Plus size={19} />
                        </button>
                      )}
                      <button
                        className="preview-top-prev"
                        title="Previous page"
                        aria-label="Previous page (top)"
                        disabled={busy || dayPageIndex <= 0}
                        onClick={() => void pick(dayPages[dayPageIndex - 1])}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        className="preview-top-next"
                        title="Next page"
                        aria-label="Next page (top)"
                        disabled={busy || dayPageIndex >= dayPages.length - 1}
                        onClick={() => void pick(dayPages[dayPageIndex + 1])}
                      >
                        <ChevronRight size={18} />
                      </button>
                      {!draft.trashed && (
                        <>
                          <button
                            className="preview-top-add"
                            title="Add page after this one"
                            aria-label="Add page after this one (top)"
                            disabled={busy}
                            onClick={() =>
                              void create(draft.date, true, draft.id)
                            }
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            className="preview-favourite"
                            title="Favourite this day"
                            aria-label="Favourite this day"
                            aria-pressed={dayPages.some((p) => p.favourite)}
                            disabled={busy}
                            onClick={() => void favouriteDay()}
                          >
                            <Heart
                              size={15}
                              fill={
                                dayPages.some((p) => p.favourite)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                          <button
                            className="preview-delete"
                            title="Move page to trash"
                            aria-label="Move this page to trash"
                            disabled={busy}
                            onClick={() => void trash(draft, true)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      <span>
                        {draft.date} · {dayPageIndex + 1}/{dayPages.length}
                      </span>
                    </div>
                  )}
                  <DiaryCanvas
                    pageTitle={draft.title}
                    pageDate={draft.date}
                    key={draft.id}
                    value={draft}
                    change={edit}
                    readOnly={!!draft.trashed || preview}
                    renderSticker={(kind) => <StickerArt kind={kind} />}
                    fullscreen={toggleFullscreen}
                    expanded={expanded}
                    onStickers={() => setStickersOpen(!stickersOpen)}
                    stickersOpen={stickersOpen}
                    closeStickers={() => setStickersOpen(false)}
                    stickerMenu={
                      <div className="sheet-sticker-library">
                        {stickersOpen && !draft.trashed && !preview && (
                          <div className="diary-sticker-picker">
                            <header>
                              <div>
                                <strong>Sticker studio</strong>
                                <small>A little mood for every page</small>
                              </div>
                              <button
                                aria-label="Close sticker studio"
                                onClick={() => setStickersOpen(false)}
                              >
                                <X size={16} />
                              </button>
                            </header>
                            <input
                              type="search"
                              aria-label="Find a sticker"
                              placeholder="Find a sticker…"
                              value={stickerSearch}
                              onChange={(e) => setStickerSearch(e.target.value)}
                            />
                            <div
                              className="diary-segmented"
                              role="group"
                              aria-label="Sticker collection"
                            >
                              {[
                                ["all", "All"],
                                ["animated", "Illustrated"],
                                ["classic", "Classic"],
                              ].map(([id, label]) => (
                                <button
                                  key={id}
                                  aria-pressed={stickerPack === id}
                                  onClick={() => setStickerPack(id)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="diary-sticker-grid">
                              {Object.entries(art)
                                .filter(
                                  ([kind]) =>
                                    kind.includes(
                                      stickerSearch.trim().toLowerCase(),
                                    ) &&
                                    (stickerPack === "all" ||
                                      (stickerPack === "animated"
                                        ? !!onlineArt[kind]
                                        : !onlineArt[kind])),
                                )
                                .map(([kind]) => (
                                  <button
                                    key={kind}
                                    title={`Add ${kind}`}
                                    aria-label={`Add ${kind} sticker`}
                                    disabled={draft.stickers.length >= 12}
                                    onClick={() => {
                                      const s = {
                                        id: crypto.randomUUID(),
                                        kind,
                                        x:
                                          15 + (draft.stickers.length % 4) * 23,
                                        y: 50,
                                        size: 52,
                                      };
                                      edit({
                                        stickers: [...draft.stickers, s],
                                      });
                                      setSelectedSticker(s.id);
                                      setStickersOpen(false);
                                    }}
                                  >
                                    <StickerArt kind={kind} />
                                    <small>{kind}</small>
                                  </button>
                                ))}
                            </div>
                            <small>
                              Up to 12 stickers. Drag to move; select one to
                              resize.
                              {stickerSearch &&
                                !Object.keys(art).some((kind) =>
                                  kind.includes(
                                    stickerSearch.trim().toLowerCase(),
                                  ),
                                ) &&
                                " No matching stickers. Try a different word."}
                            </small>
                            <a
                              className="diary-sticker-credit"
                              href="https://googlefonts.github.io/noto-emoji-files/?view=docs"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Noto illustrations · Google · CC BY 4.0
                            </a>
                          </div>
                        )}
                      </div>
                    }
                    save={() =>
                      void action(async () => {
                        await flush();
                        setSaved("Saved securely");
                      })
                    }
                    saving={busy}
                    pageControls={
                      <div className="sheet-page-navigation">
                        <button
                          title="Previous page"
                          aria-label="Previous page while editing"
                          disabled={busy || dayPageIndex <= 0}
                          onClick={() =>
                            void pick(dayPages[dayPageIndex - 1], true)
                          }
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span>
                          {dayPageIndex + 1} / {dayPages.length}
                        </span>
                        <button
                          title="Next page"
                          aria-label="Next page while editing"
                          disabled={busy || dayPageIndex >= dayPages.length - 1}
                          onClick={() =>
                            void pick(dayPages[dayPageIndex + 1], true)
                          }
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button
                          title="Add page after this one"
                          aria-label="Add page after this one while editing"
                          disabled={busy || !!draft.trashed}
                          onClick={() =>
                            void create(draft.date, true, draft.id)
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    }
                  />
                  <label className="diary-tag-input">
                    Tags
                    <input
                      aria-label="Entry tags separated by commas"
                      placeholder="personal, college, little wins"
                      disabled={draft.trashed || preview || busy}
                      value={draft.tags.join(",")}
                      onChange={(e) =>
                        edit({
                          tags: e.target.value
                            .split(",")
                            .slice(0, 8)
                            .map((t) => t.slice(0, 30)),
                        })
                      }
                      onBlur={() =>
                        edit({
                          tags: draft.tags.map((t) => t.trim()).filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <footer className="diary-paper-footer">
                    <span>
                      {draft.body.trim().match(/\S+/g)?.length || 0} words
                    </span>
                    <span>
                      Encrypted ·{" "}
                      {draft.trashed
                        ? "Restore to edit"
                        : "Autosaves as you write"}
                    </span>
                  </footer>
                </div>
              </article>
            ) : (
              <section className="journal-page-index">
                <header>
                  <div>
                    <span className="diary-eyebrow">YOUR DAYS</span>
                    <h2>One day. Your whole story.</h2>
                    <p>Open a day to read or add pages.</p>
                  </div>
                  <div className="diary-collection-controls">
                    <div
                      className="diary-segmented"
                      aria-label="Collection layout"
                    >
                      <button
                        aria-label="Grid view"
                        aria-pressed={collectionView === "grid"}
                        onClick={() => setCollectionView("grid")}
                      >
                        <LayoutGrid size={17} />
                      </button>
                      <button
                        aria-label="List view"
                        aria-pressed={collectionView === "list"}
                        onClick={() => setCollectionView("list")}
                      >
                        <List size={17} />
                      </button>
                    </div>
                    <button
                      className="diary-primary"
                      onClick={() => void create()}
                    >
                      <Plus size={16} /> Today
                    </button>
                  </div>
                </header>
                <div className={`diary-day-collection ${collectionView}`}>
                  {daysInView.map((day) => (
                    <button
                      key={day.date}
                      className={`diary-day-card ${day.favourite ? "favourite-day" : ""}`}
                      disabled={busy}
                      onClick={() => void pick(day.pages[0])}
                    >
                      <DiaryDayCover
                        date={day.date}
                        favourite={day.favourite}
                        mood={
                          [...day.pages].reverse().find((page) => page.mood)
                            ?.mood
                        }
                      />
                      <span className="diary-day-copy">
                        <small>
                          {new Date(day.date + "T12:00:00").toLocaleDateString(
                            undefined,
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </small>
                        <strong>{day.title}</strong>
                        <p>
                          {day.pages
                            .map((p) => p.body)
                            .find(Boolean)
                            ?.slice(0, 100) ||
                            "Your thoughts, sketches and little moments."}
                        </p>
                        <em>
                          {day.pages.length}{" "}
                          {day.pages.length === 1 ? "page" : "pages"}{" "}
                          {day.favourite ? "· Favourite" : ""}
                        </em>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                </div>
                {!ordered.length && (
                  <div className="journal-index-empty">
                    <BookHeart size={40} />
                    <h3>
                      {date
                        ? "No pages for this day yet."
                        : "Your next chapter starts here."}
                    </h3>
                    <p>
                      Choose a day on the calendar or create your first page.
                    </p>
                    <button onClick={() => void create()}>
                      {date ? `Write for ${date}` : "Write today’s page"} →
                    </button>
                  </div>
                )}
              </section>
            )}
            <section className="diary-assistant">
              <button
                className="diary-assistant-heading"
                aria-expanded={assistant}
                onClick={() => setAssistant(!assistant)}
              >
                <span className="diary-assistant-icon">
                  <Sparkles size={20} />
                </span>
                <span>
                  <strong>A little reflection with Saarthi</strong>
                  <small>Private questions. You choose what to share.</small>
                </span>
                <Plus size={18} />
              </button>
              {assistant && (
                <div className="diary-assistant-body">
                  <Toggle
                    checked={status.aiAllowed}
                    change={(v) => void allow(v)}
                  >
                    Allow Saarthi for this unlocked session
                    <small>
                      Selected entries and your question are sent to Gemini.
                      Nothing is added to regular chat memory.
                    </small>
                  </Toggle>
                  <fieldset disabled={!status.aiAllowed || asking}>
                    <legend>Choose up to 20 saved entries</legend>
                    <div className="diary-share-list">
                      {active.map((e) => (
                        <label key={e.id}>
                          <input
                            type="checkbox"
                            checked={chosen.includes(e.id)}
                            onChange={(ev) =>
                              setChosen((ids) =>
                                ev.target.checked
                                  ? [...ids, e.id].slice(0, 20)
                                  : ids.filter((id) => id !== e.id),
                              )
                            }
                          />
                          {e.title || "Untitled moment"}
                          <small>{e.date}</small>
                        </label>
                      ))}
                      {!active.length && (
                        <p>Save your first entry to reflect with Saarthi.</p>
                      )}
                    </div>
                  </fieldset>
                  <form onSubmit={ask}>
                    <textarea
                      aria-label="Question for Saarthi about selected diary entries"
                      value={question}
                      maxLength={2000}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What small wins can you see in these entries?"
                      disabled={!status.aiAllowed || asking}
                      required
                    />
                    <button
                      className="diary-primary"
                      disabled={asking || !status.aiAllowed || !chosen.length}
                    >
                      <ArrowUp size={16} />
                      {asking ? "Reflecting…" : "Ask privately"}
                    </button>
                  </form>
                  {answer && (
                    <div className="diary-private-answer">
                      <strong>Saarthi ✦</strong>
                      <ReactMarkdown>{answer}</ReactMarkdown>
                      <button
                        onClick={() => {
                          setAnswer("");
                          setQuestion("");
                        }}
                      >
                        Clear this reflection
                      </button>
                    </div>
                  )}
                  <p className="diary-notice">
                    This reflection disappears when you leave or lock the diary.
                    Never type your password into a question.
                  </p>
                </div>
              )}
            </section>
          </main>
        </div>
      )}
    </section>
  );
  return (
    <>
      {expanded || book ? createPortal(content, document.body) : content}
      {bookReveal &&
        createPortal(
          <div
            className="diary-book-reveal"
            aria-hidden="true"
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setBookReveal(false);
            }}
          >
            <div className="diary-reveal-halo" />
            {Array.from({ length: 36 }, (_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 37 + 11) % 100}%`,
                  top: `${(i * 23 + 7) % 100}%`,
                  animationDelay: `${(i % 6) * 45}ms`,
                  fontSize: `${i % 3 === 0 ? 22 : 8 + (i % 7)}px`,
                }}
              >
                ✦
              </span>
            ))}
          </div>,
          document.body,
        )}
      {!book &&
        !expanded &&
        createPortal(
          <div
            className={`diary-floating-controls ${expanded ? "is-fullscreen" : ""}`}
          >
            <button
              className="diary-book-fab"
              disabled={busy}
              aria-label={
                book ? "Return to writing desk" : "Open complete diary"
              }
              title={book ? "Writing desk" : "Open complete diary"}
              onClick={() =>
                void action(async () => {
                  await flush();
                  setExpanded(false);
                  setBookReveal(true);
                  setBook(true);
                })
              }
            >
              <BookOpenText size={25} strokeWidth={1.6} />
              <i aria-hidden="true">✦</i>
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
