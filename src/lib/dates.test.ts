import { describe, expect, it } from "vitest";
import type { NotebookFile } from "../types";
import {
  calculateSystemStreak,
  dailyTemplate,
  isoWeek,
  setSystemStreak,
} from "./dates";

function day(path: string, task = "Do the thing"): NotebookFile {
  return {
    path: `Daily/${path}.md`,
    name: path,
    modified: 0,
    content: `# Day\n\n## Win\n\n- [ ] ${task}\n\n## Tasks\n`,
    loaded: true,
  };
}

describe("System streak", () => {
  it("counts planned days and tolerates one missing day", () => {
    expect(
      calculateSystemStreak(
        [day("2026-08-03"), day("2026-08-01"), day("2026-07-31")],
        "2026-08-03",
      ),
    ).toBe(3);
  });

  it("resets after two consecutive missing days", () => {
    expect(
      calculateSystemStreak(
        [day("2026-08-03"), day("2026-07-31"), day("2026-07-30")],
        "2026-08-03",
      ),
    ).toBe(1);
  });

  it("does not count an empty template as planning", () => {
    const file = day("2026-08-03", "");
    expect(calculateSystemStreak([file], "2026-08-03")).toBe(0);
  });

  it("counts even a one-character planned task", () => {
    expect(calculateSystemStreak([day("2026-08-03", "X")], "2026-08-03")).toBe(1);
  });

  it("updates a stored streak line", () => {
    expect(setSystemStreak("# Today\n\n🔥 System streak: 2\n", 3)).toContain(
      "System streak: 3",
    );
  });
});

describe("templates and dates", () => {
  it("includes a Limits section in each new daily page", () => {
    expect(dailyTemplate("2026-08-03")).toContain("## Limits\n\n- [ ]");
  });

  it("uses the requested System streak label", () => {
    expect(dailyTemplate("2026-08-03", 12)).toContain("🔥 System streak: 12");
  });

  it("calculates ISO week boundaries", () => {
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ year: 2026, week: 53 });
  });
});
