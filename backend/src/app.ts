import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, owned } from "./db.js";
import { auth } from "./security.js";
import { authRouter } from "./auth.js";
import { calendarRouter, interval } from "./calendar.js";
import { runAgent } from "./agent.js";
import { approve, meetingSchema } from "./tools.js";
import { upload, download, removeDocument } from "./storage.js";
import { focusRouter } from "./focus.js";
import { diaryRouter, readDiaryForAgent } from "./diary.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
const origin = process.env.APP_URL || "http://localhost:3000";
app.use(cors({ origin, credentials: true }));
app.use("/api/diary/entries", express.json({ limit: "2mb" }));
app.use(express.json({ limit: "600kb" }));
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== origin
  ) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  next();
});
app.get("/api/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ status: "ok" });
});
app.use("/api/auth", authRouter);
app.use("/api/calendar", calendarRouter);
const api = express.Router();
api.use(auth);
api.use(
  rateLimit({
    windowMs: 60000,
    limit: 120,
    keyGenerator: (r) => r.userId,
    validate: { ip: false },
  }),
);
api.use("/focus", focusRouter);
api.use("/diary", diaryRouter);
api.get("/me", async (req, res) => {
  const [u] = await query(
    "SELECT id,email,name,timezone,duration,profile FROM users WHERE id=$1",
    [req.userId],
  );
  const c = await query("SELECT user_id FROM connections WHERE user_id=$1", [
    req.userId,
  ]);
  res.json({
    ...u,
    calendarConnected: !!c.length,
    calendarConfigured: !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
    aiConfigured: !!process.env.GEMINI_API_KEY,
    storage: process.env.AWS_S3_BUCKET ? "S3" : "Local disk",
  });
});
api.patch("/me", async (req, res) => {
  const p = z
    .object({
      name: z.string().min(1).max(80),
      timezone: z.string().refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Invalid timezone"),
      duration: z.number().int().min(10).max(240),
      profile: z
        .object({
          role: z.string().max(80).default(""),
          organisation: z.string().max(100).default(""),
          bio: z.string().max(500).default(""),
          avatar: z
            .string()
            .max(450000)
            .regex(/^$|^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
            .default(""),
          theme: z
            .enum([
              "amethyst",
              "ocean",
              "forest",
              "ivory",
              "glass",
              "glass-frost",
              "glass-bloom",
              "glass-sand",
            ])
            .default("ivory"),
          timeFormat: z.enum(["12", "24"]).default("12"),
          density: z.enum(["comfortable", "compact"]).default("comfortable"),
          workingDays: z
            .array(z.number().int().min(0).max(6))
            .min(1)
            .max(7)
            .default([1, 2, 3, 4, 5]),
          workStart: z
            .string()
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
            .default("09:00"),
          workEnd: z
            .string()
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
            .default("18:00"),
        })
        .refine(
          (p) => p.workStart < p.workEnd,
          "Working hours must end after they start",
        )
        .optional(),
    })
    .parse(req.body);
  await query("UPDATE users SET name=$1,timezone=$2,duration=$3 WHERE id=$4", [
    p.name,
    p.timezone,
    p.duration,
    req.userId,
  ]);
  if (p.profile)
    await query("UPDATE users SET profile=$1 WHERE id=$2", [
      JSON.stringify(p.profile),
      req.userId,
    ]);
  res.json({ ok: true });
});
api.get("/threads", async (req, res) =>
  res.json(
    await query(
      "SELECT * FROM threads WHERE user_id=$1 ORDER BY updated_at DESC",
      [req.userId],
    ),
  ),
);
api.post("/threads", async (req, res) => {
  const id = randomUUID();
  await query("INSERT INTO threads(id,user_id,title) VALUES($1,$2,$3)", [
    id,
    req.userId,
    "New conversation",
  ]);
  res.json({ id, title: "New conversation" });
});
api.get("/threads/:id", async (req, res) => {
  await owned("threads", String(req.params.id), req.userId);
  res.json(
    await query(
      "SELECT * FROM messages WHERE thread_id=$1 ORDER BY created_at",
      [req.params.id],
    ),
  );
});
api.patch("/threads/:id", async (req, res) => {
  await owned("threads", String(req.params.id), req.userId);
  const title = z.string().min(1).max(100).parse(req.body.title);
  await query("UPDATE threads SET title=$1 WHERE id=$2", [
    title,
    req.params.id,
  ]);
  res.json({ ok: true });
});
api.delete("/threads/:id", async (req, res) => {
  await owned("threads", String(req.params.id), req.userId);
  await query("DELETE FROM threads WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});
api.post(
  ["/chat", "/diary/chat"],
  rateLimit({ windowMs: 60000, limit: 10, keyGenerator: (r) => r.userId }),
  async (req, res) => {
    const d = z
      .object({
        threadId: z.uuid(),
        message: z.string().trim().min(1).max(5000),
      })
      .parse(req.body);
    await owned("threads", d.threadId, req.userId);
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const controller = new AbortController();
    res.on("close", () => controller.abort());
    const emit = (e: unknown) => {
      if (!res.destroyed) res.write(`data: ${JSON.stringify(e)}\n\n`);
    };
    const heartbeat = setInterval(() => {
      if (!res.destroyed) res.write(": ping\n\n");
    }, 15000);
    try {
      emit({ type: "started" });
      await runAgent(
        req.userId,
        d.threadId,
        d.message,
        emit,
        controller.signal,
        () => readDiaryForAgent(req),
      );
    } catch (e: any) {
      emit({ type: "error", message: e.message });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  },
);
api.get("/tasks", async (req, res) =>
  res.json(
    await query(
      "SELECT * FROM tasks WHERE user_id=$1 ORDER BY created_at DESC",
      [req.userId],
    ),
  ),
);
const taskFields = z.object({
  title: z.string().trim().min(1).max(300),
  due: z.iso.date().nullable(),
  status: z.enum(["todo", "doing", "done"]),
  details: z.string().max(8000),
  note_ids: z
    .array(z.uuid())
    .max(20)
    .transform((ids) => [...new Set(ids)]),
});
api.post("/tasks", async (req, res) => {
  const d = taskFields.parse({
    due: null,
    status: "todo",
    details: "",
    note_ids: [],
    ...req.body,
  });
  await Promise.all(d.note_ids.map((id) => owned("documents", id, req.userId)));
  const id = randomUUID();
  await query(
    "INSERT INTO tasks(id,user_id,title,due,status,details,note_ids) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [id, req.userId, d.title, d.due, d.status, d.details, d.note_ids],
  );
  res.json({ id });
});
api.patch("/tasks/:id", async (req, res) => {
  const d = taskFields
    .partial()
    .strict()
    .refine((v) => Object.keys(v).length > 0, "No task changes supplied")
    .parse(req.body);
  await owned("tasks", String(req.params.id), req.userId);
  if (d.note_ids)
    await Promise.all(
      d.note_ids.map((id) => owned("documents", id, req.userId)),
    );
  const entries = Object.entries(d);
  // Column names come only from the strict schema above, never arbitrary input.
  await query(
    `UPDATE tasks SET ${entries.map(([key], i) => `${key}=$${i + 1}`).join(",")} WHERE id=$${entries.length + 1} AND user_id=$${entries.length + 2}`,
    [...entries.map(([, value]) => value), req.params.id, req.userId],
  );
  res.json({ ok: true });
});
api.delete("/tasks/:id", async (req, res) => {
  await query("DELETE FROM tasks WHERE id=$1 AND user_id=$2", [
    req.params.id,
    req.userId,
  ]);
  res.json({ ok: true });
});
api.get("/proposals", async (req, res) => {
  const thread = req.query.threadId
    ? z.uuid().parse(req.query.threadId)
    : undefined;
  if (thread) await owned("threads", thread, req.userId);
  res.json(
    await query(
      `SELECT * FROM proposals WHERE user_id=$1${thread ? " AND thread_id=$2" : ""} ORDER BY created_at DESC`,
      thread ? [req.userId, thread] : [req.userId],
    ),
  );
});
api.patch("/proposals/:id", async (req, res) => {
  const p = await owned("proposals", String(req.params.id), req.userId);
  if (p.status !== "pending") throw Error("Proposal already processed");
  if (req.body.status === "rejected") {
    await query(
      "UPDATE proposals SET status='rejected' WHERE id=$1 AND user_id=$2 AND status='pending'",
      [p.id, req.userId],
    );
  } else {
    if (p.kind !== "create")
      throw Error("Only new-meeting proposals can be edited here");
    const d = meetingSchema.parse(req.body.payload);
    interval(d.start, d.end);
    await query(
      "UPDATE proposals SET payload=$1 WHERE id=$2 AND user_id=$3 AND status='pending'",
      [JSON.stringify(d), p.id, req.userId],
    );
  }
  res.json({ ok: true });
});
api.post("/proposals/:id/approve", async (req, res) =>
  res.json(await approve(req.userId, String(req.params.id))),
);
api.get("/folders", async (req, res) =>
  res.json(
    await query(
      "SELECT id,name FROM document_folders WHERE user_id=$1 ORDER BY name",
      [req.userId],
    ),
  ),
);
api.post("/folders", async (req, res) => {
  const { name } = z
    .object({ name: z.string().trim().min(1).max(80) })
    .strict()
    .parse(req.body);
  const id = randomUUID();
  const existing = await query(
    "SELECT id FROM document_folders WHERE user_id=$1 AND name=$2",
    [req.userId, name],
  );
  if (existing.length) {
    res.status(409).json({ error: "A folder with that name already exists." });
    return;
  }
  await query(
    "INSERT INTO document_folders(id,user_id,name) VALUES($1,$2,$3)",
    [id, req.userId, name],
  );
  res.json({ id, name });
});
api.patch("/folders/:id", async (req, res) => {
  const { name } = z
    .object({ name: z.string().trim().min(1).max(80) })
    .strict()
    .parse(req.body);
  const rows = await query(
    "UPDATE document_folders SET name=$1 WHERE id=$2 AND user_id=$3 RETURNING id,name",
    [name, req.params.id, req.userId],
  );
  if (!rows.length) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.json(rows[0]);
});
api.delete("/folders/:id", async (req, res) => {
  const rows = await query(
    "DELETE FROM document_folders WHERE id=$1 AND user_id=$2 RETURNING id",
    [req.params.id, req.userId],
  );
  if (!rows.length) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.json({ ok: true });
});
api.patch("/documents/:id/folder", async (req, res) => {
  const { folderId } = z
    .object({ folderId: z.uuid().nullable() })
    .strict()
    .parse(req.body);
  await owned("documents", String(req.params.id), req.userId);
  if (
    folderId &&
    !(
      await query(
        "SELECT id FROM document_folders WHERE id=$1 AND user_id=$2",
        [folderId, req.userId],
      )
    ).length
  ) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  await query("UPDATE documents SET folder_id=$1 WHERE id=$2 AND user_id=$3", [
    folderId,
    req.params.id,
    req.userId,
  ]);
  res.json({ ok: true });
});
api.get("/documents", async (req, res) =>
  res.json(
    await query(
      "SELECT id,title,mime,size,version,created_at,folder_id FROM documents WHERE user_id=$1 ORDER BY created_at DESC",
      [req.userId],
    ),
  ),
);
api.post(
  "/documents",
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  }).single("file"),
  async (req, res) => {
    if (!req.file) throw Error("Choose a file");
    res.json(await upload(req.userId, req.file));
  },
);
api.get("/documents/:id", async (req, res) =>
  res.json(await owned("documents", String(req.params.id), req.userId)),
);
api.get("/documents/:id/download", async (req, res) => {
  const d = await download(req.userId, String(req.params.id));
  res.setHeader("Content-Type", d.document.mime);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(d.document.title)}`,
  );
  res.send(d.buffer);
});
api.delete("/documents/:id", async (req, res) => {
  await removeDocument(req.userId, String(req.params.id));
  res.json({ ok: true });
});
api.get("/activity", async (req, res) =>
  res.json(
    await query(
      "SELECT id,tool,created_at FROM tool_runs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
      [req.userId],
    ),
  ),
);
app.use("/api", api);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Endpoint not found" }),
);
app.use("/workspace", (_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});
app.use(
  express.static(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../frontend/out",
    ),
    {
      setHeaders(res, filePath) {
        // Next's fingerprinted bundles can be reused safely across visits.
        if (filePath.includes(path.join("_next", "static") + path.sep))
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    },
  ),
);
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (res.headersSent) return;
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: err.issues
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join("; "),
      });
      return;
    }
    res.status(err.status || 400).json({
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "File exceeds 10 MB"
          : err.message || "Request failed",
    });
  },
);
