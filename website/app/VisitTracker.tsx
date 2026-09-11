"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer || undefined }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  return null;
}
