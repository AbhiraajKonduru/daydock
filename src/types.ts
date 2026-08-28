export type NotebookFile = {
  path: string;
  name: string;
  content: string;
  loaded: boolean;
  modified: number;
};

export type SaveState = "saved" | "saving" | "error";

export type GitStatus = {
  configured: boolean;
  remoteUrl: string | null;
  branch: string | null;
};

export type SyncResult = {
  status: "upToDate" | "pushed" | "pulled" | "reconciled" | "conflict";
  message: string;
};
