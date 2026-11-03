"use client";
import { useEffect, useState } from "react";
import {
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Download,
  Trash2,
  Pencil,
  Search,
} from "lucide-react";
import { api, dateLabel } from "../lib/workspace";
import type { Workspace } from "../lib/use-workspace";
import { Heading } from "./ui";
type FolderRow = { id: string; name: string };
export function NotesBrowser({ w }: { w: Workspace }) {
  const [folders, setFolders] = useState<FolderRow[]>([]),
    [folder, setFolder] = useState("all");
  const [restored, setRestored] = useState(false);
  const [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState("");
  async function reload() {
    setFolders(await api("/folders"));
  }
  useEffect(() => {
    void api("/folders")
      .then((rows: FolderRow[]) => {
        setFolders(rows);
        const saved = localStorage.getItem(`notes:folder:${w.user!.id}`);
        if (saved === "none" || rows.some((row) => row.id === saved))
          setFolder(saved!);
        setRestored(true);
      })
      .catch((e) => w.setToast(e.message));
  }, []);
  useEffect(() => {
    if (restored) localStorage.setItem(`notes:folder:${w.user!.id}`, folder);
  }, [folder, restored]);
  const selected = folders.find((f) => f.id === folder);
  const rows = w.docs.filter(
    (d) =>
      (folder === "all" ||
        (folder === "none" ? !d.folder_id : d.folder_id === folder)) &&
      d.title.toLowerCase().includes(w.search.toLowerCase()),
  );
  return (
    <div className="page notes-browser">
      <Heading
        eyebrow="YOUR LIBRARY"
        title="Notes & files"
        action={
          <button
            className="primary"
            disabled={w.busy}
            onClick={() => {
              w.uploadFolder.current = selected?.id || null;
              w.upload.current?.click();
            }}
          >
            <Upload size={17} /> Upload a file
          </button>
        }
      >
        Keep meeting notes, documents and transcripts in folders.
      </Heading>
      <div className="notes-folder-layout">
        <aside className="notes-folder-sidebar">
          <button
            aria-pressed={folder === "all"}
            onClick={() => setFolder("all")}
          >
            <FileText size={17} /> All notes <small>{w.docs.length}</small>
          </button>
          <button
            aria-pressed={folder === "none"}
            onClick={() => setFolder("none")}
          >
            <Folder size={17} /> Unfiled
          </button>
          <div className="notes-folders-heading">
            <span>FOLDERS</span>
            <button
              aria-label="Create folder"
              onClick={() => {
                setEditing("new");
                setName("");
              }}
            >
              <FolderPlus size={18} />
            </button>
          </div>
          {folders.map((f) => (
            <button
              key={f.id}
              aria-pressed={folder === f.id}
              onClick={() => setFolder(f.id)}
            >
              <Folder size={17} />
              <span>{f.name}</span>
              <small>{w.docs.filter((d) => d.folder_id === f.id).length}</small>
            </button>
          ))}
        </aside>
        <section className="notes-folder-content">
          <div className="page-toolbar">
            <h2>
              {selected?.name ||
                (folder === "none" ? "Unfiled notes" : "All notes")}
            </h2>
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Search notes"
                placeholder="Find a note…"
                value={w.search}
                onChange={(e) => w.setSearch(e.target.value)}
              />
            </label>
            {selected && (
              <>
                <button
                  className="icon-button"
                  aria-label="Rename folder"
                  onClick={() => {
                    setEditing(selected.id);
                    setName(selected.name);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Remove folder and keep its notes"
                  title="Remove folder; keep notes"
                  disabled={w.busy}
                  onClick={() =>
                    void w.action(async () => {
                      await api(`/folders/${selected.id}`, "DELETE");
                      setFolder("all");
                      await reload();
                      await w.loadWorkspace();
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
          {editing && (
            <form
              className="notes-folder-form"
              onSubmit={(event) => {
                event.preventDefault();
                void w.action(async () => {
                  await api(
                    editing === "new" ? "/folders" : `/folders/${editing}`,
                    editing === "new" ? "POST" : "PATCH",
                    { name },
                  );
                  setEditing(null);
                  await reload();
                });
              }}
            >
              <label>
                Folder name
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="primary" disabled={w.busy}>
                Save folder
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </form>
          )}
          <div className="document-grid">
            {rows.map((d) => (
              <article key={d.id} className="document-card">
                <button className="document-open" onClick={() => w.readDoc(d)}>
                  <span className="file-icon">
                    <FileText size={25} />
                  </span>
                  <span className="pill">v{d.version}</span>
                  <h3>{d.title}</h3>
                  <p>
                    {dateLabel(d.created_at, w.user!)} ·{" "}
                    {Math.max(1, Math.round(d.size / 1024))} KB
                  </p>
                </button>
                <label className="note-folder-picker">
                  Folder
                  <select
                    aria-label={`Folder for ${d.title}`}
                    value={d.folder_id || ""}
                    disabled={w.busy}
                    onChange={(event) =>
                      void w.action(async () => {
                        await api(`/documents/${d.id}/folder`, "PATCH", {
                          folderId: event.target.value || null,
                        });
                        await w.loadWorkspace();
                      })
                    }
                  >
                    <option value="">Unfiled</option>
                    {folders.map((f) => (
                      <option value={f.id} key={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="document-actions">
                  <button className="text-button" onClick={() => w.readDoc(d)}>
                    Open note ↗
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Download ${d.title}`}
                    onClick={() => w.downloadDoc(d)}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${d.title}`}
                    onClick={() => w.remove("documents", d)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!rows.length && (
            <div className="empty">
              <Folder size={30} />
              <p>
                No notes here yet. Use each note’s folder selector to move it
                here.
              </p>
            </div>
          )}
          <p className="footnote">
            Removing a folder keeps its notes in Unfiled. Existing versions and
            Saarthi note search remain available.
          </p>
        </section>
      </div>
    </div>
  );
}
