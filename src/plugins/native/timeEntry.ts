import type { DaydockPlugin, SlashCommandContext, SlashCommandOutcome } from "../api";
import { spliceCommandLine } from "../api";
import { pluginIcon } from "../icons";
import {
  createTimeEntrySource,
  durationProblemMessage,
  readDuration,
  timeEntryAnchorAt,
} from "./timeModel";

function timeEntryCommand(
  context: SlashCommandContext,
  argumentsText: string,
): SlashCommandOutcome {
  const typed = argumentsText.trim();
  if (!typed) return null;

  const duration = readDuration(argumentsText);
  if (!duration.ok) return { error: durationProblemMessage(typed, duration.reason) };

  const label = argumentsText.slice(duration.consumed).trim();
  const placement = context.prefix.trimEnd() ? "inline" : "block";
  if (placement === "inline" && label) {
    return {
      error: `Focus time on a task takes its name from the task, so "${label}" has nowhere to go. Remove it, or put /time on its own line to name it.`,
    };
  }

  const source = createTimeEntrySource(duration.minutes, placement, label || "Focus time");
  return spliceCommandLine(context, source, placement);
}

export const timeEntryPlugin: DaydockPlugin = {
  id: "daydock.time-entry",
  name: "Focus time",
  version: 1,
  commands: [{
    name: "time",
    icon: "clock",
    description: "Add focus time without starting a timer",
    usage: "/time 2h School",
    run: timeEntryCommand,
  }],
  decorateLine({ document, line }) {
    const anchor = timeEntryAnchorAt(document, line.from);
    if (!anchor) return [];
    return [{
      from: anchor.from,
      to: anchor.to,
      widget: {
        key: `time-entry:${anchor.placement}:${anchor.minutes}:${anchor.title}`,
        placement: anchor.placement,
        className: anchor.placement === "block"
          ? "daydock-card daydock-time-entry-block-host"
          : "daydock-time-entry-inline-host",
        mount(element) {
          element.setAttribute("contenteditable", "false");
          element.setAttribute("aria-label", `${anchor.title}: ${anchor.durationLabel} of focus time`);
          const duration = globalThis.document.createElement("strong");
          duration.className = "card-value";
          duration.textContent = anchor.durationLabel;
          if (anchor.placement === "block") {
            const title = globalThis.document.createElement("span");
            title.className = "card-title";
            title.textContent = anchor.title;
            element.append(pluginIcon("clock"), title, duration);
          } else {
            element.append(pluginIcon("clock"), duration);
          }
        },
      },
    }];
  },
};
