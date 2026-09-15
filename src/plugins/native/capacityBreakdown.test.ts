import { describe, expect, it } from "vitest";
import { capacityBreakdown } from "./capacity";
import {
  createBlockSource,
  createCapacitySource,
  createTimeEntrySource,
  withTimeBlockState,
  type TimeBlockState,
} from "./timeModel";

const now = Date.parse("2026-09-14T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

function page(blocks: Array<{ id: string; planned: number; state: TimeBlockState }>, entries: number[] = []) {
  let document = [
    "# Today",
    "",
    createCapacitySource(240),
    ...blocks.map((block) => createBlockSource(block.id, block.planned, "block", "Work")),
    ...entries.map((minutes) => createTimeEntrySource(minutes, "block", "Class")),
    "",
  ].join("\n");
  for (const block of blocks) document = withTimeBlockState(document, block.id, block.state);
  return document;
}

describe("capacity breakdown", () => {
  it("counts an untouched block as planned only, and static time as planned and done", () => {
    const document = page([{ id: "tb_ready", planned: 60, state: { status: "ready", sessions: [] } }], [30]);
    expect(capacityBreakdown(document, now)).toEqual({ plannedMinutes: 90, doneMinutes: 30, projectedMinutes: 90 });
  });

  it("projects a finished block at what it actually took, over or under plan", () => {
    const document = page([
      { id: "tb_late", planned: 60, state: { status: "completed", sessions: [{ started: minutesAgo(75), stopped: minutesAgo(0) }] } },
      { id: "tb_early", planned: 60, state: { status: "completed", sessions: [{ started: minutesAgo(20), stopped: minutesAgo(0) }] } },
    ]);
    expect(capacityBreakdown(document, now)).toEqual({ plannedMinutes: 120, doneMinutes: 95, projectedMinutes: 95 });
  });

  it("keeps a paused block at its plan while counting the time already spent", () => {
    const document = page([
      { id: "tb_paused", planned: 60, state: { status: "paused", sessions: [{ started: minutesAgo(20), stopped: minutesAgo(0) }] } },
    ]);
    expect(capacityBreakdown(document, now)).toEqual({ plannedMinutes: 60, doneMinutes: 20, projectedMinutes: 60 });
  });

  it("lets a running block in overtime push the projection past its plan", () => {
    const document = page([
      { id: "tb_running", planned: 30, state: { status: "running", sessions: [{ started: minutesAgo(45) }] } },
    ]);
    expect(capacityBreakdown(document, now)).toEqual({ plannedMinutes: 30, doneMinutes: 45, projectedMinutes: 45 });
  });
});
