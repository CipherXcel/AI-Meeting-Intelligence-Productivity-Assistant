import { randomUUID, randomBytes, createHash } from "node:crypto";
import { Router } from "express";
import { query } from "./db.js";
import { encrypt, decrypt, auth } from "./security.js";
const callback = () => `${process.env.PUBLIC_URL}/api/calendar/callback`;
async function googleToken(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const j = (await r.json()) as any;
  if (!r.ok)
    throw Error("Google authorization failed; reconnect your calendar");
  return j;
}
export async function calendarRequest(
  user: string,
  path: string,
  method = "GET",
  body?: unknown,
) {
  const [connection] = await query(
    "SELECT tokens FROM connections WHERE user_id=$1",
    [user],
  );
  if (!connection) throw Error("Connect Google Calendar in Settings first");
  let tokens = JSON.parse(decrypt(connection.tokens));
  if (!tokens.access_token || tokens.expiry < Date.now() + 60000) {
    const next = await googleToken({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    });
    tokens = {
      ...tokens,
      ...next,
      expiry: Date.now() + next.expires_in * 1000,
    };
    await query("UPDATE connections SET tokens=$1 WHERE user_id=$2", [
      encrypt(JSON.stringify(tokens)),
      user,
    ]);
  }
  const r = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 204) return { ok: true };
  const j = (await r.json()) as any;
  if (!r.ok) throw Error(j.error?.message || "Calendar request failed");
  return j;
}
export function interval(start: string, end: string) {
  if (
    !/(Z|[+-]\d{2}:\d{2})$/.test(start) ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(end) ||
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    Date.parse(end) <= Date.parse(start)
  )
    throw Error(
      "Provide valid start/end datetimes with timezone; end must follow start",
    );
  if (Date.parse(end) - Date.parse(start) > 31 * 86400000)
    throw Error("Date range must be within 31 days");
}
export async function listEvents(user: string, start: string, end: string) {
  interval(start, end);
  let items: any[] = [],
    pageToken = "";
  do {
    const p = new URLSearchParams({
      timeMin: start,
      timeMax: end,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    });
    const r = await calendarRequest(user, `calendars/primary/events?${p}`);
    items.push(...(r.items || []));
    pageToken = r.nextPageToken || "";
  } while (pageToken && items.length < 2000);
  return items;
}
export async function busy(user: string, start: string, end: string) {
  interval(start, end);
  const r = await calendarRequest(user, "freeBusy", "POST", {
    timeMin: start,
    timeMax: end,
    items: [{ id: "primary" }],
  });
  if (r.calendars?.primary?.errors?.length)
    throw Error("Calendar availability could not be verified");
  return r.calendars?.primary?.busy || [];
}
export const calendarRouter = Router();
calendarRouter.get("/callback", async (req, res) => {
  const state = String(req.query.state || "");
  const [row] = await query(
    "DELETE FROM oauth_states WHERE state=$1 AND expires>NOW() RETURNING *",
    [state],
  );
  if (!row || typeof req.query.code !== "string") {
    res.status(400).send("Invalid or expired connection request");
    return;
  }
  const tokens = await googleToken({
    grant_type: "authorization_code",
    code: req.query.code,
    redirect_uri: callback(),
    code_verifier: row.verifier,
  });
  if (!tokens.refresh_token)
    throw Error("Google did not grant offline access; reconnect with consent");
  tokens.expiry = Date.now() + tokens.expires_in * 1000;
  await query(
    "INSERT INTO connections(user_id,tokens) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET tokens=EXCLUDED.tokens",
    [row.user_id, encrypt(JSON.stringify(tokens))],
  );
  res.redirect(`${process.env.APP_URL || process.env.PUBLIC_URL}/?connected=1`);
});
calendarRouter.use(auth);
calendarRouter.get("/connect", async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    throw Error("Google OAuth is not configured on this server");
  const state = randomBytes(32).toString("hex"),
    verifier = randomBytes(48).toString("base64url");
  await query(
    "INSERT INTO oauth_states(state,user_id,verifier,expires) VALUES($1,$2,$3,$4)",
    [state, req.userId, verifier, new Date(Date.now() + 600000)],
  );
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callback(),
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` });
});
calendarRouter.delete("/connection", async (req, res) => {
  const [c] = await query("SELECT tokens FROM connections WHERE user_id=$1", [
    req.userId,
  ]);
  if (c) {
    const t = JSON.parse(decrypt(c.tokens));
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: t.refresh_token }),
      signal: AbortSignal.timeout(15000),
    });
    await query("DELETE FROM connections WHERE user_id=$1", [req.userId]);
  }
  res.json({ ok: true });
});
calendarRouter.get("/events", async (req, res) =>
  res.json(
    await listEvents(
      req.userId,
      String(req.query.start),
      String(req.query.end),
    ),
  ),
);
