import { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { indentWithTab } from "@codemirror/commands";
import { EditorSelection, Prec, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onOpenLink: (target: string) => void;
};

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
    readonly to: number,
  ) {
    super();
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.from === this.from && other.to === this.to;
  }

  toDOM(view: EditorView) {
    const label = document.createElement("label");
    label.className = "notebook-checkbox";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.checked;
    input.setAttribute("aria-label", this.checked ? "Mark incomplete" : "Mark complete");
    input.addEventListener("change", () => {
      view.dispatch({
        changes: {
          from: this.from + 1,
          to: this.to - 1,
          insert: input.checked ? "x" : " ",
        },
      });
    });
    label.append(input);
    return label;
  }

  ignoreEvent() {
    return false;
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const bullet = document.createElement("span");
    bullet.className = "notebook-bullet";
    bullet.textContent = "•";
    return bullet;
  }
}

class NumberedListWidget extends WidgetType {
  constructor(readonly marker: string) {
    super();
  }

  eq(other: NumberedListWidget) {
    return other.marker === this.marker;
  }

  toDOM() {
    const number = document.createElement("span");
    number.className = "notebook-number";
    number.textContent = this.marker;
    return number;
  }
}

function previewDecorations(view: EditorView): DecorationSet {
  const ranges: Array<ReturnType<Decoration["range"]>> = [];
  const activeLines = view.hasFocus
    ? new Set(view.state.selection.ranges.map((range) => view.state.doc.lineAt(range.head).number))
    : new Set<number>();

  for (const visible of view.visibleRanges) {
    let position = visible.from;
    while (position <= visible.to) {
      const line = view.state.doc.lineAt(position);
      const isActiveLine = activeLines.has(line.number);
      if (line.text.length === 0) {
        ranges.push(Decoration.line({ class: "cm-blank-line" }).range(line.from));
      }
      const heading = line.text.match(/^(#{1,6})\s+/);
      if (heading) {
        ranges.push(
          Decoration.line({ class: `cm-notebook-heading cm-notebook-h${heading[1].length}` }).range(
            line.from,
          ),
        );
        if (!isActiveLine) {
          ranges.push(
            Decoration.replace({}).range(line.from, line.from + heading[0].length),
          );
        }
      }

      if (/^🔥 System streak: \d+\s*$/.test(line.text)) {
        ranges.push(Decoration.line({ class: "cm-system-streak" }).range(line.from));
      }

      if (!isActiveLine) {
        for (const match of line.text.matchAll(/\*\*([^*\n]+)\*\*/g)) {
          if (match.index === undefined) continue;
          const from = line.from + match.index;
          const textFrom = from + 2;
          const to = from + match[0].length;
          ranges.push(Decoration.replace({}).range(from, textFrom));
          ranges.push(Decoration.mark({ class: "cm-notebook-strong" }).range(textFrom, to - 2));
          ranges.push(Decoration.replace({}).range(to - 2, to));
        }

        // Match both CommonMark emphasis forms. The explicit prefix avoids
        // treating either marker in a bold `**phrase**` span as italics.
        for (const match of line.text.matchAll(/(^|[^*_])([*_])([^*_\n]+)\2(?![*_])/g)) {
          if (match.index === undefined) continue;
          const prefixLength = match[1].length;
          const from = line.from + match.index + prefixLength;
          const textFrom = from + 1;
          const to = from + match[0].length - prefixLength;
          ranges.push(Decoration.replace({}).range(from, textFrom));
          ranges.push(Decoration.mark({ class: "cm-notebook-emphasis" }).range(textFrom, to - 1));
          ranges.push(Decoration.replace({}).range(to - 1, to));
        }
      }

      // CommonMark thematic breaks: three or more matching -, _ or * characters,
      // with optional spaces between them. Keep the source visible while the line
      // is active, consistent with the editor's other live-preview elements.
      if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line.text)) {
        if (!isActiveLine) {
          ranges.push(Decoration.line({ class: "cm-notebook-horizontal-rule" }).range(line.from));
          ranges.push(Decoration.replace({}).range(line.from, line.to));
        }
      }

      const quote = line.text.match(/^>\s+/);
      if (quote) {
        ranges.push(Decoration.line({ class: "cm-notebook-quote" }).range(line.from));
        if (!activeLines.has(line.number)) {
          ranges.push(Decoration.replace({}).range(line.from, line.from + quote[0].length));
        }
      }

      const bullet = line.text.match(/^(\s*)[-*+]\s+(?!\[[ xX]\])/);
      if (bullet && !activeLines.has(line.number)) {
        const markerFrom = line.from + bullet[1].length;
        ranges.push(
          Decoration.replace({ widget: new BulletWidget() }).range(
            markerFrom,
            markerFrom + 2,
          ),
        );
      }

      const numberedList = line.text.match(/^(\s*)(\d+)([.)])\s+/);
      if (numberedList && !isActiveLine) {
        const markerFrom = line.from + numberedList[1].length;
        const markerTo = markerFrom + numberedList[2].length + numberedList[3].length + 1;
        ranges.push(
          Decoration.replace({ widget: new NumberedListWidget(`${numberedList[2]}${numberedList[3]}`) }).range(
            markerFrom,
            markerTo,
          ),
        );
      }

      for (const match of line.text.matchAll(/\[([ xX]?)\]/g)) {
        if (match.index === undefined) continue;
        const before = line.text.slice(0, match.index);
        if (!/(?:^|\s)-\s*$/.test(before) && before.length !== 0) continue;
        const checkboxFrom = line.from + match.index;
        const markerFrom = /(?:^|\s)-\s*$/.test(before)
          ? line.from + before.lastIndexOf("-")
          : checkboxFrom;
        ranges.push(
          Decoration.replace({
            widget: new CheckboxWidget(match[1].toLowerCase() === "x", checkboxFrom, checkboxFrom + match[0].length),
          }).range(markerFrom, checkboxFrom + match[0].length),
        );
      }

      for (const match of line.text.matchAll(/\[\[([^\]]+)\]\]/g)) {
        if (isActiveLine) continue;
        if (match.index === undefined) continue;
        const from = line.from + match.index;
        const to = from + match[0].length;
        ranges.push(
          Decoration.mark({ class: "cm-notebook-link" }).range(
            from + 2,
            to - 2,
          ),
        );
        ranges.push(Decoration.replace({}).range(from, from + 2));
        ranges.push(Decoration.replace({}).range(to - 2, to));
      }

      if (line.to >= visible.to || line.to === view.state.doc.length) break;
      position = line.to + 1;
    }
  }

  return Decoration.set(ranges, true);
}

const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = previewDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
        this.decorations = previewDecorations(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

function continueList(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;
  const line = view.state.doc.lineAt(selection.head);
  const beforeCursor = line.text.slice(0, selection.head - line.from);

  // The task marker is rendered as a widget, so its visual cursor position can
  // sit on either edge of the hidden Markdown. Treat an empty task as an exit
  // from the list regardless of which edge CodeMirror reports.
  if (/^\s*-\s+\[[ xX]?\]\s*$/.test(line.text)) {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: "" },
      selection: EditorSelection.cursor(line.from),
    });
    return true;
  }

  const task = beforeCursor.match(/^(\s*)-\s+\[[ xX]?\]\s*/);
  if (task) {
    const insert = `\n${task[1]}- [ ] `;
    view.dispatch({
      changes: { from: selection.head, insert },
      selection: EditorSelection.cursor(selection.head + insert.length),
    });
    return true;
  }

  const bullet = beforeCursor.match(/^(\s*)([-*+])\s+/);
  if (bullet) {
    if (/^\s*[-*+]\s*$/.test(line.text)) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: "" },
        selection: EditorSelection.cursor(line.from),
      });
      return true;
    }
    const insert = `\n${bullet[1]}${bullet[2]} `;
    view.dispatch({
      changes: { from: selection.head, insert },
      selection: EditorSelection.cursor(selection.head + insert.length),
    });
    return true;
  }

  const numbered = beforeCursor.match(/^(\s*)(\d+)([.)])\s+/);
  if (!numbered) return false;
  if (/^\s*\d+[.)]\s*$/.test(line.text)) {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: "" },
      selection: EditorSelection.cursor(line.from),
    });
    return true;
  }
  const insert = `\n${numbered[1]}${Number(numbered[2]) + 1}${numbered[3]} `;
  view.dispatch({
    changes: { from: selection.head, insert },
    selection: EditorSelection.cursor(selection.head + insert.length),
  });
  return true;
}

function removeTaskMarker(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;
  const line = view.state.doc.lineAt(selection.head);
  const task = line.text.match(/^(\s*)-\s+\[[ xX]?\]\s*/);
  if (!task) return false;

  const offset = selection.head - line.from;
  if (offset === 0 || offset > task[0].length) return false;

  view.dispatch({
    changes: { from: line.from + task[1].length, to: line.from + task[0].length, insert: "" },
    selection: EditorSelection.cursor(line.from + task[1].length),
  });
  return true;
}

function toggleCurrentTask(view: EditorView): boolean {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const match = line.text.match(/\[([ xX])\]/);
  if (!match || match.index === undefined) return false;
  const from = line.from + match.index + 1;
  view.dispatch({ changes: { from, to: from + 1, insert: match[1] === " " ? "x" : " " } });
  return true;
}

function resetAllTasks(view: EditorView): boolean {
  const changes = [];
  const text = view.state.doc.toString();

  for (const match of text.matchAll(/\[[xX]\]/g)) {
    if (match.index === undefined) continue;
    changes.push({ from: match.index + 1, to: match.index + 2, insert: " " });
  }

  if (changes.length === 0) return true;
  view.dispatch({ changes });
  return true;
}

function completeAllTasks(view: EditorView): boolean {
  const changes = [];
  const text = view.state.doc.toString();

  for (const match of text.matchAll(/\[ \]/g)) {
    if (match.index === undefined) continue;
    changes.push({ from: match.index + 1, to: match.index + 2, insert: "x" });
  }

  if (changes.length === 0) return true;
  view.dispatch({ changes });
  return true;
}

export function MarkdownEditor({ value, onChange, onOpenLink }: Props) {
  const openLinkRef = useRef(onOpenLink);

  useEffect(() => {
    openLinkRef.current = onOpenLink;
  }, [onOpenLink]);

  const extensions = useMemo<Extension[]>(
    () => [
      markdown(),
      EditorView.lineWrapping,
      livePreview,
      Prec.highest(keymap.of([
        { key: "Enter", run: continueList },
        { key: "Backspace", run: removeTaskMarker },
        { key: "Mod-Enter", run: toggleCurrentTask },
        { key: "Ctrl-Alt-r", run: resetAllTasks },
        { key: "Ctrl-Alt-f", run: completeAllTasks },
        indentWithTab,
      ])),
      EditorView.domEventHandlers({
        click(event, view) {
          const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (position === null) return false;
          const line = view.state.doc.lineAt(position);
          const offset = position - line.from;

          for (const match of line.text.matchAll(/\[\[([^\]]+)\]\]/g)) {
            if (match.index === undefined) continue;
            const linkStart = match.index + 2;
            const linkEnd = linkStart + match[1].length;
            if (offset >= linkStart && offset < linkEnd) {
              event.preventDefault();
              view.contentDOM.blur();
              openLinkRef.current(match[1]);
              return true;
            }
          }

          const markdownLink = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
          for (const match of line.text.matchAll(markdownLink)) {
            if (match.index === undefined) continue;
            const linkStart = match.index + 1;
            const linkEnd = linkStart + match[1].length;
            if (offset >= linkStart && offset < linkEnd) {
              event.preventDefault();
              view.contentDOM.blur();
              openLinkRef.current(match[2]);
              return true;
            }
          }
          return false;
        },
      }),
    ],
    [],
  );

  return (
    <CodeMirror
      className="markdown-editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        bracketMatching: false,
        closeBrackets: false,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        allowMultipleSelections: false,
      }}
    />
  );
}
