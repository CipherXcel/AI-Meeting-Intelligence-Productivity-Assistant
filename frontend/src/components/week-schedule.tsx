import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  CalendarDays,
  Timer,
  RefreshCw,
  ListTodo,
} from "lucide-react";
import type { Workspace } from "../lib/use-workspace";
import { api, type Row } from "../lib/workspace";
import {
  dayKey,
  weekDays,
  shiftDay,
  overlapsDay,
  elapsedSeconds,
  durationLabel,
} from "../lib/schedule";
export function WeekSchedule({
  w,
  selectedDay,
  detailsOnly = false,
  externalEvents,
}: {
  w: Workspace;
  selectedDay?: string;
  detailsOnly?: boolean;
  externalEvents?: Row[];
}) {
  const user = w.user!;
  const today = dayKey(Date.now(), user.timezone);
  const [localSelected, setSelected] = useState(today),
    [events, setEvents] = useState<Row[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const selected = selectedDay || localSelected;
  const days = weekDays(selected),
    first = days[0];
  useEffect(() => {
    let alive = true;
    setEvents([]);
    setError("");
    if (externalEvents !== undefined) {
      setEvents(externalEvents);
      setLoading(false);
      return;
    }
    if (!user.calendarConnected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const start = shiftDay(first, -1) + "T00:00:00Z",
      end = shiftDay(first, 8) + "T00:00:00Z";
    api(
      `/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    )
      .then((rows) => {
        if (alive) setEvents(rows);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [first, user.id, user.calendarConnected, revision, externalEvents]);
  const time = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? "All day"
      : new Date(value).toLocaleTimeString("en-IN", {
          timeZone: user.timezone,
          hour: "numeric",
          minute: "2-digit",
          hour12: w.pref.timeFormat !== "24",
        });
  const google = events.filter(
    (e) => e.start && (e.start.dateTime || e.start.date),
  );
  const entries: Row[] = [
    ...google.map((e) => ({
      id: "google-" + e.id,
      title: e.summary || "Untitled event",
      start: e.start.dateTime || e.start.date,
      end: e.end?.dateTime || e.end?.date,
      kind: "meeting",
      description: e.description || "",
      attendees: e.attendees?.length || 0,
      url: e.htmlLink,
    })),
    ...w.focusSessions.map((s) => ({
      id: "focus-" + s.id,
      title: s.title,
      start: s.started_at,
      end: s.ended_at || new Date().toISOString(),
      kind: "focus",
      running: !s.ended_at,
      description: s.ended_at ? "Completed focus session" : "Focus in progress",
      task: s.task_id,
      mode: s.mode,
      overtime: s.overtime_seconds,
      goalReached: s.goal_reached,
    })),
    ...w.tasks
      .filter((t) => t.due)
      .map((t) => ({
        id: "task-" + t.id,
        title: t.title,
        start: String(t.due).slice(0, 10),
        kind: "task",
        description: t.status === "done" ? "Completed task" : "Task due",
        status: t.status,
      })),
  ];
  const matches = (e: Row, day: string) =>
    overlapsDay(e.start, e.end, day, user.timezone);
  const shown = entries
    .filter((e) => matches(e, selected))
    .sort((a, b) => a.start.localeCompare(b.start));
  const dayTitle = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Date(day + "T12:00:00Z").toLocaleDateString("en-IN", {
      ...options,
      timeZone: "UTC",
    });
  return (
    <section className="week-schedule" aria-label="Weekly schedule">
      {!detailsOnly && (
        <>
          <div className="section-head">
            <div>
              <span className="overline">SCHEDULE</span>
              <h2>Your week</h2>
            </div>
            <div className="week-controls">
              <button
                className="icon-button"
                aria-label="Previous week"
                onClick={() => setSelected(shiftDay(selected, -7))}
              >
                <ChevronLeft size={17} />
              </button>
              <button className="secondary" onClick={() => setSelected(today)}>
                Today
              </button>
              <button
                className="icon-button"
                aria-label="Next week"
                onClick={() => setSelected(shiftDay(selected, 7))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <div className="week-strip">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelected(day)}
                className={selected === day ? "selected" : ""}
                aria-pressed={selected === day}
                aria-current={day === today ? "date" : undefined}
                aria-label={dayTitle(day, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              >
                <span>{dayTitle(day, { weekday: "short" })}</span>
                <strong>{Number(day.slice(-2))}</strong>
                <i
                  className={
                    entries.some((e) => matches(e, day)) ? "has-events" : ""
                  }
                />
              </button>
            ))}
          </div>
        </>
      )}
      <div className="schedule-caption">
        <span>
          {dayTitle(selected, {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <small>{user.timezone}</small>
      </div>
      {!user.calendarConnected && (
        <div className="calendar-hint">
          <CalendarDays size={16} />
          <span>Your tasks and focus sessions appear here.</span>
          <button className="text-button" disabled={w.busy} onClick={w.connect}>
            Connect Google <ArrowUpRight size={13} />
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="small-copy">
          Loading meetings...
        </p>
      )}
      {error && (
        <div className="error-box">
          {error}
          <button
            className="text-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={13} />
            Retry meetings
          </button>
        </div>
      )}
      <div className="schedule-list">
        {shown.map((e) => (
          <article className={`schedule-entry ${e.kind}`} key={e.id}>
            <div className="schedule-time">
              <strong>{time(e.start)}</strong>
              {e.end &&
                e.start.includes("T") &&
                !(e.running && e.mode === "open") && (
                  <small>{e.running ? "Running" : time(e.end)}</small>
                )}
            </div>
            <div className="schedule-event">
              <div className="event-kind">
                {e.kind === "focus" ? (
                  <Timer size={13} />
                ) : e.kind === "task" ? (
                  <ListTodo size={13} />
                ) : (
                  <CalendarDays size={13} />
                )}
                <span>
                  {e.kind === "focus"
                    ? "Focus session"
                    : e.kind === "task"
                      ? e.description
                      : e.attendees
                        ? `${e.attendees} participants`
                        : "Google Calendar"}
                </span>
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${e.title} in Google Calendar`}
                  >
                    <ArrowUpRight size={17} />
                  </a>
                )}
              </div>
              <h3>{e.title}</h3>
              {e.description && e.kind !== "task" && (
                <p>{e.description.replace(/<[^>]*>/g, "").slice(0, 220)}</p>
              )}
              <div className="event-tags">
                {e.end &&
                  e.start.includes("T") &&
                  !(e.running && e.mode === "open") && (
                    <span>{durationLabel(elapsedSeconds(e.start, e.end))}</span>
                  )}
                {e.running && <span className="running-tag">In progress</span>}
                {e.task && <span>Task saved</span>}
                {e.goalReached && <span>Goal reached</span>}
                {e.overtime > 0 && (
                  <span>+{durationLabel(e.overtime)} extra</span>
                )}
                {e.kind === "task" && (
                  <span>{e.status === "done" ? "Done" : "Due today"}</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && !loading && (
        <div className="schedule-empty">
          <CalendarDays size={23} />
          <h3>No plans for this day</h3>
          <p>Start a focus session or add a task with a due date.</p>
        </div>
      )}
    </section>
  );
}
