import { NoteReader } from "./note-reader";
import { TaskDetails } from "./task-details";
import { Check, Plus, Download, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Workspace } from "../lib/use-workspace";
import { api } from "../lib/workspace";
import { Modal } from "./ui";
export function WorkspaceDialogs({ w }: { w: Workspace }) {
  const { modal, selected, busy } = w;
  if (modal === "rename" && selected)
    return (
      <Modal title="Rename conversation" close={() => w.setModal("")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const title = String(
              new FormData(e.currentTarget).get("title"),
            ).trim();
            void w.action(async () => {
              await api(`/threads/${selected.id}`, "PATCH", { title });
              await w.loadWorkspace();
              w.setModal("");
            });
          }}
        >
          <label>
            Conversation name
            <input
              name="title"
              required
              autoFocus
              maxLength={100}
              defaultValue={selected.title}
            />
          </label>
          <button className="primary" disabled={busy}>
            Save name
            <Check size={16} />
          </button>
        </form>
      </Modal>
    );
  if (modal === "delete" && selected)
    return (
      <Modal
        title={`Delete ${selected.deleteKind === "threads" ? "conversation" : selected.deleteKind === "documents" ? "document version" : "task"}?`}
        close={() => w.setModal("")}
      >
        <p>
          This permanently removes “{selected.title}”.{" "}
          {selected.deleteKind === "threads"
            ? "Its proposals remain in All proposals."
            : ""}
        </p>
        <div className="dialog-actions">
          <button className="secondary" onClick={() => w.setModal("")}>
            Keep it
          </button>
          <button
            className="danger"
            disabled={busy}
            onClick={() =>
              w.action(async () => {
                await api(`/${selected.deleteKind}/${selected.id}`, "DELETE");
                if (
                  selected.deleteKind === "threads" &&
                  w.thread === selected.id
                )
                  w.newChat();
                await w.loadWorkspace();
                w.setModal("");
                w.notify("Deleted.");
              })
            }
          >
            Delete
          </button>
        </div>
      </Modal>
    );
  if (modal === "task" || (modal === "task-detail" && selected))
    return (
      <TaskDetails
        w={w}
        task={modal === "task-detail" ? selected! : undefined}
      />
    );
  if (modal === "document" && selected)
    return <NoteReader key={selected.id} w={w} />;
  return null;
}
