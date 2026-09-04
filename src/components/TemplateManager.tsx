import { Check, Copy, FilePlus2, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NotebookFile, SaveState, TemplateKind, TemplateSettings } from "../types";
import { documentDisplayName, documentFileStem, documentNameIssue } from "../lib/documents";
import { MarkdownEditor } from "./MarkdownEditor";

type TemplateManagerProps = {
  files: NotebookFile[];
  activePath: string;
  content: string;
  saveState: SaveState;
  settings: TemplateSettings;
  onChoose: (path: string) => void;
  onChange: (content: string) => void;
  onCreate: (kind: TemplateKind, name: string) => void;
  onDuplicate: (file: NotebookFile, name: string) => void;
  onRename: (file: NotebookFile, name: string) => void;
  onDelete: (file: NotebookFile) => void;
  onSetActive: (kind: TemplateKind, path: string) => void;
  zoom: number;
};

type NameAction = { type: "create"; kind: TemplateKind } | { type: "duplicate" | "rename"; file: NotebookFile };

function kindForPath(path: string): TemplateKind {
  return path.startsWith("Templates/Weekly/") ? "weekly" : "daily";
}

function templateIssue(value: string): string | null {
  return documentNameIssue(value)?.replaceAll("document", "template").replaceAll("Document", "Template") ?? null;
}

function TemplateNameModal({
  action,
  files,
  onClose,
  onSubmit,
}: {
  action: NameAction | null;
  files: NotebookFile[];
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!action) return;
    const initial = action.type === "rename"
      ? documentDisplayName(action.file.name)
      : action.type === "duplicate"
        ? `${documentDisplayName(action.file.name)} Copy`
        : "New Template";
    setName(initial);
    window.setTimeout(() => input.current?.select(), 0);
  }, [action]);

  if (!action) return null;
  const kind = action.type === "create" ? action.kind : kindForPath(action.file.path);
  const parent = kind === "daily" ? "Templates/Daily/" : "Templates/Weekly/";
  const path = `${parent}${documentFileStem(name)}.md`;
  const oldPath = action.type === "create" ? "" : action.file.path;
  const duplicate = files.some((file) => file.path !== oldPath && file.path.toLowerCase() === path.toLowerCase());
  const issue = name ? templateIssue(name) : "Enter a template name.";
  const unchanged = action.type === "rename" && path === action.file.path;
  const title = action.type === "create" ? "Create a template" : action.type === "duplicate" ? "Duplicate template" : "Rename template";

  const submit = () => {
    if (!issue && !duplicate && !unchanged) onSubmit(name.trim().replace(/\.md$/i, ""));
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="new-document-modal" role="dialog" aria-modal="true" aria-labelledby="template-name-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <h2 id="template-name-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <label htmlFor="template-name">Name</label>
        <input
          id="template-name"
          ref={input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") onClose();
          }}
        />
        {issue && <p className="modal-field-error">{issue}</p>}
        {duplicate && <p className="modal-field-error">A template with that name already exists.</p>}
        {!issue && !duplicate && <p className="modal-help">Saved as {documentFileStem(name)}.md</p>}
        <div className="modal-actions">
          <button className="text-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={submit} disabled={Boolean(issue) || duplicate || unchanged}>
            {action.type === "create" ? "Create template" : action.type === "duplicate" ? "Duplicate" : "Rename"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function TemplateManager(props: TemplateManagerProps) {
  const [kind, setKind] = useState<TemplateKind>(() => kindForPath(props.activePath));
  const [nameAction, setNameAction] = useState<NameAction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotebookFile | null>(null);
  const [contextMenu, setContextMenu] = useState<{ file: NotebookFile; x: number; y: number } | null>(null);
  const templates = useMemo(
    () => props.files
      .filter((file) => file.path.startsWith(kind === "daily" ? "Templates/Daily/" : "Templates/Weekly/"))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [kind, props.files],
  );
  const selected = props.files.find((file) => file.path === props.activePath);
  const active = props.settings[kind];

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const switchKind = (next: TemplateKind) => {
    setKind(next);
    const nextTemplates = props.files
      .filter((file) => file.path.startsWith(next === "daily" ? "Templates/Daily/" : "Templates/Weekly/"))
      .sort((a, b) => a.name.localeCompare(b.name));
    const target = nextTemplates.find((file) => file.path === props.settings[next]) || nextTemplates[0];
    if (target) props.onChoose(target.path);
  };

  return (
    <div className="template-manager">
      <aside className="template-library">
        <div className="template-library-heading">
          <div>
            <h1>Templates</h1>
            <p>Choose what new pages start with.</p>
          </div>
          <button className="icon-button" onClick={() => setNameAction({ type: "create", kind })} aria-label="Create template" title="Create template">
            <FilePlus2 size={18} />
          </button>
        </div>
        <div className="template-tabs" role="tablist">
          <button className={kind === "daily" ? "active" : ""} onClick={() => switchKind("daily")}>Daily</button>
          <button className={kind === "weekly" ? "active" : ""} onClick={() => switchKind("weekly")}>Weekly</button>
        </div>
        <div className="template-list">
          {templates.map((file) => (
            <button
              key={file.path}
              className={props.activePath === file.path ? "selected" : ""}
              onClick={() => props.onChoose(file.path)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const scale = props.zoom / 100;
                setContextMenu({
                  file,
                  x: Math.max(6, Math.min(event.clientX / scale, window.innerWidth / scale - 180)),
                  y: Math.max(6, Math.min(event.clientY / scale, window.innerHeight / scale - 155)),
                });
              }}
            >
              <span>{documentDisplayName(file.name)}</span>
              {file.path === active && <small><Check size={12} /> Active</small>}
            </button>
          ))}
        </div>
      </aside>

      <section className="template-editor-panel">
        <header className="template-editor-toolbar">
          <div>
            <strong>{selected ? documentDisplayName(selected.name) : "Template"}</strong>
            <small>{kind === "daily" ? "Use {{DATE}} for the page date" : "Use {{WEEK}} and {{YEAR}} for the week heading"}</small>
          </div>
          <span className={`save-state save-${props.saveState}`}>
            {props.saveState === "saved" ? "Saved" : props.saveState === "saving" ? "Saving…" : "Save failed"}
          </span>
          {selected && (
            <div className="template-actions">
              {selected.path !== active && <button className="set-active-button" onClick={() => props.onSetActive(kind, selected.path)}><Check size={14} /> Set active</button>}
              <button className="icon-button" onClick={() => setNameAction({ type: "duplicate", file: selected })} title="Duplicate template"><Copy size={16} /></button>
              <button className="icon-button" onClick={() => setNameAction({ type: "rename", file: selected })} title="Rename template"><Pencil size={16} /></button>
              {selected.name.toLowerCase() !== "default" && (
                <button className="icon-button template-delete-button" onClick={() => setDeleteTarget(selected)} title="Delete template"><Trash2 size={16} /></button>
              )}
            </div>
          )}
        </header>
        <div className="template-editor-scroll">
          <MarkdownEditor value={props.content} onChange={props.onChange} onOpenLink={() => {}} />
        </div>
      </section>

      {contextMenu && (
        <div
          className="document-context-menu template-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.file.path !== props.settings[kindForPath(contextMenu.file.path)] && (
            <button
              role="menuitem"
              onClick={() => {
                props.onSetActive(kindForPath(contextMenu.file.path), contextMenu.file.path);
                setContextMenu(null);
              }}
            >
              <Check size={14} /> Set active
            </button>
          )}
          <button role="menuitem" onClick={() => { setNameAction({ type: "duplicate", file: contextMenu.file }); setContextMenu(null); }}>
            <Copy size={14} /> Duplicate
          </button>
          <button role="menuitem" onClick={() => { setNameAction({ type: "rename", file: contextMenu.file }); setContextMenu(null); }}>
            <Pencil size={14} /> Rename
          </button>
          {contextMenu.file.name.toLowerCase() !== "default" && (
            <button className="context-danger" role="menuitem" onClick={() => { setDeleteTarget(contextMenu.file); setContextMenu(null); }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}

      <TemplateNameModal
        action={nameAction}
        files={props.files}
        onClose={() => setNameAction(null)}
        onSubmit={(name) => {
          if (!nameAction) return;
          if (nameAction.type === "create") props.onCreate(nameAction.kind, name);
          else if (nameAction.type === "duplicate") props.onDuplicate(nameAction.file, name);
          else props.onRename(nameAction.file, name);
          setNameAction(null);
        }}
      />

      {deleteTarget && (
        <div className="modal-backdrop" onMouseDown={() => setDeleteTarget(null)}>
          <section className="new-document-modal delete-document-modal" role="dialog" aria-modal="true" aria-labelledby="delete-template-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="delete-document-icon"><Trash2 size={19} /></div>
            <h2 id="delete-template-title">Delete template?</h2>
            <p className="modal-copy">“{documentDisplayName(deleteTarget.name)}” will be removed. The built-in Default template is recreated automatically if needed.</p>
            <div className="modal-actions">
              <button className="text-button" onClick={() => setDeleteTarget(null)}>Keep template</button>
              <button className="danger-button" onClick={() => { props.onDelete(deleteTarget); setDeleteTarget(null); }}>Delete template</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function ApplyTemplateModal({
  open,
  files,
  kind,
  activeTemplate,
  currentPath,
  onClose,
  onApply,
}: {
  open: boolean;
  files: NotebookFile[];
  kind: TemplateKind;
  activeTemplate: string;
  currentPath: string;
  onClose: () => void;
  onApply: (path: string) => void;
}) {
  const templates = files
    .filter((file) => file.path.startsWith(kind === "daily" ? "Templates/Daily/" : "Templates/Weekly/"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const [selected, setSelected] = useState(activeTemplate);
  const [confirming, setConfirming] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setSelected(activeTemplate);
      setConfirming(false);
    }
  }, [activeTemplate, open]);
  useEffect(() => {
    if (confirming) window.setTimeout(() => cancel.current?.focus(), 0);
  }, [confirming]);
  if (!open) return null;
  const chosen = templates.find((file) => file.path === selected);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="new-document-modal apply-template-modal" role="dialog" aria-modal="true" aria-labelledby="apply-template-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
        {!confirming ? (
          <>
            <div className="modal-heading">
              <div><h2 id="apply-template-title">Apply a template</h2><p>Choose a {kind} template for this page.</p></div>
              <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="apply-template-list">
              {templates.map((file) => (
                <button key={file.path} className={selected === file.path ? "selected" : ""} onClick={() => setSelected(file.path)}>
                  <span>{documentDisplayName(file.name)}</span>
                  {file.path === activeTemplate && <small>Active default</small>}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="text-button" onClick={onClose}>Cancel</button>
              <button className="primary-button" disabled={!chosen} onClick={() => setConfirming(true)}>Continue</button>
            </div>
          </>
        ) : (
          <>
            <div className="delete-document-icon"><Trash2 size={19} /></div>
            <h2 id="apply-template-title">Replace this page?</h2>
            <p className="modal-copy">Applying “{chosen ? documentDisplayName(chosen.name) : "this template"}” will permanently erase all content in <strong>{currentPath}</strong>.</p>
            <div className="modal-actions">
              <button ref={cancel} className="text-button" onClick={() => setConfirming(false)}>Go back</button>
              <button className="danger-button" onClick={() => chosen && onApply(chosen.path)}>Replace page</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
