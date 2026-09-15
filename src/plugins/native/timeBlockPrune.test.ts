import { describe, expect, it } from "vitest";
import {
  createBlockSource,
  parseDocumentState,
  pruneTimeBlockState,
  withTimeBlockState,
} from "./timeModel";

const ready = { status: "ready" as const, sessions: [] };

function page(...ids: string[]) {
  let document = `# Today\n\n${ids.map((id) => createBlockSource(id, 60, "block", "Work")).join("\n")}\n`;
  for (const id of ids) document = withTimeBlockState(document, id, ready);
  return document;
}

describe("time block state pruning", () => {
  it("drops the state of a block whose marker was deleted", () => {
    const document = page("tb_keep", "tb_gone").replace(createBlockSource("tb_gone", 60, "block", "Work"), "");
    expect(Object.keys(parseDocumentState(pruneTimeBlockState(document)).timeBlocks)).toEqual(["tb_keep"]);
  });

  it("removes the footer once no block needs it", () => {
    const document = page("tb_gone").replace(createBlockSource("tb_gone", 60, "block", "Work"), "");
    expect(pruneTimeBlockState(document)).not.toContain("daydock:state");
  });

  it("leaves a page untouched while every block is still present", () => {
    const document = page("tb_keep");
    expect(pruneTimeBlockState(document)).toBe(document);
  });
});
