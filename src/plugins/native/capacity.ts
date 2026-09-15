import type { DaydockPlugin, SlashCommandContext, SlashCommandOutcome } from "../api";
import { spliceCommandLine } from "../api";
import { pluginIcon } from "../icons";
import {
  capacityAnchorAt,
  chargedMinutes,
  createCapacitySource,
  durationProblemMessage,
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

/**
 * What the page has spent against its capacity. A block still in progress is
 * charged what it planned; a finished one is charged what it actually took, so
 * a 1h block closed after 20m stops reading as a lost hour.
 */
export function allocatedFocusMinutes(document: string, now = Date.now()): number {
  const timeBlocks = parseDocumentState(document).timeBlocks;
  const blockMinutes = findTimeBlockAnchors(document).reduce(
    (total, block) => total + chargedMinutes(timeBlocks[block.id], block.plannedMinutes, now),
    0,
  );
  const enteredMinutes = findTimeEntryAnchors(document).reduce(
    (total, entry) => total + entry.minutes,
    0,
  );
  return blockMinutes + enteredMinutes;
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
    const allocatedMinutes = allocatedFocusMinutes(document);
    const remaining = capacity.availableMinutes - allocatedMinutes;
    const over = remaining < 0;
    const filled = capacity.availableMinutes > 0
      ? Math.min(100, (allocatedMinutes / capacity.availableMinutes) * 100)
      : 0;

    return [{
      from: capacity.from,
      to: capacity.to,
      widget: {
        key: `capacity:${capacity.availableMinutes}:${allocatedMinutes}`,
        placement: "block",
        className: "daydock-card daydock-capacity-host",
        mount(element) {
          element.setAttribute("contenteditable", "false");
          element.dataset.over = String(over);
          element.setAttribute(
            "aria-label",
            over
              ? `Focus capacity: ${formatDuration(Math.abs(remaining))} over ${capacity.durationLabel}`
              : `Focus capacity: ${formatDuration(remaining)} of ${capacity.durationLabel} still free`,
          );

          const title = globalThis.document.createElement("span");
          title.className = "card-title";
          title.textContent = "Focus capacity";

          const total = globalThis.document.createElement("span");
          total.className = "capacity-total";
          total.textContent = `${formatDuration(allocatedMinutes)} of ${capacity.durationLabel}`;

          const meter = globalThis.document.createElement("span");
          meter.className = "capacity-meter";
          meter.style.setProperty("--capacity-fill", `${filled}%`);

          const status = globalThis.document.createElement("small");
          status.className = "capacity-status";
          status.textContent = over
            ? `${formatDuration(Math.abs(remaining))} over capacity`
            : `${formatDuration(remaining)} still free`;

          element.append(pluginIcon("gauge"), title, total, meter, status);
        },
      },
    }];
  },
};
