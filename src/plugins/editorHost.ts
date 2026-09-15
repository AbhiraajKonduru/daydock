import { EditorSelection, EditorState, StateEffect, StateField, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import type {
  DaydockPlugin,
  PluginEditorHost,
  PluginUpdateContext,
  PluginWidgetSpec,
  SlashCommand,
  SlashCommandContext,
  SlashIcon,
  SlashSuggestion,
} from "./api";
import { isCommandFailure, minimalChange, replaceEditorDocument } from "./api";
import { stateFooterRange } from "./documentState";
import { pluginIcon } from "./icons";

type SlashPicker = {
  command: SlashCommand;
  suggestions: readonly SlashSuggestion[];
};

type SlashInvocation = {
  context: SlashCommandContext;
  name: string;
  argumentsText: string;
  matches: SlashCommand[];
  // Present once a complete command name with suggestions has its arguments
  // open, so the menu offers argument values instead of command names.
  picker: SlashPicker | null;
  // A chosen command whose arguments are being typed: Enter still runs it, but
  // the menu has done its job and stays out of the way.
  hidden: boolean;
};

/**
 * A closed slash menu. `name: null` means Escape closed it, so the text is left
 * alone entirely. A name means that command was chosen from the menu.
 */
type ClosedSlash = { position: number; name: string | null };

const closeSlashMenu = StateEffect.define<ClosedSlash>();

const closedSlashField = StateField.define<ClosedSlash | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(closeSlashMenu)) return effect.value;
    }
    if (!value) return null;
    const position = transaction.changes.mapPos(value.position);
    const { doc, selection } = transaction.state;
    const head = selection.main.head;
    // Editing the command itself, or leaving it, lets the menu open again.
    const marker = value.name === null ? "/" : `/${value.name} `;
    if (doc.sliceString(position, position + marker.length) !== marker) return null;
    if (head < position + marker.length || doc.lineAt(head).number !== doc.lineAt(position).number) return null;
    return { ...value, position };
  },
});

function allCommands(plugins: readonly DaydockPlugin[]): SlashCommand[] {
  return plugins.flatMap((plugin) => [...(plugin.commands ?? [])]);
}

/** The menu shows the command's real name, so what you read is what you type. */
function commandLabel(command: SlashCommand) {
  return `${command.name.charAt(0).toUpperCase()}${command.name.slice(1)}`;
}

function slashInvocation(state: EditorState, host: PluginEditorHost): SlashInvocation | null {
  const selection = state.selection.main;
  if (!selection.empty) return null;
  const line = state.doc.lineAt(selection.head);
  const beforeCursor = line.text.slice(0, selection.head - line.from);
  const match = beforeCursor.match(/(?:^|\s)\/([a-z-]*)(?:\s+(.*))?$/i);
  if (!match || match.index === undefined) return null;
  const slashOffset = match.index + (match[0].startsWith("/") ? 0 : 1);
  const commandFrom = line.from + slashOffset;
  const closedState = state.field(closedSlashField, false);
  const closed = closedState?.position === commandFrom ? closedState : null;
  if (closed && closed.name === null) return null;

  const name = match[1].toLowerCase();
  const hasArguments = match[2] !== undefined;
  const matches = allCommands(host.plugins)
    .filter((command) => !name || command.name.startsWith(name))
    .sort((a, b) => Number(b.name === name) - Number(a.name === name));
  if (matches.length === 0) return null;

  const argumentsText = match[2] ?? "";
  const exact = matches.find((command) => command.name === name);
  const suggestions = exact?.suggest && hasArguments && !closed
    ? exact.suggest(argumentsText, { documents: host.documents?.() ?? [] })
    : [];

  return {
    context: {
      document: state.doc.toString(),
      lineFrom: line.from,
      lineTo: line.to,
      lineText: line.text,
      commandFrom,
      commandTo: selection.head,
      prefix: line.text.slice(0, slashOffset),
    },
    name,
    argumentsText,
    matches,
    picker: exact && suggestions.length > 0 ? { command: exact, suggestions } : null,
    hidden: closed !== null,
  };
}

function menuItemCount(invocation: SlashInvocation) {
  return invocation.picker?.suggestions.length ?? invocation.matches.length;
}

function menuKey(invocation: SlashInvocation) {
  return JSON.stringify([
    invocation.name,
    invocation.argumentsText,
    ...invocation.matches.map((command) => command.name),
    ...(invocation.picker?.suggestions.map((suggestion) => suggestion.label) ?? []),
  ]);
}

function selectedCommand(invocation: SlashInvocation, index: number): SlashCommand | null {
  if (invocation.hidden) return invocation.matches.find((command) => command.name === invocation.name) ?? null;
  return invocation.matches[Math.max(0, Math.min(index, invocation.matches.length - 1))] ?? null;
}

function currentMenuIndex(view: EditorView, count: number) {
  const parsed = Number(view.dom.dataset.daydockSlashIndex ?? "0");
  return Number.isInteger(parsed) ? Math.max(0, Math.min(parsed, count - 1)) : 0;
}

function renderMenuSelection(view: EditorView, index: number) {
  view.dom.dataset.daydockSlashIndex = String(index);
  const options = view.dom.querySelectorAll<HTMLButtonElement>(".daydock-slash-menu [role=option]");
  options.forEach((option, optionIndex) => {
    const selected = optionIndex === index;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", String(selected));
  });
  options[index]?.scrollIntoView({ block: "nearest" });
}

/** Write the chosen command's name, ready for its arguments, and close the menu. */
function completeCommand(view: EditorView, invocation: SlashInvocation, command: SlashCommand) {
  const insert = `/${command.name} ${invocation.argumentsText.trim()}`;
  const { commandFrom, commandTo } = invocation.context;
  view.dispatch({
    changes: { from: commandFrom, to: commandTo, insert },
    selection: EditorSelection.cursor(commandFrom + insert.length),
    // A command with suggestions opens its picker next instead.
    effects: command.suggest ? [] : closeSlashMenu.of({ position: commandFrom, name: command.name }),
  });
  return true;
}

function applyCommand(view: EditorView, invocation: SlashInvocation, command: SlashCommand, host: PluginEditorHost) {
  if (command.name !== invocation.name) return completeCommand(view, invocation, command);
  if (host.mode === "template") return false;
  const outcome = command.run(invocation.context, invocation.argumentsText);
  // A command that rejected its arguments keeps them on screen. Replacing the
  // line here would delete exactly the text the person needs in order to fix it.
  if (isCommandFailure(outcome)) {
    host.reportError(outcome.error);
    return true;
  }
  if (!outcome) {
    // Already chosen and still waiting for arguments: let Enter be a new line.
    if (invocation.hidden) return false;
    return completeCommand(view, invocation, command);
  }
  replaceEditorDocument(view, outcome.document, outcome.selection);
  queueMicrotask(() => void host.requestSave());
  return true;
}

function applySuggestion(
  view: EditorView,
  invocation: SlashInvocation,
  picker: SlashPicker,
  suggestion: SlashSuggestion,
  host: PluginEditorHost,
) {
  const outcome = picker.command.run(invocation.context, suggestion.argumentsText);
  if (isCommandFailure(outcome)) {
    host.reportError(outcome.error);
    return true;
  }
  if (!outcome) return false;
  replaceEditorDocument(view, outcome.document, outcome.selection);
  if (host.mode !== "template") queueMicrotask(() => void host.requestSave());
  return true;
}

class MountedPluginWidget extends WidgetType {
  private cleanup: (() => void) | undefined;

  constructor(
    readonly spec: PluginWidgetSpec,
    readonly host: PluginEditorHost,
  ) {
    super();
  }

  eq(other: MountedPluginWidget) {
    return other.spec.key === this.spec.key;
  }

  toDOM(view: EditorView) {
    const element = document.createElement(this.spec.placement === "block" ? "div" : "span");
    element.className = this.spec.className;
    const context: PluginUpdateContext = {
      getDocument: () => view.state.doc.toString(),
      updateDocument: async (update, options) => {
        const current = view.state.doc.toString();
        const next = update(current);
        if (next === current) return true;
        replaceEditorDocument(view, next);
        if (!options?.durable) return true;
        // CodeMirror's update listener has synchronously handed the new document
        // to React before this microtask, so the save sees this exact transition.
        await Promise.resolve();
        const saved = await this.host.requestSave();
        if (!saved) this.host.reportError("The timer change is still open in the editor but could not be saved to disk.");
        return saved;
      },
      reportError: this.host.reportError,
    };
    this.cleanup = this.spec.mount(element, context) ?? undefined;
    return element;
  }

  destroy() {
    this.cleanup?.();
    this.cleanup = undefined;
  }

  ignoreEvent() {
    return false;
  }
}

type MenuRow = {
  icon?: SlashIcon;
  label: string;
  hint?: string;
  tooltip?: string;
};

function menuIcon(icon: SlashIcon | undefined) {
  const wrapper = document.createElement("span");
  wrapper.className = "daydock-slash-icon";
  wrapper.append(pluginIcon(icon ?? "command"));
  return wrapper;
}

function menuHint(text: string) {
  const hint = document.createElement("kbd");
  hint.className = "daydock-slash-hint";
  hint.textContent = text;
  return hint;
}

class SlashMenuWidget extends WidgetType {
  constructor(
    readonly invocation: SlashInvocation,
    readonly host: PluginEditorHost,
  ) {
    super();
  }

  eq(other: SlashMenuWidget) {
    return menuKey(other.invocation) === menuKey(this.invocation);
  }

  toDOM(view: EditorView) {
    const key = menuKey(this.invocation);
    if (view.dom.dataset.daydockSlashKey !== key) {
      // A changed filter starts from its best match rather than a stale row.
      view.dom.dataset.daydockSlashKey = key;
      view.dom.dataset.daydockSlashIndex = "0";
    }
    const anchor = document.createElement("span");
    anchor.className = "daydock-slash-anchor";
    const menu = document.createElement("span");
    menu.className = "daydock-slash-menu";
    const list = document.createElement("span");
    list.className = "daydock-slash-list";
    list.setAttribute("role", "listbox");
    const selectedIndex = currentMenuIndex(view, menuItemCount(this.invocation));
    const picker = this.invocation.picker;

    const section = document.createElement("span");
    section.className = "daydock-slash-section";
    section.textContent = picker ? picker.command.description : "Commands";
    list.append(section);

    const option = (index: number, row: MenuRow, choose: () => void) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "daydock-slash-option";
      button.setAttribute("role", "option");
      button.classList.toggle("selected", index === selectedIndex);
      button.setAttribute("aria-selected", String(index === selectedIndex));
      if (row.tooltip) button.title = row.tooltip;
      const label = document.createElement("span");
      label.className = "daydock-slash-label";
      label.textContent = row.label;
      button.append(menuIcon(row.icon), label);
      if (row.hint) button.append(menuHint(row.hint));
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        choose();
      });
      button.addEventListener("mouseenter", () => renderMenuSelection(view, index));
      list.append(button);
    };

    if (picker) {
      for (const [index, suggestion] of picker.suggestions.entries()) {
        option(index, {
          icon: suggestion.icon ?? picker.command.icon,
          label: suggestion.label,
          hint: suggestion.detail,
        }, () => {
          applySuggestion(view, this.invocation, picker, suggestion, this.host);
        });
      }
    } else {
      for (const [index, command] of this.invocation.matches.entries()) {
        option(index, {
          icon: command.icon,
          label: commandLabel(command),
          hint: command.usage,
          tooltip: command.description,
        }, () => {
          applyCommand(view, this.invocation, command, this.host);
        });
      }
    }

    const footer = document.createElement("span");
    footer.className = "daydock-slash-footer";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "daydock-slash-close";
    const closeLabel = document.createElement("span");
    closeLabel.className = "daydock-slash-label";
    closeLabel.textContent = "Close menu";
    close.append(closeLabel, menuHint("esc"));
    close.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({ effects: closeSlashMenu.of({ position: this.invocation.context.commandFrom, name: null }) });
    });
    footer.append(close);

    menu.append(list, footer);
    anchor.append(menu);
    // Open upward when the menu would run past the bottom of the window.
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 8 && rect.top - rect.height - 44 > 0) menu.classList.add("above");
    });
    return anchor;
  }

  ignoreEvent() {
    return false;
  }
}

type PluginDecorations = {
  decorations: DecorationSet;
  /** Plugin widgets alone, which the cursor and deletion treat as single units. */
  atomic: DecorationSet;
};

function pluginDecorations(state: EditorState, host: PluginEditorHost): PluginDecorations {
  const ranges: Array<ReturnType<Decoration["range"]>> = [];
  const widgets: Array<ReturnType<Decoration["range"]>> = [];
  const documentText = state.doc.toString();
  const footer = stateFooterRange(documentText);
  if (footer) ranges.push(Decoration.replace({ block: true }).range(footer.from, footer.to));

  let position = 0;
  while (position <= state.doc.length) {
    const line = state.doc.lineAt(position);
    if (footer && line.from >= footer.from) break;
    for (const plugin of host.plugins) {
      for (const contribution of plugin.decorateLine?.({
        document: documentText,
        line: { from: line.from, to: line.to, number: line.number, text: line.text },
      }) ?? []) {
        const range = Decoration.replace({
          widget: new MountedPluginWidget(contribution.widget, host),
          block: contribution.widget.placement === "block",
        }).range(contribution.from, contribution.to);
        ranges.push(range);
        widgets.push(range);
      }
    }
    if (line.to === state.doc.length) break;
    position = line.to + 1;
  }

  const invocation = slashInvocation(state, host);
  if (invocation && !invocation.hidden) {
    ranges.push(Decoration.widget({
      widget: new SlashMenuWidget(invocation, host),
      side: 1,
    }).range(state.selection.main.head));
  }
  return { decorations: Decoration.set(ranges, true), atomic: Decoration.set(widgets, true) };
}

/**
 * Deleting a widget's marker also deletes the state it kept in the footer. The
 * cleanup joins the same transaction, so a single undo brings both back.
 */
function pruneOrphanedState(host: PluginEditorHost): Extension {
  return EditorState.transactionFilter.of((transaction) => {
    if (!transaction.docChanged) return transaction;
    const pruners = host.plugins.flatMap((plugin) => (plugin.pruneState ? [plugin.pruneState] : []));
    if (pruners.length === 0) return transaction;
    const before = transaction.newDoc.toString();
    const after = pruners.reduce((document, prune) => prune(document), before);
    if (after === before) return transaction;
    return [transaction, { changes: minimalChange(before, after), sequential: true }];
  });
}

export function pluginEditorExtensions(host: PluginEditorHost): Extension[] {
  const decorations = StateField.define<PluginDecorations>({
    create(state) {
      return pluginDecorations(state, host);
    },
    update(_decorations, transaction) {
      return pluginDecorations(transaction.state, host);
    },
    provide: (field) => [
      EditorView.decorations.from(field, (value) => value.decorations),
      // A widget is one unit: the cursor steps over it and Backspace removes all
      // of it, instead of exposing the Markdown marker underneath.
      EditorView.atomicRanges.of((view) => view.state.field(field).atomic),
    ],
  });

  // The closed-menu field must precede the decorations that read it.
  return [closedSlashField, decorations, pruneOrphanedState(host)];
}

export function runPluginSlashCommand(view: EditorView, host: PluginEditorHost): boolean {
  const invocation = slashInvocation(view.state, host);
  if (!invocation) return false;
  const index = currentMenuIndex(view, menuItemCount(invocation));
  if (invocation.picker) {
    return applySuggestion(view, invocation, invocation.picker, invocation.picker.suggestions[index], host);
  }
  const command = selectedCommand(invocation, index);
  if (!command) return false;
  return applyCommand(view, invocation, command, host);
}

export function movePluginSlashSelection(
  view: EditorView,
  host: PluginEditorHost,
  direction: -1 | 1,
): boolean {
  const invocation = slashInvocation(view.state, host);
  if (!invocation || invocation.hidden) return false;
  const count = menuItemCount(invocation);
  const current = currentMenuIndex(view, count);
  const next = (current + direction + count) % count;
  renderMenuSelection(view, next);
  return true;
}

export function dismissPluginSlashMenu(view: EditorView, host: PluginEditorHost): boolean {
  const invocation = slashInvocation(view.state, host);
  if (!invocation || invocation.hidden) return false;
  view.dispatch({ effects: closeSlashMenu.of({ position: invocation.context.commandFrom, name: null }) });
  return true;
}
