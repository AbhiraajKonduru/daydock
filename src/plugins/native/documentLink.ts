import type { DaydockPlugin, SlashCommandContext, SlashCommandResult, SlashSuggestion } from "../api";

const MAX_SUGGESTIONS = 50;

/**
 * Filter document names by a typed query. Names starting with the query come
 * first, then names with a word starting with it, then any other substring.
 */
export function rankDocumentNames(names: readonly string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  const ranked: Array<{ name: string; rank: number }> = [];
  for (const name of new Set(names)) {
    // A closing bracket would end the wiki link early.
    if (name.includes("]")) continue;
    const haystack = name.toLowerCase();
    const index = haystack.indexOf(needle);
    if (index < 0) continue;
    const rank = index === 0 ? 0 : /[\s_-]/.test(haystack[index - 1]) ? 1 : 2;
    ranked.push({ name, rank });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map((item) => item.name);
}

function documentLinkCommand(
  context: SlashCommandContext,
  argumentsText: string,
): SlashCommandResult | null {
  const target = argumentsText.trim();
  if (!target || target.includes("]")) return null;
  const link = `[[${target}]]`;
  const document = `${context.document.slice(0, context.commandFrom)}${link}${context.document.slice(context.commandTo)}`;
  return { document, selection: context.commandFrom + link.length };
}

export const documentLinkPlugin: DaydockPlugin = {
  id: "daydock.document-link",
  name: "Document links",
  version: 1,
  commands: [{
    name: "doc",
    icon: "file",
    description: "Link to a document",
    usage: "/doc Name",
    run: documentLinkCommand,
    suggest: (query, { documents }) => {
      const suggestions: SlashSuggestion[] = rankDocumentNames(documents, query)
        .slice(0, MAX_SUGGESTIONS)
        .map((name) => ({ label: name, icon: "file", argumentsText: name }));
      const target = query.trim();
      const exists = documents.some((name) => name.toLowerCase() === target.toLowerCase());
      if (target && !exists && !target.includes("]")) {
        suggestions.push({ label: target, detail: "New document", icon: "file-plus", argumentsText: target });
      }
      return suggestions;
    },
  }],
};
