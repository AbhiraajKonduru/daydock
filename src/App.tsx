import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  FilePlus2,
  FolderOpen,
  Menu,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Search,
  Settings2,
  Square,
  Sparkles,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { SearchPalette } from "./components/SearchPalette";
import {
  dailyPath,
  dailyTemplate,
  dateFromKey,
  dateKey,
  documentTemplate,
  shiftDate,
  shortDate,
  titleForFile,
  weeklyPath,
  weeklyTemplate,
} from "./lib/dates";
import { notebookStorage } from "./lib/storage";
import type { GitStatus, NotebookFile, SaveState } from "./types";

const ROOT_KEY = "daydock-root";
const SIDEBAR_KEY = "daydock-sidebar-collapsed";
const ZOOM_KEY = "daydock-zoom";
const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 80;
const MAX_ZOOM = 150;
const ZOOM_STEP = 10;

function storedZoom(): number {
  const saved = localStorage.getItem(ZOOM_KEY);
  if (saved === null) return DEFAULT_ZOOM;

  const value = Number(saved);
  // Older builds could leave behind a fractional scale (for example, `1` for
  // 100%). Treat anything outside this app's selectable zoom values as a bad
  // preference instead of clamping it to an unexpectedly tiny layout.
  if (
    !Number.isFinite(value)
    || value < MIN_ZOOM
    || value > MAX_ZOOM
    || value % ZOOM_STEP !== 0
  ) {
    return DEFAULT_ZOOM;
  }
  return value;
}

function nameFromRoot(root: string): string {
  return root.split(/[\\/]/).filter(Boolean).pop() || "Daydock";
}

function sanitizeDocumentName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "").replace(/\.md$/i, "").trim();
}

type DocumentModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
};

function DocumentModal({ open, onClose, onCreate }: DocumentModalProps) {
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      window.setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const safeName = sanitizeDocumentName(name);
    if (safeName) onCreate(safeName);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="new-document-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-document-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2 id="new-document-title">Create a document</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label htmlFor="document-name">Name</label>
        <input
          id="document-name"
          ref={input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") onClose();
          }}
          placeholder="Morning Routine"
        />
        <div className="modal-actions">
          <button className="text-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={submit} disabled={!sanitizeDocumentName(name)}>
            Create document
          </button>
        </div>
      </section>
    </div>
  );
}

type DeleteDocumentModalProps = {
  file: NotebookFile | null;
  onClose: () => void;
  onConfirm: () => void;
};

function DeleteDocumentModal({ file, onClose, onConfirm }: DeleteDocumentModalProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (file) window.setTimeout(() => cancelButton.current?.focus(), 0);
  }, [file]);

  if (!file) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="new-document-modal delete-document-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-document-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
      >
        <div className="delete-document-icon"><Trash2 size={19} /></div>
        <h2 id="delete-document-title">Delete document?</h2>
        <p className="modal-copy">“{titleForFile(file)}” will be permanently removed from your notebook.</p>
        <div className="modal-actions">
          <button ref={cancelButton} className="text-button" onClick={onClose}>Keep document</button>
          <button className="danger-button" onClick={onConfirm}>Delete document</button>
        </div>
      </section>
    </div>
  );
}

type GithubSyncModalProps = {
  open: boolean;
  syncing: boolean;
  onClose: () => void;
  onConnect: (remoteUrl: string) => void;
};

function GithubSyncModal({ open, syncing, onClose, onConnect }: GithubSyncModalProps) {
  const [remoteUrl, setRemoteUrl] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (remoteUrl.trim()) onConnect(remoteUrl.trim());
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="new-document-modal github-sync-modal" role="dialog" aria-modal="true" aria-labelledby="github-sync-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">GitHub sync</p>
            <h2 id="github-sync-title">Connect your notebook</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close" disabled={syncing}><X size={18} /></button>
        </div>
        <p className="modal-copy">Paste the URL of an empty GitHub repository. Sync creates commits for your saved notebook changes.</p>
        <label htmlFor="github-remote-url">GitHub repository URL</label>
        <input
          id="github-remote-url"
          ref={input}
          value={remoteUrl}
          onChange={(event) => setRemoteUrl(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); if (event.key === "Escape" && !syncing) onClose(); }}
          placeholder="https://github.com/you/notebook.git"
          disabled={syncing}
        />
        <p className="modal-help">HTTPS and SSH GitHub URLs are supported. Authentication is handled by Git or your SSH key.</p>
        <div className="modal-actions">
          <button className="text-button" onClick={onClose} disabled={syncing}>Cancel</button>
          <button className="primary-button" onClick={submit} disabled={!remoteUrl.trim() || syncing}>
            <RefreshCw size={15} className={syncing ? "spin" : ""} /> {syncing ? "Connecting…" : "Connect & sync"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [root, setRoot] = useState<string | null>(() =>
    localStorage.getItem(ROOT_KEY) || (!notebookStorage.native ? notebookStorage.browserRoot : null),
  );
  const [files, setFiles] = useState<NotebookFile[]>([]);
  const [activePath, setActivePath] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(Boolean(root));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotebookFile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "true",
  );
  const [zoom, setZoom] = useState(storedZoom);
  const [planMode, setPlanMode] = useState(false);
  const [planReference, setPlanReference] = useState<"week" | "today">("week");
  const [planWeeklyPath, setPlanWeeklyPath] = useState("");
  const [planWeeklyContent, setPlanWeeklyContent] = useState("");
  const [planTodayPath, setPlanTodayPath] = useState("");
  const [planTodayContent, setPlanTodayContent] = useState("");
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [githubSyncModalOpen, setGithubSyncModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [syncMessage, setSyncMessage] = useState("");

  const saveTimer = useRef<number | null>(null);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const planSaveTimer = useRef<number | null>(null);
  const planTodaySaveTimer = useRef<number | null>(null);
  const dirty = useRef(false);
  const planDirty = useRef(false);
  const planTodayDirty = useRef(false);
  const activePathRef = useRef(activePath);
  const contentRef = useRef(content);
  const filesRef = useRef(files);
  const activeDiskModifiedRef = useRef(0);
  const planDiskModifiedRef = useRef(0);
  const editVersionRef = useRef(0);
  const planEditVersionRef = useRef(0);
  const planTodayEditVersionRef = useRef(0);
  const planWeeklyPathRef = useRef(planWeeklyPath);
  const planWeeklyContentRef = useRef(planWeeklyContent);
  const planTodayPathRef = useRef(planTodayPath);
  const planTodayContentRef = useRef(planTodayContent);
  const planTodayDiskModifiedRef = useRef(0);
  const syncShortcutRef = useRef<() => void>(() => {});

  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => {
    planWeeklyPathRef.current = planWeeklyPath;
  }, [planWeeklyPath]);
  useEffect(() => {
    planWeeklyContentRef.current = planWeeklyContent;
  }, [planWeeklyContent]);
  useEffect(() => {
    planTodayPathRef.current = planTodayPath;
  }, [planTodayPath]);
  useEffect(() => {
    planTodayContentRef.current = planTodayContent;
  }, [planTodayContent]);

  const bootstrap = useCallback(async (notebookRoot: string) => {
    setLoading(true);
    setError("");
    try {
      await notebookStorage.initialize(notebookRoot);
      let scanned = await notebookStorage.scan(notebookRoot);

      const todayPath = dailyPath();
      let todayFile = scanned.find((file) => file.path === todayPath);
      if (!todayFile) {
        const initial = dailyTemplate(dateKey());
        todayFile = await notebookStorage.materialize(notebookRoot, todayPath, initial);
        scanned = [todayFile, ...scanned];
      } else {
        todayFile = await notebookStorage.read(notebookRoot, todayPath);
        scanned = scanned.map((file) => file.path === todayPath ? todayFile! : file);
      }

      localStorage.setItem(ROOT_KEY, notebookRoot);
      setFiles(scanned);
      setActivePath(todayPath);
      setContent(todayFile.content);
      activeDiskModifiedRef.current = todayFile.modified;
      dirty.current = false;
      setSaveState("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      if (notebookStorage.native) {
        localStorage.removeItem(ROOT_KEY);
        setRoot(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (root) void bootstrap(root);
  }, [bootstrap, root]);

  useEffect(() => {
    if (!root || !notebookStorage.native) return;
    let stopped = false;
    let refreshing = false;
    const reconcile = async () => {
      if (refreshing || stopped || document.hidden) return;
      refreshing = true;
      try {
        const scanned = await notebookStorage.scan(root);
        if (stopped) return;
        const previous = filesRef.current;
        const merged = scanned.map((diskFile) => {
          const existing = previous.find((file) => file.path === diskFile.path);
          // A scan can observe our write before its invoke promise resolves. Keep
          // the editor's version until the conditional write settles.
          if (diskFile.path === activePathRef.current && dirty.current && existing) return existing;
          return existing && existing.modified === diskFile.modified ? existing : diskFile;
        });
        filesRef.current = merged;
        setFiles(merged);

        const active = activePathRef.current;
        const before = previous.find((file) => file.path === active);
        const after = scanned.find((file) => file.path === active);
        if (active && before && !after) {
          setError(`“${active}” was removed outside Daydock.`);
        // While dirty, the conditional write is the authoritative conflict check.
        // Treating a polling snapshot as external here races with our own save.
        } else if (active && after && before && activeDiskModifiedRef.current !== after.modified && !dirty.current) {
          const fresh = await notebookStorage.read(root, active);
          if (stopped || activePathRef.current !== active || dirty.current) return;
          setContent(fresh.content);
          contentRef.current = fresh.content;
          activeDiskModifiedRef.current = fresh.modified;
          setFiles((current) => current.map((file) => file.path === active ? fresh : file));
        }
      } catch (caught) {
        if (!stopped) setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        refreshing = false;
      }
    };
    const timer = window.setInterval(() => void reconcile(), 5000);
    const onFocus = () => void reconcile();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [root]);

  const refreshGitStatus = useCallback(async (notebookRoot: string) => {
    if (!notebookStorage.native) return;
    try {
      setGitStatus(await notebookStorage.gitStatus(notebookRoot));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  useEffect(() => {
    if (root) void refreshGitStatus(root);
  }, [refreshGitStatus, root]);

  useLayoutEffect(() => {
    localStorage.setItem(ZOOM_KEY, String(zoom));
    document.documentElement.style.zoom = String(zoom / 100);
    document.documentElement.style.setProperty("--app-zoom", String(zoom / 100));
  }, [zoom]);

  const chooseFolder = async () => {
    setError("");
    try {
      const selected = await notebookStorage.chooseFolder();
      if (selected) setRoot(selected);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const flushSave = useCallback(async () => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (saveInFlightRef.current) {
      await saveInFlightRef.current;
      return;
    }
    if (!dirty.current || !root || !activePathRef.current) return;

    // Coalesce edits made during a slow write into a following serialized write.
    const operation = (async () => {
      while (dirty.current && activePathRef.current) {
        try {
          setSaveState("saving");
          const path = activePathRef.current;
          const content = contentRef.current;
          const version = editVersionRef.current;
          const saved = await notebookStorage.write(root, path, content, activeDiskModifiedRef.current);
          activeDiskModifiedRef.current = saved.modified;
          setFiles((current) => current.map((file) => file.path === saved.path ? saved : file));
          if (editVersionRef.current === version) {
            dirty.current = false;
            setSaveState("saved");
          }
        } catch (caught) {
          setSaveState("error");
          setError(caught instanceof Error ? caught.message : String(caught));
          break;
        }
      }
    })();

    saveInFlightRef.current = operation;
    try {
      await operation;
    } finally {
      if (saveInFlightRef.current === operation) saveInFlightRef.current = null;
    }
  }, [root]);

  const flushPlanSave = useCallback(async () => {
    if (planSaveTimer.current !== null) {
      window.clearTimeout(planSaveTimer.current);
      planSaveTimer.current = null;
    }
    if (!planDirty.current || !root || !planWeeklyPathRef.current) return;
    try {
      setSaveState("saving");
      const version = planEditVersionRef.current;
      const saved = await notebookStorage.write(root, planWeeklyPathRef.current, planWeeklyContentRef.current, planDiskModifiedRef.current);
      planDiskModifiedRef.current = saved.modified;
      setFiles((current) => current.map((file) => file.path === saved.path ? saved : file));
      if (planEditVersionRef.current === version) {
        planDirty.current = false;
        setSaveState("saved");
      }
    } catch (caught) {
      setSaveState("error");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [root]);

  const flushPlanTodaySave = useCallback(async () => {
    if (planTodaySaveTimer.current !== null) {
      window.clearTimeout(planTodaySaveTimer.current);
      planTodaySaveTimer.current = null;
    }
    if (!planTodayDirty.current || !root || !planTodayPathRef.current) return;
    try {
      setSaveState("saving");
      const version = planTodayEditVersionRef.current;
      const saved = await notebookStorage.write(root, planTodayPathRef.current, planTodayContentRef.current, planTodayDiskModifiedRef.current);
      planTodayDiskModifiedRef.current = saved.modified;
      setFiles((current) => current.map((file) => file.path === saved.path ? saved : file));
      if (planTodayEditVersionRef.current === version) {
        planTodayDirty.current = false;
        setSaveState("saved");
      }
    } catch (caught) {
      setSaveState("error");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [root]);

  const materialize = useCallback(
    async (path: string): Promise<NotebookFile> => {
      const existing = files.find((file) => file.path.toLowerCase() === path.toLowerCase());
      if (existing) {
        if (!existing.loaded && root) {
          const loaded = await notebookStorage.read(root, existing.path);
          setFiles((current) => current.map((file) => file.path === loaded.path ? loaded : file));
          return loaded;
        }
        return existing;
      }
      if (!root) throw new Error("Choose a notebook folder first.");

      let initial: string;
      if (/^Daily\/\d{4}-\d{2}-\d{2}\.md$/.test(path)) {
        const key = path.slice(6, 16);
        initial = dailyTemplate(key);
      } else if (path.startsWith("Weekly/")) {
        initial = weeklyTemplate();
      } else {
        initial = documentTemplate(path.split("/").pop()?.replace(/\.md$/i, "") || "Document");
      }

      const materialized = await notebookStorage.materialize(root, path, initial);
      setFiles((current) => {
        const existingIndex = current.findIndex((file) => file.path.toLowerCase() === path.toLowerCase());
        if (existingIndex < 0) return [materialized, ...current];
        return current.map((file, index) => index === existingIndex ? materialized : file);
      });
      return materialized;
    },
    [files, root],
  );

  const openPath = useCallback(
    async (path: string) => {
      await flushSave();
      try {
        let file = await materialize(path);
        if (!file.loaded && root) {
          file = await notebookStorage.read(root, file.path);
          setFiles((current) => current.map((item) => (item.path === file.path ? file : item)));
        }
        if (planMode && /^Daily\/\d{4}-\d{2}-\d{2}\.md$/.test(file.path)) {
          setActivePath(file.path);
          setContent(file.content);
          activePathRef.current = file.path;
          contentRef.current = file.content;
          activeDiskModifiedRef.current = file.modified;
          dirty.current = false;
        } else {
          setPlanMode(false);
          setActivePath(file.path);
          setContent(file.content);
          activePathRef.current = file.path;
          contentRef.current = file.content;
          activeDiskModifiedRef.current = file.modified;
          dirty.current = false;
        }
        setSaveState("saved");
        setSidebarOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [files, flushSave, materialize, planMode, root],
  );

  const handleChange = useCallback(
    (nextContent: string) => {
      if (!root || !activePathRef.current) return;
      const path = activePathRef.current;
      // Keep the editor's change exactly as CodeMirror produced it. Rewriting
      // the streak line near the top while someone types causes a controlled
      // document update that can move their selection unexpectedly.
      const normalized = nextContent;

      setContent(normalized);
      contentRef.current = normalized;
      dirty.current = true;
      editVersionRef.current += 1;
      setSaveState("saving");
      setFiles((current) =>
        current.map((file) =>
          file.path === path ? { ...file, content: normalized } : file,
        ),
      );

      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void flushSave(), 450);
    },
    [files, flushSave, root],
  );

  const handleWeeklyPlanChange = useCallback(
    (nextContent: string) => {
      if (!root || !planWeeklyPathRef.current) return;
      const path = planWeeklyPathRef.current;
      setPlanWeeklyContent(nextContent);
      planWeeklyContentRef.current = nextContent;
      planDirty.current = true;
      planEditVersionRef.current += 1;
      setSaveState("saving");
      setFiles((current) =>
        current.map((file) =>
          file.path === path ? { ...file, content: nextContent } : file,
        ),
      );

      if (planSaveTimer.current !== null) window.clearTimeout(planSaveTimer.current);
      planSaveTimer.current = window.setTimeout(() => void flushPlanSave(), 450);
    },
    [flushPlanSave, root],
  );

  const handleTodayPlanChange = useCallback(
    (nextContent: string) => {
      if (!root || !planTodayPathRef.current) return;
      const path = planTodayPathRef.current;
      setPlanTodayContent(nextContent);
      planTodayContentRef.current = nextContent;
      planTodayDirty.current = true;
      planTodayEditVersionRef.current += 1;
      setSaveState("saving");
      setFiles((current) =>
        current.map((file) => file.path === path ? { ...file, content: nextContent } : file),
      );

      if (planTodaySaveTimer.current !== null) window.clearTimeout(planTodaySaveTimer.current);
      planTodaySaveTimer.current = window.setTimeout(() => void flushPlanTodaySave(), 450);
    },
    [flushPlanTodaySave, root],
  );

  const togglePlanReference = useCallback(async () => {
    if (!planMode) return;
    if (planReference === "today") {
      await flushPlanTodaySave();
      setPlanReference("week");
      return;
    }

    try {
      const today = await materialize(dailyPath());
      setPlanTodayPath(today.path);
      setPlanTodayContent(today.content);
      planTodayPathRef.current = today.path;
      planTodayContentRef.current = today.content;
      planTodayDiskModifiedRef.current = today.modified;
      planTodayDirty.current = false;
      setPlanReference("today");
      setSaveState("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [flushPlanTodaySave, materialize, planMode, planReference]);

  const togglePlanMode = useCallback(async () => {
    if (planMode) {
      await flushPlanSave();
      await flushPlanTodaySave();
      setPlanMode(false);
      return;
    }

    await flushSave();
    try {
      const [week, tomorrow] = await Promise.all([
        materialize(weeklyPath()),
        materialize(dailyPath(shiftDate(dateKey(), 1))),
      ]);
      setPlanWeeklyPath(week.path);
      setPlanWeeklyContent(week.content);
      planWeeklyPathRef.current = week.path;
      planWeeklyContentRef.current = week.content;
      planDiskModifiedRef.current = week.modified;
      planDirty.current = false;
      setPlanReference("week");
      setActivePath(tomorrow.path);
      setContent(tomorrow.content);
      activePathRef.current = tomorrow.path;
      contentRef.current = tomorrow.content;
      activeDiskModifiedRef.current = tomorrow.modified;
      dirty.current = false;
      setPlanMode(true);
      setSaveState("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [flushPlanSave, flushPlanTodaySave, flushSave, materialize, planMode]);

  const openLink = useCallback(
    (target: string) => {
      let path = target.replace(/\\/g, "/");
      if (path.includes("..")) return;
      if (!path.toLowerCase().endsWith(".md")) {
        const cleanName = sanitizeDocumentName(path);
        const matching = files.find(
          (file) => file.path.startsWith("Docs/") && file.name.toLowerCase() === cleanName.toLowerCase(),
        );
        path = matching?.path || `Docs/${cleanName}.md`;
      } else if (!path.includes("/")) {
        path = `Docs/${path}`;
      }
      void openPath(path);
    },
    [files, openPath],
  );

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        void openPath(dailyPath());
      }
      if (event.altKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        void openPath(dailyPath(shiftDate(dateKey(), -1)));
      }
      if (event.altKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void openPath(dailyPath(shiftDate(dateKey(), 1)));
      }
      if (event.altKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        void openPath(weeklyPath());
      }
      if (event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        void openPath(weeklyPath(dateFromKey(shiftDate(dateKey(), -7))));
      }
      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void openPath(weeklyPath(dateFromKey(shiftDate(dateKey(), 7))));
      }
      if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        void togglePlanMode();
      }
      if (event.altKey && event.key.toLowerCase() === "d" && planMode) {
        event.preventDefault();
        void togglePlanReference();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        syncShortcutRef.current();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flushSave();
        void flushPlanSave();
      }
      if ((event.ctrlKey || event.metaKey) && event.code === "Period") {
        event.preventDefault();
        setSidebarCollapsed((current) => {
          const next = !current;
          localStorage.setItem(SIDEBAR_KEY, String(next));
          return next;
        });
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Equal" || event.code === "NumpadAdd" || event.key === "+")) {
        event.preventDefault();
        setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Minus" || event.code === "NumpadSubtract" || event.key === "_")) {
        event.preventDefault();
        setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP));
      }
      if ((event.ctrlKey || event.metaKey) && (event.code === "Digit0" || event.code === "Numpad0")) {
        event.preventDefault();
        setZoom(DEFAULT_ZOOM);
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [flushPlanSave, flushSave, openPath, planMode, togglePlanMode, togglePlanReference]);

  const createDocument = async (name: string) => {
    setDocumentModalOpen(false);
    await openPath(`Docs/${sanitizeDocumentName(name)}.md`);
  };

  const confirmDeleteDocument = useCallback(async () => {
    const file = deleteTarget;
    if (!root || !file) return;
    setDeleteTarget(null);

    try {
      if (file.path === activePath) await flushSave();
      await notebookStorage.delete(root, file.path);
      const remaining = files.filter((item) => item.path !== file.path);
      setFiles(remaining);
      if (file.path === activePath) {
        activePathRef.current = "";
        contentRef.current = "";
        dirty.current = false;
        await openPath(remaining.find((item) => item.path.startsWith("Docs/"))?.path || dailyPath());
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [activePath, deleteTarget, files, flushSave, openPath, root]);

  const recentDays = useMemo(
    () =>
      files
        .filter((file) => file.path.startsWith("Daily/"))
        .sort((a, b) => b.path.localeCompare(a.path))
        .slice(0, 7),
    [files],
  );
  const recentDocs = useMemo(
    () =>
      files
        .filter((file) => file.path.startsWith("Docs/"))
        .sort((a, b) => b.modified - a.modified)
        .slice(0, 5),
    [files],
  );
  const activeFile = files.find((file) => file.path === activePath);
  const toolbarTitle =
    activePath === dailyPath()
      ? "Today"
      : activePath === dailyPath(shiftDate(dateKey(), -1))
        ? "Yesterday"
        : activePath === dailyPath(shiftDate(dateKey(), 1))
          ? "Tomorrow"
          : activePath === weeklyPath(dateFromKey(shiftDate(dateKey(), -7)))
            ? "Last week"
          : activePath === weeklyPath()
            ? "This week"
            : activePath === weeklyPath(dateFromKey(shiftDate(dateKey(), 7)))
              ? "Next week"
            : activeFile
              ? titleForFile(activeFile)
              : "Daydock";

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  };

  const minimizeWindow = () => {
    if (notebookStorage.native) void getCurrentWindow().minimize();
  };

  const maximizeWindow = () => {
    if (notebookStorage.native) void getCurrentWindow().toggleMaximize();
  };

  const closeWindow = async () => {
    if (!notebookStorage.native) return;
    await flushSave();
    await flushPlanSave();
    await flushPlanTodaySave();
    await getCurrentWindow().close();
  };

  const syncNotebook = async () => {
    if (!root || syncingRef.current) return;
    if (!gitStatus?.configured) {
      setGithubSyncModalOpen(true);
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    setError("");
    setSyncMessage("");
    try {
      await flushSave();
      await flushPlanSave();
      await flushPlanTodaySave();
      const result = await notebookStorage.sync(root);
      if (result.status === "conflict") setError(result.message);
      else setSyncMessage(result.message);
      if (result.status === "pulled" || result.status === "reconciled") await bootstrap(root);
      await refreshGitStatus(root);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  syncShortcutRef.current = () => void syncNotebook();

  const connectGithubSync = async (remoteUrl: string) => {
    if (!root || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setError("");
    setSyncMessage("");
    try {
      await flushSave();
      await flushPlanSave();
      await flushPlanTodaySave();
      const result = await notebookStorage.configureGithubSync(root, remoteUrl);
      setSyncMessage(result.message);
      setGithubSyncModalOpen(false);
      await refreshGitStatus(root);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  if (!root) {
    return (
      <main className="welcome-screen">
        <div className="welcome-mark"><BookOpen size={34} /></div>
        <p className="eyebrow">Daydock</p>
        <h1>Your day, without the machinery.</h1>
        <p className="welcome-copy">
          Choose a normal folder. Your daily pages, weekly pages, and documents stay there as plain Markdown, readable with or without this app.
        </p>
        <button className="primary-button choose-folder" onClick={chooseFolder}>
          <FolderOpen size={18} /> Choose notebook folder
        </button>
        <p className="welcome-detail">No account. No cloud requirement. No proprietary format.</p>
        {error && <p className="error-message">{error}</p>}
      </main>
    );
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <button
        className="mobile-menu"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open notebook navigation"
      >
        <Menu size={21} />
      </button>

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand" data-tauri-drag-region>
          <span className="brand-mark" data-tauri-drag-region><BookOpen size={21} /></span>
          <span className="brand-name" data-tauri-drag-region>Daydock</span>
          <button className="sidebar-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <ChevronLeft size={19} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Notebook">
          <button className={activePath === dailyPath() ? "active" : ""} onClick={() => void openPath(dailyPath())}>
            <Sparkles size={18} /><span>Today</span><kbd>Alt T</kbd>
          </button>
          <button className={activePath === dailyPath(shiftDate(dateKey(), -1)) ? "active" : ""} onClick={() => void openPath(dailyPath(shiftDate(dateKey(), -1)))}>
            <CalendarDays size={18} /><span>Yesterday</span><kbd>Alt Y</kbd>
          </button>
          <button className={activePath === dailyPath(shiftDate(dateKey(), 1)) ? "active" : ""} onClick={() => void openPath(dailyPath(shiftDate(dateKey(), 1)))}>
            <CalendarDays size={18} /><span>Tomorrow</span><kbd>Alt O</kbd>
          </button>
          <button className={activePath === weeklyPath(dateFromKey(shiftDate(dateKey(), -7))) ? "active" : ""} onClick={() => void openPath(weeklyPath(dateFromKey(shiftDate(dateKey(), -7))))}>
            <BookOpen size={18} /><span>Last week</span><kbd>Alt L</kbd>
          </button>
          <button className={activePath === weeklyPath() ? "active" : ""} onClick={() => void openPath(weeklyPath())}>
            <BookOpen size={18} /><span>This week</span><kbd>Alt W</kbd>
          </button>
          <button className={activePath === weeklyPath(dateFromKey(shiftDate(dateKey(), 7))) ? "active" : ""} onClick={() => void openPath(weeklyPath(dateFromKey(shiftDate(dateKey(), 7))))}>
            <BookOpen size={18} /><span>Next week</span><kbd>Alt N</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)}>
            <Search size={18} /><span>Search</span><kbd>Ctrl K</kbd>
          </button>
        </nav>

        <div className="sidebar-scroll">
          <div className="sidebar-section">
            <p>Recent days</p>
            {recentDays.map((file) => {
              const key = file.path.slice(6, 16);
              return (
                <button key={file.path} className={activePath === file.path ? "active" : ""} onClick={() => void openPath(file.path)}>
                  <span>{shortDate(key)}</span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-section">
            <div className="section-heading">
              <p>Documents</p>
              <button onClick={() => setDocumentModalOpen(true)} aria-label="New document"><FilePlus2 size={15} /></button>
            </div>
            {recentDocs.map((file) => (
              <div key={file.path} className={`document-row ${activePath === file.path ? "active" : ""}`}>
                <button className="document-open" onClick={() => void openPath(file.path)}>
                  <span>{titleForFile(file)}</span>
                </button>
                <button
                  className="document-delete"
                  onClick={() => setDeleteTarget(file)}
                  aria-label={`Delete ${titleForFile(file)}`}
                  title="Delete document"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className="folder-switcher" onClick={chooseFolder} title={root}>
          <Settings2 size={16} />
          <span><small>Notebook folder</small>{nameFromRoot(root)}</span>
        </button>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="notebook-main">
        <header className="page-toolbar" data-tauri-drag-region>
          <div className="toolbar-leading" data-tauri-drag-region>
            <button className="panel-toggle icon-button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div className="page-location" data-tauri-drag-region>
              <span className="page-title-small" data-tauri-drag-region>{toolbarTitle}</span>
              <span className="path-separator" data-tauri-drag-region>·</span>
              <span className="page-path-small" data-tauri-drag-region title={activePath}>{activePath}</span>
            </div>
          </div>
          <div className="toolbar-status">
            <span className={`save-state save-${saveState}`}>
              {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Save failed"}
            </span>
            {notebookStorage.native && (
              <button
                className={`sync-button ${syncing ? "syncing" : ""}`}
                onClick={() => void syncNotebook()}
                disabled={syncing}
                title={gitStatus?.configured ? "Sync notebook with GitHub (Ctrl+Shift+S)" : "Connect this notebook to GitHub (Ctrl+Shift+S)"}
              >
                <RefreshCw size={15} className={syncing ? "spin" : ""} />
                <span>{syncing ? "Syncing…" : gitStatus?.configured ? "Sync" : "Connect GitHub"}</span>
              </button>
            )}
            <button className="toolbar-search icon-button" onClick={() => setSearchOpen(true)} aria-label="Search notebook" title="Search notebook (Ctrl+K)">
              <Search size={18} />
            </button>
            <button
              className={`plan-button ${planMode ? "active" : ""}`}
              onClick={() => void togglePlanMode()}
              aria-pressed={planMode}
              title={planMode ? "Close planning view (Alt+P)" : "Open planning view (Alt+P)"}
            >
              <PanelsTopLeft size={16} /> {planMode ? "Close plan" : "Plan"}
            </button>
            {planMode && (
              <button
                className={`plan-button ${planReference === "today" ? "active" : ""}`}
                onClick={() => void togglePlanReference()}
                aria-pressed={planReference === "today"}
                title={planReference === "today" ? "Show weekly plan beside tomorrow (Alt+D)" : "Show today beside tomorrow (Alt+D)"}
              >
                <CalendarDays size={16} /> {planReference === "today" ? "Week" : "Today"}
              </button>
            )}
          </div>
          {notebookStorage.native && (
            <div className="window-controls">
              <button onClick={minimizeWindow} aria-label="Minimize window"><Minus size={16} /></button>
              <button onClick={maximizeWindow} aria-label="Maximize window"><Square size={12} /></button>
              <button className="window-close" onClick={() => void closeWindow()} aria-label="Close window"><X size={16} /></button>
            </div>
          )}
        </header>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}
        {syncMessage && !error && (
          <div className="sync-banner">
            <span>{syncMessage}</span>
            <button className="icon-button" onClick={() => setSyncMessage("")} aria-label="Dismiss sync status"><X size={16} /></button>
          </div>
        )}

        <div className={`page-wrap ${planMode ? "plan-layout" : ""}`}>
          {loading ? (
            <div className="page-loading"><span /><span /><span /><span /></div>
          ) : planMode ? (
            <>
              <section className="plan-panel weekly-plan-panel" aria-label={planReference === "today" ? "Today's plan" : "Weekly plan"}>
                <div className="plan-panel-label"><span>{planReference === "today" ? "Today" : "Weekly plan"}</span><small>{planReference === "today" ? planTodayPath : planWeeklyPath}</small></div>
                <div className="plan-editor-wrap">
                  <MarkdownEditor
                    key={`plan-${planReference}-${planReference === "today" ? planTodayPath : planWeeklyPath}`}
                    value={planReference === "today" ? planTodayContent : planWeeklyContent}
                    onChange={planReference === "today" ? handleTodayPlanChange : handleWeeklyPlanChange}
                    onOpenLink={openLink}
                  />
                </div>
              </section>
              <section className="plan-panel daily-plan-panel" aria-label="Daily plan">
                <div className="plan-panel-label"><span>{toolbarTitle}</span><small>{activePath}</small></div>
                <div className="plan-editor-wrap">
                  <MarkdownEditor value={content} onChange={handleChange} onOpenLink={openLink} />
                </div>
              </section>
            </>
          ) : (
            <MarkdownEditor value={content} onChange={handleChange} onOpenLink={openLink} />
          )}
        </div>
      </main>

      <SearchPalette files={files} root={root} open={searchOpen} onClose={() => setSearchOpen(false)} onChoose={(path) => void openPath(path)} />
      <DocumentModal open={documentModalOpen} onClose={() => setDocumentModalOpen(false)} onCreate={(name) => void createDocument(name)} />
      <DeleteDocumentModal file={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => void confirmDeleteDocument()} />
      <GithubSyncModal open={githubSyncModalOpen} syncing={syncing} onClose={() => setGithubSyncModalOpen(false)} onConnect={(remoteUrl) => void connectGithubSync(remoteUrl)} />
    </div>
  );
}
