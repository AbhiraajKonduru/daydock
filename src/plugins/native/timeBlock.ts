import type {
  DaydockPlugin,
  PluginUpdateContext,
  SlashCommandContext,
  SlashCommandOutcome,
} from "../api";
import { spliceCommandLine } from "../api";
import { pluginIcon } from "../icons";
import {
  TIMER_ELAPSED_EVENT,
  activeTimerId,
  clearTimerAlarm,
  primeCompletionSound,
  scheduleTimerAlarm,
} from "../timerAlarm";
import {
  completeTimeBlock,
  createBlockSource,
  createTimeBlockId,
  durationProblemMessage,
  elapsedMilliseconds,
  formatDuration,
  hasValidDocumentState,
  parseDocumentState,
  pauseTimeBlock,
  pruneTimeBlockState,
  readDuration,
  runningCompletionTime,
  signedRemainingMilliseconds,
  startTimeBlock,
  timeBlockAnchorAt,
  updateTimeBlockState,
  withTimeBlockState,
  type TimeBlockState,
} from "./timeModel";

const BROKEN_FOOTER = "This page's Daydock state footer is not valid JSON. Repair it before changing a timer.";

function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Past zero the countdown keeps going, shown as negative rather than stopping. */
function formatSignedClock(milliseconds: number): string {
  return milliseconds < 0 ? `-${formatClock(-milliseconds)}` : formatClock(milliseconds);
}

function blockCommand(
  context: SlashCommandContext,
  argumentsText: string,
): SlashCommandOutcome {
  const typed = argumentsText.trim();
  if (!typed) return null;
  if (!hasValidDocumentState(context.document)) return { error: BROKEN_FOOTER };

  const duration = readDuration(argumentsText);
  if (!duration.ok) return { error: durationProblemMessage(typed, duration.reason) };

  const label = argumentsText.slice(duration.consumed).trim();
  const placement = context.prefix.trimEnd() ? "inline" : "block";
  if (placement === "inline" && label) {
    return {
      error: `An inline timer takes its name from the task, so "${label}" has nowhere to go. Remove it, or put /block on its own line to name the block.`,
    };
  }

  const id = createTimeBlockId();
  const source = createBlockSource(id, duration.minutes, placement, label || "Focus block");
  const placed = spliceCommandLine(context, source, placement);
  const ready: TimeBlockState = { status: "ready", sessions: [] };
  return {
    document: withTimeBlockState(placed.document, id, ready),
    selection: placed.selection,
  };
}

function timeBlockWidget(
  id: string,
  placement: "inline" | "block",
  plannedMinutes: number,
  title: string,
  documentAtDecoration: string,
) {
  const snapshot = parseDocumentState(documentAtDecoration).timeBlocks[id]
    ?? { status: "ready" as const, sessions: [] };

  return {
    key: `time-block:${id}:${placement}:${plannedMinutes}:${snapshot.status}:${snapshot.sessions.length}`,
    placement,
    className: placement === "block"
      ? "daydock-card daydock-time-block-host"
      : "daydock-time-inline-host",
    mount(element: HTMLElement, context: PluginUpdateContext) {
      element.setAttribute("contenteditable", "false");
      element.setAttribute("role", "group");

      const icon = pluginIcon("timer");
      const titleElement = document.createElement("span");
      titleElement.className = "card-title";
      titleElement.textContent = title;
      // The live reading, followed by the plan it is measured against.
      const readout = document.createElement("span");
      readout.className = "time-block-readout";
      const time = document.createElement("span");
      time.className = "time-block-time";
      const planned = document.createElement("span");
      planned.className = "time-block-planned";
      readout.append(time, planned);
      const actions = document.createElement("span");
      actions.className = "card-actions";
      const primary = document.createElement("button");
      primary.type = "button";
      primary.className = "card-action-primary";
      const finish = document.createElement("button");
      finish.type = "button";
      finish.className = "card-action-quiet time-block-finish";
      finish.textContent = "Finish";
      actions.append(primary, finish);
      const progress = document.createElement("span");
      progress.className = "card-progress";

      if (placement === "block") element.append(icon, titleElement, readout, actions, progress);
      else element.append(icon, readout, actions, progress);

      let busy = false;

      const current = () => {
        const doc = context.getDocument();
        const anchor = timeBlockAnchorAt(doc, findLineStart(doc, id));
        const state = parseDocumentState(doc).timeBlocks[id]
          ?? { status: "ready" as const, sessions: [] };
        return { doc, anchor, state };
      };

      const setBusy = (value: boolean) => {
        busy = value;
        primary.disabled = value;
        finish.disabled = value;
      };

      const persistTransition = async (
        transition: (state: TimeBlockState) => TimeBlockState,
      ) => {
        setBusy(true);
        const saved = await context.updateDocument(
          (doc) => updateTimeBlockState(doc, id, transition),
          { durable: true },
        );
        setBusy(false);
        return saved;
      };

      const paint = () => {
        const { anchor, state } = current();
        if (!anchor) return;
        const remaining = signedRemainingMilliseconds(state, anchor.plannedMinutes);
        const elapsed = elapsedMilliseconds(state);
        const overtime = remaining < 0;
        const focused = Math.round(elapsed / 60_000);

        element.dataset.status = state.status;
        element.dataset.overtime = String(overtime && state.status !== "ready");
        progress.style.setProperty(
          "--time-progress",
          `${Math.min(100, (elapsed / (anchor.plannedMinutes * 600)) || 0)}%`,
        );
        finish.hidden = state.status === "ready" || state.status === "completed";
        // A ready block already reads as its plan; every later state shows it too.
        planned.hidden = state.status === "ready";
        planned.textContent = `/ ${anchor.durationLabel}`;

        if (state.status === "completed") {
          const over = focused - anchor.plannedMinutes;
          // The inline pill sits inside a task line, so it stays a bare duration.
          // The card has room to say what that duration means.
          time.textContent = placement === "block" && over > 0
            ? `${formatDuration(focused)} · ${formatDuration(over)} over`
            : formatDuration(focused);
          primary.textContent = "Done";
          primary.disabled = true;
          element.setAttribute(
            "aria-label",
            `${title}: finished, ${formatDuration(focused)} of a ${anchor.durationLabel} plan`,
          );
          return;
        }

        primary.disabled = busy;
        time.textContent = state.status === "ready"
          ? anchor.durationLabel
          : formatSignedClock(remaining);
        primary.textContent = state.status === "running"
          ? "Pause"
          : state.status === "paused" ? "Resume" : "Start";
        primary.setAttribute("aria-label", `${primary.textContent} ${title}`);
        element.setAttribute(
          "aria-label",
          overtime
            ? `${title}: ${formatDuration(Math.round(-remaining / 60_000))} past a ${anchor.durationLabel} block`
            : `${title}: ${anchor.durationLabel} focus block`,
        );
      };

      primary.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        const { anchor, state } = current();
        if (!anchor || state.status === "completed") return;
        if (!hasValidDocumentState(context.getDocument())) {
          context.reportError(BROKEN_FOOTER);
          return;
        }
        const now = Date.now();
        if (state.status === "running") {
          const saved = await persistTransition((latest) => pauseTimeBlock(latest, now));
          if (saved) clearTimerAlarm(id);
        } else {
          const runningInDocument = Object.entries(parseDocumentState(context.getDocument()).timeBlocks)
            .find(([candidateId, candidate]) => candidateId !== id && candidate.status === "running");
          if (runningInDocument) {
            context.reportError("Another focus block on this page is already running. Pause or finish it first.");
            return;
          }
          const otherTimer = activeTimerId(now);
          if (otherTimer && otherTimer !== id) {
            context.reportError("Another focus block is already running. Pause or finish it before starting this one.");
            return;
          }
          primeCompletionSound();
          const saved = await persistTransition((latest) => startTimeBlock(latest, now));
          if (saved) {
            const latest = current().state;
            const dueAt = runningCompletionTime(latest, anchor.plannedMinutes);
            // A block resumed after it already passed zero is in overtime: hold the
            // single-timer slot, but do not chime for a boundary already crossed.
            if (dueAt) scheduleTimerAlarm(id, dueAt, dueAt <= now);
          }
        }
        paint();
      });

      finish.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        if (!hasValidDocumentState(context.getDocument())) {
          context.reportError(BROKEN_FOOTER);
          return;
        }
        const saved = await persistTransition((state) => completeTimeBlock(state, Date.now()));
        if (saved) clearTimerAlarm(id);
        paint();
      });

      const onTimerElapsed = (event: Event) => {
        const detail = (event as CustomEvent<{ id: string }>).detail;
        // The block keeps running into overtime; repaint at once so the card
        // flips to its overtime treatment the moment the chime sounds.
        if (detail.id === id) paint();
      };
      window.addEventListener(TIMER_ELAPSED_EVENT, onTimerElapsed);
      const timer = window.setInterval(paint, 1000);
      paint();
      return () => {
        window.clearInterval(timer);
        window.removeEventListener(TIMER_ELAPSED_EVENT, onTimerElapsed);
        // A deleted block must not leave its alarm waiting to ring.
        if (findLineStart(context.getDocument(), id) < 0) clearTimerAlarm(id);
      };
    },
  } as const;
}

/** Locate this block's line in the live document, which may have moved since mount. */
function findLineStart(document: string, id: string): number {
  const marker = document.indexOf(`<!--daydock:block:${id}-->`);
  if (marker < 0) return -1;
  const lineBreak = document.lastIndexOf("\n", marker);
  return lineBreak + 1;
}

export const timeBlockPlugin: DaydockPlugin = {
  id: "daydock.time-block",
  name: "Time blocks",
  version: 1,
  commands: [{
    name: "block",
    icon: "timer",
    description: "Add a focused countdown to this line",
    usage: "/block 1h",
    run: blockCommand,
  }],
  decorateLine({ document, line }) {
    const anchor = timeBlockAnchorAt(document, line.from);
    if (!anchor) return [];
    return [{
      from: anchor.from,
      to: anchor.to,
      widget: timeBlockWidget(
        anchor.id,
        anchor.placement,
        anchor.plannedMinutes,
        anchor.title,
        document,
      ),
    }];
  },
  pruneState: pruneTimeBlockState,
};
