import { useState } from "react";
import { FocusDetails } from "./focus-details";
import {
  ArrowUpRight,
  Plus,
  Sparkle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { Workspace } from "../lib/use-workspace";
import { api, dateLabel } from "../lib/workspace";
import {
  dayKey,
  elapsedSeconds,
  durationLabel,
  weekDays,
} from "../lib/schedule";
import { Heading, Stat } from "./ui";
import { FocusCard } from "./focus";
import { WeekSchedule } from "./week-schedule";
export function Overview({ w }: { w: Workspace }) {
  const user = w.user!;
  const [focusDetails, setFocusDetails] = useState(false);
  const today = dayKey(Date.now(), user.timezone);
  const finished = w.focusSessions.filter(
    (s) => s.ended_at && dayKey(s.ended_at, user.timezone) === today,
  );
  const seconds = finished.reduce(
    (total, s) => total + elapsedSeconds(s.started_at, s.ended_at),
    0,
  );
  const overtime = finished.reduce(
    (total, s) => total + (s.overtime_seconds || 0),
    0,
  );
  const goals = finished.filter((s) => s.goal_reached).length;
  const openTasks = w.tasks.filter((t) => t.status !== "done");
  const weekly = weekDays(today).map((day) => ({
    day,
    seconds: w.focusSessions
      .filter((s) => s.ended_at && dayKey(s.ended_at, user.timezone) === day)
      .reduce((sum, s) => sum + elapsedSeconds(s.started_at, s.ended_at), 0),
  }));
  const weeklyTotal = weekly.reduce((sum, d) => sum + d.seconds, 0);
  const chartMax = Math.max(1500, ...weekly.map((d) => d.seconds));
  return (
    <div className="page overview-page">
      <Heading
        eyebrow="YOUR WORKSPACE"
        title={`Hello, ${user.name.split(" ")[0]}`}
        action={
          <button
            className="text-button"
            onClick={() => {
              w.setInput("Help me plan my day around my tasks and meetings.");
              w.navigate("Saarthi");
            }}
          >
            <Sparkle size={15} /> Plan my day <ArrowUpRight size={14} />
          </button>
        }
      >
        Your schedule, tasks, and focus time.
      </Heading>
      <div className="stats overview-stats">
        <Stat
          label="Open tasks"
          value={openTasks.length}
          onClick={() => w.navigate("Tasks")}
        />
        <Stat
          label="Pending review"
          value={w.pending.length}
          onClick={() => w.navigate("All proposals")}
        />
        <Stat
          label="Focus sessions today"
          value={finished.length}
          onClick={() => setFocusDetails(true)}
        />
        <Stat
          label="Saved notes"
          value={w.docs.length}
          onClick={() => w.navigate("Notes & files")}
        />
      </div>
      {w.pending.length > 0 && (
        <button
          className="overview-review"
          onClick={() => w.navigate("All proposals")}
        >
          <ShieldCheck size={17} />
          <span>
            <strong>
              {w.pending.length} proposal{w.pending.length === 1 ? "" : "s"}{" "}
              need your review
            </strong>
            <small>Approve or decline Saarthi's suggested actions.</small>
          </span>
          <ArrowUpRight size={17} />
        </button>
      )}
      <section
        className="daily-brief"
        role="button"
        tabIndex={0}
        aria-label="View today's focus sessions"
        aria-haspopup="dialog"
        onClick={() => setFocusDetails(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFocusDetails(true);
          }
        }}
      >
        <div className="brief-heading">
          <span className="overline">
            TODAY'S FOCUS <ArrowUpRight size={13} />
          </span>
          <strong>
            {seconds ? durationLabel(seconds) : "Ready when you are"}
          </strong>
          <p>
            {finished.length
              ? `${finished.length} sessions finished. ${goals} goals reached${overtime ? `, plus ${durationLabel(overtime)} extra focus` : ""}.`
              : "Start a session to track your focus, goals, and extra time."}
          </p>
        </div>
        <div className="brief-metrics">
          <div>
            <strong>
              {goals}
              <small>/{finished.filter((s) => s.mode !== "open").length}</small>
            </strong>
            <span>Goals reached</span>
          </div>
          <div>
            <strong>
              {overtime < 60 ? overtime : Math.floor(overtime / 60)}
              <small>{overtime < 60 ? " sec" : " min"}</small>
            </strong>
            <span>Extra focus</span>
          </div>
          <div>
            <strong>{openTasks.length}</strong>
            <span>Open tasks</span>
          </div>
        </div>
      </section>
      {focusDetails && (
        <FocusDetails w={w} close={() => setFocusDetails(false)} />
      )}
      <div className="daily-layout">
        <div className="daily-main">
          <WeekSchedule w={w} />
          <div className="overview-utilities">
            <section className="next-steps">
              <div className="section-head">
                <h2>Next steps</h2>
                <button
                  className="icon-button"
                  aria-label="Add a task"
                  onClick={() => w.setModal("task")}
                >
                  <Plus size={18} />
                </button>
              </div>
              {openTasks.slice(0, 4).map((t) => (
                <div className="simple-row" key={t.id}>
                  <button
                    className="task-check"
                    aria-label={`Complete ${t.title}`}
                    disabled={w.busy}
                    onClick={() =>
                      w.action(async () => {
                        await api(`/tasks/${t.id}`, "PATCH", {
                          status: "done",
                        });
                        await w.loadWorkspace();
                      })
                    }
                  />
                  <button
                    className="task-open overview-task"
                    onClick={() => {
                      w.setSelected(t);
                      w.setModal("task-detail");
                    }}
                  >
                    {t.title}
                    <small>
                      {t.due ? `Due ${dateLabel(t.due, user)}` : "No deadline"}
                    </small>
                  </button>
                </div>
              ))}
              {!openTasks.length && (
                <p className="small-copy">
                  No open tasks. Add your next step when you're ready.
                </p>
              )}
              {openTasks.length > 4 && (
                <button
                  className="text-button"
                  onClick={() => w.navigate("Tasks")}
                >
                  View all tasks <ArrowUpRight size={13} />
                </button>
              )}
            </section>

            <section className="recent-notes">
              <div className="section-head">
                <h2>Recent notes</h2>
                <button
                  className="text-button"
                  onClick={() => w.navigate("Notes & files")}
                >
                  All notes <ArrowUpRight size={13} />
                </button>
              </div>
              {w.docs.slice(0, 3).map((d) => (
                <button
                  className="note-shortcut"
                  key={d.id}
                  onClick={() => w.readDoc(d)}
                >
                  <FileText size={16} />
                  <span>
                    <strong>{d.title}</strong>
                    <small>{dateLabel(d.created_at, user)}</small>
                  </span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
              {!w.docs.length && (
                <>
                  <p className="small-copy">
                    Keep your study material and meeting notes together.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => w.upload.current?.click()}
                  >
                    Upload a note <Plus size={13} />
                  </button>
                </>
              )}
            </section>
          </div>
        </div>
        <aside className="daily-side">
          <FocusCard w={w} />
          <section className="weekly-focus">
            <div className="section-head">
              <h2>This week's focus</h2>
              <span>{weeklyTotal ? durationLabel(weeklyTotal) : "0 min"}</span>
            </div>
            <div
              className="focus-week-chart"
              role="img"
              aria-label={weekly
                .map((d) => `${d.day}: ${Math.floor(d.seconds / 60)} minutes`)
                .join(", ")}
            >
              {weekly.map((d) => (
                <div key={d.day}>
                  <div className="focus-day-track">
                    <span
                      style={{
                        height: `${Math.max(3, (d.seconds / chartMax) * 100)}%`,
                      }}
                      className={d.day === today ? "today" : ""}
                      title={`${Math.floor(d.seconds / 60)} min`}
                    />
                  </div>
                  <small>
                    {new Date(d.day + "T12:00:00Z")
                      .toLocaleDateString("en", {
                        weekday: "short",
                        timeZone: "UTC",
                      })
                      .slice(0, 1)}
                  </small>
                </div>
              ))}
            </div>
            <p>
              Completed sessions this week
              {seconds ? ` / ${durationLabel(seconds)} finished today` : ""}.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
