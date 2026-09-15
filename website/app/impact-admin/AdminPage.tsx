"use client";

import { useEffect, useMemo, useState } from "react";
import { grantLines, isFeedbackKind, statsCsv, submissionsCsv, summarizeDashboard, type AnalyticsEvent, type SubmissionRecord } from "@/lib/dashboardStats";

type DashboardPayload = {
  events: AnalyticsEvent[];
  submissions: SubmissionRecord[];
};

const RANGES = [
  { id: "all", label: "All time", days: null },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "365", label: "12 months", days: 365 },
] as const;

const STATUSES = ["new", "reviewing", "planned", "resolved", "published", "rejected"] as const;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "feedback", label: "Feedback" },
  { id: "testimonial", label: "Stories" },
  { id: "advisor", label: "Advisors" },
  { id: "volunteer", label: "Volunteers" },
] as const;

const KIND_LABELS: Record<SubmissionRecord["kind"], string> = {
  testimonial: "story",
  bug: "bug",
  feature: "feature",
  improvement: "improvement",
  general: "general",
  advisor: "advisor application",
  volunteer: "volunteer",
};

const RESPONSE_FIELDS = [
  { key: "useCase", label: "How they use Daydock" },
  { key: "problem", label: "Problem they were solving" },
  { key: "outcome", label: "What changed" },
  { key: "recommendation", label: "What they would tell others" },
  { key: "message", label: "Message" },
] as const;

function downloadFile(name: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("all");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [now, setNow] = useState(0);

  const load = async () => {
    setError("");
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    if (response.status === 401) {
      setAuthed(false);
      setData(null);
      setLoading(false);
      return;
    }
    const body = await response.json() as DashboardPayload & { error?: string };
    if (!response.ok) throw new Error(body.error || "Could not load dashboard data.");
    setData(body);
    setAuthed(true);
    setNow(Date.now());
    setLoading(false);
  };

  useEffect(() => {
    // Session cookie is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not load dashboard data.");
      setLoading(false);
    });
  }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "That password is not correct.");
      setPassword("");
      await load();
    } catch (caught) {
      setLoading(false);
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setData(null);
  };

  const updateStatus = async (id: string, status: (typeof STATUSES)[number]) => {
    const response = await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await response.json() as { error?: string };
    if (!response.ok) {
      setError(body.error || "Could not update submission.");
      return;
    }
    await load();
  };

  const rangeSpec = RANGES.find((item) => item.id === range) ?? RANGES[0];
  const stats = useMemo(() => {
    if (!data) return null;
    const until = now || data.events[0]?.createdAt || 0;
    const since = rangeSpec.days == null ? undefined : until - rangeSpec.days * 24 * 60 * 60 * 1000;
    return summarizeDashboard(data.events, data.submissions, { since, until });
  }, [data, now, rangeSpec.days]);

  const visibleSubmissions = useMemo(() => {
    if (!data) return [];
    const until = now || data.events[0]?.createdAt || 0;
    const since = rangeSpec.days == null ? undefined : until - rangeSpec.days * 24 * 60 * 60 * 1000;
    return data.submissions.filter((item) => {
      if (since != null && item.createdAt < since) return false;
      if (filter === "all") return true;
      if (filter === "feedback") return isFeedbackKind(item.kind);
      return item.kind === filter;
    });
  }, [data, filter, now, rangeSpec.days]);

  if (!authed) {
    return (
      <main className="adminLock">
        <form onSubmit={(event) => void login(event)}>
          <p className="eyebrow"><span /> Private dashboard</p>
          <h1>Impact admin</h1>
          <p>Download clicks, feedback, testimonials, and advisor and volunteer applications. This page is not linked from the public site.</p>
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          <button className="primary" type="submit" disabled={loading}>{loading ? "Checking…" : "Open dashboard"}</button>
          {error && <p className="formHint warn">{error}</p>}
        </form>
      </main>
    );
  }

  if (!data || !stats) {
    return <main className="adminLock"><p>{error || "Loading dashboard…"}</p></main>;
  }

  const maxMonth = Math.max(1, ...stats.months.map((item) => item.count));

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <div>
          <p className="eyebrow"><span /> Grant-ready evidence</p>
          <h1>Impact dashboard</h1>
        </div>
        <div className="adminHeaderActions">
          <button type="button" className="text-button" onClick={() => downloadFile("daydock-impact-stats.csv", statsCsv(stats))}>Export stats CSV</button>
          <button type="button" className="text-button" onClick={() => downloadFile("daydock-submissions.csv", submissionsCsv(visibleSubmissions))}>Export submissions CSV</button>
          <button type="button" className="text-button" onClick={() => void logout()}>Log out</button>
        </div>
      </header>

      <div className="rangeRow">
        {RANGES.map((item) => (
          <button key={item.id} type="button" className={range === item.id ? "active" : ""} onClick={() => setRange(item.id)}>{item.label}</button>
        ))}
      </div>

      {error && <p className="formHint warn">{error}</p>}

      <section className="grantBox">
        <h2>Grant summary</h2>
        <p className="microNote">These are download clicks and website visits, not proof of install or daily use.</p>
        <ul>{grantLines(stats).map((line) => <li key={line}>{line}</li>)}</ul>
      </section>

      <section className="statGrid">
        <article><small>Download clicks</small><strong>{stats.downloadClicks}</strong></article>
        <article><small>Last 30 / 90 days</small><strong>{stats.last30} / {stats.last90}</strong></article>
        <article><small>Approx. unique downloaders</small><strong>{stats.uniqueDownloaders}</strong></article>
        <article><small>Visit → download</small><strong>{stats.conversionRate == null ? "—" : `${stats.conversionRate}%`}</strong></article>
        <article><small>Growth vs previous period</small><strong>{stats.growth == null ? "—" : `${stats.growth > 0 ? "+" : ""}${stats.growth}%`}</strong></article>
        <article><small>Feedback / stories</small><strong>{stats.feedback} / {stats.testimonials}</strong></article>
        <article><small>Advisors / volunteers</small><strong>{stats.advisors} / {stats.volunteers}</strong></article>
      </section>

      <section className="adminSplit">
        <article>
          <h2>Downloads by month</h2>
          {stats.months.length === 0 ? <p className="emptyNote">No download clicks in this period.</p> : (
            <div className="barChart">
              {stats.months.map((item) => (
                <div key={item.month}>
                  <span style={{ height: `${Math.max(8, (item.count / maxMonth) * 100)}%` }} />
                  <small>{item.month.slice(2)}</small>
                  <b>{item.count}</b>
                </div>
              ))}
            </div>
          )}
        </article>
        <article>
          <h2>Platforms</h2>
          <ul className="breakdown">{Object.entries(stats.platforms).map(([name, count]) => <li key={name}><span>{name}</span><b>{count}</b></li>)}</ul>
          <h2>Versions</h2>
          <ul className="breakdown">{Object.entries(stats.versions).map(([name, count]) => <li key={name}><span>v{name}</span><b>{count}</b></li>)}</ul>
        </article>
        <article>
          <h2>How visitors arrived</h2>
          <ul className="breakdown">{Object.entries(stats.referrers).map(([name, count]) => <li key={name}><span>{name}</span><b>{count}</b></li>)}</ul>
        </article>
      </section>

      <section>
        <div className="adminSubhead">
          <h2>Responses</h2>
          <div className="rangeRow compact">
            {FILTERS.map((item) => {
              const count = item.id === "all" ? stats.submissions
                : item.id === "feedback" ? stats.feedback
                : stats.byKind[item.id] ?? 0;
              return (
                <button key={item.id} type="button" className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>
                  {item.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
        {visibleSubmissions.length === 0 ? <p className="emptyNote">No submissions in this view.</p> : (
          <div className="submissionList">
            {visibleSubmissions.map((item) => (
              <article key={item._id}>
                <header>
                  <span className="pill">{KIND_LABELS[item.kind]}</span>
                  {item.kind === "advisor" || item.kind === "volunteer" ? null
                    : item.verified ? <span className="pill verified">Valid Daydock code</span>
                    : <span className="pill">Unverified web submission</span>}
                  {item.quotePermission && <span className="pill">Quote OK</span>}
                  {item.followUpPermission && <span className="pill">Follow-up OK</span>}
                  <select
                    value={item.status}
                    onChange={(event) => void updateStatus(item._id, event.target.value as (typeof STATUSES)[number])}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status} disabled={status === "published" && (item.kind !== "testimonial" || !item.quotePermission)}>
                        {status}
                      </option>
                    ))}
                  </select>
                </header>
                <h3>{item.title || item.displayName || (item.kind === "testimonial" ? "Anonymous story" : "Untitled")}</h3>
                {RESPONSE_FIELDS.filter(({ key }) => item[key]).map(({ key, label }) => (
                  <p key={key} className="responseField"><small>{label}</small>{item[key]}</p>
                ))}
                <p className="meta">
                  {new Date(item.createdAt).toLocaleString()}
                  {item.platform ? ` · ${item.platform}` : ""}
                  {item.appVersion ? ` · v${item.appVersion}` : ""}
                  {item.displayName ? ` · ${item.displayName}` : ""}
                  {item.displayPreference ? ` · quote as ${item.displayPreference.replace("_", " ")}` : ""}
                  {item.role ? ` · ${item.role}` : ""}
                  {item.email ? ` · ${item.email}` : ""}
                  {item.contact ? ` · ${item.contact}` : ""}
                </p>
                {item.linkedinUrl ? (
                  <p className="meta">
                    <a className="textLink" href={item.linkedinUrl} target="_blank" rel="noreferrer">
                      {item.linkedinUrl}
                    </a>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
