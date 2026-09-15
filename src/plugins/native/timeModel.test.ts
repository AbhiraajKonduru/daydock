import { describe, expect, it } from "vitest";
import type { SlashCommandContext, SlashCommandOutcome } from "../api";
import { allocatedFocusMinutes, capacityPlugin } from "./capacity";
import { timeBlockPlugin } from "./timeBlock";
import { timeEntryPlugin } from "./timeEntry";
import {
  chargedMinutes,
  completeTimeBlock,
  elapsedMilliseconds,
  findCapacityAnchors,
  findTimeBlockAnchors,
  findTimeEntryAnchors,
  formatDuration,
  hasValidDocumentState,
  parseDocumentState,
  parseDuration,
  pauseTimeBlock,
  overtimeMilliseconds,
  remainingMilliseconds,
  signedRemainingMilliseconds,
  startTimeBlock,
  timeBlockAnchorAt,
  updateTimeBlockState,
  withoutStateFooter,
  writeDocumentState,
} from "./timeModel";

function commandContext(line: string): SlashCommandContext {
  const slash = line.indexOf("/");
  return {
    document: `${line}\n`,
    lineFrom: 0,
    lineTo: line.length,
    lineText: line,
    commandFrom: slash,
    commandTo: line.length,
    prefix: line.slice(0, slash),
  };
}

describe("plugin duration syntax", () => {
  it("accepts readable hour and minute forms and normalizes them", () => {
    expect(parseDuration("1 hour")?.minutes).toBe(60);
    expect(parseDuration("1.5h")?.minutes).toBe(90);
    expect(parseDuration("1h 30m")?.minutes).toBe(90);
    expect(parseDuration("45 minutes")?.minutes).toBe(45);
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("rejects zero and excessively long focus blocks", () => {
    expect(parseDuration("0m")).toBeNull();
    expect(parseDuration("25h")).toBeNull();
  });
});

describe("time-block Markdown", () => {
  it("turns a slash command after a task into a compact inline marker", () => {
    const command = timeBlockPlugin.commands![0];
    const result = command.run(commandContext("- [ ] Write proposal /block 1 hour"), "1 hour");
    expect(result).not.toBeNull();
    expect(withoutStateFooter(result!.document)).toMatch(
      /^- \[ \] Write proposal · ⏱ 1h <!--daydock:block:tb_[A-Za-z0-9]+-->$/,
    );
    const anchors = findTimeBlockAnchors(result!.document);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toMatchObject({ placement: "inline", plannedMinutes: 60, title: "Write proposal" });
    expect(parseDocumentState(result!.document).timeBlocks[anchors[0].id]).toEqual({
      status: "ready",
      sessions: [],
    });
  });

  it("turns a slash command on an empty line into a standalone marker", () => {
    const command = timeBlockPlugin.commands![0];
    const result = command.run(commandContext("/block 2h Architecture work"), "2h Architecture work");
    expect(withoutStateFooter(result!.document)).toMatch(
      /^⏱ Architecture work · 2h <!--daydock:block:tb_[A-Za-z0-9]+-->$/,
    );
    expect(findTimeBlockAnchors(result!.document)[0]).toMatchObject({
      placement: "block",
      plannedMinutes: 120,
      title: "Architecture work",
    });
  });

  it("keeps timer history in a readable hidden footer at the end", () => {
    const document = "# Today\n\n- [ ] Work · ⏱ 1h <!--daydock:block:tb_one-->\n";
    const updated = updateTimeBlockState(document, "tb_one", () => ({
      status: "paused",
      sessions: [{
        started: "2026-09-14T13:00:00.000Z",
        stopped: "2026-09-14T13:25:00.000Z",
      }],
    }));
    expect(updated).toContain("<!-- daydock:state\n{");
    expect(updated.trimEnd().slice(-3)).toBe("-->");
    expect(parseDocumentState(updated).timeBlocks.tb_one.status).toBe("paused");
    expect(withoutStateFooter(updated)).toBe(document.trimEnd());
  });

  it("never replaces a malformed external state footer", () => {
    const malformed = "# Today\n\n<!-- daydock:state\n{not json}\n-->\n";
    expect(hasValidDocumentState(malformed)).toBe(false);
    expect(updateTimeBlockState(malformed, "tb_one", () => ({ status: "ready", sessions: [] })))
      .toBe(malformed);
  });
});

describe("durable timer arithmetic", () => {
  const start = Date.parse("2026-09-14T13:00:00.000Z");

  it("reconstructs elapsed time entirely from saved timestamps", () => {
    const running = startTimeBlock({ status: "ready", sessions: [] }, start);
    expect(remainingMilliseconds(running, 60, start + 20 * 60_000)).toBe(40 * 60_000);
    const paused = pauseTimeBlock(running, start + 25 * 60_000);
    expect(elapsedMilliseconds(paused, start + 40 * 60_000)).toBe(25 * 60_000);
    const resumed = startTimeBlock(paused, start + 45 * 60_000);
    const completed = completeTimeBlock(resumed, start + 80 * 60_000);
    expect(elapsedMilliseconds(completed)).toBe(60 * 60_000);
  });
});

describe("static focus-time Markdown", () => {
  it("adds time to a task without creating timer state", () => {
    const command = timeEntryPlugin.commands![0];
    const result = command.run(commandContext("- [ ] Attend class /time 90m"), "90m");
    expect(withoutStateFooter(result!.document)).toBe(
      "- [ ] Attend class · ◷ 1h 30m <!--daydock:time-->",
    );
    expect(findTimeEntryAnchors(result!.document)[0]).toMatchObject({
      placement: "inline",
      minutes: 90,
      title: "Attend class",
    });
    expect(Object.keys(parseDocumentState(result!.document).timeBlocks)).toHaveLength(0);
  });

  it("creates a named standalone time entry", () => {
    const command = timeEntryPlugin.commands![0];
    const result = command.run(commandContext("/time 2h School"), "2h School");
    expect(result!.document.trim()).toBe("◷ School · 2h <!--daydock:time-->");
    expect(findTimeEntryAnchors(result!.document)[0]).toMatchObject({
      placement: "block",
      minutes: 120,
      title: "School",
    });
  });
});

describe("capacity Markdown", () => {
  it("creates one centered capacity marker", () => {
    const command = capacityPlugin.commands![0];
    const result = command.run(commandContext("/capacity 4 hours"), "4 hours");
    expect(result!.document.trim()).toBe("⏳ Focus capacity · 4h <!--daydock:capacity-->");
    expect(findCapacityAnchors(result!.document)[0].availableMinutes).toBe(240);
  });

  it("counts timed blocks and static time entries together", () => {
    const document = [
      "⏱ Deep work · 1h <!--daydock:block:tb_one-->",
      "◷ School · 2h <!--daydock:time-->",
      "⏳ Focus capacity · 4h <!--daydock:capacity-->",
    ].join("\n");
    expect(allocatedFocusMinutes(document)).toBe(180);
  });
});

/** A command typed mid-line: the cursor sits after the arguments, not at line end. */
function midLineContext(line: string): SlashCommandContext {
  const slash = line.indexOf("/");
  const cursor = line.indexOf("|");
  const text = line.replace("|", "");
  return {
    document: `${text}\n`,
    lineFrom: 0,
    lineTo: text.length,
    lineText: text,
    commandFrom: slash,
    commandTo: cursor,
    prefix: text.slice(0, slash),
  };
}

function failure(outcome: SlashCommandOutcome): string {
  expect(outcome && "error" in outcome).toBe(true);
  return (outcome as { error: string }).error;
}

describe("command arguments survive mistakes", () => {
  const block = timeBlockPlugin.commands![0];
  const time = timeEntryPlugin.commands![0];
  const capacity = capacityPlugin.commands![0];

  it("explains an unreadable duration instead of deleting it", () => {
    expect(failure(block.run(commandContext("/block 3 days"), "3 days"))).toMatch(/not a duration/i);
    expect(failure(block.run(commandContext("/block 25"), "25"))).toMatch(/not a duration/i);
    expect(failure(time.run(commandContext("/time banana"), "banana"))).toMatch(/not a duration/i);
  });

  it("names the limit when a duration is out of range", () => {
    expect(failure(block.run(commandContext("/block 30h"), "30h"))).toMatch(/24h/);
    expect(failure(block.run(commandContext("/block 0m"), "0m"))).toMatch(/at least a minute/i);
  });

  it("leaves a bare command as an editable prompt", () => {
    expect(block.run(commandContext("/block"), "")).toBeNull();
    expect(time.run(commandContext("/time"), "")).toBeNull();
    expect(capacity.run(commandContext("/capacity"), "")).toBeNull();
  });

  it("refuses an inline label rather than silently dropping it", () => {
    const outcome = block.run(commandContext("- [ ] Ship it /block 1h deep work"), "1h deep work");
    expect(failure(outcome)).toContain("deep work");
    expect(failure(time.run(commandContext("- [ ] Class /time 1h School"), "1h School"))).toContain("School");
  });

  it("keeps /capacity to its own line and to a bare duration", () => {
    expect(failure(capacity.run(commandContext("- [ ] Plan /capacity 4h"), "4h"))).toMatch(/line of its own/i);
    expect(failure(capacity.run(commandContext("/capacity 4h Work"), "4h Work"))).toContain("Work");
  });
});

describe("commands only replace the command itself", () => {
  it("keeps text that follows the cursor on a task line", () => {
    const block = timeBlockPlugin.commands![0];
    const result = block.run(midLineContext("- [ ] Write proposal /block 1h| and email Dana"), "1h");
    expect(result && "document" in result).toBe(true);
    expect(withoutStateFooter((result as { document: string }).document)).toMatch(
      /^- \[ \] Write proposal · ⏱ 1h <!--daydock:block:tb_[A-Za-z0-9]+--> and email Dana$/,
    );
  });

  it("moves trailing text below a standalone marker instead of swallowing it", () => {
    const time = timeEntryPlugin.commands![0];
    const result = time.run(midLineContext("/time 2h School|leftover note"), "2h School");
    expect((result as { document: string }).document.trimEnd()).toBe(
      "◷ School · 2h <!--daydock:time-->\nleftover note",
    );
  });
});

describe("a block that passes zero keeps counting", () => {
  const start = Date.parse("2026-09-14T13:00:00.000Z");

  it("reports negative time left rather than stopping at zero", () => {
    const running = startTimeBlock({ status: "ready", sessions: [] }, start);
    const tenPast = start + 70 * 60_000;
    expect(signedRemainingMilliseconds(running, 60, tenPast)).toBe(-10 * 60_000);
    expect(remainingMilliseconds(running, 60, tenPast)).toBe(0);
    expect(overtimeMilliseconds(running, 60, tenPast)).toBe(10 * 60_000);
    // Still running: nothing completed it on its behalf.
    expect(running.status).toBe("running");
  });

  it("records the real elapsed time when overtime is finished by hand", () => {
    const running = startTimeBlock({ status: "ready", sessions: [] }, start);
    const done = completeTimeBlock(running, start + 75 * 60_000);
    expect(elapsedMilliseconds(done)).toBe(75 * 60_000);
    expect(chargedMinutes(done, 60)).toBe(75);
  });
});

describe("capacity charges plans while open and reality once closed", () => {
  const start = Date.parse("2026-09-14T13:00:00.000Z");
  const page = [
    "⏱ Deep work · 1h <!--daydock:block:tb_one-->",
    "◷ School · 2h <!--daydock:time-->",
    "⏳ Focus capacity · 4h <!--daydock:capacity-->",
  ].join("\n");

  it("charges the planned hour while the block is unfinished", () => {
    expect(allocatedFocusMinutes(page)).toBe(180);
  });

  it("charges the twenty minutes actually spent once it is finished", () => {
    const finished = updateTimeBlockState(page, "tb_one", () => completeTimeBlock(
      startTimeBlock({ status: "ready", sessions: [] }, start),
      start + 20 * 60_000,
    ));
    expect(allocatedFocusMinutes(finished)).toBe(140);
  });
});

describe("the state footer belongs to every plugin", () => {
  it("keeps another plugin's state when the last time block is removed", () => {
    const document = writeDocumentState("# Today\n", {
      version: 1,
      timeBlocks: { tb_one: { status: "ready", sessions: [] } },
      habits: { streak: 4 },
    });
    const emptied = writeDocumentState(document, {
      ...parseDocumentState(document),
      timeBlocks: {},
    });
    expect(emptied).toContain("habits");
    expect(parseDocumentState(emptied).habits).toEqual({ streak: 4 });
  });

  it("drops the footer only when nothing is left to store", () => {
    const document = writeDocumentState("# Today\n", {
      version: 1,
      timeBlocks: { tb_one: { status: "ready", sessions: [] } },
    });
    expect(writeDocumentState(document, { version: 1, timeBlocks: {} })).toBe("# Today\n");
  });
});

describe("document scanning stays linear", () => {
  function page(lines: number) {
    return Array.from({ length: lines }, (_, index) => (
      index % 25 === 0
        ? `- [ ] Task ${index} · ⏱ 1h <!--daydock:block:tb_x${index}-->`
        : `- [ ] Ordinary task line number ${index}`
    )).join("\n");
  }

  it("reuses one scan for repeated questions about the same revision", () => {
    const document = page(40);
    // Identity, not just equality: a second pass must not rescan the document.
    expect(findTimeBlockAnchors(document)).toBe(findTimeBlockAnchors(document));
    expect(timeBlockAnchorAt(document, 0)).toBe(findTimeBlockAnchors(document)[0]);
  });

  it("rescans once the document actually changes", () => {
    expect(findTimeBlockAnchors(page(40))).toHaveLength(2);
    expect(findTimeBlockAnchors(page(80))).toHaveLength(4);
    expect(findTimeBlockAnchors("# Empty\n")).toHaveLength(0);
  });

  it("decorates a long page without quadratic cost", () => {
    const document = page(1500);
    const lines = document.split("\n");
    const started = performance.now();
    let from = 0;
    for (const [index, text] of lines.entries()) {
      const line = { from, to: from + text.length, number: index + 1, text };
      for (const plugin of [timeBlockPlugin, timeEntryPlugin, capacityPlugin]) {
        plugin.decorateLine?.({ document, line });
      }
      from += text.length + 1;
    }
    // The pre-cache implementation needed roughly a second for this page.
    expect(performance.now() - started).toBeLessThan(400);
  });
});

describe("a page keeps exactly one capacity marker", () => {
  const command = capacityPlugin.commands![0];

  function rerun(document: string, lineFrom: number, args: string) {
    const lineTo = document.indexOf("\n", lineFrom) < 0 ? document.length : document.indexOf("\n", lineFrom);
    const lineText = document.slice(lineFrom, lineTo);
    const outcome = command.run({
      document,
      lineFrom,
      lineTo,
      lineText,
      commandFrom: lineFrom + lineText.indexOf("/"),
      commandTo: lineTo,
      prefix: lineText.slice(0, lineText.indexOf("/")),
    }, args);
    return (outcome as { document: string }).document;
  }

  it("moves a marker that sits above the re-run command", () => {
    const page = "⏳ Focus capacity · 4h <!--daydock:capacity-->\n- [ ] task\n/capacity 3h\n";
    const next = rerun(page, page.indexOf("/capacity"), "3h");
    expect(findCapacityAnchors(next)).toHaveLength(1);
    expect(findCapacityAnchors(next)[0].availableMinutes).toBe(180);
    expect(next.trimEnd()).toBe("- [ ] task\n⏳ Focus capacity · 3h <!--daydock:capacity-->");
  });

  it("moves a marker that sits below the re-run command", () => {
    const page = "/capacity 3h\n- [ ] task\n⏳ Focus capacity · 4h <!--daydock:capacity-->\n";
    const next = rerun(page, 0, "3h");
    expect(findCapacityAnchors(next)).toHaveLength(1);
    expect(next.trimEnd()).toBe("⏳ Focus capacity · 3h <!--daydock:capacity-->\n- [ ] task");
  });
});
