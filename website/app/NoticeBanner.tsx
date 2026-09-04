"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISSED_KEY = "daydock-ai-notice-dismissed";

export default function NoticeBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Read after hydration so the server and initial client markup stay identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sessionStorage.getItem(DISMISSED_KEY) === "true") setVisible(false);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  return (
    <aside className="aiBanner" role="status">
      <span className="noticeDot" aria-hidden="true" />
      <p>This website is AI slop. Its purpose is just so that you can download the app.</p>
      <button type="button" onClick={dismiss} aria-label="Dismiss notice">
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
