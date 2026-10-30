import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, UserRound } from "lucide-react";
import { Avatar } from "./ui";
import { api, profileOf, themes } from "../lib/workspace";
import type { Workspace } from "../lib/use-workspace";

export function ProfileMenu({ w }: { w: Workspace }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function keyboard(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [open]);
  if (!w.user) return null;
  const user = w.user;
  const profile = profileOf(user);
  async function theme(id: string) {
    document.documentElement.dataset.theme = id;
    const ok = await w.action(async () => {
      await api("/me", "PATCH", {
        name: user.name,
        timezone: user.timezone,
        duration: user.duration,
        profile: { ...profile, theme: id },
      });
      await w.refreshProfile();
    });
    if (!ok) document.documentElement.dataset.theme = profile.theme;
  }
  return (
    <div className="floating-profile" ref={root}>
      <button
        ref={trigger}
        className={`profile-trigger ${open || w.view === "Profile" ? "active" : ""}`}
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-controls="profile-menu"
        onClick={() => setOpen(!open)}
      >
        <Avatar user={user} />
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          id="profile-menu"
          className="profile-popover"
          role="dialog"
          aria-label="Profile and appearance"
        >
          <div className="popover-identity">
            <Avatar user={user} />
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button
            className="popover-action"
            onClick={() => {
              w.navigate("Profile");
              setOpen(false);
            }}
          >
            <UserRound size={16} />
            Your profile
            <ChevronDown className="side-chevron" size={13} />
          </button>
          <div className="popover-themes">
            <span className="overline">APPEARANCE</span>
            <div className="quick-themes">
              {themes.map((t) => (
                <button
                  key={t.id}
                  disabled={w.busy}
                  aria-label={`${t.name} theme`}
                  aria-pressed={profile.theme === t.id}
                  className={profile.theme === t.id ? "chosen" : ""}
                  onClick={() => theme(t.id)}
                >
                  <span className={`theme-swatch ${t.id}`}>
                    {profile.theme === t.id && <Check size={13} />}
                  </span>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            className="popover-action signout"
            disabled={w.busy || w.chatBusy}
            onClick={w.logout}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
