export type Row = Record<string, any>;
export type View =
  | "Saarthi"
  | "Overview"
  | "Tasks"
  | "Notes & files"
  | "Calendar"
  | "All proposals"
  | "Profile";
export const defaults = {
  role: "",
  organisation: "",
  bio: "",
  avatar: "",
  theme: "ivory",
  timeFormat: "12",
  density: "comfortable",
  workingDays: [1, 2, 3, 4, 5],
  workStart: "09:00",
  workEnd: "18:00",
};
export const themes = [
  { id: "ivory", name: "White", detail: "White, cyan & purple" },
  { id: "amethyst", name: "Dark", detail: "Black & purple" },
  { id: "glass", name: "Glass", detail: "Pearl & lavender" },
  { id: "glass-frost", name: "Frost", detail: "Glass · cool cyan & blue" },
  { id: "glass-bloom", name: "Bloom", detail: "Glass · rose & lilac" },
  { id: "glass-sand", name: "Sand", detail: "Glass · warm cream & gold" },
];
export const base = process.env.NEXT_PUBLIC_API_URL || "";
let token = "";
let refreshPromise: Promise<boolean> | null = null;
export function setToken(value: string) {
  token = value;
}
export async function restoreSession() {
  if (!refreshPromise)
    refreshPromise = (async () => {
      const r = await fetch(`${base}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(12000),
      });
      if (r.status === 401) {
        token = "";
        return false;
      }
      if (!r.ok)
        throw Error("Unable to restore your session. Please try again.");
      token = (await r.json()).token;
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
  raw = false,
  signal?: AbortSignal,
): Promise<any> {
  const request = () =>
    fetch(`${base}/api${path}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  let r = await request();
  if (
    r.status === 401 &&
    (!path.startsWith("/auth/") || path === "/auth/change-password")
  ) {
    if (await restoreSession()) r = await request();
    else {
      window.dispatchEvent(new Event("session-expired"));
      throw Error("Your session expired. Please sign in again.");
    }
  }
  if (!r.ok)
    throw Error(
      (await r.json().catch(() => ({}))).error ||
        "The server could not complete this request.",
    );
  return raw ? r : r.json();
}
export function profileOf(user: Row) {
  const profile = { ...defaults, ...user.profile };
  if (["ocean", "forest"].includes(profile.theme)) profile.theme = "ivory";
  return profile;
}
export function dateLabel(value: string, user: Row, time = false) {
  if (!value) return "No date";
  // Date-only values describe a calendar day, not a UTC instant.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return new Date(value + "T12:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  return new Date(value).toLocaleString("en-IN", {
    timeZone: user.timezone,
    day: "numeric",
    month: "short",
    ...(time
      ? {
          hour: "numeric",
          minute: "2-digit",
          hour12: profileOf(user).timeFormat !== "24",
        }
      : {}),
  });
}
