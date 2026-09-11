import { ArrowDownToLine, Download, RefreshCw, X } from "lucide-react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deferredUpdateValue,
  isUpdateDeferred,
  UPDATE_DEFER_KEY,
} from "../lib/updater";

const INITIAL_CHECK_DELAY_MS = 2500;
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type UpdateStage = "idle" | "saving" | "downloading" | "installing" | "error";

export type AppUpdater = {
  update: Update | null;
  modalOpen: boolean;
  reminderVisible: boolean;
  stage: UpdateStage;
  downloaded: number;
  contentLength?: number;
  error: string;
  open: () => void;
  later: () => void;
  install: (beforeInstall: () => Promise<void>) => Promise<void>;
};

function errorMessage(caught: unknown): string {
  const detail = caught instanceof Error ? caught.message : String(caught);
  return `Daydock couldn't install the update. Your notebook files are safe. ${detail}`;
}

function displayVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

export function useAppUpdater(enabled: boolean, canPrompt = true): AppUpdater {
  const [update, setUpdate] = useState<Update | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [stage, setStage] = useState<UpdateStage>("idle");
  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState<number>();
  const [error, setError] = useState("");
  const checkingRef = useRef(false);
  const updateRef = useRef<Update | null>(null);
  const canPromptRef = useRef(canPrompt);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);
  useEffect(() => {
    canPromptRef.current = canPrompt;
  }, [canPrompt]);

  const checkForUpdate = useCallback(async () => {
    if (!enabled || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const available = await check({ timeout: 15_000 });
      if (!available) return;

      const previous = updateRef.current;
      if (previous && previous.version === available.version) {
        await available.close();
        return;
      }
      if (previous) void previous.close();

      updateRef.current = available;
      setUpdate(available);
      setStage("idle");
      setError("");
      setDownloaded(0);
      setContentLength(undefined);

      const deferred = isUpdateDeferred(
        available.version,
        localStorage.getItem(UPDATE_DEFER_KEY),
      );
      const shouldPrompt = !deferred && canPromptRef.current;
      setModalOpen(shouldPrompt);
      setReminderVisible(!shouldPrompt);
    } catch (caught) {
      // Startup update checks are deliberately quiet. A temporary network or
      // release-host failure should never interrupt the user's planning flow.
      console.warn("Daydock update check failed", caught);
    } finally {
      checkingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const initial = window.setTimeout(() => void checkForUpdate(), INITIAL_CHECK_DELAY_MS);
    const interval = window.setInterval(() => void checkForUpdate(), RECHECK_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [checkForUpdate, enabled]);

  const open = useCallback(() => {
    if (!updateRef.current) return;
    setModalOpen(true);
    setReminderVisible(false);
  }, []);

  const later = useCallback(() => {
    const available = updateRef.current;
    if (!available || stage === "saving" || stage === "downloading" || stage === "installing") return;
    localStorage.setItem(UPDATE_DEFER_KEY, deferredUpdateValue(available.version));
    setModalOpen(false);
    setReminderVisible(true);
    setStage("idle");
    setError("");
  }, [stage]);

  const install = useCallback(async (beforeInstall: () => Promise<void>) => {
    const available = updateRef.current;
    if (!available || stage === "saving" || stage === "downloading" || stage === "installing") return;

    setError("");
    setStage("saving");
    setDownloaded(0);
    setContentLength(undefined);
    try {
      await beforeInstall();
      setStage("downloading");
      let received = 0;
      await available.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          received = 0;
          setDownloaded(0);
          setContentLength(event.data.contentLength);
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          setDownloaded(received);
        } else {
          setStage("installing");
        }
      });

      // Windows exits as the installer starts. macOS and Linux reach this line
      // after installation and need an explicit relaunch.
      await relaunch();
    } catch (caught) {
      setError(errorMessage(caught));
      setStage("error");
      setReminderVisible(false);
    }
  }, [stage]);

  return {
    update,
    modalOpen,
    reminderVisible,
    stage,
    downloaded,
    contentLength,
    error,
    open,
    later,
    install,
  };
}

export function UpdateReminder({ updater }: { updater: AppUpdater }) {
  if (!updater.update || !updater.reminderVisible) return null;
  return (
    <button
      className="update-reminder icon-button"
      onClick={updater.open}
      aria-label={`Daydock ${displayVersion(updater.update.version)} is available`}
      title={`Update to Daydock ${displayVersion(updater.update.version)}`}
    >
      <ArrowDownToLine size={17} />
      <span aria-hidden="true" />
    </button>
  );
}

type UpdateModalProps = {
  updater: AppUpdater;
  beforeInstall: () => Promise<void>;
};

export function UpdateModal({ updater, beforeInstall }: UpdateModalProps) {
  const { update, modalOpen, stage } = updater;
  const busy = stage === "saving" || stage === "downloading" || stage === "installing";
  const percent = updater.contentLength
    ? Math.min(100, Math.round((updater.downloaded / updater.contentLength) * 100))
    : undefined;

  if (!update || !modalOpen) return null;

  const status = stage === "saving"
    ? "Saving your open pages…"
    : stage === "downloading"
      ? percent === undefined ? "Downloading update…" : `Downloading update… ${percent}%`
      : stage === "installing"
        ? "Installing and restarting…"
        : "";

  return (
    <div className="modal-backdrop" onMouseDown={() => { if (!busy) updater.later(); }}>
      <section
        className="new-document-modal update-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        aria-describedby="update-description"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === "Escape" && !busy) updater.later(); }}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Beta update</p>
            <h2 id="update-title">Daydock {displayVersion(update.version)} is ready</h2>
          </div>
          {!busy && (
            <button className="icon-button" onClick={updater.later} aria-label="Remind me later">
              <X size={18} />
            </button>
          )}
        </div>
        <p id="update-description" className="modal-copy">
          Daydock will save your open pages before installing, then restart into the new version.
        </p>
        {update.body && (
          <div className="update-notes">
            <strong>What’s new</strong>
            <p>{update.body}</p>
          </div>
        )}
        {busy && (
          <div className="update-progress" aria-live="polite">
            <div className={percent === undefined && stage === "downloading" ? "indeterminate" : ""}>
              <span style={{ width: stage === "saving" ? "8%" : stage === "installing" ? "100%" : `${percent ?? 32}%` }} />
            </div>
            <p>{status}</p>
          </div>
        )}
        {updater.error && <p className="update-error" role="alert">{updater.error}</p>}
        <div className="modal-actions">
          <button className="text-button" onClick={updater.later} disabled={busy}>Later</button>
          <button className="primary-button" onClick={() => void updater.install(beforeInstall)} disabled={busy}>
            {stage === "error" ? <RefreshCw size={15} /> : <Download size={15} />}
            {stage === "error" ? "Try again" : busy ? "Updating…" : "Update and restart"}
          </button>
        </div>
      </section>
    </div>
  );
}
