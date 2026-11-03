import { useState } from "react";
import {
  Check,
  X,
  Pencil,
  Clock3,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { type Row, dateLabel } from "../lib/workspace";
import { Empty, Modal } from "./ui";
type Props = {
  items: Row[];
  user: Row;
  busy: boolean;
  act: (p: Row, action: string, payload?: Row) => Promise<void>;
  openThread?: (id: string) => void;
  compact?: boolean;
};
export function Proposals({
  items,
  user,
  busy,
  act,
  openThread,
  compact = false,
}: Props) {
  const [section, setSection] = useState("pending"),
    [edit, setEdit] = useState<Row | null>(null);
  const pending = items.filter((p) => p.status === "pending"),
    history = items.filter((p) => p.status !== "pending");
  return (
    <div className={compact ? "proposal-panel" : "proposal-list"}>
      <div className="section-head">
        <div className="inline">
          <ShieldCheck size={18} />
          <h2>{compact ? "All proposals" : "Review queue"}</h2>
        </div>
        <span className="pill">{items.length}</span>
      </div>
      <p className="muted small-copy">You decide what happens next.</p>
      <div className="segmented">
        <button
          onClick={() => setSection("pending")}
          className={section === "pending" ? "selected" : ""}
        >
          Pending <span>{pending.length}</span>
        </button>
        <button
          onClick={() => setSection("history")}
          className={section === "history" ? "selected" : ""}
        >
          History <span>{history.length}</span>
        </button>
      </div>
      <div className="proposal-items">
        {(section === "pending" ? pending : history).map((p) => (
          <article className="proposal-card" key={p.id}>
            <div className="section-head">
              <span className={`status ${p.status}`}>
                <Clock3 size={12} />
                {p.status === "rejected" ? "Dismissed" : p.status}
              </span>
              <span className="overline">
                {p.kind === "tasks"
                  ? "Action items"
                  : p.kind === "create"
                    ? "New meeting"
                    : p.kind}
              </span>
            </div>
            <h3>
              {p.payload.title ||
                (p.kind === "tasks"
                  ? `${p.payload.tasks.length} suggested tasks`
                  : "Calendar change")}
            </h3>
            {p.payload.start && (
              <p className="proposal-time">
                {dateLabel(p.payload.start, user, true)}
                <br />
                <span className="muted">
                  to {dateLabel(p.payload.end, user, true)}
                </span>
              </p>
            )}
            {p.payload.description && (
              <p className="small-copy">{p.payload.description}</p>
            )}
            {!!p.payload.attendees?.length && (
              <p className="muted small-copy">
                With {p.payload.attendees.join(", ")}
              </p>
            )}
            {p.payload.tasks && (
              <ul className="task-preview">
                {p.payload.tasks.map((t: Row, i: number) => (
                  <li key={i}>
                    {t.title}
                    {t.due && <small>Due {dateLabel(t.due, user)}</small>}
                  </li>
                ))}
              </ul>
            )}
            {p.payload.eventId && (
              <details>
                <summary>Event details</summary>
                <code>{p.payload.eventId}</code>
              </details>
            )}
            {!compact &&
              (p.thread_id ? (
                <button
                  className="text-button"
                  onClick={() => openThread?.(p.thread_id)}
                >
                  Open conversation <ArrowUpRight size={14} />
                </button>
              ) : (
                <small>Originating conversation unavailable</small>
              ))}
            {p.status === "pending" && (
              <div className="proposal-actions">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => act(p, "approve")}
                >
                  <Check size={15} />
                  Approve
                </button>
                {p.kind === "create" && (
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label="Edit proposal"
                    onClick={() => setEdit(p)}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label="Dismiss proposal"
                  onClick={() => act(p, "dismiss")}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            {p.result?.htmlLink && (
              <a
                className="text-button"
                target="_blank"
                rel="noreferrer"
                href={p.result.htmlLink}
              >
                View calendar event <ArrowUpRight size={14} />
              </a>
            )}
          </article>
        ))}
      </div>
      {!(section === "pending" ? pending : history).length && (
        <Empty
          title={
            section === "pending" ? "All clear for now" : "No decisions yet"
          }
        >
          {section === "pending"
            ? "Meeting and task proposals from Saarthi appear here for your review."
            : "Approved and dismissed proposals will stay here."}
        </Empty>
      )}
      {edit && (
        <Modal title="Edit meeting proposal" close={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await act(edit, "edit", edit.payload);
                setEdit(null);
              } catch {
                /* The workspace displays the server validation error. */
              }
            }}
          >
            <label>
              Meeting title
              <input
                required
                maxLength={200}
                value={edit.payload.title}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    payload: { ...edit.payload, title: e.target.value },
                  })
                }
              />
            </label>
            {["start", "end"].map((k) => (
              <label key={k}>
                {k === "start" ? "Starts" : "Ends"} (ISO date with timezone)
                <input
                  required
                  value={edit.payload[k]}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      payload: { ...edit.payload, [k]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <label>
              Attendee emails
              <input
                value={edit.payload.attendees.join(", ")}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    payload: {
                      ...edit.payload,
                      attendees: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={edit.payload.description}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    payload: { ...edit.payload, description: e.target.value },
                  })
                }
              />
            </label>
            <button className="primary" disabled={busy}>
              Save proposal
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
