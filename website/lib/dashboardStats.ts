export type AnalyticsEvent = {
  kind: "page_view" | "download";
  visitorHash: string;
  platform?: "windows" | "macos" | "linux";
  version?: string;
  referrer?: string;
  createdAt: number;
};

export type SubmissionRecord = {
  _id: string;
  kind: "testimonial" | "bug" | "feature" | "improvement" | "general" | "advisor" | "volunteer";
  status: "new" | "reviewing" | "planned" | "resolved" | "published" | "rejected";
  title?: string;
  message?: string;
  useCase?: string;
  problem?: string;
  outcome?: string;
  recommendation?: string;
  displayPreference?: "anonymous" | "first_name" | "full_name";
  displayName?: string;
  role?: string;
  email?: string;
  linkedinUrl?: string;
  contact?: string;
  quotePermission: boolean;
  followUpPermission: boolean;
  verified: boolean;
  platform?: string;
  appVersion?: string;
  createdAt: number;
  updatedAt: number;
};

export type DashboardRange = {
  since?: number;
  until?: number;
};

const DAY = 24 * 60 * 60 * 1000;

function inRange(value: number, range: DashboardRange): boolean {
  if (range.since != null && value < range.since) return false;
  if (range.until != null && value > range.until) return false;
  return true;
}

function monthKey(value: number): string {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function countBy(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return counts;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function summarizeDashboard(
  events: AnalyticsEvent[],
  submissions: SubmissionRecord[],
  range: DashboardRange = {},
) {
  const until = range.until ?? Date.now();
  const since = range.since;
  const filteredEvents = events.filter((event) => inRange(event.createdAt, { since, until }));
  const filteredSubmissions = submissions.filter((item) => inRange(item.createdAt, { since, until }));
  const downloads = filteredEvents.filter((event) => event.kind === "download");
  const views = filteredEvents.filter((event) => event.kind === "page_view");
  const uniqueDownloaders = new Set(downloads.map((event) => event.visitorHash));
  const uniqueVisitors = new Set(views.map((event) => event.visitorHash));
  const converted = [...uniqueDownloaders].filter((id) => uniqueVisitors.has(id)).length;
  const last30 = events.filter((event) => event.kind === "download" && event.createdAt >= until - 30 * DAY && event.createdAt <= until).length;
  const last90 = events.filter((event) => event.kind === "download" && event.createdAt >= until - 90 * DAY && event.createdAt <= until).length;
  const prior30 = events.filter((event) => event.kind === "download" && event.createdAt >= until - 60 * DAY && event.createdAt < until - 30 * DAY).length;
  const previousDownloads = since != null
    ? events.filter((event) => (
      event.kind === "download"
      && event.createdAt >= since - (until - since)
      && event.createdAt < since
    )).length
    : prior30;

  const months = new Map<string, number>();
  for (const event of downloads) {
    const key = monthKey(event.createdAt);
    months.set(key, (months.get(key) ?? 0) + 1);
  }

  const testimonials = filteredSubmissions.filter((item) => item.kind === "testimonial");
  const growthCurrent = since != null ? downloads.length : last30;
  const growth = percentChange(growthCurrent, previousDownloads);

  return {
    downloadClicks: downloads.length,
    uniqueDownloaders: uniqueDownloaders.size,
    pageViews: views.length,
    uniqueVisitors: uniqueVisitors.size,
    conversionRate: uniqueVisitors.size === 0 ? null : Math.round((converted / uniqueVisitors.size) * 1000) / 10,
    last30,
    last90,
    growth,
    previousDownloadClicks: previousDownloads,
    platforms: countBy(downloads.map((event) => event.platform || "unknown")),
    versions: countBy(downloads.map((event) => event.version || "unknown")),
    referrers: countBy(views.map((event) => event.referrer || "direct")),
    months: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
    submissions: filteredSubmissions.length,
    testimonials: testimonials.length,
    publishedTestimonials: testimonials.filter((item) => item.status === "published").length,
    verifiedSubmissions: filteredSubmissions.filter((item) => item.verified).length,
    quotePermission: testimonials.filter((item) => item.quotePermission).length,
    byKind: countBy(filteredSubmissions.map((item) => item.kind)),
    byStatus: countBy(filteredSubmissions.map((item) => item.status)),
  };
}

export function grantLines(stats: ReturnType<typeof summarizeDashboard>): string[] {
  const platforms = Object.keys(stats.platforms).filter((name) => name !== "unknown").length;
  return [
    `${stats.downloadClicks} download click${stats.downloadClicks === 1 ? "" : "s"} in this period`,
    `${stats.last30} in the last 30 days · ${stats.last90} in the last 90 days`,
    stats.growth == null ? "Growth needs a previous period with downloads for comparison" : `${stats.growth > 0 ? "+" : ""}${stats.growth}% vs the previous period`,
    `Approximate unique downloaders: ${stats.uniqueDownloaders}`,
    platforms > 0 ? `Download clicks from ${platforms} operating system${platforms === 1 ? "" : "s"}` : "No platform breakdown yet",
    `${stats.submissions} feedback submission${stats.submissions === 1 ? "" : "s"}`,
    `${stats.testimonials} impact stor${stats.testimonials === 1 ? "y" : "ies"}`,
    stats.conversionRate == null ? "Conversion rate needs website visits in this period" : `${stats.conversionRate}% of tracked visitors clicked a download`,
  ];
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}

export function statsCsv(stats: ReturnType<typeof summarizeDashboard>): string {
  const rows: Array<Array<string | number | boolean | null | undefined>> = [
    ["Metric", "Value"],
    ["Download clicks", stats.downloadClicks],
    ["Last 30 days", stats.last30],
    ["Last 90 days", stats.last90],
    ["Approximate unique downloaders", stats.uniqueDownloaders],
    ["Website visits", stats.pageViews],
    ["Approximate unique visitors", stats.uniqueVisitors],
    ["Visit to download conversion %", stats.conversionRate ?? ""],
    ["Growth % vs previous period", stats.growth ?? ""],
    ["Feedback submissions", stats.submissions],
    ["Impact stories", stats.testimonials],
    ["Published testimonials", stats.publishedTestimonials],
    ["Submitted with a valid Daydock code", stats.verifiedSubmissions],
  ];
  for (const [platform, count] of Object.entries(stats.platforms)) rows.push([`Downloads · ${platform}`, count]);
  for (const [version, count] of Object.entries(stats.versions)) rows.push([`Downloads · v${version}`, count]);
  for (const [referrer, count] of Object.entries(stats.referrers)) rows.push([`Visits from ${referrer}`, count]);
  for (const month of stats.months) rows.push([`Downloads · ${month.month}`, month.count]);
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function submissionsCsv(records: SubmissionRecord[]): string {
  const header = [
    "createdAt", "kind", "status", "verified", "quotePermission", "displayName", "role",
    "platform", "appVersion", "title", "message", "useCase", "problem", "outcome", "recommendation", "email",
  ];
  const rows = records.map((record) => [
    new Date(record.createdAt).toISOString(),
    record.kind,
    record.status,
    record.verified,
    record.quotePermission,
    record.displayName,
    record.role,
    record.platform,
    record.appVersion,
    record.title,
    record.message,
    record.useCase,
    record.problem,
    record.outcome,
    record.recommendation,
    record.email,
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}
