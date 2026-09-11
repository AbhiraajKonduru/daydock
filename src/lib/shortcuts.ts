import type { DesktopPlatform } from "./platform";

export type AppCommand =
  | "block-reload"
  | "open-today"
  | "open-yesterday"
  | "open-tomorrow"
  | "open-last-week"
  | "open-this-week"
  | "open-next-week"
  | "search"
  | "save"
  | "sync"
  | "toggle-sidebar"
  | "zoom-in"
  | "zoom-out"
  | "zoom-reset"
  | "toggle-plan"
  | "toggle-plan-reference"
  | "apply-template"
  | "toggle-current-task"
  | "reset-page-tasks"
  | "complete-page-tasks"
  | "close-window"
  | "quit-app"
  | "share-feedback";

export type KeyboardShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

type Modifiers = {
  alt?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
};

function hasModifiers(event: KeyboardShortcutEvent, modifiers: Modifiers): boolean {
  return event.altKey === Boolean(modifiers.alt)
    && event.ctrlKey === Boolean(modifiers.ctrl)
    && event.metaKey === Boolean(modifiers.meta)
    && event.shiftKey === Boolean(modifiers.shift);
}

function keyIs(event: KeyboardShortcutEvent, key: string): boolean {
  return event.key.toLowerCase() === key;
}

function letterIs(event: KeyboardShortcutEvent, letter: string): boolean {
  return event.code === `Key${letter.toUpperCase()}` || keyIs(event, letter);
}

function macCommand(event: KeyboardShortcutEvent): AppCommand | null {
  if (hasModifiers(event, { meta: true })) {
    if (letterIs(event, "r")) return "block-reload";
    if (letterIs(event, "k")) return "search";
    if (letterIs(event, "s")) return "save";
    if (event.code === "Digit1" || event.code === "Numpad1") return "open-today";
    if (event.code === "Digit2" || event.code === "Numpad2") return "open-yesterday";
    if (event.code === "Digit3" || event.code === "Numpad3") return "open-tomorrow";
    if (event.code === "Digit4" || event.code === "Numpad4") return "open-last-week";
    if (event.code === "Digit5" || event.code === "Numpad5") return "open-this-week";
    if (event.code === "Digit6" || event.code === "Numpad6") return "open-next-week";
    if (event.code === "Minus" || event.code === "NumpadSubtract") return "zoom-out";
    if (event.code === "Digit0" || event.code === "Numpad0") return "zoom-reset";
  }
  if (hasModifiers(event, { meta: true, shift: true })) {
    if (letterIs(event, "s")) return "sync";
    if (letterIs(event, "p")) return "toggle-plan";
    if (letterIs(event, "d")) return "toggle-plan-reference";
    if (letterIs(event, "e")) return "apply-template";
    if (letterIs(event, "f")) return "share-feedback";
    if (event.code === "Equal" || event.code === "NumpadAdd" || event.key === "+") return "zoom-in";
  }
  if (hasModifiers(event, { alt: true, meta: true })) {
    if (letterIs(event, "s")) return "toggle-sidebar";
    if (letterIs(event, "r")) return "reset-page-tasks";
    if (letterIs(event, "f")) return "complete-page-tasks";
  }
  return null;
}

function windowsOrLinuxCommand(event: KeyboardShortcutEvent): AppCommand | null {
  const primary = event.ctrlKey || event.metaKey;
  if (primary && !event.altKey && !event.shiftKey) {
    if (keyIs(event, "r")) return "block-reload";
    if (keyIs(event, "k")) return "search";
    if (keyIs(event, "s")) return "save";
    if (event.code === "Period") return "toggle-sidebar";
    if (event.code === "Digit0" || event.code === "Numpad0") return "zoom-reset";
  }
  if (primary && !event.altKey && event.shiftKey) {
    if (keyIs(event, "s")) return "sync";
    if (keyIs(event, "f")) return "share-feedback";
    if (event.code === "Equal" || event.code === "NumpadAdd" || event.key === "+") return "zoom-in";
    if (event.code === "Minus" || event.code === "NumpadSubtract" || event.key === "_") return "zoom-out";
  }
  if (!primary && event.altKey && !event.shiftKey) {
    if (keyIs(event, "t")) return "open-today";
    if (keyIs(event, "y")) return "open-yesterday";
    if (keyIs(event, "o")) return "open-tomorrow";
    if (keyIs(event, "l")) return "open-last-week";
    if (keyIs(event, "w")) return "open-this-week";
    if (keyIs(event, "n")) return "open-next-week";
    if (keyIs(event, "p")) return "toggle-plan";
    if (keyIs(event, "d")) return "toggle-plan-reference";
    if (keyIs(event, "e")) return "apply-template";
  }
  if (event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey) {
    if (keyIs(event, "r")) return "reset-page-tasks";
    if (keyIs(event, "f")) return "complete-page-tasks";
  }
  return null;
}

export function commandForKeyboardEvent(
  event: KeyboardShortcutEvent,
  platform: DesktopPlatform,
): AppCommand | null {
  return platform === "macos" ? macCommand(event) : windowsOrLinuxCommand(event);
}

const WINDOWS_LABELS: Partial<Record<AppCommand, string>> = {
  "open-today": "Alt T",
  "open-yesterday": "Alt Y",
  "open-tomorrow": "Alt O",
  "open-last-week": "Alt L",
  "open-this-week": "Alt W",
  "open-next-week": "Alt N",
  search: "Ctrl K",
  save: "Ctrl S",
  sync: "Ctrl Shift S",
  "toggle-sidebar": "Ctrl .",
  "zoom-in": "Ctrl Shift +",
  "zoom-out": "Ctrl Shift -",
  "zoom-reset": "Ctrl 0",
  "toggle-plan": "Alt P",
  "toggle-plan-reference": "Alt D",
  "apply-template": "Alt E",
  "toggle-current-task": "Ctrl Enter",
  "reset-page-tasks": "Ctrl Alt R",
  "complete-page-tasks": "Ctrl Alt F",
  "share-feedback": "Ctrl Shift F",
};

const MAC_LABELS: Partial<Record<AppCommand, string>> = {
  "open-today": "⌘1",
  "open-yesterday": "⌘2",
  "open-tomorrow": "⌘3",
  "open-last-week": "⌘4",
  "open-this-week": "⌘5",
  "open-next-week": "⌘6",
  search: "⌘K",
  save: "⌘S",
  sync: "⇧⌘S",
  "toggle-sidebar": "⌥⌘S",
  "zoom-in": "⌘+",
  "zoom-out": "⌘−",
  "zoom-reset": "⌘0",
  "toggle-plan": "⇧⌘P",
  "toggle-plan-reference": "⇧⌘D",
  "apply-template": "⇧⌘E",
  "toggle-current-task": "⌘↩",
  "reset-page-tasks": "⌥⌘R",
  "complete-page-tasks": "⌥⌘F",
  "share-feedback": "⇧⌘F",
};

export function shortcutLabel(command: AppCommand, platform: DesktopPlatform): string {
  return (platform === "macos" ? MAC_LABELS : WINDOWS_LABELS)[command] ?? "";
}
