import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, query } from "./db.js";
function withStats(row: any) {
  const elapsed = Math.max(
    0,
    Math.floor(
      (new Date(row.ended_at || Date.now()).getTime() -
        new Date(row.started_at).getTime()) /
        1000,
    ),
  );
  return {
    ...row,
    elapsed_seconds: elapsed,
    overtime_seconds:
      row.mode === "open" ? 0 : Math.max(0, elapsed - row.goal_minutes * 60),
    goal_reached: row.mode !== "open" && elapsed >= row.goal_minutes * 60,
  };
}
export const focusRouter = Router();
focusRouter.get("/", async (req, res) => {
  const rows = await query(
    "SELECT * FROM focus_sessions WHERE user_id=$1 ORDER BY started_at DESC",
    [req.userId],
  );
  res.json(rows.map(withStats));
});
focusRouter.post("/", async (req, res) => {
  const data = z
    .object({
      title: z.string().trim().min(1).max(160),
      goalMinutes: z.number().int().min(1).max(240).default(25),
      mode: z.enum(["timed", "open"]).default("timed"),
      saveTask: z.boolean().default(false),
    })
    .parse(req.body);
  try {
    const [session] = await query(
      "INSERT INTO focus_sessions(id,user_id,title,goal_minutes,save_task,mode) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        randomUUID(),
        req.userId,
        data.title,
        data.mode === "open" ? 0 : data.goalMinutes,
        data.saveTask,
        data.mode,
      ],
    );
    res.status(201).json(withStats(session));
  } catch (e: any) {
    if (e.code === "23505") {
      res.status(409).json({
        error:
          "A focus session is already running. Return to it before starting another.",
      });
      return;
    }
    throw e;
  }
});
focusRouter.post("/:id/finish", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT * FROM focus_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE",
      [id, req.userId],
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Focus session not found" });
      return;
    }
    let session = rows[0];
    if (!session.ended_at) {
      const ended = new Date();
      let taskId = null;
      if (session.save_task) {
        taskId = randomUUID();
        await client.query(
          "INSERT INTO tasks(id,user_id,title,status) VALUES($1,$2,$3,'done')",
          [taskId, req.userId, session.title],
        );
      }
      session = (
        await client.query(
          "UPDATE focus_sessions SET ended_at=$1,task_id=$2 WHERE id=$3 RETURNING *",
          [ended, taskId, id],
        )
      ).rows[0];
    }
    await client.query("COMMIT");
    res.json(withStats(session));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
