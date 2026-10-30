import { useState } from "react";
import { Check, Plus, FileText, ArrowUpRight } from "lucide-react";
import type { Workspace } from "../lib/use-workspace";
import { api, dateLabel, type Row } from "../lib/workspace";
import { Modal } from "./ui";
export function TaskDetails({ w, task }: { w: Workspace; task?: Row }) {
  const [title, setTitle] = useState(task?.title || ""),
    [details, setDetails] = useState(task?.details || ""),
    [status, setStatus] = useState(task?.status || "todo"),
    [due, setDue] = useState(task?.due?.slice(0, 10) || ""),
    [notes, setNotes] = useState<string[]>(task?.note_ids || []),
    [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Row | null>(null),
    [reading, setReading] = useState(false);
  const docs = w.docs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );
  async function read(id: string) {
    setReading(true);
    try {
      setPreview(await api(`/documents/${id}`));
    } catch (e: any) {
      w.notify(e.message);
    } finally {
      setReading(false);
    }
  }
  return (
    <Modal
      title={task ? "Task details" : "New task"}
      close={() => w.setModal("")}
    >
      <form
        className="task-detail-form"
        onSubmit={(e) => {
          e.preventDefault();
          void w.action(async () => {
            await api(
              task ? `/tasks/${task.id}` : "/tasks",
              task ? "PATCH" : "POST",
              { title, details, status, due: due || null, note_ids: notes },
            );
            await w.loadWorkspace();
            w.setModal("");
            w.notify(task ? "Task updated." : "Task added.");
          });
        }}
      >
        {task && (
          <p className="task-created">
            Created {dateLabel(task.created_at, w.user!, true)}
          </p>
        )}
        <label>
          Task name
          <input
            autoFocus
            required
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
          />
        </label>
        <div className="task-detail-meta">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">To do</option>
              <option value="doing">In progress</option>
              <option value="done">Completed</option>
            </select>
          </label>
          <label>
            Due date
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
        </div>
        <label>
          Description & notes
          <textarea
            rows={4}
            maxLength={8000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add context, next steps, links, or anything you want to remember."
          />
        </label>
        <section className="task-note-links" aria-label="Linked notes">
          <div className="section-head">
            <h3>
              <FileText size={15} />
              Linked notes
            </h3>
            <span>{notes.length}/20</span>
          </div>
          {w.docs.length > 4 && (
            <input
              aria-label="Find notes to link"
              placeholder="Find a note"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          {!w.docs.length && (
            <p>Upload a note in Notes & files to link it here.</p>
          )}
          <div className="task-note-options">
            {docs.map((d) => (
              <div key={d.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={notes.includes(d.id)}
                    disabled={!notes.includes(d.id) && notes.length >= 20}
                    onChange={(e) =>
                      setNotes(
                        e.target.checked
                          ? [...notes, d.id]
                          : notes.filter((id) => id !== d.id),
                      )
                    }
                  />
                  <span>{d.title}</span>
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Preview ${d.title}`}
                  disabled={reading}
                  onClick={() => read(d.id)}
                >
                  <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
          {task?.source_id &&
            !notes.includes(task.source_id) &&
            w.docs.some((d) => d.id === task.source_id) && (
              <button
                type="button"
                className="text-button"
                onClick={() => read(task.source_id)}
              >
                Open source note <ArrowUpRight size={13} />
              </button>
            )}
          {preview && (
            <div className="task-note-preview">
              <div className="section-head">
                <strong>{preview.title}</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setPreview(null)}
                >
                  Close preview
                </button>
              </div>
              <pre>{preview.content}</pre>
            </div>
          )}
        </section>
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => w.setModal("")}
          >
            Cancel
          </button>
          <button className="primary" disabled={w.busy}>
            {task ? <Check size={15} /> : <Plus size={15} />}{" "}
            {task ? "Save task" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
