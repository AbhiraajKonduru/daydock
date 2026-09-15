import type { DaydockPlugin, SlashCommandContext, SlashCommandOutcome } from "../api";
import { spliceCommandLine } from "../api";
import { pluginIcon } from "../icons";
import {
  capacityAnchorAt,
  chargedMinutes,
  createCapacitySource,
  durationProblemMessage,
  elapsedMilliseconds,
  findCapacityAnchors,
  findTimeBlockAnchors,
  findTimeEntryAnchors,
  formatDuration,
  parseDocumentState,
  readDuration,
} from "./timeModel";

function capacityCommand(
  context: SlashCommandContext,
  argumentsText: string,
): SlashCommandOutcome {
  const typed = argumentsText.trim();
  if (!typed) return null;
  if (context.prefix.trim()) {
    return { error: "/capacity needs a line of its own, because it measures the whole page." };
  }

  const duration = readDuration(argumentsText);
  if (!duration.ok) return { error: durationProblemMessage(typed, duration.reason) };

  const remainder = argumentsText.slice(duration.consumed).trim();
  if (remainder) {
    return { error: `/capacity takes only a duration, so "${remainder}" has nowhere to go.` };
  }

  const placed = spliceCommandLine(context, createCapacitySource(duration.minutes), "block");

  // One capacity marker per page: re-running the command moves the existing one
  // here rather than leaving two disagreeing totals behind. Removing from the
  // bottom up keeps the offsets of earlier markers, and the caret, correct.
  let document = placed.document;
  let selection = placed.selection;
  const stale = findCapacityAnchors(document)
    .filter((anchor) => anchor.lineFrom !== context.lineFrom)
    .slice()
    .sort((left, right) => right.lineFrom - left.lineFrom);
  for (const anchor of stale) {
    const end = Math.min(document.length, anchor.lineTo + 1);
    document = document.slice(0, anchor.lineFrom) + document.slice(end);
    if (anchor.lineFrom < selection) selection -= end - anchor.lineFrom;
  }

  return { document, selection: Math.max(0, selection) };
}

export type CapacityBreakdown = {
  /** Everything scheduled: every block's plan plus static focus time. */
  plannedMinutes: number;
  /** Time actually tracked on blocks so far, including a block still running. */
  doneMinutes: number;
  /**
   * Where the page is heading. A finished block counts what it took; an
   * unfinished one counts its plan, or more once it has run past it.
   */
  projectedMinutes: number;
};

export function capacityBreakdown(document: string, now = Date.now()): CapacityBreakdown {
  const timeBlocks = parseDocumentState(document).timeBlocks;
  // Static focus time has no timer to run, so it counts as planned and done at once.
  const entered = findTimeEntryAnchors(document).reduce((total, entry) => total + entry.minutes, 0);
  let plannedMinutes = entered;
  let projectedMinutes = entered;
  let doneMilliseconds = entered * 60_000;
  for (const block of findTimeBlockAnchors(document)) {
    const state = timeBlocks[block.id];
    const elapsed = state ? elapsedMilliseconds(state, now) : 0;
    const charged = chargedMinutes(state, block.plannedMinutes, now);
    plannedMinutes += block.plannedMinutes;
    doneMilliseconds += elapsed;
    projectedMinutes += state?.status === "completed"
      ? charged
      : Math.max(charged, Math.round(elapsed / 60_000));
  }
  return { plannedMinutes, doneMinutes: Math.round(doneMilliseconds / 60_000), projectedMinutes };
}

/** What the page is expected to spend against its capacity. */
export function allocatedFocusMinutes(document: string, now = Date.now()): number {
  return capacityBreakdown(document, now).projectedMinutes;
}

function element(tag: string, className: string, text = "") {
  const node = globalThis.document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

export const capacityPlugin: DaydockPlugin = {
  id: "daydock.capacity",
  name: "Focus capacity",
  version: 1,
  commands: [{
    name: "capacity",
    icon: "gauge",
    description: "Set the focus time available on this page",
    usage: "/capacity 4h",
    run: capacityCommand,
  }],
  decorateLine({ document, line }) {
    const capacity = capacityAnchorAt(document, line.from);
    if (!capacity) return [];
    const snapshot = capacityBreakdown(document);

    return [{
      from: capacity.from,
      to: capacity.to,
      widget: {
        key: `capacity:${capacity.availableMinutes}:${snapshot.plannedMinutes}:${snapshot.projectedMinutes}`,
        placement: "block",
        className: "daydock-card daydock-capacity-host",
        mount(host, context) {
          host.setAttribute("contenteditable", "false");

          const meter = element("span", "capacity-meter");
          const projectedBar = element("span", "capacity-projected");
          const doneBar = element("span", "capacity-done");
          meter.append(projectedBar, doneBar);

          const stats = element("span", "capacity-stats");
          const stat = (kind: string, label: string) => {
            const name = element("small", "", label);
            const value = element("strong", "");
            const wrapper = element("span", `capacity-stat ${kind}`);
            wrapper.append(name, value);
            stats.append(wrapper);
            return { name, value };
          };
          const done = stat("done", "Done");
          const planned = stat("planned", "Planned");
          const left = stat("left", "Left");
          const drift = element("small", "capacity-drift");

          host.append(
            pluginIcon("gauge"),
            element("span", "card-title", "Focus capacity"),
            element("span", "capacity-total", `${capacity.durationLabel} available`),
            meter,
            stats,
            drift,
          );

          const share = (minutes: number) => capacity.availableMinutes > 0
            ? `${Math.min(100, (minutes / capacity.availableMinutes) * 100)}%`
            : "0%";

          // Repaints every second so a running block's tracked time stays live.
          const paint = () => {
            const totals = capacityBreakdown(context.getDocument());
            const remaining = capacity.availableMinutes - totals.projectedMinutes;
            const over = remaining < 0;
            const difference = totals.projectedMinutes - totals.plannedMinutes;

            host.dataset.over = String(over);
            projectedBar.style.width = share(totals.projectedMinutes);
            doneBar.style.width = share(totals.doneMinutes);
            done.value.textContent = formatDuration(totals.doneMinutes);
            planned.value.textContent = formatDuration(totals.plannedMinutes);
            left.name.textContent = over ? "Over" : "Left";
            left.value.textContent = formatDuration(Math.abs(remaining));
            drift.hidden = difference === 0;
            drift.dataset.direction = difference > 0 ? "over" : "under";
            drift.textContent = `${formatDuration(Math.abs(difference))} ${difference > 0 ? "over" : "under"} plan`;
            host.setAttribute(
              "aria-label",
              `Focus capacity: ${formatDuration(totals.doneMinutes)} done, ${formatDuration(totals.plannedMinutes)} planned, `
                + `${formatDuration(Math.abs(remaining))} ${over ? "over" : "left"} of ${capacity.durationLabel}`,
            );
          };

          paint();
          const timer = window.setInterval(paint, 1000);
          return () => window.clearInterval(timer);
        },
      },
    }];
  },
};
