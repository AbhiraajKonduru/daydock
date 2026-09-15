// Durable plugin state lives in a hidden HTML comment at the end of the page.
// The editor host owns this envelope; each plugin owns the shape of the values
// it stores inside it. Nothing here knows what a timer or a capacity target is.

export const DAYDOCK_STATE_VERSION = 1;

export type DaydockDocumentState = {
  version: number;
  [key: string]: unknown;
};

const STATE_FOOTER = /(?:\r?\n)*<!-- daydock:state\r?\n([\s\S]*?)\r?\n-->\s*$/;

export function emptyDocumentState(): DaydockDocumentState {
  return { version: DAYDOCK_STATE_VERSION };
}

/**
 * A footer we cannot parse belongs to someone else, or has been damaged by an
 * external edit. Callers must refuse to rewrite the document in that case.
 */
export function hasValidDocumentState(document: string): boolean {
  const match = document.match(STATE_FOOTER);
  if (!match) return true;
  try {
    const parsed = JSON.parse(match[1]);
    return Boolean(parsed && typeof parsed === "object");
  } catch {
    return false;
  }
}

export function readDocumentState(document: string): DaydockDocumentState {
  const match = document.match(STATE_FOOTER);
  if (!match) return emptyDocumentState();
  try {
    const parsed = JSON.parse(match[1]) as Partial<DaydockDocumentState>;
    if (!parsed || typeof parsed !== "object") return emptyDocumentState();
    return {
      ...parsed,
      version: typeof parsed.version === "number" ? parsed.version : DAYDOCK_STATE_VERSION,
    };
  } catch {
    return emptyDocumentState();
  }
}

export function withoutStateFooter(document: string): string {
  return document.replace(STATE_FOOTER, "").trimEnd();
}

export function stateFooterRange(document: string): { from: number; to: number } | null {
  const match = STATE_FOOTER.exec(document);
  if (!match || match.index === undefined) return null;
  let from = match.index;
  while (from < document.length && (document[from] === "\n" || document[from] === "\r")) from += 1;
  return { from, to: document.length };
}

/**
 * A footer is only worth writing when some plugin actually stored something.
 * Emptiness is judged across every key, so one plugin clearing its own slice
 * never discards state another plugin is still relying on.
 */
function carriesState(state: DaydockDocumentState): boolean {
  return Object.entries(state).some(([key, value]) => {
    if (key === "version" || value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value as object).length > 0;
    return true;
  });
}

export function writeDocumentState(document: string, state: DaydockDocumentState): string {
  const body = withoutStateFooter(document);
  if (!carriesState(state)) return `${body}\n`;
  return `${body}\n\n<!-- daydock:state\n${JSON.stringify(state, null, 2)}\n-->\n`;
}
