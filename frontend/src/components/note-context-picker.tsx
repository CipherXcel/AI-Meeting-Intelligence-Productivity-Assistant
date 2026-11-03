"use client";
import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Folder,
  FileText,
  Search,
  X,
  Check,
  BookHeart,
} from "lucide-react";
import { api } from "../lib/workspace";
import type { Workspace } from "../lib/use-workspace";
export function NoteContextPicker({ w }: { w: Workspace }) {
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState("notes"),
    [search, setSearch] = useState("");
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]),
    [error, setError] = useState("");
  const [diaryDays, setDiaryDays] = useState<
    { date: string; title: string; pages: number }[]
  >([]);
  const [diaryError, setDiaryError] = useState("");
  useEffect(() => {
    if (!open || tab !== "diary") return;
    let alive = true;
    setDiaryError("");
    void api("/diary/days")
      .then((rows) => {
        if (alive) setDiaryDays(rows);
      })
      .catch(() => {
        if (alive) {
          setDiaryDays([]);
          setDiaryError(
            "Unlock Personal Diary with Remember access and Allow Saarthi to choose a day here.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [open, tab]);
  const root = useRef<HTMLDivElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
  const count =
    w.noteContext.noteIds.length +
    w.noteContext.folderIds.length +
    (w.noteContext.diaryDate ? 1 : 0);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void api("/folders")
      .then((rows) => {
        if (alive) setFolders(rows);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => {
      alive = false;
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);
  useEffect(() => {
    setOpen(false);
  }, [w.thread, w.user?.id]);
  const pick = (type: "noteIds" | "folderIds", id: string) =>
    w.setNoteContext((value) => ({
      ...value,
      diaryDate: undefined,
      [type]: value[type].includes(id)
        ? value[type].filter((v) => v !== id)
        : [...value[type], id],
    }));
  const notes = w.docs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );
  const matches = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div
      className="note-context"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="context-trigger"
        aria-expanded={open}
        aria-controls="note-context-options"
        disabled={w.chatBusy}
        onClick={() => {
          setError("");
          setOpen(!open);
        }}
      >
        <Paperclip size={16} />
        {w.noteContext.diaryDate
          ? w.noteContext.diaryDate
          : count
            ? `${count} selected`
            : "Add context"}
      </button>
      {open && (
        <div
          className="context-popover"
          id="note-context-options"
          role="dialog"
          aria-label="Choose notes for Saarthi"
        >
          <header>
            <strong>Add context</strong>
            <button
              type="button"
              aria-label="Close note picker"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>
          <p>
            Choose sources for your message. Folder contents are included when
            you send.
          </p>
          <label className="context-search">
            <Search size={15} />
            <input
              autoFocus
              placeholder="Find a note or folder…"
              aria-label="Search notes and folders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="context-tabs" role="group" aria-label="Source type">
            {["notes", "folders", "diary"].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t === "notes"
                  ? "Notes"
                  : t === "folders"
                    ? "Folders"
                    : "Diary day"}
              </button>
            ))}
          </div>
          {error && <p role="alert">{error}</p>}
          {tab === "diary" && (
            <div className="context-items">
              {diaryError ? (
                <p>
                  {diaryError}{" "}
                  <button
                    type="button"
                    onClick={() => w.navigate("Personal Diary")}
                  >
                    Open diary ↗
                  </button>
                </p>
              ) : (
                diaryDays
                  .filter((d) =>
                    (d.date + " " + d.title)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      aria-pressed={w.noteContext.diaryDate === day.date}
                      onClick={() => {
                        w.setNoteContext({
                          noteIds: [],
                          folderIds: [],
                          diaryDate: day.date,
                        });
                        setOpen(false);
                      }}
                    >
                      <BookHeart size={16} />
                      <span>
                        {day.date} · {day.title}
                        <small>{day.pages} pages · private reply</small>
                      </span>
                      {w.noteContext.diaryDate === day.date && (
                        <Check size={16} />
                      )}
                    </button>
                  ))
              )}
              {!diaryError && !diaryDays.length && (
                <p>No saved diary days available.</p>
              )}
            </div>
          )}
          <div className="context-items" hidden={tab === "diary"}>
            {tab === "notes"
              ? notes.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    aria-pressed={w.noteContext.noteIds.includes(n.id)}
                    disabled={
                      !w.noteContext.noteIds.includes(n.id) &&
                      w.noteContext.noteIds.length >= 30
                    }
                    onClick={() => pick("noteIds", n.id)}
                  >
                    <FileText size={17} />
                    <span>
                      {n.title}
                      <small>
                        {folders.find((f) => f.id === n.folder_id)?.name ||
                          "Unfiled"}
                      </small>
                    </span>
                    {w.noteContext.noteIds.includes(n.id) && (
                      <Check size={16} />
                    )}
                  </button>
                ))
              : matches.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    aria-pressed={w.noteContext.folderIds.includes(f.id)}
                    disabled={
                      !w.noteContext.folderIds.includes(f.id) &&
                      w.noteContext.folderIds.length >= 10
                    }
                    onClick={() => pick("folderIds", f.id)}
                  >
                    <Folder size={17} />
                    <span>
                      {f.name}
                      <small>
                        {w.docs.filter((d) => d.folder_id === f.id).length}{" "}
                        notes
                      </small>
                    </span>
                    {w.noteContext.folderIds.includes(f.id) && (
                      <Check size={16} />
                    )}
                  </button>
                ))}
            {!(tab === "notes" ? notes.length : matches.length) && (
              <p>No matches here.</p>
            )}
          </div>
          <footer>
            <button
              type="button"
              disabled={!count}
              onClick={() => w.setNoteContext({ noteIds: [], folderIds: [] })}
            >
              Clear selection
            </button>
            <button
              className="primary"
              type="button"
              onClick={() => setOpen(false)}
            >
              Done{count ? ` · ${count}` : ""}
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
