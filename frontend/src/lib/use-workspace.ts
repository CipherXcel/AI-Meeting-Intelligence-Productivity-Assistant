"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  api,
  setToken,
  restoreSession,
  profileOf,
  type Row,
  type View,
} from "./workspace";
export function useWorkspace() {
  const [status, setStatus] = useState<"loading" | "out" | "in">("loading"),
    [user, setUser] = useState<Row | null>(null),
    [view, setView] = useState<View>("Saarthi");
  const [threads, setThreads] = useState<Row[]>([]),
    [thread, setThread] = useState(""),
    [messages, setMessages] = useState<Row[]>([]),
    [tasks, setTasks] = useState<Row[]>([]),
    [docs, setDocs] = useState<Row[]>([]),
    [proposals, setProposals] = useState<Row[]>([]),
    [focusSessions, setFocusSessions] = useState<Row[]>([]),
    [activity, setActivity] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false),
    [chatBusy, setChatBusy] = useState(false),
    [threadLoading, setThreadLoading] = useState(false),
    [progress, setProgress] = useState(""),
    [input, setInput] = useState(""),
    [toast, setToast] = useState(""),
    [bootError, setBootError] = useState("");
  const [signup, setSignup] = useState(false),
    [historySearch, setHistorySearch] = useState(""),
    [search, setSearch] = useState(""),
    [sidebar, setSidebar] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [queue, setQueue] = useState(false),
    [selected, setSelected] = useState<Row | null>(null),
    [modal, setModal] = useState(""),
    [taskFilter, setTaskFilter] = useState("all"),
    [calendarError, setCalendarError] = useState("");
  const bottom = useRef<HTMLDivElement>(null),
    upload = useRef<HTMLInputElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    abort = useRef<AbortController | null>(null),
    loadSequence = useRef(0),
    session = useRef(0),
    mounted = useRef(false);
  const pref = profileOf(user || {}),
    pending = proposals.filter((p) => p.status === "pending"),
    done = tasks.filter((t) => t.status === "done").length;
  function notify(s: string) {
    setToast(s);
  }
  function navigate(v: View) {
    const commit = () => {
      setView(v);
      setQueue(false);
      window.scrollTo({ top: 0 });
      setSearch("");
      setSidebar(false);
    };
    if (
      view === "Personal Diary" &&
      v !== view &&
      !window.dispatchEvent(
        new CustomEvent("diary-before-leave", {
          cancelable: true,
          detail: commit,
        }),
      )
    )
      return;
    commit();
  }
  function clearSession() {
    session.current++;
    loadSequence.current++;
    abort.current?.abort();
    setToken("");
    setStatus("out");
    setUser(null);
    setThread("");
    setMessages([]);
    setThreads([]);
    setTasks([]);
    setDocs([]);
    setProposals([]);
    setFocusSessions([]);
    setActivity([]);
    setSelected(null);
    setModal("");
    setInput("");
    setChatBusy(false);
    setBusy(false);
    setHistorySearch("");
    document.documentElement.dataset.theme = "ivory";
  }
  async function refreshProfile() {
    const generation = session.current;
    const data = await api("/me");
    if (generation === session.current) setUser(data);
  }
  async function loadWorkspace() {
    const generation = session.current;
    const [u, th, t, d, p, a, f] = await Promise.all([
      api("/me"),
      api("/threads"),
      api("/tasks"),
      api("/documents"),
      api("/proposals"),
      api("/activity"),
      api("/focus"),
    ]);
    if (generation !== session.current) return null;
    setUser(u);
    setThreads(th);
    setTasks(t);
    setDocs(d);
    setProposals(p);
    setActivity(a);
    setFocusSessions(f);
    return { user: u, threads: th };
  }
  async function openThread(id: string, owner = user) {
    if (chatBusy || !owner) return;
    const sequence = ++loadSequence.current;
    setThread(id);
    setQueue(false);
    setMessages([]);
    setThreadLoading(true);
    navigate("Saarthi");
    localStorage.setItem(`saarthi:last:${owner.id}`, id);
    try {
      const rows = await api(`/threads/${id}`);
      if (sequence === loadSequence.current) setMessages(rows);
    } catch (e: any) {
      if (sequence === loadSequence.current) notify(e.message);
    } finally {
      if (sequence === loadSequence.current) setThreadLoading(false);
    }
  }
  async function enter() {
    setView("Saarthi");
    const data = await loadWorkspace();
    if (!data) return;
    setStatus("in");
    const last = localStorage.getItem(`saarthi:last:${data.user.id}`);
    if (last && data.threads.some((t: Row) => t.id === last))
      await openThread(last, data.user);
  }
  async function boot() {
    setStatus("loading");
    setBootError("");
    try {
      if (await restoreSession()) await enter();
      else setStatus("out");
    } catch {
      setBootError(
        "The workspace server is unavailable. Check that the backend is running, then retry.",
      );
      setStatus("out");
    }
  }
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      void boot();
    }
    window.addEventListener("session-expired", clearSession);
    return () => window.removeEventListener("session-expired", clearSession);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = pref.theme;
    document.documentElement.dataset.density = pref.density;
  }, [pref.theme, pref.density]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const list = bottom.current?.parentElement;
    if (list)
      list.scrollTo({
        top: messages.length ? list.scrollHeight : 0,
        behavior: "smooth",
      });
  }, [messages, progress]);
  useEffect(() => {
    if (status !== "in") return;
    const timer = setInterval(() => {
      restoreSession()
        .then((ok) => {
          if (!ok) clearSession();
        })
        .catch(() =>
          notify("Connection interrupted. Please retry your next action."),
        );
    }, 12 * 60000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (status !== "in") return;
    let alive = true;
    const generation = session.current;
    async function refreshFocus() {
      if (document.hidden) return;
      try {
        const rows = await api("/focus");
        if (alive && generation === session.current) setFocusSessions(rows);
      } catch {
        /* Keep the last saved session until the next refresh. */
      }
    }
    const timer = setInterval(refreshFocus, 30000);
    window.addEventListener("focus", refreshFocus);
    document.addEventListener("visibilitychange", refreshFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", refreshFocus);
      document.removeEventListener("visibilitychange", refreshFocus);
    };
  }, [status]);
  async function startFocus(
    title: string,
    goalMinutes: number,
    saveTask: boolean,
    mode: "timed" | "open" = "timed",
  ) {
    await action(async () => {
      try {
        await api("/focus", "POST", { title, goalMinutes, saveTask, mode });
      } finally {
        await loadWorkspace();
      }
      notify("Focus started. You can leave this page and return later.");
    });
  }
  async function finishFocus(id: string) {
    await action(async () => {
      const saved = await api(`/focus/${id}/finish`, "POST");
      await loadWorkspace();
      notify(
        saved.task_id
          ? "Focus saved to Calendar and completed Tasks."
          : "Focus saved to your AgentBuddy calendar.",
      );
    });
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (e: any) {
      notify(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    await action(async () => {
      const result = await api(
        `/auth/${signup ? "register" : "login"}`,
        "POST",
        body,
      );
      session.current++;
      setToken(result.token);
      setThread("");
      setMessages([]);
      await enter();
      setBootError("");
    });
  }
  async function logout() {
    const commit = () =>
      void action(async () => {
        await api("/auth/logout", "POST");
        clearSession();
      });
    if (
      view === "Personal Diary" &&
      !window.dispatchEvent(
        new CustomEvent("diary-before-leave", {
          cancelable: true,
          detail: commit,
        }),
      )
    )
      return;
    commit();
  }
  function newChat() {
    if (chatBusy) return;
    loadSequence.current++;
    setThread("");
    setMessages([]);
    setThreadLoading(false);
    if (user) localStorage.removeItem(`saarthi:last:${user.id}`);
    navigate("Saarthi");
    setInput("");
    composer.current?.focus();
  }
  async function send(text = input) {
    if (!text.trim() || chatBusy || threadLoading || !user) return;
    setChatBusy(true);
    setInput("");
    setProgress("Thinking through your request…");
    navigate("Saarthi");
    const generation = session.current;
    let id = thread;
    try {
      if (!id) {
        const created = await api("/threads", "POST");
        id = created.id;
        setThread(id);
        localStorage.setItem(`saarthi:last:${user.id}`, id);
      }
      const next = [
        ...messages,
        { id: crypto.randomUUID(), role: "user", content: text },
      ];
      setMessages(next);
      const controller = new AbortController();
      abort.current = controller;
      const response: Response = await api(
        "/chat",
        "POST",
        { threadId: id, message: text },
        true,
        controller.signal,
      );
      if (!response.body) throw Error("No response stream was received.");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "",
        answer = "";
      while (true) {
        const result = await reader.read();
        buffer += decoder.decode(result.value, { stream: !result.done });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        for (const block of blocks) {
          const line = block.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const event = JSON.parse(line.slice(5));
          if (generation !== session.current) return;
          if (event.type === "progress") setProgress(event.message);
          if (event.type === "token") {
            answer += event.token;
            setMessages([...next, { role: "assistant", content: answer }]);
          }
          if (event.type === "error") throw Error(event.message);
        }
        if (result.done) break;
      }
    } catch (e: any) {
      if (generation === session.current) {
        notify(
          e.name === "AbortError"
            ? "Response stopped. Proposals already created remain in your review queue."
            : e.message,
        );
        setInput(text);
      }
    } finally {
      if (generation === session.current) {
        setProgress("");
        await loadWorkspace().catch((e) => notify(e.message));
        if (id)
          await api(`/threads/${id}`)
            .then((rows) => {
              if (generation === session.current) setMessages(rows);
            })
            .catch(() => {});
        setChatBusy(false);
      }
    }
  }
  async function proposalAction(p: Row, kind: string, payload?: Row) {
    const ok = await action(async () => {
      await api(
        `/proposals/${p.id}${kind === "approve" ? "/approve" : ""}`,
        kind === "approve" ? "POST" : "PATCH",
        kind === "dismiss"
          ? { status: "rejected" }
          : kind === "edit"
            ? { payload }
            : {},
      );
      await loadWorkspace();
      notify(
        kind === "approve"
          ? "Approved and completed."
          : kind === "edit"
            ? "Proposal updated."
            : "Proposal dismissed.",
      );
    });
    if (!ok && kind === "edit") throw Error("Proposal could not be saved.");
  }
  function remove(kind: string, row: Row) {
    setSelected({ ...row, deleteKind: kind });
    setModal("delete");
  }
  async function readDoc(d: Row) {
    await action(async () => {
      setSelected(await api(`/documents/${d.id}`));
      setModal("document");
    });
  }
  async function uploadFile(f?: File) {
    if (!f) return;
    await action(async () => {
      const form = new FormData();
      form.append("file", f);
      await api("/documents", "POST", form);
      await loadWorkspace();
      notify(
        "Document saved. Upload the same filename to add another version.",
      );
    });
    if (upload.current) upload.current.value = "";
  }
  async function downloadDoc(d: Row) {
    await action(async () => {
      const r: Response = await api(
        `/documents/${d.id}/download`,
        "GET",
        undefined,
        true,
      );
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = d.title;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  async function saveProfile(draft: Row) {
    await action(async () => {
      await api("/me", "PATCH", {
        name: draft.name,
        timezone: draft.timezone,
        duration: draft.duration,
        profile: draft.profile,
      });
      await loadWorkspace();
      notify("Your profile and preferences are saved.");
    });
  }
  function connect() {
    void action(async () => {
      const result = await api("/calendar/connect");
      window.location.assign(result.url);
    });
  }
  return {
    status,
    refreshProfile,
    user,
    view,
    threads,
    thread,
    messages,
    tasks,
    docs,
    proposals,
    focusSessions,
    startFocus,
    finishFocus,
    activity,
    busy,
    chatBusy,
    threadLoading,
    progress,
    input,
    setInput,
    toast,
    setToast,
    bootError,
    signup,
    setSignup,
    historySearch,
    setHistorySearch,
    search,
    setSearch,
    sidebar,
    setSidebar,
    collapsed,
    setCollapsed,
    queue,
    setQueue,
    selected,
    setSelected,
    modal,
    setModal,
    taskFilter,
    setTaskFilter,
    calendarError,
    bottom,
    upload,
    composer,
    abort,
    pref,
    pending,
    done,
    notify,
    navigate,
    loadWorkspace,
    openThread,
    boot,
    action,
    login,
    logout,
    newChat,
    send,
    proposalAction,
    remove,
    readDoc,
    uploadFile,
    downloadDoc,
    saveProfile,
    connect,
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
