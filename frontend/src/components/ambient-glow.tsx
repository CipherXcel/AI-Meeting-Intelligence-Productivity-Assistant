import { useEffect, useRef } from "react";
// Pointer work stays outside React renders; there is no continuous animation loop.
export function AmbientGlow({
  enabled,
  sparkle = false,
}: {
  enabled: boolean;
  sparkle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || sparkle) return;
    const media = window.matchMedia(
      "(prefers-reduced-motion: no-preference) and (pointer: fine)",
    );
    let frame = 0,
      x = 0,
      y = 0;
    const cancel = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (ref.current) ref.current.style.opacity = "0";
    };
    const move = (e: PointerEvent) => {
      if (!media.matches || document.hidden || e.pointerType !== "mouse")
        return;
      x = e.clientX;
      y = e.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (ref.current) {
          ref.current.style.transform = `translate3d(${x - 260}px,${y - 260}px,0)`;
          ref.current.style.opacity = "1";
        }
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", cancel);
    document.addEventListener("visibilitychange", cancel);
    media.addEventListener("change", cancel);
    return () => {
      cancel();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", cancel);
      document.removeEventListener("visibilitychange", cancel);
      media.removeEventListener("change", cancel);
    };
  }, [enabled, sparkle]);
  if (enabled && sparkle) return <CursorTrail />;
  return enabled ? (
    <div
      ref={ref}
      className={`ambient-glow ${sparkle ? "sparkle-glow" : ""}`}
      aria-hidden="true"
    />
  ) : null;
}

// A fading wake rather than a texture attached to the pointer. Stops when idle.
function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d");
    if (!ctx) return;
    const media = matchMedia(
      "(prefers-reduced-motion: no-preference) and (pointer: fine)",
    );
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      age: number;
      life: number;
      size: number;
      phase: number;
      purple: boolean;
      star: boolean;
      glow: boolean;
    };
    let particles: Particle[] = [],
      frame = 0,
      last = 0,
      previous: { x: number; y: number } | null = null;
    let pending: { x: number; y: number } | null = null;
    const glow = document.createElement("canvas");
    glow.width = glow.height = 180;
    const g = glow.getContext("2d")!,
      gradient = g.createRadialGradient(90, 90, 0, 90, 90, 90);
    gradient.addColorStop(0, "rgba(68,198,221,.12)");
    gradient.addColorStop(1, "rgba(68,198,221,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 180, 180);
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      particles = [];
      previous = null;
      pending = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    const resize = () => {
      clear();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (now: number) => {
      if (pending) {
        emit(pending.x, pending.y);
        pending = null;
      }
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      particles = particles.filter((p) => p.age < p.life);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age += dt;
        p.x += (p.vx + Math.sin(p.age * 5 + p.phase) * 8) * dt;
        p.y += (p.vy - 7) * dt;
        const fade = Math.max(0, 1 - p.age / p.life);
        ctx.globalAlpha = Math.min(1, p.age / 0.14) * fade * fade * 0.75;
        if (p.glow) ctx.drawImage(glow, p.x - 90, p.y - 90);
        ctx.fillStyle = p.purple
          ? "rgba(119,81,177,.34)"
          : "rgba(30,153,183,.38)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.star) {
          ctx.fillStyle = "rgba(255,255,255,.5)";
          ctx.fillRect(p.x - 0.5, p.y - 3.5, 1, 7);
          ctx.fillRect(p.x - 3.5, p.y - 0.5, 7, 1);
        }
      }
      ctx.globalAlpha = 1;
      if (particles.length) frame = requestAnimationFrame(draw);
      else {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        frame = 0;
      }
    };
    const emit = (x: number, y: number) => {
      const start = previous || { x: x, y: y },
        dx = x - start.x,
        dy = y - start.y,
        distance = Math.hypot(dx, dy),
        steps = Math.min(4, Math.max(1, Math.ceil(distance / 6)));
      for (let i = 1; i <= steps; i++)
        for (let n = 0; n < 2; n++)
          particles.push({
            x: start.x + (dx * i) / steps + (Math.random() - 0.5) * 85,
            y: start.y + (dy * i) / steps + (Math.random() - 0.5) * 85,
            vx: dx * 0.15 + (Math.random() - 0.5) * 14,
            vy: dy * 0.15 + (Math.random() - 0.5) * 14,
            age: 0,
            life: 1.1 + Math.random() * 0.8,
            size: 0.5 + Math.random() * 0.8,
            phase: Math.random() * 6,
            purple: Math.random() > 0.6,
            star: Math.random() > 0.985,
            glow: Math.random() < 0.12,
          });
      if (particles.length > 800) particles.splice(0, particles.length - 800);
      previous = { x: x, y: y };
    };
    const move = (e: PointerEvent) => {
      if (!media.matches || document.hidden || e.pointerType !== "mouse")
        return;
      pending = { x: e.clientX, y: e.clientY };
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    const leave = () => {
      previous = null;
    };
    resize();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", clear);
    media.addEventListener("change", clear);
    return () => {
      clear();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", clear);
      media.removeEventListener("change", clear);
    };
  }, []);
  return <canvas ref={ref} className="cursor-trail" aria-hidden="true" />;
}
