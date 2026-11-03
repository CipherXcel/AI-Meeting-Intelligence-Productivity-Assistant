"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookOpenText, LockKeyhole, X, Heart } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/workspace";
import { diaryDays } from "../lib/diary-pages";
type Page = {
  id: string;
  date: string;
  title: string;
  body: string;
  favourite: boolean;
  trashed?: boolean;
  createdAt?: string;
};
type Access = {
  configured: boolean;
  unlocked: boolean;
  remember: boolean;
  aiAllowed: boolean;
};
export function SaarthiDiary({
  onClose,
  openDiary,
}: {
  onClose: () => void;
  openDiary: () => void;
}) {
  const [access, setAccess] = useState<Access | null>(null),
    [pages, setPages] = useState<Page[]>([]);
  const [password, setPassword] = useState(""),
    [remember, setRemember] = useState(false),
    [consent, setConsent] = useState(false);
  const [selected, setSelected] = useState<string[]>([]),
    [question, setQuestion] = useState(""),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [favourites, setFavourites] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const live = useRef(false),
    state = useRef(access),
    version = useRef(0),
    request = useRef<AbortController | null>(null);
  state.current = access;
  function forget() {
    version.current++;
    request.current?.abort();
    setMessages([]);
    setPages([]);
    setSelected([]);
    setQuestion("");
    setPassword("");
  }
  async function inspect(load = false) {
    const generation = version.current;
    const status: Access = await api("/diary/status");
    if (!live.current || generation !== version.current) return;
    if (!status.unlocked && state.current?.unlocked) forget();
    else if (!status.aiAllowed && state.current?.aiAllowed) {
      version.current++;
      request.current?.abort();
      setMessages([]);
      setQuestion("");
    }
    state.current = status;
    setAccess(status);
    if (status.unlocked && load) {
      const loadVersion = version.current;
      const entries = await api("/diary/entries");
      if (live.current && version.current === loadVersion)
        setPages(entries.filter((e: Page) => !e.trashed));
    }
  }
  useEffect(() => {
    live.current = true;
    void inspect(true).catch(() => {
      if (live.current) setError("Cannot reach your diary. Try again.");
    });
    const timer = setInterval(() => void inspect().catch(() => {}), 10000);
    return () => {
      live.current = false;
      version.current++;
      request.current?.abort();
      clearInterval(timer);
      if (state.current?.unlocked && !state.current.remember)
        void api("/diary/lock", "POST").catch(() => {});
    };
  }, []);
  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/diary/unlock", "POST", {
        password,
        remember,
        aiAllowed: consent,
      });
      setPassword("");
      await inspect(true);
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "Could not unlock diary.");
    } finally {
      if (live.current) setBusy(false);
    }
  }
  async function allow(value: boolean) {
    setError("");
    try {
      await api("/diary/access", "PATCH", { aiAllowed: value });
      if (!value) forget();
      await inspect(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update access.");
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy || !question.trim() || !selected.length || !access?.aiAllowed)
      return;
    const text = question.trim(),
      generation = version.current;
    const history = messages
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));
    setBusy(true);
    setError("");
    setMessages((list) => [...list, { role: "user", text }]);
    setQuestion("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await api(
        "/diary/ask",
        "POST",
        { question: text, entryIds: selected, history },
        false,
        controller.signal,
      );
      if (live.current && generation === version.current)
        setMessages((list) => [
          ...list,
          { role: "assistant", text: result.answer },
        ]);
    } catch (e) {
      if (live.current && generation === version.current) {
        setError(
          e instanceof Error ? e.message : "Could not complete your request.",
        );
        await inspect().catch(() => {});
      }
    } finally {
      if (live.current) setBusy(false);
    }
  }
  const days = diaryDays(pages).filter((day) => !favourites || day.favourite);
  return (
    <section className="saarthi-diary" aria-label="Private diary with Saarthi">
      <header>
        <div>
          <BookOpenText size={22} />
          <span>
            <strong>Saarthi · Diary</strong>
            <small>Private conversation · not saved to chat history</small>
          </span>
        </div>
        <button aria-label="Return to regular chat" onClick={onClose}>
          <X size={19} />
        </button>
      </header>
      {error && (
        <p className="diary-error" role="alert">
          {error}
        </p>
      )}
      {!access ? (
        <p>Checking diary access…</p>
      ) : !access.configured ? (
        <div className="saarthi-diary-gate">
          <h2>Your private diary starts here.</h2>
          <button onClick={openDiary}>Set up my diary</button>
        </div>
      ) : !access.unlocked ? (
        <form className="saarthi-diary-gate" onSubmit={unlock}>
          <LockKeyhole size={28} />
          <h2>Unlock your diary</h2>
          <p>Enter your diary password here. It is never sent to Saarthi.</p>
          <label>
            Diary password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="saarthi-diary-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember access on this signed-in device
          </label>
          <label className="saarthi-diary-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Allow selected diary pages to be sent to Gemini when I ask
          </label>
          <button disabled={busy}>
            {busy ? "Unlocking…" : "Unlock diary"}
          </button>
        </form>
      ) : (
        <>
          <div className="saarthi-diary-access">
            <label>
              <input
                type="checkbox"
                role="switch"
                checked={access.aiAllowed}
                onChange={(e) => void allow(e.target.checked)}
              />{" "}
              Allow Saarthi to read selected pages
            </label>
            <button onClick={openDiary}>Write in diary ↗</button>
          </div>
          <div className="saarthi-diary-layout">
            <aside>
              <div className="saarthi-diary-picker">
                <strong>Choose days</strong>
                <button
                  aria-pressed={favourites}
                  aria-label="Favourite days"
                  onClick={() => setFavourites(!favourites)}
                >
                  <Heart size={16} />
                </button>
              </div>
              <small>
                {selected.length}/20 pages selected · Text and text boxes
              </small>
              {days.map((day) => (
                <details key={day.date}>
                  <summary>
                    {day.date}
                    <span>{day.pages.length} pages</span>
                  </summary>
                  {day.pages.map((page, index) => (
                    <label className="saarthi-diary-check" key={page.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(page.id)}
                        disabled={
                          busy ||
                          (!selected.includes(page.id) && selected.length >= 20)
                        }
                        onChange={(e) => {
                          setSelected((ids) =>
                            e.target.checked
                              ? [...ids, page.id]
                              : ids.filter((id) => id !== page.id),
                          );
                          setMessages([]);
                        }}
                      />
                      <span>
                        Page {index + 1} · {page.title || "Untitled"}
                        <small>{page.body.slice(0, 70)}</small>
                      </span>
                    </label>
                  ))}
                </details>
              ))}
              {!days.length && <p>No days in this collection yet.</p>}
            </aside>
            <div className="saarthi-diary-conversation">
              <div className="saarthi-diary-messages" aria-live="polite">
                {!messages.length && (
                  <div className="saarthi-diary-welcome">
                    <BookOpenText size={30} />
                    <h2>A little space to reflect.</h2>
                    <p>
                      Choose pages from your diary, then ask about your
                      memories, ideas, or the patterns in your days. Drawings
                      and sticker images are not read by the assistant.
                    </p>
                  </div>
                )}
                {messages.map((message, i) => (
                  <article key={i} className={`message ${message.role}`}>
                    <div className="message-content">
                      <span className="message-author">
                        {message.role === "user" ? "You" : "Saarthi"}
                      </span>
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                  </article>
                ))}
                {busy && <p role="status">Saarthi is reflecting…</p>}
              </div>
              <form className="saarthi-diary-composer" onSubmit={send}>
                <textarea
                  aria-label="Ask Saarthi about selected diary pages"
                  placeholder="What have I been enjoying lately?"
                  value={question}
                  maxLength={2000}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={!access.aiAllowed}
                />
                <button
                  aria-label="Send private diary question"
                  disabled={
                    busy ||
                    !access.aiAllowed ||
                    !selected.length ||
                    !question.trim()
                  }
                >
                  <ArrowUp size={19} />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
