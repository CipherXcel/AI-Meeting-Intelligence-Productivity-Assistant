import { Clock3, Check, Sparkle, Timer } from "lucide-react";
import type { Workspace } from "../lib/use-workspace";
import { dayKey, elapsedSeconds, durationLabel } from "../lib/schedule";
import { dateLabel, profileOf } from "../lib/workspace";
import { Modal } from "./ui";
export function FocusDetails({
  w,
  close,
}: {
  w: Workspace;
  close: () => void;
}) {
  const user = w.user!,
    today = dayKey(Date.now(), user.timezone);
  const sessions = w.focusSessions.filter(
    (s) => dayKey(s.ended_at || s.started_at, user.timezone) === today,
  );
  const finished = sessions.filter((s) => s.ended_at),
    total = finished.reduce(
      (n, s) => n + elapsedSeconds(s.started_at, s.ended_at),
      0,
    );
  const time = (value: string) =>
    new Date(value).toLocaleTimeString("en-IN", {
      timeZone: user.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: profileOf(user).timeFormat !== "24",
    });
  return (
    <Modal title="Today's focus" close={close}>
      <div className="focus-detail-summary">
        <span className="focus-detail-icon">
          <Clock3 size={22} />
        </span>
        <div>
          <strong>{durationLabel(total)} focused</strong>
          <p>
            {finished.length} finished ·{" "}
            {sessions.filter((s) => !s.ended_at).length} active
          </p>
        </div>
      </div>
      <p className="focus-detail-date">
        {dateLabel(new Date().toISOString(), user)} · {user.timezone}
      </p>
      <div className="focus-session-list">
        {sessions.length === 0 && (
          <p className="small-copy">
            No sessions today yet. Start focus whenever you're ready.
          </p>
        )}
        {sessions.map((s) => (
          <article className="focus-session-detail" key={s.id}>
            <div className="focus-session-heading">
              <span className={`session-state ${s.ended_at ? "" : "active"}`}>
                {s.ended_at ? <Check size={14} /> : <Timer size={14} />}
              </span>
              <h3>{s.title}</h3>
              <strong>
                {s.ended_at
                  ? durationLabel(elapsedSeconds(s.started_at, s.ended_at))
                  : "In progress"}
              </strong>
            </div>
            <div className="session-timing">
              <span>
                {time(s.started_at)} →{" "}
                {s.ended_at ? time(s.ended_at) : "Ongoing"}
              </span>
              {dayKey(s.started_at, user.timezone) !== today && (
                <small>Started {dateLabel(s.started_at, user)}</small>
              )}
            </div>
            <div className="session-facts">
              <span>
                {s.mode === "open" ? "No timer" : `${s.goal_minutes} min goal`}
              </span>
              {s.goal_reached && (
                <span className="goal">
                  <Sparkle size={10} /> Goal reached
                </span>
              )}
              {s.overtime_seconds > 0 && (
                <span>+{durationLabel(s.overtime_seconds)} extra</span>
              )}
              {s.task_id && <span>Task saved</span>}
            </div>
          </article>
        ))}
      </div>
    </Modal>
  );
}
