import { EditorSelection, Prec, StateEffect, StateField, type Extension, type Text } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { stateFooterRange } from "../plugins/native/timeModel";
import { APP_PLATFORM } from "./platform";
import { shortcutLabel } from "./shortcuts";
import {
  collapsedLinesEffect,
  collapsedListLines,
  isListCollapsed,
  parseMarkdownListTree,
  pageListMove,
  setEveryListCollapsed,
  setListAtLineCollapsed,
} from "./nestedLists";

export type LineGroup = {
  anchorLine: number;
  headLine: number;
};

export type MovedLines = {
  document: string;
  fromLine: number;
  toLine: number;
};

type LineSelectionState = {
  group: LineGroup | null;
  decorations: DecorationSet;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  group: LineGroup;
  dragging: boolean;
  targetLine: number | null;
  targetItemLine: number | null;
  after: boolean;
  sourceListLine: number | null;
  descendants: number;
};

type LineDragHost = {
  requestSave: () => Promise<boolean>;
  reportError: (message: string) => void;
};

const setLineGroup = StateEffect.define<LineGroup | null>();
const HANDLE_HEIGHT = 24;
// How far left of the editor the pointer may travel and still be over a line's handle column.
const HOVER_GUTTER = 64;

function orderedGroup(group: LineGroup) {
  return {
    fromLine: Math.min(group.anchorLine, group.headLine),
    toLine: Math.max(group.anchorLine, group.headLine),
  };
}

function clampGroup(group: LineGroup | null, doc: Text): LineGroup | null {
  if (!group) return null;
  return {
    anchorLine: Math.max(1, Math.min(group.anchorLine, doc.lines)),
    headLine: Math.max(1, Math.min(group.headLine, doc.lines)),
  };
}

function lineGroupDecorations(doc: Text, group: LineGroup | null): DecorationSet {
  if (!group) return Decoration.none;
  const { fromLine, toLine } = orderedGroup(group);
  const ranges = [];
  for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
    const classes = ["cm-daydock-line-selected"];
    if (lineNumber === fromLine) classes.push("cm-daydock-line-selected-first");
    if (lineNumber === toLine) classes.push("cm-daydock-line-selected-last");
    ranges.push(Decoration.line({ class: classes.join(" ") }).range(doc.line(lineNumber).from));
  }
  return Decoration.set(ranges, true);
}

const lineSelectionField = StateField.define<LineSelectionState>({
  create() {
    return { group: null, decorations: Decoration.none };
  },
  update(value, transaction) {
    let group = value.group;
    for (const effect of transaction.effects) {
      if (effect.is(setLineGroup)) group = effect.value;
    }
    if (transaction.docChanged && !transaction.effects.some((effect) => effect.is(setLineGroup))) {
      group = null;
    }
    group = clampGroup(group, transaction.state.doc);
    return { group, decorations: lineGroupDecorations(transaction.state.doc, group) };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

function lineEnding(document: string) {
  return document.includes("\r\n") ? "\r\n" : "\n";
}

/** The one-based line numbers in their post-move order, or null when the move is a no-op. */
function movedLineOrder(
  totalLines: number,
  fromLine: number,
  toLine: number,
  targetLine: number,
  after: boolean,
): number[] | null {
  const start = Math.max(1, Math.min(fromLine, toLine));
  const end = Math.min(totalLines, Math.max(fromLine, toLine));
  const target = Math.max(1, Math.min(targetLine, totalLines));
  if (target >= start && target <= end) return null;

  const lines = Array.from({ length: totalLines }, (_, index) => index + 1);
  const count = end - start + 1;
  const moved = lines.slice(start - 1, end);
  const remaining = [...lines.slice(0, start - 1), ...lines.slice(end)];
  let insertionIndex = target - 1 + (after ? 1 : 0);
  if (insertionIndex > start - 1) insertionIndex -= count;
  insertionIndex = Math.max(0, Math.min(insertionIndex, remaining.length));
  remaining.splice(insertionIndex, 0, ...moved);
  return remaining.every((line, index) => line === index + 1) ? null : remaining;
}

/** Move a contiguous, one-based line range without changing any line content. */
export function moveMarkdownLines(
  document: string,
  fromLine: number,
  toLine: number,
  targetLine: number,
  after: boolean,
): MovedLines | null {
  const lines = document.split(/\r?\n/);
  const order = movedLineOrder(lines.length, fromLine, toLine, targetLine, after);
  if (!order) return null;
  const start = Math.max(1, Math.min(fromLine, toLine));
  const end = Math.min(lines.length, Math.max(fromLine, toLine));
  const firstIndex = order.indexOf(start);
  return {
    document: order.map((line) => lines[line - 1]).join(lineEnding(document)),
    fromLine: firstIndex + 1,
    toLine: firstIndex + (end - start + 1),
  };
}

/** Old line number to new line number for the same move, so collapsed items stay collapsed. */
export function movedLineMap(
  totalLines: number,
  fromLine: number,
  toLine: number,
  targetLine: number,
  after: boolean,
): Map<number, number> {
  const order = movedLineOrder(totalLines, fromLine, toLine, targetLine, after)
    ?? Array.from({ length: totalLines }, (_, index) => index + 1);
  return new Map(order.map((line, index) => [line, index + 1]));
}

function visibleLineLimit(view: EditorView): number {
  const footer = stateFooterRange(view.state.doc.toString());
  return footer ? Math.max(0, view.state.doc.lineAt(footer.from).number - 1) : view.state.doc.lines;
}

function selectedLineGroup(view: EditorView) {
  return view.state.field(lineSelectionField).group;
}

function updateLineGroup(view: EditorView, group: LineGroup | null) {
  view.dispatch({ effects: setLineGroup.of(group) });
}

function extendLineGroup(view: EditorView, direction: -1 | 1): boolean {
  const group = selectedLineGroup(view);
  if (!group) return false;
  const limit = visibleLineLimit(view);
  const headLine = Math.max(1, Math.min(group.headLine + direction, limit));
  if (headLine === group.headLine) return true;
  view.dispatch({
    effects: setLineGroup.of({ ...group, headLine }),
    selection: EditorSelection.cursor(view.state.doc.line(headLine).from),
  });
  return true;
}

class LineDragControls {
  private readonly handle: HTMLButtonElement;
  private readonly dropIndicator: HTMLDivElement;
  private readonly ghost: HTMLDivElement;
  private readonly menu: HTMLDivElement;
  private hoveredLine: number | null = null;
  private drag: DragState | null = null;
  private menuLine: number | null = null;
  private settleTimer: number | null = null;
  private hideTimer: number | null = null;
  private readonly measureKey = {};

  constructor(
    private readonly view: EditorView,
    private readonly host: LineDragHost,
  ) {
    this.handle = document.createElement("button");
    this.handle.type = "button";
    this.handle.className = "daydock-line-handle";
    this.handle.setAttribute("aria-label", "Drag Markdown line");
    this.handle.innerHTML = "<span aria-hidden=\"true\"><i></i><i></i><i></i><i></i><i></i><i></i></span>";

    this.dropIndicator = document.createElement("div");
    this.dropIndicator.className = "daydock-line-drop-indicator";
    this.ghost = document.createElement("div");
    this.ghost.className = "daydock-line-drag-ghost";
    this.menu = document.createElement("div");
    this.menu.className = "daydock-block-menu";
    this.menu.setAttribute("role", "menu");
    this.menu.hidden = true;
    this.menu.innerHTML = `
      <button type="button" role="menuitem" data-action="toggle-current"><span>Collapse children</span><kbd>${shortcutLabel("collapse-current-nested", APP_PLATFORM)}</kbd></button>
      <button type="button" role="menuitem" data-action="collapse-all"><span>Collapse all nested</span><kbd>${shortcutLabel("collapse-all-nested", APP_PLATFORM)}</kbd></button>
      <button type="button" role="menuitem" data-action="expand-all"><span>Expand all nested</span><kbd>${shortcutLabel("expand-all-nested", APP_PLATFORM)}</kbd></button>
    `;
    this.view.dom.append(this.handle, this.dropIndicator, this.ghost, this.menu);

    document.addEventListener("pointermove", this.onPointerHover, { passive: true });
    this.view.contentDOM.addEventListener("pointerdown", this.onContentPointerDown, true);
    this.handle.addEventListener("pointerdown", this.onHandlePointerDown);
    this.menu.addEventListener("click", this.onMenuClick);
    document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
    this.schedulePosition();
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.hoveredLine = null;
      this.closeMenu();
    }
    if (update.docChanged || update.viewportChanged || update.geometryChanged || update.selectionSet) {
      this.schedulePosition();
    }
  }

  /**
   * CodeMirror forbids reading layout while it applies an update, and switches a
   * plugin that tries off for the rest of the session. Repositioning in the
   * measure phase keeps the handle working after every edit and cursor move.
   */
  private schedulePosition() {
    this.view.requestMeasure({ key: this.measureKey, read: () => null, write: () => this.positionHandle() });
  }

  destroy() {
    // Detach first, so nothing below can leave a listener pointing at a dead editor.
    document.removeEventListener("pointermove", this.onPointerHover);
    this.view.contentDOM.removeEventListener("pointerdown", this.onContentPointerDown, true);
    this.handle.removeEventListener("pointerdown", this.onHandlePointerDown);
    this.menu.removeEventListener("click", this.onMenuClick);
    document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    this.endPointerTracking(false);
    if (this.settleTimer !== null) window.clearTimeout(this.settleTimer);
    this.cancelHide();
    this.handle.remove();
    this.dropIndicator.remove();
    this.ghost.remove();
    this.menu.remove();
  }

  private isInteractiveTarget(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest(
      ".daydock-slash-menu, .daydock-time-inline-host, .daydock-time-block-host, .daydock-capacity-host, .daydock-block-menu",
    ));
  }

  private lineAtY(clientY: number): number | null {
    const content = this.view.contentDOM.getBoundingClientRect();
    const position = this.view.posAtCoords({
      x: Math.min(content.right - 2, content.left + 12),
      y: clientY,
    });
    if (position === null) return null;
    const lineNumber = this.view.state.doc.lineAt(position).number;
    return lineNumber <= visibleLineLimit(this.view) ? lineNumber : null;
  }

  /**
   * App zoom scales every distance the browser measures, but not the pixel
   * offsets written back into styles. Measured distances are divided by this
   * factor so the handle, drop line, ghost, and menu land under the pointer.
   */
  private zoom() {
    const width = this.view.dom.offsetWidth;
    return width ? this.view.dom.getBoundingClientRect().width / width : 1;
  }

  private positionHandle(lineNumber?: number | null) {
    const group = selectedLineGroup(this.view);
    const groupStart = group ? orderedGroup(group).fromLine : null;
    const line = lineNumber ?? this.hoveredLine ?? groupStart;
    if (!line || line > visibleLineLimit(this.view) || line > this.view.state.doc.lines) {
      this.handle.classList.remove("visible");
      return;
    }
    const target = this.view.state.doc.line(line);
    const coordinates = this.view.coordsAtPos(target.from, 1);
    if (!coordinates) {
      this.handle.classList.remove("visible");
      return;
    }
    const editor = this.view.dom.getBoundingClientRect();
    const content = this.view.contentDOM.getBoundingClientRect();
    const indentLength = target.text.match(/^[ \t]*/)?.[0].length ?? 0;
    const markerCoordinates = this.view.coordsAtPos(target.from + indentLength, 1);
    const markerLeft = Math.max(content.left, markerCoordinates?.left ?? content.left);
    const zoom = this.zoom();
    // A nested item's parent guide runs 17px left of its marker. Centring the
    // 18px opaque handle on that guide lets the line pass behind it instead of
    // cutting through the dots.
    this.handle.style.left = `${(markerLeft - editor.left) / zoom - 26}px`;
    const bounds = group ? orderedGroup(group) : null;
    this.handle.classList.toggle("on-selection", Boolean(bounds && line >= bounds.fromLine && line <= bounds.toLine));
    this.handle.style.top = `${(this.handleTop(target.from, coordinates, zoom) - editor.top) / zoom}px`;
    const count = group ? orderedGroup(group).toLine - orderedGroup(group).fromLine + 1 : 1;
    const listItem = parseMarkdownListTree(this.view.state.doc.toString(), visibleLineLimit(this.view)).byLine.get(line);
    const label = listItem
      ? `Open options or drag ${this.lineLabel(line)}${listItem.descendants ? ` with ${listItem.descendants} nested items` : ""}`
      : count === 1 ? "Drag Markdown line" : `Drag ${count} Markdown lines`;
    this.handle.setAttribute("aria-label", label);
    this.handle.title = listItem
      ? `${label}. Click for nested-list actions.`
      : group
      ? `${label}. Shift-click another handle or press Shift+Up/Down to extend.`
      : `${label}. Shift-click another handle to select a range.`;
    this.handle.classList.add("visible");
  }

  /** Centre the handle on the line's first text row, whatever widgets sit in it. */
  private handleTop(position: number, fallback: { top: number; bottom: number }, zoom: number) {
    const { node } = this.view.domAtPos(position);
    const element = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element)
      ?.closest<HTMLElement>(".cm-line");
    if (!element) return fallback.top + (fallback.bottom - fallback.top - HANDLE_HEIGHT * zoom) / 2;
    // Computed styles are unzoomed CSS pixels while the rect is zoomed, so the
    // row is measured in CSS pixels and scaled once at the end.
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const rowHeight = Math.min(
      Number.parseFloat(style.lineHeight) || (fallback.bottom - fallback.top) / zoom,
      rect.height / zoom - paddingTop,
    );
    return rect.top + (paddingTop + (rowHeight - HANDLE_HEIGHT) / 2) * zoom;
  }

  /**
   * Hover is tracked across the editor's whole scroll area rather than the editor
   * box alone, so the handle keeps following lines while the pointer travels up
   * and down the gutter to the left of the text, where the handle itself lives.
   */
  private readonly onPointerHover = (event: PointerEvent) => {
    if (this.drag) return;
    const target = event.target instanceof Node ? event.target : null;
    const area = this.view.dom.closest(".page-wrap, .plan-editor-wrap, .template-editor-scroll") ?? this.view.dom;
    const editor = this.view.dom.getBoundingClientRect();
    const inRange = Boolean(target && area.contains(target))
      && event.clientY >= editor.top && event.clientY <= editor.bottom
      && event.clientX >= editor.left - HOVER_GUTTER * this.zoom() && event.clientX <= editor.right;
    if (!inRange) {
      this.scheduleHide();
      return;
    }
    this.cancelHide();
    // Keep the handle on its line while the pointer is over it, even where the
    // handle is taller than a short row.
    if (target && this.handle.contains(target)) return;
    if (this.isInteractiveTarget(event.target)) return;
    const line = this.lineAtY(event.clientY);
    if (line !== this.hoveredLine) {
      this.hoveredLine = line;
      this.positionHandle(line);
    }
  };

  private scheduleHide() {
    if (this.hideTimer !== null || !this.handle.classList.contains("visible")) return;
    if (selectedLineGroup(this.view) || !this.menu.hidden) return;
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = null;
      if (this.drag || selectedLineGroup(this.view) || !this.menu.hidden) return;
      this.hoveredLine = null;
      this.handle.classList.remove("visible");
    }, 160);
  }

  private cancelHide() {
    if (this.hideTimer === null) return;
    window.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private readonly onContentPointerDown = (event: PointerEvent) => {
    if (this.isInteractiveTarget(event.target)) return;
    if (selectedLineGroup(this.view)) updateLineGroup(this.view, null);
  };

  private readonly onHandlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const line = this.hoveredLine ?? selectedLineGroup(this.view)?.headLine;
    if (!line) return;

    this.closeMenu();
    const current = selectedLineGroup(this.view);
    const currentBounds = current ? orderedGroup(current) : null;
    const listItem = !event.shiftKey
      ? parseMarkdownListTree(this.view.state.doc.toString(), visibleLineLimit(this.view)).byLine.get(line)
      : undefined;
    const group = listItem
      ? { anchorLine: listItem.line, headLine: listItem.endLine }
      : event.shiftKey && current
      ? { anchorLine: current.anchorLine, headLine: line }
      : current && currentBounds && line >= currentBounds.fromLine && line <= currentBounds.toLine
        ? current
        : { anchorLine: line, headLine: line };
    this.view.dispatch({
      effects: setLineGroup.of(group),
      selection: EditorSelection.cursor(this.view.state.doc.line(line).from),
    });
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      group,
      dragging: false,
      targetLine: null,
      targetItemLine: null,
      after: false,
      sourceListLine: listItem?.line ?? null,
      descendants: listItem?.descendants ?? 0,
    };
    this.handle.setPointerCapture?.(event.pointerId);
    document.addEventListener("pointermove", this.onDocumentPointerMove, true);
    document.addEventListener("pointerup", this.onDocumentPointerUp, true);
    document.addEventListener("pointercancel", this.onDocumentPointerUp, true);
    this.positionHandle(orderedGroup(group).fromLine);
  };

  private readonly onDocumentPointerMove = (event: PointerEvent) => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const distance = Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY);
    if (!this.drag.dragging && distance < 4) return;
    event.preventDefault();
    this.drag.dragging = true;
    this.view.dom.classList.add("daydock-lines-dragging");
    this.handle.classList.add("dragging");

    const lineNumber = this.lineAtY(event.clientY);
    this.drag.targetLine = lineNumber;
    this.drag.targetItemLine = lineNumber;
    this.drag.after = false;
    if (lineNumber) {
      const line = this.view.state.doc.line(lineNumber);
      const coordinates = this.view.coordsAtPos(line.from, 1);
      if (coordinates) this.drag.after = event.clientY > (coordinates.top + coordinates.bottom) / 2;
    }
    if (lineNumber && this.drag.sourceListLine) {
      const resolved = pageListMove(
        this.view.state.doc.toString(),
        this.drag.sourceListLine,
        lineNumber,
        this.drag.after,
        visibleLineLimit(this.view),
      );
      this.drag.targetLine = resolved?.targetLine ?? null;
      this.drag.targetItemLine = resolved?.targetItemLine ?? null;
      this.drag.after = resolved?.after ?? false;
    }
    this.positionDropIndicator();
    this.positionGhost(event.clientX, event.clientY);
    this.autoScroll(event.clientY);
  };

  private readonly onDocumentPointerUp = (event: PointerEvent) => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    const drag = this.drag;
    this.endPointerTracking();
    if (!drag.dragging) {
      if (drag.sourceListLine) this.openMenu(drag.sourceListLine);
      return;
    }
    if (!drag.targetLine) return;
    const bounds = orderedGroup(drag.group);
    const totalLines = this.view.state.doc.lines;
    const moved = moveMarkdownLines(
      this.view.state.doc.toString(),
      bounds.fromLine,
      bounds.toLine,
      drag.targetLine,
      drag.after,
    );
    if (!moved) return;
    const remapped = movedLineMap(totalLines, bounds.fromLine, bounds.toLine, drag.targetLine, drag.after);
    const collapsed = collapsedListLines(this.view.state).map((line) => remapped.get(line) ?? line);
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: moved.document },
      effects: [
        setLineGroup.of({ anchorLine: moved.fromLine, headLine: moved.toLine }),
        collapsedLinesEffect(collapsed),
      ],
      selection: EditorSelection.cursor(this.view.state.doc.line(Math.min(moved.fromLine, this.view.state.doc.lines)).from),
    });
    this.settle();
    queueMicrotask(async () => {
      const saved = await this.host.requestSave();
      if (!saved) this.host.reportError("The moved lines are still open in the editor but could not be saved to disk.");
    });
  };

  private positionDropIndicator() {
    if (!this.drag?.targetLine) {
      this.dropIndicator.classList.remove("visible");
      return;
    }
    const bounds = orderedGroup(this.drag.group);
    if (this.drag.targetLine >= bounds.fromLine && this.drag.targetLine <= bounds.toLine) {
      this.dropIndicator.classList.remove("visible");
      return;
    }
    const visualLine = this.drag.after
      && this.drag.targetItemLine
      && isListCollapsed(this.view, this.drag.targetItemLine)
      ? this.drag.targetItemLine
      : this.drag.targetLine;
    const target = this.view.state.doc.line(visualLine);
    const coordinates = this.view.coordsAtPos(this.drag.after ? target.to : target.from, this.drag.after ? -1 : 1);
    if (!coordinates) return;
    const editor = this.view.dom.getBoundingClientRect();
    const content = this.view.contentDOM.getBoundingClientRect();
    const sourceLine = this.drag.sourceListLine
      ? this.view.state.doc.line(this.drag.sourceListLine)
      : null;
    const sourceIndent = sourceLine?.text.match(/^[ \t]*/)?.[0].length ?? 0;
    const sourceCoordinates = sourceLine
      ? this.view.coordsAtPos(sourceLine.from + sourceIndent, 1)
      : null;
    const left = Math.max(content.left, sourceCoordinates?.left ?? content.left);
    const zoom = this.zoom();
    this.dropIndicator.style.left = `${(left - editor.left) / zoom}px`;
    this.dropIndicator.style.width = `${Math.max(40, (content.right - left) / zoom)}px`;
    this.dropIndicator.style.top = `${((this.drag.after ? coordinates.bottom : coordinates.top) - editor.top) / zoom}px`;
    this.dropIndicator.classList.add("visible");
  }

  private positionGhost(clientX: number, clientY: number) {
    if (!this.drag) return;
    const bounds = orderedGroup(this.drag.group);
    const count = bounds.toLine - bounds.fromLine + 1;
    const editor = this.view.dom.getBoundingClientRect();
    const extra = this.drag.sourceListLine ? this.drag.descendants : count - 1;
    this.ghost.textContent = `${this.lineLabel(bounds.fromLine)}${extra ? `  +${extra}` : ""}`;
    const zoom = this.zoom();
    this.ghost.style.left = `${(clientX - editor.left) / zoom + 13}px`;
    this.ghost.style.top = `${(clientY - editor.top) / zoom + 11}px`;
    this.ghost.classList.add("visible");
  }

  private autoScroll(clientY: number) {
    const scrollContainer = this.view.dom.closest<HTMLElement>(
      ".page-wrap, .plan-editor-wrap, .template-editor-scroll",
    );
    if (!scrollContainer) return;
    const bounds = scrollContainer.getBoundingClientRect();
    const edge = 72;
    if (clientY < bounds.top + edge) {
      const strength = Math.min(1, (bounds.top + edge - clientY) / edge);
      scrollContainer.scrollBy({ top: -Math.max(4, Math.round(24 * strength * strength)) });
    }
    if (clientY > bounds.bottom - edge) {
      const strength = Math.min(1, (clientY - (bounds.bottom - edge)) / edge);
      scrollContainer.scrollBy({ top: Math.max(4, Math.round(24 * strength * strength)) });
    }
  }

  /** Let the dropped rows land with a short settle rather than snapping into place. */
  private settle() {
    if (this.settleTimer !== null) window.clearTimeout(this.settleTimer);
    this.view.dom.classList.add("daydock-lines-settling");
    this.settleTimer = window.setTimeout(() => {
      this.view.dom.classList.remove("daydock-lines-settling");
      this.settleTimer = null;
    }, 220);
  }

  private lineLabel(lineNumber: number) {
    return this.view.state.doc.line(lineNumber).text
      .replace(/^\s*(?:#{1,6}\s+|(?:[-+*]|\d+[.)])\s+(?:\[[ xX]?\]\s*)?)/, "")
      .trim()
      .slice(0, 54) || "Empty line";
  }

  private openMenu(lineNumber: number) {
    const tree = parseMarkdownListTree(this.view.state.doc.toString(), visibleLineLimit(this.view));
    const item = tree.byLine.get(lineNumber);
    if (!item || !tree.items.some((candidate) => candidate.descendants)) return;
    this.menuLine = lineNumber;
    const toggle = this.menu.querySelector<HTMLButtonElement>('[data-action="toggle-current"]');
    if (toggle) {
      toggle.hidden = item.descendants === 0;
      const label = toggle.querySelector("span");
      if (label) label.textContent = isListCollapsed(this.view, lineNumber) ? "Expand children" : "Collapse children";
    }
    this.menu.hidden = false;
    // Work in unzoomed CSS pixels throughout, matching offsetWidth and the styles.
    const zoom = this.zoom();
    const editor = this.view.dom.getBoundingClientRect();
    const handle = this.handle.getBoundingClientRect();
    const handleLeft = (handle.left - editor.left) / zoom;
    const handleTop = (handle.top - editor.top) / zoom;
    const handleBottom = (handle.bottom - editor.top) / zoom;
    const left = Math.max(5, Math.min(handleLeft, editor.width / zoom - this.menu.offsetWidth - 5));
    const below = handleBottom + 5;
    const top = below + this.menu.offsetHeight <= editor.height / zoom - 5
      ? below
      : Math.max(5, handleTop - this.menu.offsetHeight - 5);
    this.menu.style.left = `${left}px`;
    this.menu.style.top = `${top}px`;
  }

  private closeMenu() {
    this.menu.hidden = true;
    this.menuLine = null;
  }

  private readonly onMenuClick = (event: MouseEvent) => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>("button[data-action]")
      : null;
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.action;
    if (action === "toggle-current" && this.menuLine) {
      setListAtLineCollapsed(this.view, this.menuLine, !isListCollapsed(this.view, this.menuLine));
    }
    if (action === "collapse-all") setEveryListCollapsed(this.view, true);
    if (action === "expand-all") setEveryListCollapsed(this.view, false);
    this.closeMenu();
    this.positionHandle();
  };

  private readonly onDocumentPointerDown = (event: PointerEvent) => {
    if (this.menu.hidden || this.menu.contains(event.target as Node) || this.handle.contains(event.target as Node)) return;
    this.closeMenu();
  };

  private endPointerTracking(reposition = true) {
    if (this.drag) this.handle.releasePointerCapture?.(this.drag.pointerId);
    this.drag = null;
    document.removeEventListener("pointermove", this.onDocumentPointerMove, true);
    document.removeEventListener("pointerup", this.onDocumentPointerUp, true);
    document.removeEventListener("pointercancel", this.onDocumentPointerUp, true);
    this.view.dom.classList.remove("daydock-lines-dragging");
    this.handle.classList.remove("dragging");
    this.dropIndicator.classList.remove("visible");
    this.ghost.classList.remove("visible");
    if (reposition) this.positionHandle();
  }
}

export function lineDragExtensions(host: LineDragHost): Extension[] {
  return [
    lineSelectionField,
    ViewPlugin.define((view) => new LineDragControls(view, host)),
    Prec.highest(keymap.of([
      { key: "Shift-ArrowDown", run: (view) => extendLineGroup(view, 1) },
      { key: "Shift-ArrowUp", run: (view) => extendLineGroup(view, -1) },
      { key: "Escape", run: (view) => {
        if (!selectedLineGroup(view)) return false;
        updateLineGroup(view, null);
        return true;
      } },
    ])),
  ];
}
