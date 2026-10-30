import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkle,
  RefreshCw,
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
import { Heading } from "./ui";
import { WeekSchedule } from "./week-schedule";
function monthKey(day: string) {
  return day.slice(0, 7) + "-01";
}
function moveMonth(day: string, amount: number) {
  const date = new Date(monthKey(day) + "T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}
export function CalendarView({ w }: { w: Workspace }) {
  const user = w.user!,
    today = dayKey(Date.now(), user.timezone);
  const [view, setView] = useState("month"),
    [month, setMonth] = useState(monthKey(today)),
    [selected, setSelected] = useState(today),
    [events, setEvents] = useState<Row[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const first = weekDays(month)[0],
    days = Array.from({ length: 42 }, (_, i) => shiftDay(first, i));
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setEvents([]);
    setError("");
    if (view !== "month" || !user.calendarConnected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const boundaries = [-1, 19, 39, 43];
    Promise.all(
      boundaries.slice(0, -1).map((offset, i) => {
        const start = shiftDay(first, offset) + "T00:00:00Z",
          end = shiftDay(first, boundaries[i + 1]) + "T00:00:00Z";
        return api(
          `/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
          "GET",
          undefined,
          false,
          controller.signal,
        );
      }),
    )
      .then((rows) => {
        if (alive)
          setEvents([
            ...new Map(
              rows.flat().map((event: Row) => [event.id, event]),
            ).values(),
          ] as Row[]);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [first, user.id, user.calendarConnected, view, refresh]);
  function summary(day: string) {
    const tasks = w.tasks.filter(
        (t) => t.due && String(t.due).slice(0, 10) === day,
      ),
      done = tasks.filter((t) => t.status === "done").length;
    const focus = w.focusSessions.filter((s) =>
      overlapsDay(
        s.started_at,
        s.ended_at || new Date().toISOString(),
        day,
        user.timezone,
      ),
    );
    const seconds = focus
      .filter((s) => s.ended_at)
      .reduce((n, s) => n + elapsedSeconds(s.started_at, s.ended_at), 0);
    const meetings = events.filter(
      (e) =>
        e.start &&
        overlapsDay(
          e.start.dateTime || e.start.date,
          e.end?.dateTime || e.end?.date,
          day,
          user.timezone,
        ),
    ).length;
    return {
      tasks: tasks.length,
      done,
      seconds,
      focus: focus.length,
      meetings,
    };
  }
  const chosen = summary(selected);
  const label = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Date(day + "T12:00:00Z").toLocaleDateString("en-IN", {
      ...options,
      timeZone: "UTC",
    });
  return (
    <div className="page calendar-page month-page">
      <Heading
        eyebrow="YOUR SCHEDULE"
        title="Calendar"
        action={
          <button
            className="primary"
            onClick={() => {
              w.setInput("Help me plan a meeting.");
              w.navigate("Saarthi");
            }}
          >
            Plan with Saarthi <Sparkle size={15} />
          </button>
        }
      >
        Meetings, tasks, and focus in one place.
      </Heading>
      <div
        className="calendar-view-switch segmented"
        aria-label="Calendar view"
      >
        <button
          className={view === "month" ? "selected" : ""}
          aria-pressed={view === "month"}
          onClick={() => setView("month")}
        >
          Month
        </button>
        <button
          className={view === "week" ? "selected" : ""}
          aria-pressed={view === "week"}
          onClick={() => setView("week")}
        >
          Week
        </button>
      </div>
      {view === "week" ? (
        <WeekSchedule w={w} />
      ) : (
        <div className="month-layout">
          <section className="month-board" aria-label="Month calendar">
            <div className="section-head">
              <h2>{label(month, { month: "long", year: "numeric" })}</h2>
              <div className="week-controls">
                <button
                  className="icon-button"
                  aria-label="Previous month"
                  onClick={() => {
                    const next = moveMonth(month, -1);
                    setMonth(next);
                    setSelected(next);
                  }}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setMonth(monthKey(today));
                    setSelected(today);
                  }}
                >
                  Today
                </button>
                <button
                  className="icon-button"
                  aria-label="Next month"
                  onClick={() => {
                    const next = moveMonth(month, 1);
                    setMonth(next);
                    setSelected(next);
                  }}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
            <div className="month-weekdays" aria-hidden="true">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="month-grid">
              {days.map((day) => {
                const info = summary(day);
                return (
                  <button
                    key={day}
                    className={`month-cell ${day === selected ? "selected" : ""} ${day.slice(0, 7) !== month.slice(0, 7) ? "outside-month" : ""}`}
                    aria-pressed={day === selected}
                    aria-current={day === today ? "date" : undefined}
                    aria-label={`${label(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, ${info.meetings} meetings, ${info.done} of ${info.tasks} tasks complete, ${Math.floor(info.seconds / 60)} focus minutes`}
                    onClick={() => setSelected(day)}
                  >
                    <span className="month-number">
                      {Number(day.slice(-2))}
                    </span>
                    <span className="month-cell-meta">
                      {info.meetings > 0 && (
                        <span className="meeting-count">
                          <i />
                          {info.meetings}
                          <span> meetings</span>
                        </span>
                      )}
                      {info.tasks > 0 && (
                        <span className="task-count">
                          <i />
                          {info.done}/{info.tasks}
                          <span> tasks</span>
                        </span>
                      )}
                      {info.focus > 0 && (
                        <span className="focus-count">
                          <i />
                          {Math.floor(info.seconds / 60)}
                          <span> min focus</span>
                        </span>
                      )}
                    </span>
                    {info.tasks > 0 && (
                      <span className="day-progress" aria-hidden="true">
                        <i
                          style={{
                            width: `${(info.done / info.tasks) * 100}%`,
                          }}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span>
                <i className="meeting-dot" />
                Meetings
              </span>
              <span>
                <i className="task-dot" />
                Tasks / completion bar
              </span>
              <span>
                <i className="focus-dot" />
                Focus
              </span>
            </div>
            {loading && (
              <p className="small-copy" role="status">
                Loading calendar meetings...
              </p>
            )}
            {error && (
              <div className="error-box">
                {error}
                <button
                  className="text-button"
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  <RefreshCw size={13} />
                  Retry meetings
                </button>
              </div>
            )}
          </section>
          <aside className="day-details" aria-label="Selected day details">
            <div className="section-head">
              <h2>
                <CalendarDays size={16} /> Day details
              </h2>
            </div>
            <div className="day-summary">
              <span>
                <strong>{chosen.meetings}</strong> meetings
              </span>
              <span>
                <strong>
                  {chosen.done}/{chosen.tasks}
                </strong>{" "}
                tasks
              </span>
              <span>
                <strong>{durationLabel(chosen.seconds)}</strong> focus
              </span>
            </div>
            <WeekSchedule
              w={w}
              selectedDay={selected}
              detailsOnly
              externalEvents={events}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
