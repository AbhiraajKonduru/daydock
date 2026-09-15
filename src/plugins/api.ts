import type { EditorView } from "@codemirror/view";
import type { PluginIconName } from "./icons";

export type PluginPlacement = "inline" | "block";

export type PluginUpdateContext = {
  getDocument: () => string;
  updateDocument: (
    update: (document: string) => string,
    options?: { durable?: boolean },
  ) => Promise<boolean>;
  reportError: (message: string) => void;
};

export type PluginWidgetSpec = {
  key: string;
  placement: PluginPlacement;
  className: string;
  mount: (element: HTMLElement, context: PluginUpdateContext) => void | (() => void);
};

export type PluginDecoration = {
  from: number;
  to: number;
  widget: PluginWidgetSpec;
};

export type PluginLineContext = {
  document: string;
  line: {
    from: number;
    to: number;
    number: number;
    text: string;
  };
};

export type SlashCommandContext = {
  document: string;
  lineFrom: number;
  lineTo: number;
  lineText: string;
  commandFrom: number;
  commandTo: number;
  prefix: string;
};

export type SlashCommandResult = {
  document: string;
  selection: number;
};

/**
 * A command that understood the request but cannot honour it. The host keeps
 * what the person typed and shows the message, so a typo is never answered by
 * silently deleting the arguments.
 */
export type SlashCommandFailure = {
  error: string;
};

/** `null` means "nothing to apply yet" - a bare command that should stay a prompt. */
export type SlashCommandOutcome = SlashCommandResult | SlashCommandFailure | null;

export function isCommandFailure(outcome: SlashCommandOutcome): outcome is SlashCommandFailure {
  return Boolean(outcome && "error" in outcome);
}

export function isCommandResult(outcome: SlashCommandOutcome): outcome is SlashCommandResult {
  return Boolean(outcome && "document" in outcome);
}

/** Icons the slash menu can draw, from the shared plugin icon family. */
export type SlashIcon = PluginIconName;

/** One argument value a command offers while its arguments are being typed. */
export type SlashSuggestion = {
  label: string;
  detail?: string;
  icon?: SlashIcon;
  argumentsText: string;
};

export type SlashSuggestContext = {
  documents: readonly string[];
};

export type SlashCommand = {
  name: string;
  icon?: SlashIcon;
  description: string;
  usage: string;
  run: (context: SlashCommandContext, argumentsText: string) => SlashCommandOutcome;
  /** Offer argument values once the command name is complete. */
  suggest?: (
    argumentsText: string,
    context: SlashSuggestContext,
  ) => readonly SlashSuggestion[];
};

export type DaydockPlugin = {
  id: string;
  name: string;
  version: number;
  commands?: readonly SlashCommand[];
  decorateLine?: (context: PluginLineContext) => readonly PluginDecoration[];
  /**
   * Drop state the document no longer references, such as a deleted timer's
   * sessions. It runs inside the edit that removed the marker, so undo restores both.
   */
  pruneState?: (document: string) => string;
};

export type PluginEditorHost = {
  plugins: readonly DaydockPlugin[];
  mode?: "document" | "template";
  requestSave: () => Promise<boolean>;
  reportError: (message: string) => void;
  /** Names of the notebook's documents, for commands that suggest them. */
  documents?: () => readonly string[];
};

/** Leading whitespace of the line the command was typed on. */
function lineIndent(prefix: string): string {
  return prefix.slice(0, prefix.length - prefix.trimStart().length);
}

/**
 * Replace just the command itself, never the rest of the line. Commands used to
 * splice from line start to line end, which meant typing `/block 1h` with the
 * cursor mid-line silently deleted everything after it.
 *
 * An inline marker keeps the trailing text where it was. A standalone marker
 * owns its whole line, so any trailing text moves down to a line of its own
 * rather than being swallowed by the widget.
 */
export function spliceCommandLine(
  context: SlashCommandContext,
  source: string,
  placement: PluginPlacement,
): SlashCommandResult {
  const prefix = context.prefix.trimEnd();
  const suffix = context.document.slice(context.commandTo, context.lineTo);
  const head = context.document.slice(0, context.lineFrom);
  const tail = context.document.slice(context.lineTo);

  if (placement === "inline") {
    const line = `${prefix}${source}${suffix}`;
    return {
      document: `${head}${line}${tail}`,
      selection: context.lineFrom + prefix.length + source.length,
    };
  }

  const indent = lineIndent(context.prefix);
  const trailing = suffix.trim();
  const line = trailing
    ? `${indent}${source}\n${indent}${trailing}`
    : `${indent}${source}`;
  return {
    document: `${head}${line}${tail}`,
    selection: context.lineFrom + indent.length + source.length,
  };
}

/** The smallest single replacement that turns one document into another. */
export function minimalChange(previous: string, next: string): { from: number; to: number; insert: string } {
  let prefix = 0;
  const prefixLimit = Math.min(previous.length, next.length);
  while (prefix < prefixLimit && previous[prefix] === next[prefix]) prefix += 1;

  let suffix = 0;
  const suffixLimit = Math.min(previous.length - prefix, next.length - prefix);
  while (
    suffix < suffixLimit
    && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return { from: prefix, to: previous.length - suffix, insert: next.slice(prefix, next.length - suffix) };
}

export function replaceEditorDocument(
  view: EditorView,
  nextDocument: string,
  selection?: number,
) {
  const previous = view.state.doc.toString();
  if (previous === nextDocument) return;
  view.dispatch({
    changes: minimalChange(previous, nextDocument),
    selection: selection === undefined
      ? undefined
      : { anchor: Math.max(0, Math.min(selection, nextDocument.length)) },
  });
}
