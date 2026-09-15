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

export type EditorShortcutCommand =
  | "collapse-current-nested"
  | "expand-current-nested"
  | "collapse-all-nested"
  | "expand-all-nested";

export type ShortcutCommand = AppCommand | EditorShortcutCommand;

export type KeyboardShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

type ShortcutBinding = {
  key?: string;
  code?: string;
  mod?: boolean;
  alt?: boolean;
  shift?: boolean;
};

/** `null` means the command has no keyboard binding on that platform. */
type PlatformBinding = ShortcutBinding | ShortcutBinding[] | null;

type ShortcutDefinition = {
  command: ShortcutCommand;
  title: string;
  section: "Navigation" | "Editing" | "View" | "Notebook";
  scope?: "app" | "editor";
  hidden?: boolean;
  mac: PlatformBinding;
  windows: PlatformBinding;
};

const definition = (
  command: ShortcutCommand,
  title: string,
  section: ShortcutDefinition["section"],
  binding: ShortcutBinding,
  options: Partial<Pick<ShortcutDefinition, "scope" | "hidden">> = {},
): ShortcutDefinition => ({ command, title, section, mac: binding, windows: binding, ...options });

/** The single source of truth for keyboard handling, labels, and Settings. */
export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { command: "open-today", title: "Open today", section: "Navigation", mac: { mod: true, code: "Digit1" }, windows: { alt: true, code: "KeyT" } },
  { command: "open-yesterday", title: "Open yesterday", section: "Navigation", mac: { mod: true, code: "Digit2" }, windows: { alt: true, code: "KeyY" } },
  { command: "open-tomorrow", title: "Open tomorrow", section: "Navigation", mac: { mod: true, code: "Digit3" }, windows: { alt: true, code: "KeyO" } },
  { command: "open-last-week", title: "Open last week", section: "Navigation", mac: { mod: true, code: "Digit4" }, windows: { alt: true, code: "KeyL" } },
  { command: "open-this-week", title: "Open this week", section: "Navigation", mac: { mod: true, code: "Digit5" }, windows: { alt: true, code: "KeyW" } },
  { command: "open-next-week", title: "Open next week", section: "Navigation", mac: { mod: true, code: "Digit6" }, windows: { alt: true, code: "KeyN" } },
  definition("search", "Search notebook", "Navigation", { mod: true, code: "KeyK" }),

  definition("toggle-current-task", "Toggle current task", "Editing", { mod: true, code: "Enter" }, { scope: "editor" }),
  definition("collapse-current-nested", "Collapse current nested list", "Editing", { mod: true, shift: true, key: "[" }, { scope: "editor" }),
  definition("expand-current-nested", "Expand current nested list", "Editing", { mod: true, shift: true, key: "]" }, { scope: "editor" }),
  definition("collapse-all-nested", "Collapse all nested lists", "Editing", { mod: true, alt: true, key: "[" }, { scope: "editor" }),
  definition("expand-all-nested", "Expand all nested lists", "Editing", { mod: true, alt: true, key: "]" }, { scope: "editor" }),
  definition("reset-page-tasks", "Mark all tasks incomplete", "Editing", { mod: true, alt: true, code: "KeyR" }),
  definition("complete-page-tasks", "Mark all tasks complete", "Editing", { mod: true, alt: true, code: "KeyF" }),

  { command: "toggle-sidebar", title: "Toggle sidebar", section: "View", mac: { mod: true, alt: true, code: "KeyS" }, windows: { mod: true, code: "Period" } },
  { command: "toggle-plan", title: "Toggle planning view", section: "View", mac: { mod: true, shift: true, code: "KeyP" }, windows: { alt: true, code: "KeyP" } },
  { command: "toggle-plan-reference", title: "Switch plan reference", section: "View", mac: { mod: true, shift: true, code: "KeyD" }, windows: { alt: true, code: "KeyD" } },
  { command: "apply-template", title: "Apply template", section: "View", mac: { mod: true, shift: true, code: "KeyE" }, windows: { alt: true, code: "KeyE" } },
  { command: "zoom-in", title: "Zoom in", section: "View", mac: [{ mod: true, code: "Equal" }, { mod: true, shift: true, code: "Equal" }], windows: { mod: true, shift: true, code: "Equal" } },
  { command: "zoom-out", title: "Zoom out", section: "View", mac: { mod: true, code: "Minus" }, windows: { mod: true, shift: true, code: "Minus" } },
  definition("zoom-reset", "Actual size", "View", { mod: true, code: "Digit0" }),

  definition("save", "Save", "Notebook", { mod: true, code: "KeyS" }),
  definition("sync", "Sync notebook", "Notebook", { mod: true, shift: true, code: "KeyS" }),
  definition("share-feedback", "Share feedback", "Notebook", { mod: true, shift: true, code: "KeyF" }),
  // Served by the macOS application menu, so they carry no in-page binding elsewhere.
  { command: "close-window", title: "Close window", section: "Notebook", mac: { mod: true, code: "KeyW" }, windows: null },
  { command: "quit-app", title: "Quit Daydock", section: "Notebook", mac: { mod: true, code: "KeyQ" }, windows: null },
  definition("block-reload", "Reload", "Notebook", { mod: true, code: "KeyR" }, { hidden: true }),
];

function bindingsFor(definition: ShortcutDefinition, platform: DesktopPlatform): ShortcutBinding[] {
  const configured = platform === "macos" ? definition.mac : definition.windows;
  if (!configured) return [];
  return Array.isArray(configured) ? configured : [configured];
}

function bindingFor(definition: ShortcutDefinition, platform: DesktopPlatform): ShortcutBinding | undefined {
  return bindingsFor(definition, platform)[0];
}

function matches(event: KeyboardShortcutEvent, binding: ShortcutBinding, platform: DesktopPlatform): boolean {
  const mod = platform === "macos" ? event.metaKey : event.ctrlKey || event.metaKey;
  if (mod !== Boolean(binding.mod)) return false;
  if (event.altKey !== Boolean(binding.alt) || event.shiftKey !== Boolean(binding.shift)) return false;
  if (platform === "macos" && event.ctrlKey) return false;
  if (binding.code && event.code !== binding.code) return false;
  if (binding.key && event.key !== binding.key) return false;
  return true;
}

export function commandForKeyboardEvent(event: KeyboardShortcutEvent, platform: DesktopPlatform): AppCommand | null {
  const match = SHORTCUT_DEFINITIONS.find((candidate) =>
    candidate.scope !== "editor"
      && bindingsFor(candidate, platform).some((binding) => matches(event, binding, platform)),
  );
  return match?.command as AppCommand | undefined ?? null;
}

function keyName(binding: ShortcutBinding): string {
  if (binding.key === "[") return "[";
  if (binding.key === "]") return "]";
  if (binding.code?.startsWith("Key")) return binding.code.slice(3);
  if (binding.code?.startsWith("Digit")) return binding.code.slice(5);
  if (binding.code === "Period") return ".";
  if (binding.code === "Equal") return "+";
  if (binding.code === "Minus") return "−";
  if (binding.code === "Enter") return "Enter";
  return binding.key ?? binding.code ?? "";
}

function labelForBinding(binding: ShortcutBinding, platform: DesktopPlatform): string {
  const key = keyName(binding);
  if (platform === "macos") {
    return `${binding.shift ? "⇧" : ""}${binding.alt ? "⌥" : ""}${binding.mod ? "⌘" : ""}${key === "Enter" ? "↩" : key}`;
  }
  return [binding.mod ? "Ctrl" : "", binding.alt ? "Alt" : "", binding.shift ? "Shift" : "", key]
    .filter(Boolean)
    .join(" ");
}

export function shortcutLabel(command: ShortcutCommand, platform: DesktopPlatform): string {
  const item = SHORTCUT_DEFINITIONS.find((candidate) => candidate.command === command);
  const binding = item && bindingFor(item, platform);
  return binding ? labelForBinding(binding, platform) : "";
}

/** Every shortcut the app actually binds on this platform, for the Settings list. */
export function shortcutsForPlatform(platform: DesktopPlatform) {
  return SHORTCUT_DEFINITIONS
    .filter((item) => !item.hidden && bindingFor(item, platform))
    .map((item) => ({
      command: item.command,
      title: item.title,
      section: item.section,
      label: shortcutLabel(item.command, platform),
    }));
}

export function shortcutAccelerator(command: ShortcutCommand): string | undefined {
  const item = SHORTCUT_DEFINITIONS.find((candidate) => candidate.command === command);
  const binding = item && bindingFor(item, "macos");
  if (!binding) return undefined;
  const modifiers = [binding.mod ? "CmdOrCtrl" : "", binding.alt ? "Alt" : "", binding.shift ? "Shift" : ""].filter(Boolean);
  const key = keyName(binding).replace("−", "Minus");
  return [...modifiers, key].join("+");
}

export function codeMirrorShortcut(command: ShortcutCommand): string {
  const item = SHORTCUT_DEFINITIONS.find((candidate) => candidate.command === command);
  const binding = item && bindingFor(item, "macos");
  if (!binding) return "";
  return [
    binding.mod ? "Mod" : "",
    binding.alt ? "Alt" : "",
    binding.shift ? "Shift" : "",
    keyName(binding),
  ].filter(Boolean).join("-");
}
