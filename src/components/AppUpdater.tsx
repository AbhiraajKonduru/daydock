import { ArrowDownToLine, CircleAlert, CircleCheck, Download, RefreshCw, X } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
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

/** Where the most recent check left things, for the Updates settings section. */
export type UpdateCheckStatus = "idle" | "checking" | "up-to-date" | "available" | "error";

export type AppUpdater = {
  enabled: boolean;
  currentVersion: string | null;
  update: Update | null;
  modalOpen: boolean;
  reminderVisible: boolean;
  stage: UpdateStage;
  downloaded: number;
  contentLength?: number;
  error: string;
  checkStatus: UpdateCheckStatus;
  checkError: string;
  lastChecked: number | null;
  open: () => void;
  later: () => void;
  checkNow: () => Promise<void>;
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
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [update, setUpdate] = useState<Update | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [stage, setStage] = useState<UpdateStage>("idle");
  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState<number>();
  const [error, setError] = useState("");
  const [checkStatus, setCheckStatus] = useState<UpdateCheckStatus>("idle");
  const [checkError, setCheckError] = useState("");
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const checkingRef = useRef(false);
  const updateRef = useRef<Update | null>(null);
  const canPromptRef = useRef(canPrompt);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);
  useEffect(() => {
    canPromptRef.current = canPrompt;
  }, [canPrompt]);

  useEffect(() => {
    let cancelled = false;
    // Outside the desktop app there is no Tauri runtime to ask.
    getVersion()
      .then((version) => { if (!cancelled) setCurrentVersion(version); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /**
   * Background checks stay quiet and may prompt. A check the person asks for
   * from Settings reports every outcome, including failures, and shows a found
   * update in place rather than interrupting with a dialog.
   */
  const checkForUpdate = useCallback(async (manual = false) => {
    if (!enabled || checkingRef.current) return;
    checkingRef.current = true;
    if (manual) {
      setCheckStatus("checking");
      setCheckError("");
    }
    try {
      const available = await check({ timeout: 15_000 });
      setLastChecked(Date.now());
      if (!available) {
        setCheckStatus(updateRef.current ? "available" : "up-to-date");
        return;
      }

      const previous = updateRef.current;
      if (previous && previous.version === available.version) {
        await available.close();
        setCheckStatus("available");
        return;
      }
      if (previous) void previous.close();

      updateRef.current = available;
      setUpdate(available);
      setCheckStatus("available");
      setStage("idle");
      setError("");
      setDownloaded(0);
      setContentLength(undefined);

      if (manual) {
        setModalOpen(false);
        setReminderVisible(true);
        return;
      }

      const deferred = isUpdateDeferred(
        available.version,
        localStorage.getItem(UPDATE_DEFER_KEY),
      );
      const shouldPrompt = !deferred && canPromptRef.current;
      setModalOpen(shouldPrompt);
      setReminderVisible(!shouldPrompt);
    } catch (caught) {
      if (manual) {
        const detail = caught instanceof Error ? caught.message : String(caught);
        setCheckStatus("error");
        setCheckError(`Daydock couldn't reach the update server. Check your connection and try again. ${detail}`);
      } else {
        // Startup update checks are deliberately quiet. A temporary network or
        // release-host failure should never interrupt the user's planning flow.
        console.warn("Daydock update check failed", caught);
      }
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

  const checkNow = useCallback(() => checkForUpdate(true), [checkForUpdate]);

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
    enabled,
    currentVersion,
    update,
    modalOpen,
    reminderVisible,
    stage,
    downloaded,
    contentLength,
    error,
    checkStatus,
    checkError,
    lastChecked,
    open,
    later,
    checkNow,
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

function isBusy(stage: UpdateStage) {
  return stage === "saving" || stage === "downloading" || stage === "installing";
}

/** Download and install progress, shared by the dialog and the settings section. */
function UpdateProgress({ updater }: { updater: AppUpdater }) {
  const { stage } = updater;
  if (!isBusy(stage)) return null;
  const percent = updater.contentLength
    ? Math.min(100, Math.round((updater.downloaded / updater.contentLength) * 100))
    : undefined;
  const status = stage === "saving"
    ? "Saving your open pages…"
    : stage === "downloading"
      ? percent === undefined ? "Downloading update…" : `Downloading update… ${percent}%`
      : "Installing and restarting…";

  return (
    <div className="update-progress" aria-live="polite">
      <div className={percent === undefined && stage === "downloading" ? "indeterminate" : ""}>
        <span style={{ width: stage === "saving" ? "8%" : stage === "installing" ? "100%" : `${percent ?? 32}%` }} />
      </div>
      <p>{status}</p>
    </div>
  );
}

function InstallButton({ updater, beforeInstall }: UpdateModalProps) {
  const busy = isBusy(updater.stage);
  return (
    <button className="primary-button" onClick={() => void updater.install(beforeInstall)} disabled={busy}>
      {updater.stage === "error" ? <RefreshCw size={15} /> : <Download size={15} />}
      {updater.stage === "error" ? "Try again" : busy ? "Updating…" : "Update and restart"}
    </button>
  );
}

export function UpdateModal({ updater, beforeInstall }: UpdateModalProps) {
  const { update, modalOpen, stage } = updater;
  const busy = isBusy(stage);

  if (!update || !modalOpen) return null;

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
        <UpdateProgress updater={updater} />
        {updater.error && <p className="update-error" role="alert">{updater.error}</p>}
        <div className="modal-actions">
          <button className="text-button" onClick={updater.later} disabled={busy}>Later</button>
          <InstallButton updater={updater} beforeInstall={beforeInstall} />
        </div>
      </section>
    </div>
  );
}

function checkedAt(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type Tone = "neutral" | "good" | "available" | "error";

export function UpdateSettings({ updater, beforeInstall }: UpdateModalProps) {
  const { update, checkStatus, lastChecked } = updater;
  const busy = isBusy(updater.stage);
  const checking = checkStatus === "checking";

  let tone: Tone = "neutral";
  let title = "Daydock checks for updates automatically";
  let detail = "It looks for a new beta shortly after launch and every few hours after that.";
  if (!updater.enabled) {
    title = "Updates run in the desktop app";
    detail = "This preview can’t check for or install updates. Open Daydock on your computer to update.";
  } else if (update) {
    tone = "available";
    title = `Daydock ${displayVersion(update.version)} is available`;
    detail = updater.currentVersion
      ? `You’re on ${displayVersion(updater.currentVersion)}. Daydock saves your open pages before installing, then restarts into the new version.`
      : "Daydock saves your open pages before installing, then restarts into the new version.";
  } else if (checking) {
    title = "Checking for updates…";
    detail = "Looking for a newer beta release.";
  } else if (checkStatus === "error") {
    tone = "error";
    title = "Couldn’t check for updates";
    detail = updater.checkError;
  } else if (checkStatus === "up-to-date") {
    tone = "good";
    title = "You’re up to date";
    detail = updater.currentVersion
      ? `${displayVersion(updater.currentVersion)} is the newest beta.`
      : "You have the newest beta.";
  }

  const icon = tone === "good"
    ? <CircleCheck size={17} />
    : tone === "available"
      ? <ArrowDownToLine size={17} />
      : tone === "error"
        ? <CircleAlert size={17} />
        : <RefreshCw size={17} className={checking ? "spinning" : ""} />;

  return (
    <section className="update-settings" aria-labelledby="update-settings-title">
      <header className="settings-content-heading">
        <p className="eyebrow">Settings</p>
        <h1 id="update-settings-title">Updates</h1>
        <p>Keep Daydock on the newest beta. Your notebook stays on your computer throughout.</p>
      </header>
      <div className="update-settings-body">
        <div className="update-card" data-tone={tone} aria-live="polite">
          <div className="update-card-status">
            <span className="update-card-icon" aria-hidden="true">{icon}</span>
            <div>
              <strong>{title}</strong>
              {detail && <p>{detail}</p>}
            </div>
          </div>
          {update?.body && (
            <div className="update-notes">
              <strong>What’s new</strong>
              <p>{update.body}</p>
            </div>
          )}
          <UpdateProgress updater={updater} />
          {updater.error && <p className="update-error" role="alert">{updater.error}</p>}
          <div className="update-card-actions">
            <button
              className="update-check-button"
              onClick={() => void updater.checkNow()}
              disabled={!updater.enabled || checking || busy}
            >
              <RefreshCw size={14} className={checking ? "spinning" : ""} />
              {checking ? "Checking…" : "Check for updates"}
            </button>
            {update && <InstallButton updater={updater} beforeInstall={beforeInstall} />}
          </div>
        </div>
        <dl className="update-facts">
          <div><dt>Installed version</dt><dd>{updater.currentVersion ? displayVersion(updater.currentVersion) : "Unknown"}</dd></div>
          <div><dt>Release channel</dt><dd>Beta</dd></div>
          <div><dt>Last checked</dt><dd>{lastChecked ? checkedAt(lastChecked) : "Not yet"}</dd></div>
        </dl>
      </div>
    </section>
  );
}
