import { describe, expect, it } from "vitest";
import { commandForKeyboardEvent, shortcutLabel, type KeyboardShortcutEvent } from "./shortcuts";

function key(
  value: string,
  modifiers: Partial<KeyboardShortcutEvent> = {},
): KeyboardShortcutEvent {
  return {
    key: value,
    code: `Key${value.toUpperCase()}`,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

describe("macOS shortcuts", () => {
  it("uses Command instead of Control for platform shortcuts", () => {
    expect(commandForKeyboardEvent(key("k", { metaKey: true }), "macos")).toBe("search");
    expect(commandForKeyboardEvent(key("k", { ctrlKey: true }), "macos")).toBeNull();
  });

  it("uses number keys for calendar navigation", () => {
    expect(commandForKeyboardEvent(key("1", { code: "Digit1", metaKey: true }), "macos")).toBe("open-today");
    expect(commandForKeyboardEvent(key("6", { code: "Digit6", metaKey: true }), "macos")).toBe("open-next-week");
  });

  it("matches Option-Command commands by physical modifiers", () => {
    expect(commandForKeyboardEvent(key("ß", { code: "KeyS", altKey: true, metaKey: true }), "macos")).toBe("toggle-sidebar");
    expect(commandForKeyboardEvent(key("®", { code: "KeyR", altKey: true, metaKey: true }), "macos")).toBe("reset-page-tasks");
  });

  it("renders native Mac key symbols", () => {
    expect(shortcutLabel("sync", "macos")).toBe("⇧⌘S");
    expect(shortcutLabel("toggle-sidebar", "macos")).toBe("⌥⌘S");
    expect(shortcutLabel("share-feedback", "macos")).toBe("⇧⌘F");
    expect(commandForKeyboardEvent(key("f", { metaKey: true, shiftKey: true }), "macos")).toBe("share-feedback");
  });
});

describe("Windows and Linux shortcuts", () => {
  it("preserves the existing Alt navigation shortcuts", () => {
    expect(commandForKeyboardEvent(key("t", { altKey: true }), "windows")).toBe("open-today");
    expect(commandForKeyboardEvent(key("w", { altKey: true }), "linux")).toBe("open-this-week");
  });

  it("preserves Control save, sync, and sidebar shortcuts", () => {
    expect(commandForKeyboardEvent(key("s", { ctrlKey: true }), "windows")).toBe("save");
    expect(commandForKeyboardEvent(key("s", { ctrlKey: true, shiftKey: true }), "windows")).toBe("sync");
    expect(commandForKeyboardEvent(key("f", { ctrlKey: true, shiftKey: true }), "windows")).toBe("share-feedback");
    expect(commandForKeyboardEvent(key(".", { code: "Period", ctrlKey: true }), "windows")).toBe("toggle-sidebar");
  });

  it("preserves task bulk actions", () => {
    expect(commandForKeyboardEvent(key("f", { altKey: true, ctrlKey: true }), "windows")).toBe("complete-page-tasks");
  });
});
