import { NotesBrowser } from "./notes-browser";
import {
  Plus,
  Sparkle,
  ArrowUpRight,
  ArrowRight,
  Check,
  Trash2,
  Search,
  Upload,
  Download,
  FileText,
  Clock3,
  CalendarDays,
} from "lucide-react";
import { type Workspace } from "../lib/use-workspace";
import { api, dateLabel } from "../lib/workspace";
import { Heading, Stat, Empty } from "./ui";
import { Proposals } from "./proposals";
import { Overview } from "./overview";
import { CalendarView } from "./calendar-view";
import { Diary } from "./diary";
import { Profile } from "./profile";
export function WorkspaceViews({ w }: { w: Workspace }) {
  const {
    view,
    user,
    tasks,
    docs,
    threads,
    activity,
    pending,
    done,
    busy,
    pref,
    search,
    proposals,
    taskFilter,
  } = w;
  if (!user) return null;
  const taskRows = tasks.filter(
    (t) =>
      (taskFilter === "all" || t.status === taskFilter) &&
      t.title.toLowerCase().includes(search.toLowerCase()),
  );
  const docRows = docs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );
  const taskStatus = (id: string, status: string) =>
    w.action(async () => {
      await api(`/tasks/${id}`, "PATCH", { status });
      await w.loadWorkspace();
    });
  const searchBox = (label: string) => (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={`Search ${label}`}
        placeholder={`Find ${label}`}
        value={search}
        onChange={(e) => w.setSearch(e.target.value)}
      />
    </label>
  );
  if (view === "Personal Diary")
    return <Diary key={user.id} userId={user.id} />;
  if (view === "Profile")
    return (
      <Profile
        user={user}
        tasks={tasks}
        docs={docs}
        threads={threads}
        busy={busy}
        save={w.saveProfile}
        connect={w.connect}
        disconnect={() =>
          w.action(async () => {
            await api("/calendar/connection", "DELETE");
            await w.loadWorkspace();
          })
        }
        logout={w.logout}
        notify={w.notify}
        openAssistant={() => w.navigate("Saarthi")}
        openCalendar={() => w.navigate("Calendar")}
      />
    );
  if (view === "All proposals")
    return (
      <div className="page">
        <Heading eyebrow="REVIEW" title="All proposals">
          Every proposed meeting and action item, across all your conversations.
        </Heading>
        <Proposals
          items={proposals}
          user={user}
          busy={busy}
          act={w.proposalAction}
          openThread={(id) => w.openThread(id)}
        />
      </div>
    );
  if (view === "Overview") return <Overview w={w} />;
  if (view === "Tasks")
    return (
      <div className="page">
        <Heading
          eyebrow="TASKS"
          title="Tasks"
          action={
            <button className="primary" onClick={() => w.setModal("task")}>
              <Plus size={17} />
              New task
            </button>
          }
        >
          {done} of {tasks.length} tasks complete.
        </Heading>
        <div className="page-toolbar">
          <div className="segmented">
            {[
              ["all", "All tasks"],
              ["todo", "To do"],
              ["doing", "In progress"],
              ["done", "Completed"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={taskFilter === id ? "selected" : ""}
                onClick={() => w.setTaskFilter(id)}
              >
                {label}
                <span>
                  {tasks.filter((t) => id === "all" || t.status === id).length}
                </span>
              </button>
            ))}
          </div>
          {searchBox("a task")}
        </div>
        <div className="panel task-table">
          {taskRows.map((t) => (
            <div
              key={t.id}
              className={`task-row ${t.status === "done" ? "completed" : ""}`}
            >
              <button
                className={`task-check ${t.status === "done" ? "checked" : ""}`}
                disabled={busy}
                aria-label={`${t.status === "done" ? "Reopen" : "Complete"} ${t.title}`}
                onClick={() =>
                  taskStatus(t.id, t.status === "done" ? "todo" : "done")
                }
              >
                {t.status === "done" && <Check size={13} />}
              </button>
              <button
                className="task-title task-open"
                aria-label={`Open task: ${t.title}`}
                onClick={() => {
                  w.setSelected(t);
                  w.setModal("task-detail");
                }}
              >
                <strong>{t.title}</strong>
                <small>
                  {t.details
                    ? t.details.slice(0, 85)
                    : t.source_id
                      ? "From your meeting notes"
                      : "Add details or link notes"}
                  {t.note_ids?.length > 0 &&
                    ` · ${t.note_ids.length} linked notes`}
                </small>
              </button>
              <span className="due-date">
                {t.due ? dateLabel(t.due, user) : "No due date"}
              </span>
              <select
                aria-label={`Status of ${t.title}`}
                value={t.status}
                disabled={busy}
                onChange={(e) => taskStatus(t.id, e.target.value)}
              >
                <option value="todo">To do</option>
                <option value="doing">In progress</option>
                <option value="done">Completed</option>
              </select>
              <button
                className="icon-button"
                aria-label={`Delete ${t.title}`}
                onClick={() => w.remove("tasks", t)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!taskRows.length && (
            <Empty title="Nothing on this list yet">
              Add a task or change your filters.
            </Empty>
          )}
        </div>
      </div>
    );
  if (view === "Notes & files") return <NotesBrowser key={user.id} w={w} />;
  if (view === "Calendar") return <CalendarView w={w} />;
  return null;
}
