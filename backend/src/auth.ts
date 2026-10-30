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
async function createSession(
  user: string,
  db: Pick<typeof pool, "query"> = pool,
) {
  const sid = randomUUID(),
    refresh = randomBytes(48).toString("hex");
  await db.query(
    "INSERT INTO sessions(id,user_id,hash,expires) VALUES($1,$2,$3,$4)",
    [sid, user, sha(refresh), new Date(Date.now() + 30 * 86400000)],
  );
  return { token: await access(user, sid), refresh };
}

authRouter.post("/register", async (req, res) => {
  const data = credentials.parse(req.body);
  const id = randomUUID(),
    password = await argon.hash(data.password);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "INSERT INTO users(id,email,password,name) VALUES($1,$2,$3,$4)",
      [id, data.email, password, data.name || data.email.split("@")[0]],
    );
    const session = await createSession(id, db);
    await db.query("COMMIT");
    res
      .cookie("refresh", session.refresh, cookie)
      .json({ token: session.token });
  } catch (e: any) {
    await db.query("ROLLBACK");
    if (e.code === "23505") {
      res.status(409).json({ error: "Account already exists" });
      return;
    }
    throw e;
  } finally {
    db.release();
  }
});

authRouter.post("/login", async (req, res) => {
  const data = credentials.parse(req.body);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const {
      rows: [user],
    } = await db.query("SELECT * FROM users WHERE email=$1 FOR UPDATE", [
      data.email,
    ]);
    if (!user || !(await argon.verify(user.password, data.password))) {
      await db.query("ROLLBACK");
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const session = await createSession(user.id, db);
    await db.query("COMMIT");
    res
      .cookie("refresh", session.refresh, cookie)
      .json({ token: session.token });
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
});

const passwordChange = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(128),
    confirmPassword: z.string().min(10).max(128),
  })
  .strict()
  .refine(
    (p) => p.newPassword === p.confirmPassword,
    "New passwords do not match",
  )
  .refine(
    (p) => p.newPassword !== p.currentPassword,
    "Choose a different new password",
  );
authRouter.post(
  "/change-password",
  auth,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    keyGenerator: (req) => req.userId,
    validate: { ip: false },
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many password-change attempts. Try again in 15 minutes.",
    },
  }),
  async (req, res) => {
    const data = passwordChange.parse(req.body);
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const {
        rows: [user],
      } = await db.query("SELECT password FROM users WHERE id=$1 FOR UPDATE", [
        req.userId,
      ]);
      if (!user || !(await argon.verify(user.password, data.currentPassword))) {
        await db.query("ROLLBACK");
        res.status(400).json({ error: "Current password is incorrect." });
        return;
      }
      await db.query("UPDATE users SET password=$1 WHERE id=$2", [
        await argon.hash(data.newPassword),
        req.userId,
      ]);
      await db.query("DELETE FROM sessions WHERE user_id=$1", [req.userId]);
      const session = await createSession(req.userId, db);
      await db.query("COMMIT");
      res
        .cookie("refresh", session.refresh, cookie)
        .json({ token: session.token });
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    } finally {
      db.release();
    }
  },
);

authRouter.post("/refresh", async (req, res) => {
  const raw = req.cookies.refresh;
  if (typeof raw !== "string") {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const {
      rows: [existing],
    } = await db.query(
      "SELECT user_id FROM sessions WHERE hash=$1 AND expires>NOW()",
      [sha(raw)],
    );
    // Serialize refresh/login/password changes on the same account so an old
    // refresh request cannot create a session after a password change commits.
    if (existing)
      await db.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        existing.user_id,
      ]);
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
