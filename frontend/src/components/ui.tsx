import { useEffect, useRef, type ReactNode } from "react";
import { Sparkle, X, ArrowUpRight } from "lucide-react";
import { type Row, profileOf } from "../lib/workspace";
export function Brand() {
  return (
    <span className="brand">
      <svg
        className="brand-symbol buddy-mark"
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="34" height="34" rx="10" fill="var(--accent)" />
        <path
          d="m10 26 7-17h2l7 17M13 21h10"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27.5" cy="8.5" r="1.6" fill="#adf1ef" />
      </svg>
      AgentBuddy
    </span>
  );
}
export function Avatar({
  user,
  large = false,
}: {
  user: Row;
  large?: boolean;
}) {
  return (
    <span className={`avatar ${large ? "large" : ""}`}>
      {profileOf(user).avatar ? (
        <img src={profileOf(user).avatar} alt="Your profile" />
      ) : (
        (user.name || "U")
          .split(" ")
          .map((v: string) => v[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      )}
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">◇</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Modal({
  title,
  close,
  children,
  className = "",
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="section-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Stat({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number | string;
  onClick?: () => void;
}) {
  return (
    <button className="stat" onClick={onClick} disabled={!onClick}>
      <span>
        {label}
        {onClick && <ArrowUpRight size={15} />}
      </span>
      <strong>{value}</strong>
    </button>
  );
}
