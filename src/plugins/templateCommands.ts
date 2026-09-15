import type { DaydockPlugin, SlashCommand, SlashCommandContext } from "./api";
import { isCommandResult } from "./api";

type TemplateInvocation = {
  command: SlashCommand;
  context: SlashCommandContext;
  argumentsText: string;
};

function commandNames(command: SlashCommand) {
  return [command.name.toLowerCase()];
}

function templateLines(document: string) {
  const lines: Array<{ from: number; to: number; text: string }> = [];
  let from = 0;
  for (const rawLine of document.split("\n")) {
    const text = rawLine.replace(/\r$/, "");
    lines.push({ from, to: from + text.length, text });
    from += rawLine.length + 1;
  }
  return lines;
}

function templateInvocation(
  document: string,
  line: ReturnType<typeof templateLines>[number],
  plugins: readonly DaydockPlugin[],
): TemplateInvocation | null {
  const match = line.text.match(/(?:^|\s)\/([a-z-]+)(?:\s+(.*))?$/i);
  if (!match || match.index === undefined) return null;
  const name = match[1].toLowerCase();
  const command = plugins
    .flatMap((plugin) => [...(plugin.commands ?? [])])
    .find((candidate) => commandNames(candidate).includes(name));
  if (!command) return null;
  const slashOffset = match.index + (match[0].startsWith("/") ? 0 : 1);
  return {
    command,
    argumentsText: match[2] ?? "",
    context: {
      document,
      lineFrom: line.from,
      lineTo: line.to,
      lineText: line.text,
      commandFrom: line.from + slashOffset,
      commandTo: line.to,
      prefix: line.text.slice(0, slashOffset),
    },
  };
}

/**
 * Resolve complete plugin directives only when a template becomes a real page.
 * Processing bottom-up keeps earlier source offsets stable as commands expand.
 * Incomplete directives deliberately remain editable prompts in the new page.
 */
export function materializeTemplateCommands(
  template: string,
  plugins: readonly DaydockPlugin[],
): string {
  let document = template;
  const lines = templateLines(template);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const invocation = templateInvocation(document, lines[index], plugins);
    if (!invocation) continue;
    // A directive the command rejects stays on the page exactly as written, so a
    // bad duration in a template surfaces as an editable prompt instead of
    // silently disappearing from every page the template generates.
    const outcome = invocation.command.run(invocation.context, invocation.argumentsText);
    if (isCommandResult(outcome)) document = outcome.document;
  }
  return document;
}
