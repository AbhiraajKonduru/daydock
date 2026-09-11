import { Copy, ExternalLink, X } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { APP_PLATFORM } from "../lib/platform";
import { generateSurveyCode, type SurveyPlatform } from "../lib/surveyCode";
import { shortcutLabel } from "../lib/shortcuts";

const FEEDBACK_SITE = import.meta.env.DEV ? "http://localhost:3000" : "https://daydock.vercel.app";
const PACKAGE_VERSION = "0.2.0";

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
};

async function currentAppVersion(): Promise<string> {
  if (isTauri()) {
    try {
      return await getVersion();
    } catch {
      return PACKAGE_VERSION;
    }
  }
  return PACKAGE_VERSION;
}

function surveyPlatform(): SurveyPlatform {
  return APP_PLATFORM === "macos" || APP_PLATFORM === "linux" ? APP_PLATFORM : "windows";
}

async function openWebsite(url: string) {
  if (isTauri()) {
    await invoke("open_external_url", { url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCopied(false);
    setError("");
    void currentAppVersion().then((appVersion) => {
      if (cancelled) return;
      setCode(generateSurveyCode({
        platform: surveyPlatform(),
        appVersion,
      }));
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const openForm = async (kind: "feedback" | "testimonial") => {
    const url = new URL("/feedback", FEEDBACK_SITE);
    url.searchParams.set("kind", kind);
    if (code) url.searchParams.set("code", code);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Opening the form still works if the clipboard is unavailable.
    }
    try {
      await openWebsite(url.toString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Daydock could not open the website.");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The code could not be copied.");
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="new-document-modal feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Optional</p>
            <h2 id="feedback-title">Share feedback</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="modal-copy">
          Daydock creates a short code on this computer. Paste it on the website so the report can be labeled as coming from an installed copy. The code never leaves this device unless you copy it or open the form.
        </p>
        <label htmlFor="survey-code-value">Your code</label>
        <div className="survey-code-row">
          <input id="survey-code-value" readOnly value={code} />
          <button className="text-button" type="button" onClick={() => void copyCode()} disabled={!code}>
            <Copy size={14} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="modal-help">Valid for 14 days. Shortcut: {shortcutLabel("share-feedback", APP_PLATFORM)}</p>
        {error && <p className="modal-field-error">{error}</p>}
        <div className="feedback-choices">
          <button className="primary-button" type="button" onClick={() => void openForm("feedback")} disabled={!code}>
            Give feedback <ExternalLink size={14} />
          </button>
          <button className="text-button" type="button" onClick={() => void openForm("testimonial")} disabled={!code}>
            Share your Daydock story <ExternalLink size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
