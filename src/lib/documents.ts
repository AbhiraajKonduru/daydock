import type { NotebookFile } from "../types";

const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const INVALID_FILENAME_CHARACTER = /[<>:"/\\|?*\u0000-\u001f]/;

export function documentNameIssue(value: string): string | null {
  const name = value.replace(/\.md$/i, "").trim();
  if (!name) return "Enter a document name.";
  if (INVALID_FILENAME_CHARACTER.test(name)) {
    return 'Document names cannot contain < > : " / \\ | ? or *.';
  }
  if (/[. ]$/.test(name)) return "Document names cannot end with a space or period.";
  const stem = name.replace(/\s+/g, "_");
  if (stem === "." || stem === ".." || WINDOWS_RESERVED_NAME.test(stem)) {
    return `“${name}” is reserved by Windows.`;
  }
  return null;
}

export function documentFileStem(value: string): string {
  return value.replace(/\.md$/i, "").trim().replace(/\s+/g, "_");
}

export function documentDisplayName(stem: string): string {
  return stem.replace(/_+/g, " ").trim();
}

export function documentTitle(file: NotebookFile): string {
  return documentDisplayName(file.name) || file.name;
}

export function documentPath(name: string): string {
  return `Docs/${documentFileStem(name)}.md`;
}

export function rewriteDocumentLinks(content: string, oldPath: string, newPath: string): string {
  const oldFile = oldPath.split("/").pop() || oldPath;
  const newFile = newPath.split("/").pop() || newPath;
  const oldStem = oldFile.replace(/\.md$/i, "");
  const newStem = newFile.replace(/\.md$/i, "");

  const withWikiLinks = content.replace(/\[\[([^\]]+)\]\]/g, (link, target: string) => {
    const targetStem = documentFileStem(target);
    return targetStem.toLowerCase() === oldStem.toLowerCase()
      ? `[[${documentDisplayName(newStem)}]]`
      : link;
  });

  return withWikiLinks.replace(/(\[[^\]]*\]\()([^)]+\.md)(\))/gi, (link, opening: string, target: string, closing: string) => {
    const normalizedTarget = target.replace(/\\/g, "/").replace(/^\.\//, "");
    const pointsToOldPath = normalizedTarget.toLowerCase() === oldPath.toLowerCase();
    const pointsToOldFile = !normalizedTarget.includes("/") && normalizedTarget.toLowerCase() === oldFile.toLowerCase();
    if (!pointsToOldPath && !pointsToOldFile) return link;
    return `${opening}${pointsToOldFile ? newFile : newPath}${closing}`;
  });
}
