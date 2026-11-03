"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sparkle,
  LayoutDashboard,
  ListTodo,
  FileText,
  CalendarDays,
  ShieldCheck,
  BookHeart,
  Grip,
  PanelLeft,
  PanelRight,
  PanelBottom,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { View } from "../lib/workspace";
const items = [
  { name: "Saarthi", icon: Sparkle },
  { name: "Overview", icon: LayoutDashboard },
  { name: "Tasks", icon: ListTodo },
  { name: "Notes & files", icon: FileText },
  { name: "Calendar", icon: CalendarDays },
  { name: "Personal Diary", icon: BookHeart },
  { name: "All proposals", icon: ShieldCheck },
] as const;
type Position = "left" | "right" | "bottom";
export function FloatingDock({
  userId,
  view,
  navigate,
  pending,
}: {
  userId: string;
  view: View;
  navigate: (v: View) => void;
  pending: number;
}) {
  const [position, setPosition] = useState<Position>("right"),
    [menu, setMenu] = useState(false),
    [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null),
    moved = useRef(false);
  const [mounted, setMounted] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setMenu(false), 300);
  };
  useEffect(() => {
    setMounted(true);
    const outside = (e: PointerEvent) => {
      if (!overlay.current?.contains(e.target as Node)) setMenu(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelClose();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const key = `agentbuddy:dock:${userId}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (["left", "right", "bottom"].includes(saved || ""))
        setPosition(saved as Position);
    } catch {}
  }, [key]);
  useEffect(() => {
    document.documentElement.dataset.dock = position;
    return () => {
      delete document.documentElement.dataset.dock;
    };
  }, [position]);
  function place(value: Position) {
    setPosition(value);
    setMenu(false);
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
  if (!mounted) return null;
  return createPortal(
    <div
      ref={overlay}
      className="dock-overlay"
      onPointerEnter={cancelClose}
      onPointerLeave={scheduleClose}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenu(false);
      }}
    >
      <nav
        className={`floating-dock movable-dock dock-${position} ${drag ? "dock-dragging" : ""}`}
        aria-label="Workspace navigation"
        style={
          drag
            ? {
                left: Math.max(32, Math.min(window.innerWidth - 32, drag.x)),
                top: Math.max(40, Math.min(window.innerHeight - 40, drag.y)),
                right: "auto",
                bottom: "auto",
                transform: "translate(-50%, -50%)",
              }
            : undefined
        }
      >
        <button
          className="dock-handle"
          aria-label="Move menu or choose its position"
          aria-expanded={menu}
          title="Drag to left, right, or bottom. Click for position options."
          onClick={() => {
            if (!moved.current) setMenu(!menu);
          }}
          onPointerDown={(e) => {
            start.current = { x: e.clientX, y: e.clientY };
            moved.current = false;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (
              !start.current ||
              !e.currentTarget.hasPointerCapture(e.pointerId)
            )
              return;
            if (
              Math.hypot(
                e.clientX - start.current.x,
                e.clientY - start.current.y,
              ) > 8
            ) {
              moved.current = true;
              setDrag({ x: e.clientX, y: e.clientY });
              setMenu(false);
            }
          }}
          onPointerUp={(e) => {
            if (moved.current) {
              const bottom = window.innerHeight - e.clientY;
              place(
                bottom < 140 ||
                  (bottom < e.clientX && bottom < window.innerWidth - e.clientX)
                  ? "bottom"
                  : e.clientX < window.innerWidth / 2
                    ? "left"
                    : "right",
              );
            }
            start.current = null;
            setDrag(null);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDrag(null);
          }}
        >
          <Grip size={15} />
        </button>
        {items.map(({ name, icon: Icon }) => (
          <button
            key={name}
            aria-label={name}
            title={name}
            aria-current={view === name ? "page" : undefined}
            className={`${view === name ? "active" : ""} ${name === "Saarthi" ? "dock-assistant" : ""}`}
            onClick={() => {
              setMenu(false);
              navigate(name);
            }}
          >
            <Icon size={21} />
            <span className="dock-label">{name}</span>
            {name === "All proposals" && pending > 0 && (
              <i className="dock-count">{pending}</i>
            )}
          </button>
        ))}
      </nav>
      {menu && (
        <section
          className={`dock-position-picker picker-${position}`}
          aria-label="Menu position"
        >
          <strong>Make yourself comfortable</strong>
          <p>Drag the grip, or choose a side.</p>
          <div>
            {(
              [
                { id: "left", Icon: PanelLeft },
                { id: "bottom", Icon: PanelBottom },
                { id: "right", Icon: PanelRight },
              ] as const
            ).map(({ id, Icon }) => (
              <button
                key={id}
                aria-pressed={position === id}
                onClick={() => place(id)}
              >
                <Icon size={18} />
                {id}
              </button>
            ))}
          </div>
          <button onClick={() => setMenu(false)}>Close</button>
        </section>
      )}
      {drag && (
        <div className="dock-drop-hint">
          Release near an edge to dock your menu
        </div>
      )}
    </div>,
    document.body,
  );
}
