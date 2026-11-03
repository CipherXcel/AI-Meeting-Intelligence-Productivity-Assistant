"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PageFlip } from "page-flip";
import {
  bookPages,
  type BookPage,
  type JournalEntry,
} from "../lib/diary-pages";
import { ChevronLeft, ChevronRight, BookOpen, PenLine } from "lucide-react";
const emoji: Record<string, string> = {
  sun: "☀️",
  cloud: "☁️",
  flower: "🌷",
  coffee: "☕",
  heart: "💜",
  moon: "🌙",
  sparkle: "✨",
  butterfly: "🦋",
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
function Leaf({ page }: { page: BookPage }) {
  const day = new Date(page.entry.date + "T12:00:00");
  return (
    <div className="journal-leaf-content">
      <header>
        <span>
          {day.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            year: "numeric",
          })}
        </span>
        <strong>{day.getDate().toString().padStart(2, "0")}</strong>
        <small>
          PAGE {page.number} / {page.total}
        </small>
      </header>
      <h2>{page.entry.title || "A day in my life"}</h2>
      {page.art ? (
        <div className="journal-reading-sheet">
          <div className="sheet-body-reading">{page.text}</div>
          <svg className="sheet-ink" viewBox="0 0 1000 1400">
            {page.entry.drawing?.map((s, i) => (
              <polyline
                key={i}
                points={s.points.map((p) => p.join(",")).join(" ")}
                stroke={s.color}
                strokeWidth={s.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
          {page.entry.textBoxes?.map((b) => (
            <div
              key={b.id}
              className="sheet-read-box"
              style={{
                left: `${b.x / 10}%`,
                top: `${b.y / 14}%`,
                width: `${b.width / 10}%`,
                color: b.color,
                fontSize: `${b.size / 10}cqw`,
              }}
            >
              {b.text}
            </div>
          ))}
          {page.entry.stickers?.map((s) => (
            <span
              key={s.id}
              className="sheet-read-sticker"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                fontSize: `${s.size / 10}cqw`,
              }}
            >
              {emoji[s.kind] || "✦"}
            </span>
          ))}
        </div>
      ) : (
        <div className="journal-book-words">
          {page.text || "A quiet page, waiting for a memory."}
        </div>
      )}
      <footer>
        <span>PERSONAL DIARY</span>
        <span>
          {page.entry.date} · {page.number}
        </span>
      </footer>
    </div>
  );
}
// PageFlip owns these nodes. All journal text is inserted as text, never HTML.
function fillLeaf(leaf: HTMLElement, page: BookPage) {
  leaf.innerHTML =
    '<div class="journal-leaf-content"><header><span></span><strong></strong><small></small></header><h2></h2><div class="journal-book-words"></div><footer><span>PERSONAL DIARY</span><span></span></footer></div>';
  const day = new Date(page.entry.date + "T12:00:00");
  leaf.querySelector("header span")!.textContent = day.toLocaleDateString(
    undefined,
    { weekday: "long", month: "long", year: "numeric" },
  );
  leaf.querySelector("header strong")!.textContent = String(
    day.getDate(),
  ).padStart(2, "0");
  leaf.querySelector("header small")!.textContent =
    `PAGE ${page.number} / ${page.total}`;
  leaf.querySelector("h2")!.textContent =
    page.entry.title || "A day in my life";
  leaf.querySelector("footer span:last-child")!.textContent =
    `${page.entry.date} · ${page.number}`;
  const body = leaf.querySelector(".journal-book-words")!;
  if (!page.art) {
    body.textContent = page.text || "A quiet page, waiting for a memory.";
    return;
  }
  body.className = "journal-reading-sheet";
  const words = document.createElement("div");
  words.className = "sheet-body-reading";
  words.textContent = page.text;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 1400");
  svg.classList.add("sheet-ink");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Drawing saved with this diary page");
  for (const s of page.entry.drawing || []) {
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    line.setAttribute("points", s.points.map((p) => p.join(",")).join(" "));
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", s.color);
    line.setAttribute("stroke-width", String(s.width));
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.append(line);
  }
  const boxes = document.createDocumentFragment();
  for (const b of page.entry.textBoxes || []) {
    const text = document.createElement("div");
    text.className = "sheet-read-box";
    text.textContent = b.text;
    Object.assign(text.style, {
      left: `${b.x / 10}%`,
      top: `${b.y / 14}%`,
      width: `${b.width / 10}%`,
      color: b.color,
      fontSize: `${b.size / 10}cqw`,
    });
    boxes.append(text);
  }
  const stickers = document.createDocumentFragment();
  for (const s of page.entry.stickers || []) {
    const item = document.createElement("span");
    item.textContent = emoji[s.kind] || "✦";
    item.className = "sheet-read-sticker";
    Object.assign(item.style, {
      left: `${s.x}%`,
      top: `${s.y}%`,
      fontSize: `${s.size / 10}cqw`,
    });
    stickers.append(item);
  }
  body.replaceChildren(words, svg, boxes, stickers);
}
export function DiaryBook({
  expanded,
  onFullscreen,
  pageIndex,
  onPageChange,
  entries,
  motion,
  onEdit,
  onClose,
}: {
  expanded: boolean;
  onFullscreen: () => void;
  pageIndex: number;
  onPageChange: (index: number) => void;
  entries: (JournalEntry & { trashed?: boolean })[];
  motion: boolean;
  onEdit: (id: string) => void;
  onClose: () => void;
}) {
  const pages = useMemo(
    () => bookPages(entries.filter((e) => !e.trashed)),
    [entries],
  );
  const [indexOpen, setIndexOpen] = useState(false),
    [facing, setFacing] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: 300,
    height: 540,
    spread: false,
  });
  useEffect(() => {
    const measure = () => {
      if (!stage.current) return;
      const available = stage.current.clientWidth;
      const reader = stage.current.closest(".journal-reader");
      const chrome = reader
        ? Array.from(reader.children)
            .filter(
              (child) =>
                child !== stage.current &&
                !child.classList.contains("journal-book-index"),
            )
            .reduce(
              (height, child) => height + child.getBoundingClientRect().height,
              0,
            )
        : 150;
      const availableHeight = expanded
        ? window.innerHeight - chrome - 64
        : window.innerHeight - 280;
      const spread = facing && available >= 760;
      const width = Math.max(
        120,
        Math.min(
          500,
          available / (spread ? 2 : 1),
          Math.max(160, availableHeight / 1.8),
        ),
      );
      setDimensions((old) =>
        old.width === width && old.spread === spread
          ? old
          : { width, height: Math.round(width * 1.8), spread },
      );
    };
    const observer = new ResizeObserver(measure);
    if (stage.current) observer.observe(stage.current);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [expanded, facing]);
  const [index, setIndex] = useState(pageIndex),
    [reduced, setReduced] = useState(false),
    [simple, setSimple] = useState(false),
    [failed, setFailed] = useState(false);
  const mount = useRef<HTMLDivElement>(null),
    flip = useRef<PageFlip | null>(null),
    position = useRef(pageIndex);
  const animated = motion && !reduced && !simple && !failed;
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!animated || !pages.length || !mount.current) return;
    let cancelled = false,
      instance: PageFlip | undefined;
    const node = document.createElement("div");
    node.className = "journal-flip-host";
    mount.current.appendChild(node);
    void import("page-flip")
      .then(({ PageFlip }) => {
        if (cancelled) return;
        const nodes = pages.map((p) => {
          const leaf = document.createElement("div");
          leaf.className = "journal-leaf";
          fillLeaf(leaf, p);
          node.appendChild(leaf);
          return leaf;
        });
        instance = new PageFlip(node, {
          width: dimensions.width,
          height: dimensions.height,
          size: "fixed",
          minWidth: 120,
          maxWidth: 560,
          minHeight: 216,
          maxHeight: 820,
          drawShadow: true,
          maxShadowOpacity: 0.24,
          flippingTime: 700,
          usePortrait: true,
          autoSize: true,
          showCover: false,
          mobileScrollSupport: true,
          useMouseEvents: true,
          showPageCorners: true,
          disableFlipByClick: true,
          swipeDistance: 35,
          startPage: Math.min(position.current, pages.length - 1),
        });
        flip.current = instance;
        instance.on("flip", (e) => {
          position.current = Number(e.data);
          setIndex(Number(e.data));
          onPageChange(Number(e.data));
        });
        instance.loadFromHTML(nodes);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      flip.current = null;
      if (instance) {
        instance.getRender().stop();
        instance.clear();
        instance.destroy();
      }
      node.remove();
    };
  }, [pages, animated, dimensions]);
  const current = pages[Math.min(index, pages.length - 1)];
  function go(next: number) {
    const n = Math.max(0, Math.min(pages.length - 1, next));
    position.current = n;
    if (flip.current) flip.current.turnToPage(n);
    setIndex(n);
    onPageChange(n);
  }
  function turn(delta: number) {
    if (flip.current) {
      if (delta > 0) flip.current.flipNext("bottom");
      else flip.current.flipPrev("bottom");
    } else go(index + delta);
  }
  return (
    <section className="journal-reader" aria-label="Complete diary">
      <header className="journal-reader-toolbar">
        <div>
          <BookOpen size={20} />
          <strong>Your story, page by page</strong>
        </div>
        <div>
          <button
            aria-expanded={indexOpen}
            onClick={() => setIndexOpen(!indexOpen)}
          >
            ☷ Index
          </button>
          <button type="button" aria-pressed={expanded} onClick={onFullscreen}>
            {expanded ? "Exit fullscreen" : "Fullscreen book"}
          </button>
          <button onClick={onClose}>Back to pages</button>
        </div>
      </header>
      {indexOpen && (
        <aside className="journal-book-index" aria-label="Diary page index">
          <header>
            <strong>Contents</strong>
            <button
              onClick={() => setIndexOpen(false)}
              aria-label="Close index"
            >
              ×
            </button>
          </header>
          {pages.map((p, i) => (
            <button
              key={i}
              aria-current={index === i ? "page" : undefined}
              onClick={() => {
                go(i);
                setIndexOpen(false);
              }}
            >
              <span>
                {p.entry.date} · {p.number}/{p.total}
              </span>
              <strong>{p.entry.title || "Untitled page"}</strong>
            </button>
          ))}
        </aside>
      )}
      {!pages.length ? (
        <div className="journal-book-empty">
          Your book begins with your first saved page.
          <button onClick={onClose}>Write a page</button>
        </div>
      ) : (
        <>
          <div className="journal-book-navigation">
            <label>
              Go to page
              <select
                aria-label="Go to diary page"
                value={Math.min(index, pages.length - 1)}
                onChange={(e) => go(Number(e.target.value))}
              >
                {pages.map((p, i) => (
                  <option key={i} value={i}>
                    {p.entry.date} · Page {p.number} of {p.total}
                  </option>
                ))}
              </select>
            </label>
            <label className="journal-reader-switch">
              <input
                type="checkbox"
                role="switch"
                checked={facing}
                onChange={(e) => setFacing(e.target.checked)}
              />
              Facing pages on wide screens
            </label>
            <label className="journal-reader-switch">
              <input
                type="checkbox"
                role="switch"
                checked={simple}
                onChange={(e) => setSimple(e.target.checked)}
              />
              Simple reading
            </label>
            <button onClick={() => onEdit(current.entry.id)}>
              <PenLine size={14} /> Edit this entry
            </button>
          </div>
          <div
            ref={stage}
            className="journal-book-stage"
            tabIndex={0}
            aria-label="Diary book. Drag a corner to fold a page. Left and right arrow keys turn pages."
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                turn(e.key === "ArrowRight" ? 1 : -1);
              }
            }}
          >
            {animated ? (
              <div
                ref={mount}
                className="journal-flip-mount"
                style={{
                  width: dimensions.width * (dimensions.spread ? 2 : 1),
                  height: dimensions.height,
                  margin: "auto",
                }}
              />
            ) : (
              <article className="journal-leaf journal-simple-page">
                <Leaf page={current} />
              </article>
            )}
          </div>
          <footer className="journal-reader-footer">
            <button
              aria-label="Previous diary page"
              disabled={index === 0}
              onClick={() => turn(-1)}
            >
              <ChevronLeft />
              Previous
            </button>
            <div aria-live="polite">
              <strong>
                {current.entry.date} · Page {current.number} of {current.total}
              </strong>
              <small>
                {animated
                  ? "Drag a corner slowly to fold the page. Release to turn or return."
                  : "Simple reading · Use the arrows to turn pages."}
              </small>
            </div>
            <button
              aria-label="Next diary page"
              disabled={
                index >= pages.length - (dimensions.spread && animated ? 2 : 1)
              }
              onClick={() => turn(1)}
            >
              Next
              <ChevronRight />
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
