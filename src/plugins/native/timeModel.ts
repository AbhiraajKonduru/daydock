import {
  emptyDocumentState as emptyState,
  hasValidDocumentState,
  readDocumentState,
  withoutStateFooter,
  writeDocumentState as writeState,
  type DaydockDocumentState,
} from "../documentState";

export {
  DAYDOCK_STATE_VERSION,
  hasValidDocumentState,
  stateFooterRange,
  withoutStateFooter,
} from "../documentState";
export type { DaydockDocumentState } from "../documentState";

export type TimeBlockStatus = "ready" | "running" | "paused" | "completed";

export type TimeBlockSession = {
  started: string;
  stopped?: string;
};

export type TimeBlockState = {
  status: TimeBlockStatus;
  sessions: TimeBlockSession[];
};

export type TimeDocumentState = DaydockDocumentState & {
  timeBlocks: Record<string, TimeBlockState>;
};

export type TimeBlockAnchor = {
  id: string;
  placement: "inline" | "block";
  plannedMinutes: number;
  durationLabel: string;
  title: string;
  from: number;
  to: number;
  lineFrom: number;
  lineTo: number;
};

export type CapacityAnchor = {
  availableMinutes: number;
  durationLabel: string;
  from: number;
  to: number;
  lineFrom: number;
  lineTo: number;
};

export type TimeEntryAnchor = {
  placement: "inline" | "block";
  minutes: number;
  durationLabel: string;
  title: string;
  from: number;
  to: number;
  lineFrom: number;
  lineTo: number;
};

const DURATION_SOURCE = "(?:\\d+h(?: \\d+m)?|\\d+m)";
const INLINE_BLOCK = new RegExp(` · ⏱ (${DURATION_SOURCE}) <!--daydock:block:([A-Za-z0-9_-]+)-->\\s*$`);
const STANDALONE_BLOCK = new RegExp(`^\\s*⏱ (.+?) · (${DURATION_SOURCE}) <!--daydock:block:([A-Za-z0-9_-]+)-->\\s*$`);
const CAPACITY_BLOCK = new RegExp(`^\\s*⏳ Focus capacity · (${DURATION_SOURCE}) <!--daydock:capacity-->\\s*$`);
const INLINE_TIME_ENTRY = new RegExp(` · ◷ (${DURATION_SOURCE}) <!--daydock:time-->\\s*$`);
const STANDALONE_TIME_ENTRY = new RegExp(`^\\s*◷ (.+?) · (${DURATION_SOURCE}) <!--daydock:time-->\\s*$`);
const TASK_MARKER = /^\s*[-*+]\s+\[[ xX]\]\s*/;

export function emptyDocumentState(): TimeDocumentState {
  return { ...emptyState(), timeBlocks: {} };
}

function normalizedTimeBlock(value: unknown): TimeBlockState {
  if (!value || typeof value !== "object") return { status: "ready", sessions: [] };
  const candidate = value as Partial<TimeBlockState>;
  const status = ["ready", "running", "paused", "completed"].includes(candidate.status ?? "")
    ? candidate.status as TimeBlockStatus
    : "ready";
  const sessions = Array.isArray(candidate.sessions)
    ? candidate.sessions.flatMap((session) => {
        if (!session || typeof session !== "object") return [];
        const item = session as Partial<TimeBlockSession>;
        if (typeof item.started !== "string") return [];
        return [{
          started: item.started,
          ...(typeof item.stopped === "string" ? { stopped: item.stopped } : {}),
        }];
      })
    : [];
  return { status, sessions };
}

export function parseDocumentState(document: string): TimeDocumentState {
  const parsed = readDocumentState(document);
  const timeBlocks = parsed.timeBlocks && typeof parsed.timeBlocks === "object"
    ? Object.fromEntries(
        Object.entries(parsed.timeBlocks as Record<string, unknown>)
          .map(([id, value]) => [id, normalizedTimeBlock(value)]),
      )
    : {};
  return { ...parsed, timeBlocks };
}

export function writeDocumentState(document: string, state: TimeDocumentState): string {
  return writeState(document, state);
}

/** Replace one block's slice of state without mutating the parsed snapshot. */
export function withTimeBlockState(
  document: string,
  id: string,
  state: TimeBlockState,
): string {
  if (!hasValidDocumentState(document)) return document;
  const footer = parseDocumentState(document);
  return writeDocumentState(document, {
    ...footer,
    timeBlocks: { ...footer.timeBlocks, [id]: state },
  });
}

export function updateTimeBlockState(
  document: string,
  id: string,
  update: (state: TimeBlockState) => TimeBlockState,
): string {
  if (!hasValidDocumentState(document)) return document;
  const current = parseDocumentState(document).timeBlocks[id] ?? { status: "ready", sessions: [] };
  return withTimeBlockState(document, id, update(current));
}

export type DurationProblem = "syntax" | "too-short" | "too-long";

export type DurationReading =
  | { ok: true; minutes: number; consumed: number }
  | { ok: false; reason: DurationProblem };

export const MAX_DURATION_MINUTES = 24 * 60;

export function readDuration(input: string): DurationReading {
  const leadingSpace = input.length - input.trimStart().length;
  const trimmed = input.trimStart();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
  if (!match) return { ok: false, reason: "syntax" };
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return { ok: false, reason: "syntax" };
  const hours = match[2].toLowerCase().startsWith("h");
  let rawMinutes = amount * (hours ? 60 : 1);
  let consumed = leadingSpace + match[0].length;
  if (hours) {
    const remainder = trimmed.slice(match[0].length);
    const minuteMatch = remainder.match(/^\s+(\d+(?:\.\d+)?)\s*(minutes?|mins?|m)\b/i);
    if (minuteMatch) {
      rawMinutes += Number(minuteMatch[1]);
      consumed += minuteMatch[0].length;
    }
  }
  const minutes = Math.round(rawMinutes);
  if (minutes < 1) return { ok: false, reason: "too-short" };
  if (minutes > MAX_DURATION_MINUTES) return { ok: false, reason: "too-long" };
  return { ok: true, minutes, consumed };
}

export function parseDuration(input: string): { minutes: number; consumed: number } | null {
  const reading = readDuration(input);
  return reading.ok ? { minutes: reading.minutes, consumed: reading.consumed } : null;
}

export function durationProblemMessage(input: string, reason: DurationProblem): string {
  const quoted = input.trim();
  if (reason === "too-long") return `Focus time tops out at 24h, so "${quoted}" is too long.`;
  if (reason === "too-short") return `Focus time needs at least a minute, and "${quoted}" rounds to nothing.`;
  return `"${quoted}" is not a duration Daydock understands. Try 45m, 1h, or 1h 30m.`;
}

export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

export function createTimeBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `tb_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  }
  return `tb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

type DocumentScan = {
  blocks: TimeBlockAnchor[];
  capacities: CapacityAnchor[];
  entries: TimeEntryAnchor[];
  blockByLine: Map<number, TimeBlockAnchor>;
  capacityByLine: Map<number, CapacityAnchor>;
  entryByLine: Map<number, TimeEntryAnchor>;
};

function scanDocument(document: string): DocumentScan {
  const scan: DocumentScan = {
    blocks: [],
    capacities: [],
    entries: [],
    blockByLine: new Map(),
    capacityByLine: new Map(),
    entryByLine: new Map(),
  };

  const body = withoutStateFooter(document);
  let from = 0;
  for (const rawLine of body.split("\n")) {
    const text = rawLine.replace(/\r$/, "");
    const lineFrom = from;
    const to = from + text.length;
    from += rawLine.length + 1;

    // Only a line already carrying a marker glyph can anchor a widget, so an
    // ordinary line costs one substring scan instead of five regex passes.
    if (!text.includes("⏱") && !text.includes("⏳") && !text.includes("◷")) continue;

    const standaloneBlock = text.match(STANDALONE_BLOCK);
    if (standaloneBlock) {
      const plannedMinutes = parseDuration(standaloneBlock[2])?.minutes;
      if (plannedMinutes) {
        const anchor: TimeBlockAnchor = {
          id: standaloneBlock[3],
          placement: "block",
          plannedMinutes,
          durationLabel: formatDuration(plannedMinutes),
          title: standaloneBlock[1],
          from: lineFrom,
          to,
          lineFrom,
          lineTo: to,
        };
        scan.blocks.push(anchor);
        scan.blockByLine.set(lineFrom, anchor);
      }
    } else {
      const inlineBlock = text.match(INLINE_BLOCK);
      const plannedMinutes = inlineBlock ? parseDuration(inlineBlock[1])?.minutes : undefined;
      if (inlineBlock && inlineBlock.index !== undefined && plannedMinutes) {
        const title = text.slice(0, inlineBlock.index).replace(TASK_MARKER, "").trim();
        const anchor: TimeBlockAnchor = {
          id: inlineBlock[2],
          placement: "inline",
          plannedMinutes,
          durationLabel: formatDuration(plannedMinutes),
          title: title || "Focus block",
          from: lineFrom + inlineBlock.index,
          to,
          lineFrom,
          lineTo: to,
        };
        scan.blocks.push(anchor);
        scan.blockByLine.set(lineFrom, anchor);
      }
    }

    const standaloneEntry = text.match(STANDALONE_TIME_ENTRY);
    if (standaloneEntry) {
      const minutes = parseDuration(standaloneEntry[2])?.minutes;
      if (minutes) {
        const anchor: TimeEntryAnchor = {
          placement: "block",
          minutes,
          durationLabel: formatDuration(minutes),
          title: standaloneEntry[1],
          from: lineFrom,
          to,
          lineFrom,
          lineTo: to,
        };
        scan.entries.push(anchor);
        scan.entryByLine.set(lineFrom, anchor);
      }
    } else {
      const inlineEntry = text.match(INLINE_TIME_ENTRY);
      const minutes = inlineEntry ? parseDuration(inlineEntry[1])?.minutes : undefined;
      if (inlineEntry && inlineEntry.index !== undefined && minutes) {
        const title = text.slice(0, inlineEntry.index).replace(TASK_MARKER, "").trim();
        const anchor: TimeEntryAnchor = {
          placement: "inline",
          minutes,
          durationLabel: formatDuration(minutes),
          title: title || "Focus time",
          from: lineFrom + inlineEntry.index,
          to,
          lineFrom,
          lineTo: to,
        };
        scan.entries.push(anchor);
        scan.entryByLine.set(lineFrom, anchor);
      }
    }

    const capacity = text.match(CAPACITY_BLOCK);
    const availableMinutes = capacity ? parseDuration(capacity[1])?.minutes : undefined;
    if (capacity && availableMinutes) {
      const anchor: CapacityAnchor = {
        availableMinutes,
        durationLabel: formatDuration(availableMinutes),
        from: lineFrom,
        to,
        lineFrom,
        lineTo: to,
      };
      scan.capacities.push(anchor);
      scan.capacityByLine.set(lineFrom, anchor);
    }
  }

  return scan;
}

// Decorating a page asks every plugin about every line, so an uncached scan makes
// a single keystroke quadratic in document length. Keying a few recent revisions
// by their exact text makes repeated passes over one revision free; a new
// revision simply misses. Callers must treat the results as read-only.
const SCAN_CACHE_LIMIT = 4;
const scanCache = new Map<string, DocumentScan>();

function documentScan(document: string): DocumentScan {
  const cached = scanCache.get(document);
  if (cached) {
    scanCache.delete(document);
    scanCache.set(document, cached);
    return cached;
  }
  const scan = scanDocument(document);
  scanCache.set(document, scan);
  if (scanCache.size > SCAN_CACHE_LIMIT) {
    const oldest = scanCache.keys().next();
    if (!oldest.done) scanCache.delete(oldest.value);
  }
  return scan;
}

export function findTimeBlockAnchors(document: string): readonly TimeBlockAnchor[] {
  return documentScan(document).blocks;
}

export function findCapacityAnchors(document: string): readonly CapacityAnchor[] {
  return documentScan(document).capacities;
}

export function findTimeEntryAnchors(document: string): readonly TimeEntryAnchor[] {
  return documentScan(document).entries;
}

export function timeBlockAnchorAt(document: string, lineFrom: number): TimeBlockAnchor | undefined {
  return documentScan(document).blockByLine.get(lineFrom);
}

export function capacityAnchorAt(document: string, lineFrom: number): CapacityAnchor | undefined {
  return documentScan(document).capacityByLine.get(lineFrom);
}

export function timeEntryAnchorAt(document: string, lineFrom: number): TimeEntryAnchor | undefined {
  return documentScan(document).entryByLine.get(lineFrom);
}

export function elapsedMilliseconds(state: TimeBlockState, now = Date.now()): number {
  return state.sessions.reduce((total, session) => {
    const started = Date.parse(session.started);
    const stopped = session.stopped ? Date.parse(session.stopped) : now;
    if (!Number.isFinite(started) || !Number.isFinite(stopped)) return total;
    return total + Math.max(0, stopped - started);
  }, 0);
}

/**
 * Signed time left against the plan. A running block keeps counting past zero so
 * overtime stays visible, rather than the timer quietly completing itself out
 * from under the person still working.
 */
export function signedRemainingMilliseconds(
  state: TimeBlockState,
  plannedMinutes: number,
  now = Date.now(),
): number {
  return plannedMinutes * 60_000 - elapsedMilliseconds(state, now);
}

export function remainingMilliseconds(
  state: TimeBlockState,
  plannedMinutes: number,
  now = Date.now(),
): number {
  return Math.max(0, signedRemainingMilliseconds(state, plannedMinutes, now));
}

export function overtimeMilliseconds(
  state: TimeBlockState,
  plannedMinutes: number,
  now = Date.now(),
): number {
  return Math.max(0, -signedRemainingMilliseconds(state, plannedMinutes, now));
}

/** Minutes this block should count against capacity: planned until it is done, actual once it is. */
export function chargedMinutes(
  state: TimeBlockState | undefined,
  plannedMinutes: number,
  now = Date.now(),
): number {
  if (state?.status !== "completed") return plannedMinutes;
  return Math.round(elapsedMilliseconds(state, now) / 60_000);
}

export function runningCompletionTime(state: TimeBlockState, plannedMinutes: number): number | null {
  const open = state.sessions.at(-1);
  if (state.status !== "running" || !open || open.stopped) return null;
  const started = Date.parse(open.started);
  if (!Number.isFinite(started)) return null;
  const closedElapsed = elapsedMilliseconds({
    ...state,
    sessions: state.sessions.slice(0, -1),
  }, started);
  return started + Math.max(0, plannedMinutes * 60_000 - closedElapsed);
}

export function startTimeBlock(state: TimeBlockState, now: number): TimeBlockState {
  if (state.status === "running") return state;
  return {
    status: "running",
    sessions: [...state.sessions, { started: new Date(now).toISOString() }],
  };
}

export function pauseTimeBlock(state: TimeBlockState, now: number): TimeBlockState {
  if (state.status !== "running") return state;
  return {
    status: "paused",
    sessions: state.sessions.map((session, index) => index === state.sessions.length - 1
      ? { ...session, stopped: new Date(now).toISOString() }
      : session),
  };
}

export function completeTimeBlock(state: TimeBlockState, now: number): TimeBlockState {
  return {
    status: "completed",
    sessions: state.sessions.map((session, index) => (
      index === state.sessions.length - 1 && !session.stopped
        ? { ...session, stopped: new Date(now).toISOString() }
        : session
    )),
  };
}

export function createBlockSource(
  id: string,
  minutes: number,
  placement: "inline" | "block",
  title = "Focus block",
): string {
  const duration = formatDuration(minutes);
  return placement === "inline"
    ? ` · ⏱ ${duration} <!--daydock:block:${id}-->`
    : `⏱ ${title} · ${duration} <!--daydock:block:${id}-->`;
}

export function createCapacitySource(minutes: number): string {
  return `⏳ Focus capacity · ${formatDuration(minutes)} <!--daydock:capacity-->`;
}

export function createTimeEntrySource(
  minutes: number,
  placement: "inline" | "block",
  title = "Focus time",
): string {
  const duration = formatDuration(minutes);
  return placement === "inline"
    ? ` · ◷ ${duration} <!--daydock:time-->`
    : `◷ ${title} · ${duration} <!--daydock:time-->`;
}

/** Remove the state of blocks whose markers are no longer in the document. */
export function pruneTimeBlockState(document: string): string {
  if (!document.includes("<!-- daydock:state") || !hasValidDocumentState(document)) return document;
  const state = parseDocumentState(document);
  const live = new Set(findTimeBlockAnchors(document).map((anchor) => anchor.id));
  if (Object.keys(state.timeBlocks).every((id) => live.has(id))) return document;
  const timeBlocks = Object.fromEntries(Object.entries(state.timeBlocks).filter(([id]) => live.has(id)));
  return writeDocumentState(document, { ...state, timeBlocks });
}
