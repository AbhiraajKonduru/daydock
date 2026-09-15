import { describe, expect, it } from "vitest";
import { pageListMove } from "./nestedLists";

// 1 "- [ ] Alone", 2 "", 3 "Plain line", 4 "- Item A", 5 "  - Child", 6 "- Item B"
const document = "- [ ] Alone\n\nPlain line\n- Item A\n  - Child\n- Item B";

describe("page list moves", () => {
  it("lets a lone top-level item move beside a plain line", () => {
    expect(pageListMove(document, 1, 3, true)).toMatchObject({
      fromLine: 1,
      toLine: 1,
      targetLine: 3,
      after: true,
    });
  });

  it("lands a top-level item before another list's item", () => {
    expect(pageListMove(document, 1, 4, false)).toMatchObject({ targetLine: 4, after: false });
  });

  it("never drops a top-level item inside another item's children", () => {
    expect(pageListMove(document, 1, 5, false)).toMatchObject({ targetLine: 5, after: true });
  });

  it("keeps nested items inside their own parent", () => {
    expect(pageListMove(document, 5, 3, false)).toBeNull();
  });
});
