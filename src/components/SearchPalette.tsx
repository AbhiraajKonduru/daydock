import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { titleForFile } from "../lib/dates";
import { notebookStorage, type SearchResult } from "../lib/storage";
import type { NotebookFile } from "../types";

type Props = {
  files: NotebookFile[];
  root: string | null;
  open: boolean;
  indexState: "idle" | "indexing" | "ready" | "error";
  indexRevision: number;
  indexWarning: string;
  onRetryIndex: () => void;
  onClose: () => void;
  onChoose: (path: string) => void;
};

type SearchEntry = {
  file: NotebookFile;
  title: string;
  titleLower: string;
  pathLower: string;
  contentLower: string;
  preview: string;
  previewLower: string;
};

function previewFor(file: NotebookFile): string {
  return file.content
    .split(/\r?\n/)
    .filter((line, index) => {
      if (/system streak:\s*\d+\s*$/i.test(line.trim())) return false;
      return !(file.path.startsWith("Daily/") && index === 0 && /^#\s+/.test(line));
    })
    .join("\n")
    .replace(/^#+\s*/gm, "")
    .replace(/\[([ xX])\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function snippetFor(entry: SearchEntry, terms: string[]): string {
  const { preview } = entry;
  if (terms.length === 0) return preview.slice(0, 120);

  const matchIndex = terms
    .map((term) => entry.previewLower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const start = Math.max(0, matchIndex - 42);
  const end = start + 125;
  return `${start > 0 ? "…" : ""}${preview.slice(start, end)}${preview.length > end ? "…" : ""}`;
}

export function SearchPalette({
  files,
  root,
  open,
  indexState,
  indexRevision,
  indexWarning,
  onRetryIndex,
  onClose,
  onChoose,
}: Props) {
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const requestGeneration = useRef(0);
  const activeQuery = useRef("");

  useEffect(() => {
    if (open) {
      setQuery("");
      setRemoteResults([]);
      setSearching(false);
      setSearchError("");
      activeQuery.current = "";
      window.setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !root || !notebookStorage.native) return;
    const trimmed = query.trim();
    const generation = ++requestGeneration.current;
    setSearchError("");
    if (activeQuery.current !== trimmed) {
      activeQuery.current = trimmed;
      setRemoteResults([]);
    }
    if (!trimmed) {
      setRemoteResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      void notebookStorage.search(root, trimmed).then((results) => {
        if (requestGeneration.current !== generation) return;
        setRemoteResults(results);
        setSearching(false);
      }).catch((caught) => {
        if (requestGeneration.current !== generation) return;
        setRemoteResults([]);
        setSearching(false);
        setSearchError(caught instanceof Error ? caught.message : String(caught));
      });
    }, 120);
    return () => {
      window.clearTimeout(timer);
      if (requestGeneration.current === generation) requestGeneration.current += 1;
    };
  }, [indexRevision, open, query, root]);

  const searchIndex = useMemo<SearchEntry[]>(() => files.map((file) => {
    const title = titleForFile(file);
    const preview = previewFor(file);
    return {
      file,
      title,
      titleLower: title.toLowerCase(),
      pathLower: file.path.toLowerCase(),
      contentLower: file.content.toLowerCase(),
      preview,
      previewLower: preview.toLowerCase(),
    };
  }), [files]);

  const terms = useMemo(() => query.toLowerCase().trim().split(/\s+/).filter(Boolean), [query]);

  const results = useMemo(() => searchIndex
    .map((entry) => {
      const score = terms.reduce((total, term) => {
        const titleMatch = entry.titleLower.includes(term);
        const pathMatch = entry.pathLower.includes(term);
        if (!titleMatch && !pathMatch && !entry.contentLower.includes(term)) return -1000;
        return total + (titleMatch ? 8 : pathMatch ? 4 : 1);
      }, 0);
      return { entry, score };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || b.entry.file.modified - a.entry.file.modified)
    .slice(0, 12), [searchIndex, terms]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search notebook"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="search-input-row">
          <Search size={20} aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search every page…"
            aria-label="Search every page"
          />
          <button className="icon-button" onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </div>
        <div className="search-results">
          {notebookStorage.native && searchError && (
            <div className="search-error"><p>{searchError}</p></div>
          )}
          {notebookStorage.native && !searchError && query.trim() && remoteResults.length === 0 && indexState === "indexing" && (
            <p className="search-status">Preparing search…</p>
          )}
          {notebookStorage.native && !searchError && searching && indexState !== "indexing" && <p className="search-status">Searching…</p>}
          {notebookStorage.native && !searchError && !searching && remoteResults.length === 0 && indexState === "error" && (
            <div className="search-error"><p>Search indexing could not finish.</p><button onClick={onRetryIndex}>Retry</button></div>
          )}
          {notebookStorage.native && indexState === "ready" && indexWarning && <p className="search-warning">{indexWarning}</p>}
          {notebookStorage.native ? remoteResults.map((result) => (
            <button key={result.path} className="search-result" onClick={() => { onChoose(result.path); onClose(); }}>
              <span className="search-result-title">{result.title}</span>
              <span className="search-result-path">{result.path}</span>
              <span className="search-result-snippet">{result.snippet}</span>
            </button>
          )) : results.map(({ entry }) => (
            <button
              key={entry.file.path}
              className="search-result"
              onClick={() => {
                onChoose(entry.file.path);
                onClose();
              }}
            >
              <span className="search-result-title">{entry.title}</span>
              <span className="search-result-path">{entry.file.path}</span>
              <span className="search-result-snippet">{snippetFor(entry, terms)}</span>
            </button>
          ))}
          {((notebookStorage.native ? remoteResults.length : results.length) === 0 && query.trim() && !searching && indexState !== "indexing" && indexState !== "error" && !searchError) && <p className="empty-results">No pages found.</p>}
        </div>
      </section>
    </div>
  );
}
