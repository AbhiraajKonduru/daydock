import { invoke } from "@tauri-apps/api/core";
import type { GitStatus, NotebookFile, RenameResult, SyncResult, TemplateKind, TemplateSettings } from "../types";
import { rewriteDocumentLinks } from "./documents";
import { BUILTIN_DAILY_TEMPLATE, BUILTIN_WEEKLY_TEMPLATE } from "./dates";

export type SearchResult = { path: string; title: string; snippet: string };
export type IndexStatus = { indexed: number; warnings: string[] };

const BROWSER_ROOT = "Browser preview notebook";
const BROWSER_FILES_KEY = "daydock-preview-files";
const BROWSER_TEMPLATE_SETTINGS_KEY = "daydock-preview-template-settings";
export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  daily: "Templates/Daily/Default.md",
  weekly: "Templates/Weekly/Default.md",
};

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

function ensureBrowserTemplateLibrary(): TemplateSettings {
  const files = browserFiles();
  let changed = false;
  for (const [path, content] of [
    [DEFAULT_TEMPLATE_SETTINGS.daily, BUILTIN_DAILY_TEMPLATE],
    [DEFAULT_TEMPLATE_SETTINGS.weekly, BUILTIN_WEEKLY_TEMPLATE],
  ] as const) {
    if (!files.some((file) => file.path.toLowerCase() === path.toLowerCase())) {
      files.push({ path, content, modified: Date.now(), name: "Default", loaded: true });
      changed = true;
    }
  }
  if (changed) storeBrowserFiles(files);

  let settings: TemplateSettings;
  try {
    settings = JSON.parse(localStorage.getItem(BROWSER_TEMPLATE_SETTINGS_KEY) || "null") || { ...DEFAULT_TEMPLATE_SETTINGS };
  } catch {
    settings = { ...DEFAULT_TEMPLATE_SETTINGS };
  }
  if (!files.some((file) => file.path === settings.daily)) settings.daily = DEFAULT_TEMPLATE_SETTINGS.daily;
  if (!files.some((file) => file.path === settings.weekly)) settings.weekly = DEFAULT_TEMPLATE_SETTINGS.weekly;
  localStorage.setItem(BROWSER_TEMPLATE_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export const notebookStorage = {
  native: isTauri(),
  browserRoot: BROWSER_ROOT,

  async chooseFolder(): Promise<string | null> {
    if (!isTauri()) return BROWSER_ROOT;
    return invoke<string | null>("select_notebook");
  },

  async initialize(root: string): Promise<void> {
    if (!isTauri()) {
      ensureBrowserTemplateLibrary();
      return;
    }
    await invoke("initialize_notebook", { root });
  },

  async scan(root: string): Promise<NotebookFile[]> {
    if (!isTauri()) {
      ensureBrowserTemplateLibrary();
      return browserFiles().map((file) => ({ ...file, loaded: true })).sort((a, b) => b.modified - a.modified);
    }
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

  async rename(root: string, oldPath: string, newPath: string): Promise<RenameResult> {
    if (!isTauri()) {
      const files = browserFiles();
      const source = files.find((file) => file.path === oldPath);
      if (!source) throw new Error("That document no longer exists.");
      if (files.some((file) => file.path !== oldPath && file.path.toLowerCase() === newPath.toLowerCase())) {
        throw new Error("A document with that name already exists.");
      }
      source.path = newPath;
      source.name = newPath.split("/").pop()?.replace(/\.md$/i, "") || newPath;
      source.modified = Date.now();
      const updatedPaths: string[] = [];
      for (const file of files) {
        const rewritten = rewriteDocumentLinks(file.content, oldPath, newPath);
        if (rewritten !== file.content) {
          file.content = rewritten;
          file.modified = Date.now();
          updatedPaths.push(file.path);
        }
      }
      storeBrowserFiles(files);
      return { file: { ...source, loaded: true }, updatedPaths };
    }
    return invoke<RenameResult>("rename_notebook_document", { root, oldPath, newPath });
  },

  async getTemplateSettings(root: string): Promise<TemplateSettings> {
    if (!isTauri()) return ensureBrowserTemplateLibrary();
    return invoke<TemplateSettings>("get_template_settings", { root });
  },

  async setActiveTemplate(root: string, kind: TemplateKind, path: string): Promise<TemplateSettings> {
    if (!isTauri()) {
      const settings = ensureBrowserTemplateLibrary();
      const expectedPrefix = kind === "daily" ? "Templates/Daily/" : "Templates/Weekly/";
      if (!path.startsWith(expectedPrefix) || !browserFiles().some((file) => file.path === path)) {
        throw new Error("That template is unavailable.");
      }
      settings[kind] = path;
      localStorage.setItem(BROWSER_TEMPLATE_SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    }
    return invoke<TemplateSettings>("set_active_template", { root, kind, path });
  },

  async renameTemplate(root: string, oldPath: string, newPath: string): Promise<RenameResult> {
    if (!isTauri()) {
      const files = browserFiles();
      const source = files.find((file) => file.path === oldPath);
      if (!source) throw new Error("That template no longer exists.");
      if (files.some((file) => file.path !== oldPath && file.path.toLowerCase() === newPath.toLowerCase())) {
        throw new Error("A template with that name already exists.");
      }
      source.path = newPath;
      source.name = newPath.split("/").pop()?.replace(/\.md$/i, "") || newPath;
      source.modified = Date.now();
      const settings = ensureBrowserTemplateLibrary();
      if (settings.daily === oldPath) settings.daily = newPath;
      if (settings.weekly === oldPath) settings.weekly = newPath;
      storeBrowserFiles(files);
      localStorage.setItem(BROWSER_TEMPLATE_SETTINGS_KEY, JSON.stringify(settings));
      ensureBrowserTemplateLibrary();
      return { file: { ...source, loaded: true }, updatedPaths: [] };
    }
    return invoke<RenameResult>("rename_notebook_template", { root, oldPath, newPath });
  },

  async deleteTemplate(root: string, path: string): Promise<TemplateSettings> {
    if (!isTauri()) {
      const settings = ensureBrowserTemplateLibrary();
      storeBrowserFiles(browserFiles().filter((file) => file.path !== path));
      if (settings.daily === path) settings.daily = DEFAULT_TEMPLATE_SETTINGS.daily;
      if (settings.weekly === path) settings.weekly = DEFAULT_TEMPLATE_SETTINGS.weekly;
      localStorage.setItem(BROWSER_TEMPLATE_SETTINGS_KEY, JSON.stringify(settings));
      return ensureBrowserTemplateLibrary();
    }
    return invoke<TemplateSettings>("delete_notebook_template", { root, path });
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
