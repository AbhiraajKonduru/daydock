import { describe, expect, it } from "vitest";
import { moveMarkdownLines, movedLineMap } from "./lineDrag";

describe("Markdown line movement", () => {
  it("moves one line down without changing its contents", () => {
    expect(moveMarkdownLines("alpha\nbeta\ngamma\n", 1, 1, 3, true)).toEqual({
      document: "beta\ngamma\nalpha\n",
      fromLine: 3,
      toLine: 3,
    });
  });

  it("moves a contiguous group up as one unit", () => {
    expect(moveMarkdownLines("one\ntwo\nthree\nfour", 3, 4, 1, false)).toEqual({
      document: "three\nfour\none\ntwo",
      fromLine: 1,
      toLine: 2,
    });
  });

  it("preserves CRLF and the trailing newline", () => {
    expect(moveMarkdownLines("one\r\ntwo\r\nthree\r\n", 2, 2, 1, false)?.document).toBe(
      "two\r\none\r\nthree\r\n",
    );
  });

  it("does nothing when dropped inside the selected range or at the same boundary", () => {
    expect(moveMarkdownLines("one\ntwo\nthree", 1, 2, 2, false)).toBeNull();
    expect(moveMarkdownLines("one\ntwo\nthree", 2, 2, 1, true)).toBeNull();
  });

  it("reports where every line ends up, so collapsed items stay collapsed", () => {
    // Lines 1-2 are a parent and its child moving below line 4.
    const map = movedLineMap(5, 1, 2, 4, true);
    expect([...map.entries()]).toEqual([[3, 1], [4, 2], [1, 3], [2, 4], [5, 5]]);
    expect(movedLineMap(3, 2, 2, 1, true)).toEqual(new Map([[1, 1], [2, 2], [3, 3]]));
  });

  it("keeps a Daydock footer intact when a visible line is moved", () => {
    const document = "first\nsecond\n\n<!-- daydock:state\n{}\n-->\n";
    expect(moveMarkdownLines(document, 2, 2, 1, false)?.document).toBe(
      "second\nfirst\n\n<!-- daydock:state\n{}\n-->\n",
    );
  });
});
