import { invoke } from "@tauri-apps/api/core";
import type { GitStatus, NotebookFile, SyncResult } from "../types";

export type SearchResult = { path: string; title: string; snippet: string };
export type IndexStatus = { indexed: number; warnings: string[] };

const BROWSER_ROOT = "Browser preview notebook";
const BROWSER_FILES_KEY = "daydock-preview-files";

function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

function browserFiles(): NotebookFile[] {
  try {
    return JSON.parse(localStorage.getItem(BROWSER_FILES_KEY) || "[]") as NotebookFile[];
  } catch {
    return [];
  }
}

function storeBrowserFiles(files: NotebookFile[]) {
  localStorage.setItem(BROWSER_FILES_KEY, JSON.stringify(files));
}

export const notebookStorage = {
  native: isTauri(),
  browserRoot: BROWSER_ROOT,

  async chooseFolder(): Promise<string | null> {
    if (!isTauri()) return BROWSER_ROOT;
    return invoke<string | null>("select_notebook");
  },

  async initialize(root: string): Promise<void> {
    if (!isTauri()) return;
    await invoke("initialize_notebook", { root });
  },

  async scan(root: string): Promise<NotebookFile[]> {
    if (!isTauri()) return browserFiles().map((file) => ({ ...file, loaded: true })).sort((a, b) => b.modified - a.modified);
    return invoke<NotebookFile[]>("scan_notebook", { root });
  },

  async read(root: string, path: string): Promise<NotebookFile> {
    if (!isTauri()) {
      const file = browserFiles().find((item) => item.path === path);
      if (!file) throw new Error("That file no longer exists.");
      return { ...file, loaded: true };
    }
    return invoke<NotebookFile>("read_notebook_file", { root, path });
  },

  async materialize(root: string, path: string, initial: string): Promise<NotebookFile> {
    if (!isTauri()) {
      const existing = browserFiles().find((file) => file.path === path);
      if (existing) return { ...existing, loaded: true };
      await this.write(root, path, initial);
      return this.read(root, path);
    }
    return invoke<NotebookFile>("materialize_notebook_file", { root, path, initial });
  },

  async write(root: string, path: string, content: string, expectedModified?: number): Promise<NotebookFile> {
    if (!isTauri()) {
      const files = browserFiles();
      const existing = files.find((file) => file.path === path);
      if (existing) {
        existing.content = content;
        existing.modified = Date.now();
      } else {
        files.push({
          path,
          content,
          modified: Date.now(),
          name: path.split("/").pop()?.replace(/\.md$/, "") || path,
          loaded: true,
        });
      }
      storeBrowserFiles(files);
      return { ...(files.find((file) => file.path === path)!), loaded: true };
    }
    return invoke<NotebookFile>("write_notebook_file", { root, path, content, expectedModified });
  },

  async delete(root: string, path: string): Promise<void> {
    if (!isTauri()) {
      storeBrowserFiles(browserFiles().filter((file) => file.path !== path));
      return;
    }
    await invoke("delete_notebook_file", { root, path });
  },

  async gitStatus(root: string): Promise<GitStatus> {
    return invoke<GitStatus>("get_git_status", { root });
  },

  async configureGithubSync(root: string, remoteUrl: string): Promise<SyncResult> {
    return invoke<SyncResult>("configure_github_sync", { root, remoteUrl });
  },

  async sync(root: string): Promise<SyncResult> {
    return invoke<SyncResult>("sync_notebook", { root });
  },

  async search(root: string, query: string): Promise<SearchResult[]> {
    if (!isTauri()) return [];
    return invoke<SearchResult[]>("search_notebook", { root, query });
  },

  async prepareSearch(root: string): Promise<IndexStatus> {
    if (!isTauri()) return { indexed: browserFiles().length, warnings: [] };
    return invoke<IndexStatus>("prepare_search_index", { root });
  },
};
