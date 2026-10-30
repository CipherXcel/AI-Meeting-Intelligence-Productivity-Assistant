import { useEffect, useState, useRef } from "react";
import {
  Play,
  Square,
  Timer,
  ArrowUpRight,
  Check,
  Sparkle,
} from "lucide-react";
import type { Workspace } from "../lib/use-workspace";
import { clockLabel, durationLabel, elapsedSeconds } from "../lib/schedule";
import { dateLabel } from "../lib/workspace";
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(Date.now());
    const resume = () => {
      if (timer) clearInterval(timer);
      if (document.hidden) return;
      tick();
      timer = setInterval(tick, 1000);
    };
    resume();
    document.addEventListener("visibilitychange", resume);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [active]);
  return now;
}
export function FocusIndicator({ w }: { w: Workspace }) {
  const active = w.focusSessions.find((s) => !s.ended_at);
  const now = useNow(!!active && active.mode !== "open");
  const announced = useRef("");
  const reached =
    !!active &&
    active.mode !== "open" &&
    elapsedSeconds(active.started_at, now) >= active.goal_minutes * 60;
  useEffect(() => {
    if (!active || !reached || announced.current === active.id) return;
    announced.current = active.id;
    const key = `meetagent:goal:${active.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "seen");
    } catch {
      /* The in-memory guard still prevents repeated notices. */
    }
    w.notify(
      "Focus goal reached! Extra time is now being recorded. Finish whenever you are ready.",
    );
  }, [active?.id, reached]);
  if (!active || w.view === "Overview") return null;
  return (
    <button
      className={`focus-indicator ${reached ? "goal-reached" : ""}`}
      onClick={() => {
        w.navigate("Overview");
        requestAnimationFrame(() =>
          document
            .getElementById("focus-mode")
            ?.scrollIntoView({ block: "center", behavior: "instant" }),
        );
      }}
      aria-label="Return to active focus session"
    >
      <span className="live-dot" />
      <Timer size={14} />
      <span className={active.mode === "open" ? "open-focus-label" : ""}>
        {active.mode === "open" ? "Focusing" : reached ? "Extra time" : "Focus"}
      </span>
      {active.mode !== "open" && (
        <strong>
          {reached ? "+" : ""}
          {clockLabel(
            reached
              ? elapsedSeconds(active.started_at, now) -
                  active.goal_minutes * 60
              : elapsedSeconds(active.started_at, now),
          )}
        </strong>
      )}
    </button>
  );
}
export function FocusCard({ w }: { w: Workspace }) {
  const active = w.focusSessions.find((s) => !s.ended_at);
  const [title, setTitle] = useState(""),
    [goal, setGoal] = useState(25),
    [saveTask, setSaveTask] = useState(false),
    [mode, setMode] = useState<"timed" | "open">("timed");
  const openMode = (active?.mode || mode) === "open";
  const now = useNow(!!active && active.mode !== "open");
  const elapsed = active ? elapsedSeconds(active.started_at, now) : 0;
  const target = Math.max(1, active?.goal_minutes || goal || 25) * 60;
  const reached = !!active && !openMode && elapsed >= target;
  const recent = w.focusSessions.filter((s) => s.ended_at).slice(0, 3);
  return (
    <>
      <section
        className={`focus-card ${active ? "is-running" : ""} ${reached ? "goal-reached" : ""}`}
        aria-label="Focus mode"
        id="focus-mode"
      >
        <div className="section-head">
          <h2>
            <Timer size={17} /> Focus mode
          </h2>
          <span className="focus-label">
            {active ? (
              <>
                <span className="live-dot" />{" "}
                {reached ? "Goal complete" : "In progress"}
              </>
            ) : (
              "Your time"
            )}
          </span>
        </div>
        <div className="focus-emblem" aria-hidden="true">
          <svg className="focus-orbits" viewBox="0 0 220 100" fill="none">
            <ellipse
              cx="110"
              cy="50"
              rx="83"
              ry="29"
              transform="rotate(-19 110 50)"
            />
            <ellipse
              className="orbit-purple"
              cx="110"
              cy="50"
              rx="83"
              ry="29"
              transform="rotate(19 110 50)"
            />
            <circle cx="35" cy="73" r="3" className="orbit-point" />
            <circle cx="184" cy="27" r="2" className="orbit-point second" />
          </svg>
          <Sparkle size={49} fill="currentColor" strokeWidth={0.8} />
        </div>
        <div
          className={`focus-clock ${openMode ? "open-focus-clock" : ""}`}
          role={openMode ? "status" : "timer"}
          aria-label={
            openMode
              ? "Open focus status"
              : active
                ? "Focus elapsed time"
                : "Focus goal duration"
          }
        >
          {openMode
            ? active
              ? "In focus"
              : "Your own pace"
            : clockLabel(active ? elapsed : target)}
        </div>
        <p className="focus-clock-caption">
          {openMode
            ? "No visible timer. Finish when you are ready."
            : active
              ? reached
                ? "Goal reached. Finish when you're ready."
                : `${clockLabel(Math.max(0, target - elapsed))} to your goal`
              : "Choose a goal and get started."}
        </p>
        {reached && (
          <div className="focus-complete" role="status">
            <Check size={16} />
            <div>
              <strong>Goal complete</strong>
              <span>+{clockLabel(elapsed - target)} extra focus recorded</span>
            </div>
            <Sparkle size={18} />
          </div>
        )}
        {!openMode && (
          <div
            className="focus-progress"
            role="progressbar"
            aria-label="Focus goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.floor((elapsed / target) * 100))}
          >
            <span
              style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }}
            />
          </div>
        )}
        {active ? (
          <div className="focus-subject">
            <h3>{active.title}</h3>
            <p>
              {openMode
                ? "Open focus session"
                : `${active.goal_minutes} minute goal`}
              {active.save_task ? " / Save a completed task" : ""}
            </p>
          </div>
        ) : (
          <label className="focus-title-label">
            What are you working on?
            <input
              aria-label="Focus topic"
              placeholder="e.g. Study operating systems"
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        )}
        {!active && (
          <>
            <div
              className={`focus-presets ${openMode ? "is-disabled" : ""}`}
              aria-label="Focus duration"
            >
              {[25, 50, 90].map((minutes) => (
                <button
                  key={minutes}
                  disabled={openMode}
                  aria-pressed={goal === minutes}
                  onClick={() => setGoal(minutes)}
                >
                  {minutes} min
                </button>
              ))}
              <label>
                Custom
                <input
                  aria-label="Custom focus minutes"
                  disabled={openMode}
                  type="number"
                  min={1}
                  max={240}
                  value={goal}
                  onChange={(e) => setGoal(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="open-focus-toggle">
              <span>
                <strong>Focus without a timer</strong>
                <small>Keep going at your own pace</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Focus without a timer"
                checked={mode === "open"}
                onChange={(e) => setMode(e.target.checked ? "open" : "timed")}
              />
              <span className="toggle-track" aria-hidden="true" />
            </label>
            <label className="focus-task-option">
              <input
                type="checkbox"
                checked={saveTask}
                onChange={(e) => setSaveTask(e.target.checked)}
              />
              Also save as a completed task
            </label>
          </>
        )}
        <button
          className="primary focus-start"
          disabled={
            w.busy ||
            (!active &&
              !openMode &&
              (!Number.isInteger(goal) || goal < 1 || goal > 240))
          }
          onClick={() =>
            active
              ? w.finishFocus(active.id)
              : w.startFocus(
                  title.trim() || (openMode ? "Open focus" : "Focus session"),
                  openMode ? 25 : goal,
                  saveTask,
                  mode,
                )
          }
        >
          {active ? (
            <>
              <Square size={15} /> Finish & save
            </>
          ) : (
            <>
              <Play size={16} /> Start focus
            </>
          )}
        </button>
        <p className="focus-help">
          {active
            ? openMode
              ? "Your focus session stays active until you finish. Time spent is saved afterwards."
              : "Your timer continues across pages and refreshes, until you finish it."
            : "Study or work at your own pace. Finish to record the session in your AgentBuddy calendar."}
        </p>
      </section>
      {recent.length > 0 && (
        <section className="focus-history">
          <div className="section-head">
            <h2>Recent focus</h2>
            <button
              className="text-button"
              onClick={() => w.navigate("Calendar")}
            >
              Calendar <ArrowUpRight size={14} />
            </button>
          </div>
          {recent.map((s) => (
            <div key={s.id} className="focus-history-row">
              <Check size={14} />
              <div>
                <strong>{s.title}</strong>
                <small>{dateLabel(s.ended_at, w.user!, true)}</small>
              </div>
              <span>
                {durationLabel(elapsedSeconds(s.started_at, s.ended_at))}
                {s.overtime_seconds > 0 && (
                  <small>+{durationLabel(s.overtime_seconds)} extra</small>
                )}
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
