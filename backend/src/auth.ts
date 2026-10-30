import { Router } from "express";
import { randomUUID, randomBytes } from "node:crypto";
import argon from "argon2";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { pool, query } from "./db.js";
import { access, sha, auth } from "./security.js";
export const authRouter = Router();
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
  name: z.string().min(1).max(80).optional(),
});
const cookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
  maxAge: 30 * 86400000,
};
async function issue(user: string, res: any) {
  const sid = randomUUID(),
    token = randomBytes(48).toString("hex");
  await query(
    "INSERT INTO sessions(id,user_id,hash,expires) VALUES($1,$2,$3,$4)",
    [sid, user, sha(token), new Date(Date.now() + 30 * 86400000)],
  );
  res.cookie("refresh", token, cookie);
  return access(user, sid);
}
authRouter.post("/register", async (req, res) => {
  const data = credentials.parse(req.body);
  const id = randomUUID();
  try {
    await query(
      "INSERT INTO users(id,email,password,name) VALUES($1,$2,$3,$4)",
      [
        id,
        data.email,
        await argon.hash(data.password),
        data.name || data.email.split("@")[0],
      ],
    );
  } catch (e: any) {
    if (e.code === "23505") {
      res.status(409).json({ error: "Account already exists" });
      return;
    }
    throw e;
  }
  res.json({ token: await issue(id, res) });
});
authRouter.post("/login", async (req, res) => {
  const data = credentials.parse(req.body);
  const [user] = await query("SELECT * FROM users WHERE email=$1", [
    data.email,
  ]);
  if (!user || !(await argon.verify(user.password, data.password))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  res.json({ token: await issue(user.id, res) });
});
authRouter.post("/refresh", async (req, res) => {
  const raw = req.cookies.refresh;
  if (typeof raw !== "string") {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const r = await db.query(
      "DELETE FROM sessions WHERE hash=$1 AND expires>NOW() RETURNING user_id",
      [sha(raw)],
    );
    if (!r.rows[0]) {
      await db.query("ROLLBACK");
      res
        .clearCookie("refresh", cookie)
        .status(401)
        .json({ error: "Session expired" });
      return;
    }
    const sid = randomUUID(),
      token = randomBytes(48).toString("hex");
    await db.query(
      "INSERT INTO sessions(id,user_id,hash,expires) VALUES($1,$2,$3,$4)",
      [
        sid,
        r.rows[0].user_id,
        sha(token),
        new Date(Date.now() + 30 * 86400000),
      ],
    );
    await db.query("COMMIT");
    res
      .cookie("refresh", token, cookie)
      .json({ token: await access(r.rows[0].user_id, sid) });
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
});
authRouter.post("/logout", auth, async (req, res) => {
  await query("DELETE FROM sessions WHERE id=$1", [req.sessionId]);
  res.clearCookie("refresh", cookie).json({ ok: true });
});
