"use client";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  PenLine,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Move,
  Trash2,
  Maximize2,
} from "lucide-react";
import { strokeHit, type TextBox } from "../lib/diary-canvas";
import type { Stroke } from "../lib/diary-pages";
type Sticker = { id: string; kind: string; x: number; y: number; size: number };
type Sheet = {
  body: string;
  drawing?: Stroke[];
  textBoxes?: TextBox[];
  stickers: Sticker[];
};
const colors = [
  "#615083",
  "#26374d",
  "#1c827a",
  "#c65f7d",
  "#bb8832",
  "#e7d9bd",
];
export function DiaryCanvas({
  pageTitle,
  pageDate,
  value,
  change,
  readOnly,
  renderSticker,
  fullscreen,
  expanded,
  onStickers,
}: {
  pageTitle: string;
  pageDate: string;
  value: Sheet;
  change: (patch: Partial<Sheet>) => void;
  readOnly: boolean;
  renderSticker: (kind: string) => ReactNode;
  fullscreen: () => void;
  expanded: boolean;
  onStickers: () => void;
}) {
  const [mode, setMode] = useState<"write" | "place" | "draw" | "erase">(
      "write",
    ),
    [color, setColor] = useState(colors[0]),
    [width, setWidth] = useState(4),
    [selected, setSelected] = useState("");
  const [undo, setUndo] = useState<Sheet[]>([]),
    [redo, setRedo] = useState<Sheet[]>([]),
    [ink, setInk] = useState<Stroke[] | null>(null);
  const sheet = useRef<HTMLDivElement>(null),
    live = useRef(value),
    pending = useRef<Stroke[] | null>(null),
    before = useRef<Sheet | null>(null),
    drag = useRef<{
      id: string;
      type: "box" | "sticker";
      x: number;
      y: number;
      px: number;
      py: number;
    } | null>(null);
  live.current = value;
  const snapshot = () => ({
    ...live.current,
    drawing: [...(live.current.drawing || [])],
    textBoxes: [...(live.current.textBoxes || [])],
    stickers: [...live.current.stickers],
  });
  const remember = (old: Sheet) => {
    setUndo((list) => [...list.slice(-14), old]);
    setRedo([]);
  };
  function commit(patch: Partial<Sheet>) {
    remember(snapshot());
    change(patch);
  }
  function pos(e: PointerEvent): [number, number] {
    const r = sheet.current!.getBoundingClientRect();
    return [
      Math.round(
        Math.max(0, Math.min(1000, ((e.clientX - r.left) / r.width) * 1000)),
      ),
      Math.round(
        Math.max(0, Math.min(1400, ((e.clientY - r.top) / r.height) * 1400)),
      ),
    ];
  }
  function start(e: PointerEvent<SVGSVGElement>) {
    if (readOnly) return;
    const [x, y] = pos(e);
    if (mode === "place") {
      if ((value.textBoxes?.length || 0) >= 20) return;
      const box = {
        id: crypto.randomUUID(),
        text: "",
        x: Math.min(650, x),
        y: Math.min(1250, y),
        width: 300,
        size: 24,
        color,
      };
      commit({ textBoxes: [...(value.textBoxes || []), box] });
      setSelected(box.id);
      setMode("write");
      return;
    }
    if (mode !== "draw" && mode !== "erase") return;
    if (mode === "draw" && (value.drawing?.length || 0) >= 100) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    before.current = snapshot();
    pending.current =
      mode === "draw"
        ? [
            ...(value.drawing || []),
            {
              color,
              width,
              points: [
                [x, y],
                [Math.min(1000, x + 0.1), y],
              ],
            },
          ]
        : (value.drawing || []).filter(
            (s) => !strokeHit(s.points, x, y, 18 + s.width),
          );
    setInk(pending.current);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    if (!pending.current) return;
    const [x, y] = pos(e);
    if (mode === "erase")
      pending.current = pending.current.filter(
        (s) => !strokeHit(s.points, x, y, 18 + s.width),
      );
    else {
      const last = pending.current.at(-1)!;
      if (last.points.length >= 200) return;
      const p = last.points.at(-1)!;
      if (Math.hypot(x - p[0], y - p[1]) < 2) return;
      pending.current = [
        ...pending.current.slice(0, -1),
        { ...last, points: [...last.points, [x, y] as [number, number]] },
      ];
    }
    setInk(pending.current);
  }
  function finish() {
    if (pending.current) {
      remember(before.current!);
      change({ drawing: pending.current });
      pending.current = null;
      before.current = null;
      setInk(null);
    }
  }
  function startDrag(
    e: PointerEvent<HTMLElement>,
    id: string,
    type: "box" | "sticker",
    x: number,
    y: number,
  ) {
    if (readOnly || mode !== "write") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    before.current = snapshot();
    const [px, py] = pos(e);
    drag.current = { id, type, x, y, px, py };
    setSelected(id);
  }
  function moveDrag(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const [px, py] = pos(e);
    if (d.type === "box")
      change({
        textBoxes: live.current.textBoxes?.map((b) =>
          b.id === d.id
            ? {
                ...b,
                x: Math.max(0, Math.min(1000 - b.width, d.x + px - d.px)),
                y: Math.max(0, Math.min(1250, d.y + py - d.py)),
              }
            : b,
        ),
      });
    else
      change({
        stickers: live.current.stickers.map((s) =>
          s.id === d.id
            ? {
                ...s,
                x: Math.max(5, Math.min(95, d.x + (px - d.px) / 10)),
                y: Math.max(5, Math.min(95, d.y + (py - d.py) / 14)),
              }
            : s,
        ),
      });
  }
  function endDrag() {
    if (drag.current && before.current) remember(before.current);
    drag.current = null;
    before.current = null;
  }
  const box = value.textBoxes?.find((b) => b.id === selected),
    sticker = value.stickers.find((s) => s.id === selected);
  return (
    <section className="unified-journal">
      <div
        className="sheet-toolbar"
        role="toolbar"
        aria-label="Diary page tools"
      >
        {!readOnly && (
          <>
            <div className="sheet-mode-switch">
              {(
                [
                  ["write", "Write", Type],
                  ["place", "Text box", Type],
                  ["draw", "Draw", PenLine],
                  ["erase", "Eraser", Eraser],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <button
              disabled={!undo.length}
              aria-label="Undo page change"
              onClick={() => {
                setRedo((list) => [...list, snapshot()]);
                change(undo.at(-1)!);
                setUndo(undo.slice(0, -1));
              }}
            >
              <Undo2 size={16} />
            </button>
            <button
              disabled={!redo.length}
              aria-label="Redo page change"
              onClick={() => {
                setUndo((list) => [...list, snapshot()]);
                change(redo.at(-1)!);
                setRedo(redo.slice(0, -1));
              }}
            >
              <Redo2 size={16} />
            </button>
            <button onClick={onStickers}>✦ Stickers</button>
          </>
        )}
        <button onClick={fullscreen}>
          <Maximize2 size={15} />
          {expanded ? "Exit fullscreen" : "Fullscreen page"}
        </button>
      </div>
      {!readOnly && (
        <div className="sheet-options">
          {colors.map((c) => (
            <button
              key={c}
              style={{ background: c }}
              aria-label={`Ink ${c}`}
              aria-pressed={color === c}
              onClick={() => {
                setColor(c);
                if (box)
                  commit({
                    textBoxes: value.textBoxes?.map((b) =>
                      b.id === box.id ? { ...b, color: c } : b,
                    ),
                  });
              }}
            />
          ))}
          <label>
            Pen{" "}
            <input
              type="range"
              min="2"
              max="12"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>
          <small>
            {mode === "place"
              ? "Tap anywhere on the page to place text."
              : mode === "erase"
                ? "Drag over a stroke to erase it. Undo restores it."
                : mode === "draw"
                  ? "Draw anywhere on this page."
                  : "Write, or drag a text box or sticker by its handle."}
          </small>
        </div>
      )}
      <div ref={sheet} className={`unified-sheet mode-${mode}`}>
        <header className="sheet-page-meta">
          <strong>{pageTitle || "My diary"}</strong>
          <span>{pageDate}</span>
        </header>
        {readOnly ? (
          <div className="sheet-body-reading">{value.body}</div>
        ) : (
          <textarea
            className="sheet-body-editor"
            aria-label="Diary page writing"
            placeholder="Start your story here…"
            value={value.body}
            maxLength={40000}
            onFocus={() => remember(snapshot())}
            onChange={(e) => change({ body: e.target.value })}
            readOnly={mode !== "write"}
          />
        )}
        <svg
          className="sheet-ink"
          viewBox="0 0 1000 1400"
          preserveAspectRatio="none"
          aria-label="Draw or erase on your diary page"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={finish}
          style={{
            pointerEvents: readOnly || mode === "write" ? "none" : "auto",
          }}
        >
          {(ink || value.drawing || []).map((s, i) => (
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
        {value.textBoxes?.map((b) => (
          <div
            key={b.id}
            className={`sheet-text-box ${selected === b.id ? "selected" : ""}`}
            style={{
              left: `${b.x / 10}%`,
              top: `${b.y / 14}%`,
              width: `${b.width / 10}%`,
              color: b.color,
              fontSize: `${b.size / 10}cqw`,
              pointerEvents: !readOnly && mode === "write" ? "auto" : "none",
            }}
          >
            {!readOnly && mode === "write" && (
              <button
                className="sheet-move"
                aria-label="Move text box"
                onPointerDown={(e) => startDrag(e, b.id, "box", b.x, b.y)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <Move size={12} />
              </button>
            )}
            {readOnly ? (
              <div>{b.text}</div>
            ) : (
              <textarea
                aria-label="Positioned diary text"
                placeholder="Your words…"
                maxLength={1000}
                value={b.text}
                rows={Math.max(
                  2,
                  Math.min(
                    18,
                    b.text.split("\n").length +
                      Math.ceil(b.text.length / (b.width / (b.size * 0.55))),
                  ),
                )}
                onFocus={() => {
                  setSelected(b.id);
                  remember(snapshot());
                }}
                onChange={(e) =>
                  change({
                    textBoxes: value.textBoxes?.map((v) =>
                      v.id === b.id ? { ...v, text: e.target.value } : v,
                    ),
                  })
                }
              />
            )}
          </div>
        ))}
        {value.stickers.map((s) => (
          <button
            key={s.id}
            className="sheet-sticker"
            aria-label={`${s.kind} sticker: drag to move`}
            disabled={readOnly}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size / 10}%`,
              height: `${s.size / 14}%`,
              fontSize: `${s.size / 10}cqw`,
              pointerEvents: mode === "write" && !readOnly ? "auto" : "none",
            }}
            onPointerDown={(e) => startDrag(e, s.id, "sticker", s.x, s.y)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={() => setSelected(s.id)}
          >
            {renderSticker(s.kind)}
          </button>
        ))}
      </div>
      {!readOnly && (box || sticker) && (
        <div className="sheet-selection-tools">
          {box && (
            <>
              <label>
                Text size
                <input
                  type="range"
                  min="16"
                  max="48"
                  value={box.size}
                  onChange={(e) =>
                    change({
                      textBoxes: value.textBoxes?.map((b) =>
                        b.id === box.id
                          ? { ...b, size: Number(e.target.value) }
                          : b,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Width
                <input
                  type="range"
                  min="120"
                  max={Math.min(800, 1000 - box.x)}
                  value={box.width}
                  onChange={(e) =>
                    change({
                      textBoxes: value.textBoxes?.map((b) =>
                        b.id === box.id
                          ? { ...b, width: Number(e.target.value) }
                          : b,
                      ),
                    })
                  }
                />
              </label>
            </>
          )}
          {sticker && (
            <label>
              Sticker size
              <input
                type="range"
                min="28"
                max="100"
                value={sticker.size}
                onChange={(e) =>
                  change({
                    stickers: value.stickers.map((s) =>
                      s.id === sticker.id
                        ? { ...s, size: Number(e.target.value) }
                        : s,
                    ),
                  })
                }
              />
            </label>
          )}
          <button
            onClick={() => {
              if (box)
                commit({
                  textBoxes: value.textBoxes?.filter((b) => b.id !== box.id),
                });
              else if (sticker)
                commit({
                  stickers: value.stickers.filter((s) => s.id !== sticker.id),
                });
              setSelected("");
            }}
          >
            <Trash2 size={14} />
            Remove selected
          </button>
        </div>
      )}
    </section>
  );
}
