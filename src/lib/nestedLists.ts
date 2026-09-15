import { Prec, StateEffect, StateField, type EditorState, type Extension, type Text } from "@codemirror/state";
import { Decoration, EditorView, keymap, WidgetType, type DecorationSet } from "@codemirror/view";
import { codeMirrorShortcut } from "./shortcuts";

export type MarkdownListItem = {
  line: number;
  endLine: number;
  indent: number;
  depth: number;
  block: number;
  parentLine: number | null;
  marker: "bullet" | "number";
  task: boolean;
  checked: boolean;
  descendants: number;
  completedTasks: number;
};

export type MarkdownListTree = {
  items: MarkdownListItem[];
  byLine: Map<number, MarkdownListItem>;
};

export type ScopedListMove = {
  fromLine: number;
  toLine: number;
  targetLine: number;
  targetItemLine: number;
  after: boolean;
  depth: number;
  descendants: number;
  scopeLabel: string;
};

const listMarker = /^([ \t]*)(?:([-+*])|(\d+[.)]))[ \t]+(?:\[([ xX])\](?:[ \t]+|$))?/;

/** One nesting level of indentation. The stylesheet draws its guide on the same step. */
const INDENT_STEP = 24;

/** Rendered width of each marker widget, used for the hanging indent of wrapped text. */
const MARKER_WIDTHS = { task: 23, number: 27, bullet: 16 };

function indentation(value: string): number {
  let column = 0;
  for (const character of value) column += character === "\t" ? 4 - (column % 4) : 1;
  return column;
}

function leadingIndent(value: string): number {
  return indentation(value.match(/^[ \t]*/)?.[0] ?? "");
}

function markerWidth(item: MarkdownListItem): number {
  if (item.task) return MARKER_WIDTHS.task;
  return item.marker === "number" ? MARKER_WIDTHS.number : MARKER_WIDTHS.bullet;
}

/** Parse adjacent Markdown bullet, numbered, and checklist items as one mixed tree. */
export function parseMarkdownListTree(document: string, maximumLine?: number): MarkdownListTree {
  const lines = document.split(/\r?\n/);
  const limit = Math.max(0, Math.min(maximumLine ?? lines.length, lines.length));
  const items: MarkdownListItem[] = [];
  const stack: MarkdownListItem[] = [];
  const blockEnds = new Map<number, number>();
  let block = 0;
  let activeBlock = false;

  for (let index = 0; index < limit; index += 1) {
    const text = lines[index];
    const match = text.match(listMarker);
    if (!match) {
      if (activeBlock && text.trim() && leadingIndent(text) <= (stack[0]?.indent ?? 0)) {
        blockEnds.set(block, index);
        activeBlock = false;
        stack.length = 0;
      }
      continue;
    }

    if (!activeBlock) {
      block += 1;
      activeBlock = true;
      stack.length = 0;
    }

    const indent = indentation(match[1]);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1] ?? null;
    const item: MarkdownListItem = {
      line: index + 1,
      endLine: index + 1,
      indent,
      depth: parent ? parent.depth + 1 : 0,
      block,
      parentLine: parent?.line ?? null,
      marker: match[2] ? "bullet" : "number",
      task: match[4] !== undefined,
      checked: match[4]?.toLowerCase() === "x",
      descendants: 0,
      completedTasks: 0,
    };
    items.push(item);
    stack.push(item);
  }

  if (activeBlock) blockEnds.set(block, limit);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const boundary = items.slice(index + 1).find((candidate) =>
      candidate.block !== item.block || candidate.indent <= item.indent,
    );
    let endLine = boundary?.block === item.block
      ? boundary.line - 1
      : blockEnds.get(item.block) ?? limit;
    // Blank spacing below an item belongs to the list, not to the item, so it
    // stays behind when the item is dragged somewhere else.
    while (endLine > item.line && !(lines[endLine - 1] ?? "").trim()) endLine -= 1;
    item.endLine = endLine;
    const descendants = items.filter((candidate) =>
      candidate.block === item.block && candidate.line > item.line && candidate.line <= item.endLine,
    );
    item.descendants = descendants.length;
    item.completedTasks = descendants.filter((candidate) => candidate.task && candidate.checked).length;
  }

  return { items, byLine: new Map(items.map((item) => [item.line, item])) };
}

export function listItemContainingLine(tree: MarkdownListTree, line: number): MarkdownListItem | null {
  return tree.byLine.get(line)
    ?? [...tree.items].reverse().find((item) => line >= item.line && line <= item.endLine)
    ?? null;
}

/** Resolve a drop to the nearest legal sibling boundary without allowing re-parenting. */
export function scopedListMove(
  document: string,
  sourceLine: number,
  hoveredLine: number,
  hoveredAfter: boolean,
  maximumLine?: number,
): ScopedListMove | null {
  const tree = parseMarkdownListTree(document, maximumLine);
  const source = tree.byLine.get(sourceLine);
  if (!source) return null;
  if (hoveredLine >= source.line && hoveredLine <= source.endLine) return null;
  const siblings = tree.items.filter((item) =>
    item.block === source.block && item.parentLine === source.parentLine,
  );
  if (siblings.length < 2) return null;

  const candidates = siblings.filter((item) => item.line !== source.line);
  let target = candidates.find((item) => hoveredLine >= item.line && hoveredLine <= item.endLine);
  let after = hoveredAfter;
  if (!target) {
    if (hoveredLine < candidates[0].line) {
      target = candidates[0];
      after = false;
    } else {
      target = candidates[candidates.length - 1];
      after = true;
    }
  } else if (hoveredLine > target.line) {
    // Once the pointer is over a target's descendants, the only unambiguous
    // sibling boundary is after that complete subtree.
    after = true;
  }

  const parent = source.parentLine === null ? null : tree.byLine.get(source.parentLine);
  return {
    fromLine: source.line,
    toLine: source.endLine,
    targetLine: after ? target.endLine : target.line,
    targetItemLine: target.line,
    after,
    depth: source.depth,
    descendants: source.descendants,
    scopeLabel: parent ? `inside “${lineText(document, parent.line)}”` : "at the top level",
  };
}

/**
 * Resolve a drop anywhere on the page. A top-level item is a block like any
 * other line, so it may leave its list; it lands whole beside another top-level
 * block, never inside one. Nested items keep their sibling scope, so dragging
 * never silently re-parents them.
 */
export function pageListMove(
  document: string,
  sourceLine: number,
  hoveredLine: number,
  hoveredAfter: boolean,
  maximumLine?: number,
): ScopedListMove | null {
  const tree = parseMarkdownListTree(document, maximumLine);
  const source = tree.byLine.get(sourceLine);
  if (!source) return null;
  if (source.parentLine !== null) return scopedListMove(document, sourceLine, hoveredLine, hoveredAfter, maximumLine);
  if (hoveredLine >= source.line && hoveredLine <= source.endLine) return null;

  const root = tree.items.find((item) =>
    item.parentLine === null && hoveredLine >= item.line && hoveredLine <= item.endLine,
  );
  const after = root && hoveredLine > root.line ? true : hoveredAfter;
  return {
    fromLine: source.line,
    toLine: source.endLine,
    targetLine: root ? (after ? root.endLine : root.line) : hoveredLine,
    targetItemLine: root?.line ?? hoveredLine,
    after,
    depth: source.depth,
    descendants: source.descendants,
    scopeLabel: "on the page",
  };
}

function lineText(document: string, lineNumber: number): string {
  const text = document.split(/\r?\n/)[lineNumber - 1] ?? "this item";
  return text.replace(listMarker, "").trim() || "this item";
}

type CollapsedLists = {
  anchors: Set<number>;
  hidden: Set<number>;
  decorations: DecorationSet;
};

const setListCollapsed = StateEffect.define<{ line: number; collapsed: boolean }>();
const setAllListsCollapsed = StateEffect.define<boolean>();
const setCollapsedLines = StateEffect.define<number[]>();

/** Re-anchor collapsed items to new line numbers inside the transaction that moves them. */
export function collapsedLinesEffect(lines: number[]): StateEffect<number[]> {
  return setCollapsedLines.of(lines);
}

class ListIndentWidget extends WidgetType {
  constructor(readonly depth: number) {
    super();
  }

  eq(other: ListIndentWidget) {
    return other.depth === this.depth;
  }

  toDOM() {
    const indent = document.createElement("span");
    indent.className = "notebook-list-indent";
    indent.style.width = `${this.depth * INDENT_STEP}px`;
    return indent;
  }

  ignoreEvent() {
    return true;
  }
}

class CollapsedSummaryWidget extends WidgetType {
  constructor(readonly line: number, readonly descendants: number, readonly completed: number) {
    super();
  }

  eq(other: CollapsedSummaryWidget) {
    return other.line === this.line
      && other.descendants === this.descendants
      && other.completed === this.completed;
  }

  toDOM(view: EditorView) {
    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "notebook-collapsed-summary";
    summary.textContent = `${this.descendants} hidden${this.completed ? ` · ${this.completed} done` : ""}`;
    summary.title = "Show nested items";
    summary.setAttribute("aria-label", `Show ${this.descendants} nested items`);
    summary.addEventListener("mousedown", (event) => event.preventDefault());
    summary.addEventListener("click", () => setListAtLineCollapsed(view, this.line, false));
    return summary;
  }

  ignoreEvent() {
    return false;
  }
}

function anchoredItems(doc: Text, tree: MarkdownListTree, anchors: Set<number>): MarkdownListItem[] {
  const collapsed = [...anchors]
    .map((anchor) => tree.byLine.get(doc.lineAt(Math.max(0, Math.min(anchor, doc.length))).number))
    .filter((item): item is MarkdownListItem => Boolean(item && item.descendants))
    .sort((first, second) => first.line - second.line);

  // Only the outermost collapsed item draws a summary. An item collapsed inside
  // another is already hidden, and nested replacements would overlap.
  const outermost: MarkdownListItem[] = [];
  for (const item of collapsed) {
    if (outermost.some((outer) => item.line > outer.line && item.line <= outer.endLine)) continue;
    outermost.push(item);
  }
  return outermost;
}

function hierarchyDecorations(doc: Text, anchors: Set<number>) {
  const tree = parseMarkdownListTree(doc.toString());
  const ranges: Array<ReturnType<Decoration["range"]>> = [];
  const folded = anchoredItems(doc, tree, anchors);
  const hidden = new Set<number>();
  for (const item of folded) {
    for (let line = item.line + 1; line <= item.endLine; line += 1) hidden.add(line);
  }

  for (const item of tree.items) {
    if (hidden.has(item.line)) continue;
    const line = doc.line(item.line);
    const classes = ["cm-notebook-list-item", `cm-notebook-list-depth-${Math.min(item.depth, 4)}`];
    if (item.descendants) classes.push("cm-notebook-list-parent");
    if (item.task) classes.push("cm-notebook-list-task");
    ranges.push(Decoration.line({
      class: classes.join(" "),
      attributes: { style: `--list-depth:${item.depth};--list-marker:${markerWidth(item)}px` },
    }).range(line.from));

    const indentLength = line.text.match(/^[ \t]*/)?.[0].length ?? 0;
    if (indentLength) {
      ranges.push(Decoration.replace({ widget: new ListIndentWidget(item.depth) })
        .range(line.from, line.from + indentLength));
    }
  }

  for (const item of folded) {
    const line = doc.line(item.line);
    ranges.push(Decoration.line({ class: "cm-notebook-list-collapsed" }).range(line.from));
    ranges.push(Decoration.replace({
      widget: new CollapsedSummaryWidget(item.line, item.descendants, item.completedTasks),
    }).range(line.to, doc.line(item.endLine).to));
  }

  return { hidden, decorations: Decoration.set(ranges, true) };
}

function anchorsForLines(doc: Text, lines: number[]): Set<number> {
  const tree = parseMarkdownListTree(doc.toString());
  return new Set(lines
    .filter((line) => line >= 1 && line <= doc.lines && tree.byLine.get(line)?.descendants)
    .map((line) => doc.line(line).from));
}

const collapsedListField = StateField.define<CollapsedLists>({
  create(state) {
    const anchors = new Set<number>();
    return { anchors, ...hierarchyDecorations(state.doc, anchors) };
  },
  update(value, transaction) {
    const doc = transaction.state.doc;
    let anchors = new Set([...value.anchors].map((anchor) => transaction.changes.mapPos(anchor, 1)));
    for (const effect of transaction.effects) {
      if (effect.is(setAllListsCollapsed)) {
        anchors = effect.value
          ? anchorsForLines(doc, parseMarkdownListTree(doc.toString()).items.map((item) => item.line))
          : new Set<number>();
      }
      if (effect.is(setCollapsedLines)) anchors = anchorsForLines(doc, effect.value);
      if (effect.is(setListCollapsed)) {
        const item = parseMarkdownListTree(doc.toString()).byLine.get(effect.value.line);
        if (!item?.descendants) continue;
        const anchor = doc.line(item.line).from;
        if (effect.value.collapsed) anchors.add(anchor);
        else anchors.delete(anchor);
      }
    }

    // An edit can turn a parent back into a leaf, which must not stay collapsed.
    const tree = parseMarkdownListTree(doc.toString());
    anchors = new Set([...anchors].filter((anchor) =>
      Boolean(tree.byLine.get(doc.lineAt(Math.max(0, Math.min(anchor, doc.length))).number)?.descendants),
    ));
    return { anchors, ...hierarchyDecorations(doc, anchors) };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

/** Lines the collapsed state currently hides, so other decorations can skip them. */
export function hiddenListLines(state: EditorState): Set<number> {
  return state.field(collapsedListField, false)?.hidden ?? new Set<number>();
}

export function collapsedListLines(state: EditorState): number[] {
  const field = state.field(collapsedListField, false);
  if (!field) return [];
  return [...field.anchors]
    .map((anchor) => state.doc.lineAt(Math.max(0, Math.min(anchor, state.doc.length))).number)
    .sort((first, second) => first - second);
}

export function isListCollapsed(view: EditorView, line: number): boolean {
  return view.state.field(collapsedListField).anchors.has(view.state.doc.line(line).from);
}

export function setCurrentListCollapsed(view: EditorView, collapsed: boolean): boolean {
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
  const item = listItemContainingLine(parseMarkdownListTree(view.state.doc.toString()), cursorLine);
  if (!item?.descendants) return false;
  view.dispatch({ effects: setListCollapsed.of({ line: item.line, collapsed }) });
  return true;
}

export function setListAtLineCollapsed(view: EditorView, line: number, collapsed: boolean): boolean {
  const item = parseMarkdownListTree(view.state.doc.toString()).byLine.get(line);
  if (!item?.descendants) return false;
  view.dispatch({ effects: setListCollapsed.of({ line, collapsed }) });
  return true;
}

export function setEveryListCollapsed(view: EditorView, collapsed: boolean): boolean {
  if (!parseMarkdownListTree(view.state.doc.toString()).items.some((item) => item.descendants)) return false;
  view.dispatch({ effects: setAllListsCollapsed.of(collapsed) });
  return true;
}

export function nestedListExtensions(): Extension[] {
  return [
    collapsedListField,
    Prec.highest(keymap.of([
      { key: codeMirrorShortcut("collapse-current-nested"), run: (view) => setCurrentListCollapsed(view, true) },
      { key: codeMirrorShortcut("expand-current-nested"), run: (view) => setCurrentListCollapsed(view, false) },
      { key: codeMirrorShortcut("collapse-all-nested"), run: (view) => setEveryListCollapsed(view, true) },
      { key: codeMirrorShortcut("expand-all-nested"), run: (view) => setEveryListCollapsed(view, false) },
    ])),
  ];
}
