import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView, type DecorationSet } from "@codemirror/view";
import {
  collapsedLinesEffect,
  hiddenListLines,
  nestedListExtensions,
  parseMarkdownListTree,
  scopedListMove,
} from "./nestedLists";

describe("Markdown list hierarchy", () => {
  it("parses checklists nested inside ordinary bullets", () => {
    const tree = parseMarkdownListTree([
      "- Launch planning",
      "  - [ ] Draft announcement",
      "  - Supporting notes",
      "    - [x] Confirm date",
      "After the list",
    ].join("\n"));

    expect(tree.items.map(({ line, parentLine, depth, task, endLine }) => ({ line, parentLine, depth, task, endLine }))).toEqual([
      { line: 1, parentLine: null, depth: 0, task: false, endLine: 4 },
      { line: 2, parentLine: 1, depth: 1, task: true, endLine: 2 },
      { line: 3, parentLine: 1, depth: 1, task: false, endLine: 4 },
      { line: 4, parentLine: 3, depth: 2, task: true, endLine: 4 },
    ]);
    expect(tree.byLine.get(1)).toMatchObject({ descendants: 3, completedTasks: 1 });
  });

  it("keeps a child move inside its parent", () => {
    const document = [
      "- [ ] First parent",
      "  - [ ] First child",
      "  - [ ] Second child",
      "- [ ] Second parent",
      "  - [ ] Other child",
    ].join("\n");

    expect(scopedListMove(document, 2, 5, true)).toMatchObject({
      fromLine: 2,
      toLine: 2,
      targetLine: 3,
      after: true,
      depth: 1,
    });
  });

  it("moves a parent with every descendant", () => {
    const document = [
      "- [ ] First parent",
      "  - [ ] Child",
      "    - Nested note",
      "- [ ] Second parent",
    ].join("\n");

    expect(scopedListMove(document, 1, 4, true)).toMatchObject({
      fromLine: 1,
      toLine: 3,
      targetLine: 4,
      after: true,
      descendants: 2,
    });
  });

  it("does not treat a new paragraph as part of the preceding list", () => {
    const tree = parseMarkdownListTree("- One\n  - Child\n\n# Next section\nParagraph");
    expect(tree.byLine.get(1)?.endLine).toBe(2);
    expect(tree.items).toHaveLength(2);
  });

  it("leaves blank spacing behind instead of dragging it with the item", () => {
    const tree = parseMarkdownListTree("- One\n  - Child\n\n- Two\n  - Other\n");
    expect(tree.byLine.get(1)).toMatchObject({ endLine: 2, descendants: 1 });
    expect(tree.byLine.get(4)).toMatchObject({ endLine: 5, descendants: 1 });
  });

  it("keeps a checklist nested under a numbered item inside that item", () => {
    const document = [
      "1. Ship the release",
      "   - [ ] Tag the build",
      "   - [ ] Write the notes",
      "2. Tell everyone",
    ].join("\n");

    expect(parseMarkdownListTree(document).byLine.get(1)).toMatchObject({
      marker: "number",
      endLine: 3,
      descendants: 2,
    });
    // Dragging a child onto a different parent clamps back to the last legal
    // position inside its own parent.
    expect(scopedListMove(document, 3, 4, true)).toMatchObject({
      fromLine: 3,
      toLine: 3,
      targetLine: 2,
      after: true,
    });
  });
});

const NESTED_PAGE = [
  "- [ ] Parent task",
  "  - [ ] Child one",
  "    - Supporting note",
  "  - [x] Child two",
  "Closing paragraph",
].join("\n");

function stateFor(document: string, collapsed: number[] = []): EditorState {
  const state = EditorState.create({ doc: document, extensions: nestedListExtensions() });
  return collapsed.length ? state.update({ effects: collapsedLinesEffect(collapsed) }).state : state;
}

/** The replacement ranges the hierarchy draws: indent widgets, plus any collapsed subtree. */
function replacedRanges(state: EditorState): Array<{ from: number; to: number }> {
  const sets = state.facet(EditorView.decorations)
    .filter((value): value is DecorationSet => typeof value !== "function");
  const ranges: Array<{ from: number; to: number }> = [];
  for (const set of sets) {
    set.between(0, state.doc.length, (from, to) => {
      if (to > from) ranges.push({ from, to });
    });
  }
  return ranges.sort((first, second) => first.from - second.from);
}

describe("Nested list decorations", () => {
  it("replaces the leading whitespace of each nested item so indentation is exact", () => {
    const state = stateFor(NESTED_PAGE);
    expect(hiddenListLines(state).size).toBe(0);
    expect(replacedRanges(state)).toEqual([
      { from: state.doc.line(2).from, to: state.doc.line(2).from + 2 },
      { from: state.doc.line(3).from, to: state.doc.line(3).from + 4 },
      { from: state.doc.line(4).from, to: state.doc.line(4).from + 2 },
    ]);
  });

  it("folds a collapsed parent into one replacement covering its whole subtree", () => {
    const state = stateFor(NESTED_PAGE, [1]);
    expect([...hiddenListLines(state)]).toEqual([2, 3, 4]);
    expect(replacedRanges(state)).toEqual([
      { from: state.doc.line(1).to, to: state.doc.line(4).to },
    ]);
  });

  it("never nests one replacement inside another when a child is collapsed too", () => {
    const state = stateFor(NESTED_PAGE, [1, 2]);
    expect([...hiddenListLines(state)]).toEqual([2, 3, 4]);
    expect(replacedRanges(state)).toEqual([
      { from: state.doc.line(1).to, to: state.doc.line(4).to },
    ]);
  });

  it("collapses a checklist nested inside a plain bullet", () => {
    const state = stateFor("- Launch planning\n  - [ ] Draft\n  - [x] Confirm\nDone", [1]);
    expect([...hiddenListLines(state)]).toEqual([2, 3]);
    expect(replacedRanges(state)).toEqual([
      { from: state.doc.line(1).to, to: state.doc.line(3).to },
    ]);
  });

  it("drops collapsed state once an edit leaves the item without children", () => {
    const collapsed = stateFor(NESTED_PAGE, [1]);
    const flattened = collapsed.update({
      changes: { from: collapsed.doc.line(2).from, to: collapsed.doc.line(4).to, insert: "Plain text" },
    }).state;
    expect(hiddenListLines(flattened).size).toBe(0);
  });
});
