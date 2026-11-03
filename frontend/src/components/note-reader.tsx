"use client";
import { useState } from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  X,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Workspace } from "../lib/use-workspace";
import { dateLabel } from "../lib/workspace";
import { Modal } from "./ui";
export function NoteReader({ w }: { w: Workspace }) {
  const note = w.selected!;
  const [expanded, setExpanded] = useState(false),
    [textOnly, setTextOnly] = useState(false),
    [search, setSearch] = useState(""),
    [size, setSize] = useState(15);
  const body = String(note.content || ""),
    words = body.trim().split(/\s+/).filter(Boolean).length;
  const parts = search
    ? body.split(
        new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
      )
    : [body];
  const matches = search ? Math.floor(parts.length / 2) : 0;
  return (
    <Modal
      className={`note-reader ${expanded ? "note-reader-expanded" : ""}`}
      title={note.title}
      close={() => w.setModal("")}
    >
      <div className="note-reader-meta">
        <span>
          <FileText size={14} /> Version {note.version}
        </span>
        <span>{dateLabel(note.created_at, w.user!)}</span>
        <span>
          {words.toLocaleString()} words · {Math.max(1, Math.ceil(words / 220))}{" "}
          min read
        </span>
      </div>
      <div className="note-reader-toolbar">
        <label>
          <Search size={15} />
          <input
            aria-label="Find in this note"
            placeholder="Find in this note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              aria-label="Clear note search"
              onClick={() => setSearch("")}
            >
              <X size={13} />
            </button>
          )}
        </label>
        {search && <small aria-live="polite">{matches} matches</small>}
        <button aria-pressed={textOnly} onClick={() => setTextOnly(!textOnly)}>
          {textOnly ? "Reading view" : "Plain text"}
        </button>
        <button
          aria-label="Decrease text size"
          disabled={size <= 13}
          onClick={() => setSize(size - 1)}
        >
          A−
        </button>
        <button
          aria-label="Increase text size"
          disabled={size >= 21}
          onClick={() => setSize(size + 1)}
        >
          A+
        </button>
        <button
          aria-label={expanded ? "Exit note fullscreen" : "Fullscreen note"}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <article className="note-reading-paper" style={{ fontSize: size }}>
        {!body ? (
          <p>
            No extractable text in this file. Download the original to view it.
          </p>
        ) : search ? (
          <div className="note-plain-text">
            {parts.map((part, index) =>
              index % 2 ? <mark key={index}>{part}</mark> : part,
            )}
          </div>
        ) : textOnly ? (
          <div className="note-plain-text">{body}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        )}
      </article>
      <footer className="note-reader-footer">
        <button className="secondary" onClick={() => w.downloadDoc(note)}>
          <Download size={15} /> Original file
        </button>
        <button
          className="primary"
          onClick={() => {
            w.setNoteContext({ noteIds: [note.id], folderIds: [] });
            w.setInput(`Summarize "${note.title}" and suggest the next steps.`);
            w.setModal("");
            w.navigate("Saarthi");
          }}
        >
          <Sparkles size={15} /> Discuss with Saarthi
        </button>
      </footer>
    </Modal>
  );
}
