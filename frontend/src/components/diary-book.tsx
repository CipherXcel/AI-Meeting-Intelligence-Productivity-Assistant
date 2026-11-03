"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PageFlip } from "page-flip";
import {
  bookPages,
  bookLayout,
  type BookPage,
  type JournalEntry,
} from "../lib/diary-pages";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  Minimize2,
  PenLine,
  X,
} from "lucide-react";
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
          {page.entry.images?.map((image) => (
            <img
              key={image.id}
              className="sheet-read-image"
              src={image.src}
              alt="Attached diary image"
              style={{
                left: `${image.x / 10}%`,
                top: `${image.y / 14}%`,
                width: `${image.width / 10}%`,
                height: `${image.height / 14}%`,
              }}
            />
          ))}
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
  const images = document.createDocumentFragment();
  for (const image of page.entry.images || []) {
    const img = document.createElement("img");
    img.className = "sheet-read-image";
    img.alt = "Attached diary image";
    img.src = image.src;
    Object.assign(img.style, {
      left: `${image.x / 10}%`,
      top: `${image.y / 14}%`,
      width: `${image.width / 10}%`,
      height: `${image.height / 14}%`,
    });
    images.append(img);
  }
  body.replaceChildren(words, images, svg, boxes, stickers);
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
  const chapters = useMemo(
    () =>
      pages.flatMap((p, i) =>
        i === 0 || pages[i - 1].entry.date !== p.entry.date
          ? [
              {
                date: p.entry.date,
                title: p.entry.title || "A day in my life",
                page: i,
              },
            ]
          : [],
      ),
    [pages],
  );
  const contentsCount = Math.max(1, Math.ceil(chapters.length / 12));
  const total = contentsCount + pages.length;
  const [contentsOpen, setContentsOpen] = useState(false);
  const [index, setIndex] = useState(Math.min(pageIndex, total - 1));
  const [reduced, setReduced] = useState(false),
    [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null),
    root = useRef<HTMLElement>(null),
    mount = useRef<HTMLDivElement>(null);
  const flip = useRef<PageFlip | null>(null),
    position = useRef(index);
  const [dimensions, setDimensions] = useState({
    width: 300,
    height: 540,
    spread: false,
  });
  const animated = motion && !reduced && !failed;
  const current = pages[Math.max(0, index - contentsCount)];
  function go(next: number) {
    const n = Math.max(0, Math.min(total - 1, next));
    position.current = n;
    setContentsOpen(false);
    setIndex(n);
    onPageChange(n);
    flip.current?.turnToPage(n);
  }
  function turn(delta: number) {
    if (flip.current) {
      if (delta > 0) flip.current.flipNext("bottom");
      else flip.current.flipPrev("bottom");
    } else go(index + delta * (dimensions.spread ? 2 : 1));
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const measure = () => {
      if (!stage.current) return;
      const { width, height, spread } = bookLayout(
        window.innerWidth,
        window.innerHeight,
        expanded,
      );
      setDimensions((old) =>
        old.width === width && old.spread === spread
          ? old
          : { width, height, spread },
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
  }, [expanded]);
  function fillContents(leaf: HTMLElement, page: number) {
    leaf.classList.add("journal-contents-leaf");
    const content = document.createElement("div");
    content.className = "journal-contents-content";
    const eyebrow = document.createElement("small");
    eyebrow.textContent = "MY PERSONAL DIARY";
    const title = document.createElement("h2");
    title.textContent = "Contents";
    const subtitle = document.createElement("p");
    subtitle.textContent = "A life, one day at a time.";
    const list = document.createElement("nav");
    list.setAttribute("aria-label", "Days in this diary");
    for (const chapter of chapters.slice(page * 12, (page + 1) * 12)) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.bookPage = String(contentsCount + chapter.page);
      const label = document.createElement("span");
      label.textContent = new Date(
        chapter.date + "T12:00:00",
      ).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const name = document.createElement("small");
      name.textContent = chapter.title;
      const number = document.createElement("b");
      number.textContent = String(chapter.page + 1);
      label.append(name);
      button.append(label, number);
      list.append(button);
    }
    if (!chapters.length) {
      const empty = document.createElement("p");
      empty.textContent = "Your first day is waiting to be written.";
      list.append(empty);
    }
    const footer = document.createElement("footer");
    footer.textContent = `CONTENTS · ${page + 1} / ${contentsCount}`;
    content.append(eyebrow, title, subtitle, list, footer);
    leaf.append(content);
  }
  useEffect(() => {
    if (!animated || !mount.current) return;
    let cancelled = false,
      instance: PageFlip | undefined;
    const node = document.createElement("div");
    node.className = "journal-flip-host";
    mount.current.appendChild(node);
    const click = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-book-page]",
      );
      if (button) {
        event.stopPropagation();
        go(Number(button.dataset.bookPage));
      }
    };
    node.addEventListener("click", click);
    void import("page-flip")
      .then(({ PageFlip }) => {
        if (cancelled) return;
        const nodes = Array.from({ length: total }, (_, i) => {
          const leaf = document.createElement("div");
          leaf.className = "journal-leaf";
          if (i < contentsCount) fillContents(leaf, i);
          else fillLeaf(leaf, pages[i - contentsCount]);
          node.appendChild(leaf);
          return leaf;
        });
        instance = new PageFlip(node, {
          width: dimensions.width,
          height: dimensions.height,
          size: "fixed",
          minWidth: 64,
          maxWidth: 700,
          minHeight: 115,
          maxHeight: 1260,
          drawShadow: true,
          maxShadowOpacity: 0.3,
          flippingTime: 750,
          usePortrait: true,
          autoSize: true,
          showCover: false,
          mobileScrollSupport: true,
          useMouseEvents: true,
          showPageCorners: true,
          disableFlipByClick: true,
          swipeDistance: 35,
          startPage: Math.min(position.current, total - 1),
        });
        flip.current = instance;
        instance.on("flip", (event) => {
          position.current = Number(event.data);
          setIndex(Number(event.data));
          onPageChange(Number(event.data));
        });
        instance.loadFromHTML(nodes);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      flip.current = null;
      node.removeEventListener("click", click);
      if (instance) {
        instance.getRender().stop();
        instance.clear();
        instance.destroy();
      }
      node.remove();
    };
  }, [pages, animated, dimensions]);
  function simpleLeaf(i: number) {
    if (i >= total) return null;
    return (
      <article
        className={`journal-leaf ${i < contentsCount ? "journal-contents-leaf" : ""}`}
        key={i}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {i < contentsCount ? (
          <div className="journal-contents-content">
            <small>MY PERSONAL DIARY</small>
            <h2>Contents</h2>
            <p>A life, one day at a time.</p>
            <nav aria-label="Days in this diary">
              {chapters.slice(i * 12, (i + 1) * 12).map((chapter) => (
                <button
                  key={chapter.date}
                  onClick={() => go(contentsCount + chapter.page)}
                >
                  <span>
                    {chapter.date}
                    <small>{chapter.title}</small>
                  </span>
                  <b>{chapter.page + 1}</b>
                </button>
              ))}
            </nav>
            {!chapters.length && (
              <p>Your first day is waiting to be written.</p>
            )}
            <footer>
              CONTENTS · {i + 1} / {contentsCount}
            </footer>
          </div>
        ) : (
          <Leaf page={pages[i - contentsCount]} />
        )}
      </article>
    );
  }
  return (
    <section
      ref={root}
      className={`journal-reader book-only ${expanded ? "book-maximized" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Personal diary book"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const items = Array.from(
            root.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), [tabindex="0"]',
            ) || [],
          ).filter((item) => item.getClientRects().length);
          const first = items[0],
            last = items.at(-1);
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === root.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLInputElement
        )
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          turn(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div
        className="book-binding"
        style={{ width: dimensions.width * (dimensions.spread ? 2 : 1) + 24 }}
      >
        <button
          className="book-index-tab"
          title="Contents"
          aria-label="Open diary contents"
          aria-expanded={contentsOpen}
          onClick={() => setContentsOpen(!contentsOpen)}
        >
          <List size={18} />
        </button>
        <span className="book-spread-title">
          {index < contentsCount
            ? "My personal diary"
            : current?.entry.title || "A day in my life"}
        </span>
        {contentsOpen && (
          <aside className="book-contents-drawer" aria-label="Diary contents">
            <header>
              <strong>Contents</strong>
              <button
                aria-label="Close contents"
                onClick={() => setContentsOpen(false)}
              >
                <X size={16} />
              </button>
            </header>
            {chapters.map((chapter) => (
              <button
                key={chapter.date}
                onClick={() => go(contentsCount + chapter.page)}
              >
                <small>
                  {new Date(chapter.date + "T12:00:00").toLocaleDateString(
                    undefined,
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </small>
                <strong>{chapter.title}</strong>
              </button>
            ))}
          </aside>
        )}
        <div
          className="book-edge-tools"
          role="toolbar"
          aria-label="Book controls"
        >
          {current && (
            <button
              aria-label="Edit this day"
              title="Edit this day"
              onClick={() => onEdit(current.entry.id)}
            >
              <PenLine size={17} />
            </button>
          )}
          <button
            aria-label={expanded ? "Restore book size" : "Fullscreen book"}
            title={expanded ? "Restore book size" : "Fullscreen book"}
            aria-pressed={expanded}
            onClick={onFullscreen}
          >
            {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button
            aria-label="Close diary book"
            title="Close book"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div
          ref={stage}
          className="journal-book-stage"
          aria-label="Turn diary pages by dragging a corner"
        >
          {animated ? (
            <div
              ref={mount}
              className="journal-flip-mount"
              style={{
                width: dimensions.width * (dimensions.spread ? 2 : 1),
                height: dimensions.height,
              }}
            />
          ) : (
            <div className="book-static-spread">
              {simpleLeaf(index)}
              {dimensions.spread && simpleLeaf(index + 1)}
            </div>
          )}
        </div>
        <div className="book-page-controls">
          <button
            aria-label="Previous book page"
            disabled={index === 0}
            onClick={() => turn(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            {index < contentsCount
              ? "Contents"
              : `${current?.entry.date} · ${current?.number} / ${current?.total}`}
          </span>
          <button
            aria-label="Next book page"
            disabled={index >= total - (dimensions.spread ? 2 : 1)}
            onClick={() => turn(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
