import { describe, expect, it } from "vitest";
import { deferredUpdateValue, isUpdateDeferred, UPDATE_DEFER_MS } from "./updater";

describe("update deferral", () => {
  it("defers the same version for 24 hours", () => {
    const now = Date.UTC(2026, 8, 10);
    const value = deferredUpdateValue("0.3.0", now);

    expect(isUpdateDeferred("0.3.0", value, now + UPDATE_DEFER_MS - 1)).toBe(true);
    expect(isUpdateDeferred("0.3.0", value, now + UPDATE_DEFER_MS)).toBe(false);
  });

  it("does not hide a newer version", () => {
    const value = deferredUpdateValue("0.3.0", 1000);
    expect(isUpdateDeferred("0.3.1", value, 1001)).toBe(false);
  });

  it("ignores malformed stored preferences", () => {
    expect(isUpdateDeferred("0.3.0", "not json", 1000)).toBe(false);
    expect(isUpdateDeferred("0.3.0", '{"version":"0.3.0"}', 1000)).toBe(false);
  });
});
