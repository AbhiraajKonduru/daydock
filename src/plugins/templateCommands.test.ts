import { describe, expect, it } from "vitest";
import { findCapacityAnchors, findTimeBlockAnchors, findTimeEntryAnchors, parseDocumentState } from "./native/timeModel";
import { daydockPlugins } from "./registry";
import { materializeTemplateCommands } from "./templateCommands";

describe("template plugin commands", () => {
  it("materializes a complete capacity directive for a generated page", () => {
    const rendered = materializeTemplateCommands("# Today\n\n/capacity 4h\n", daydockPlugins);
    expect(findCapacityAnchors(rendered)).toHaveLength(1);
    expect(findCapacityAnchors(rendered)[0].availableMinutes).toBe(240);
    expect(rendered).not.toContain("/capacity 4h");
  });

  it("keeps an incomplete capacity directive as a daily prompt", () => {
    expect(materializeTemplateCommands("# Today\n\n/capacity\n", daydockPlugins)).toBe(
      "# Today\n\n/capacity\n",
    );
  });

  it("gives template time blocks fresh state whenever a page is generated", () => {
    const template = "# Today\n\n- [ ] Deep work /block 1h\n";
    const first = materializeTemplateCommands(template, daydockPlugins);
    const second = materializeTemplateCommands(template, daydockPlugins);
    const firstBlock = findTimeBlockAnchors(first)[0];
    const secondBlock = findTimeBlockAnchors(second)[0];

    expect(firstBlock.title).toBe("Deep work");
    expect(firstBlock.id).not.toBe(secondBlock.id);
    expect(parseDocumentState(first).timeBlocks[firstBlock.id].status).toBe("ready");
  });

  it("resolves multiple directives from one template", () => {
    const rendered = materializeTemplateCommands(
      "# Today\n\n/capacity 3h\n\n/block 45m Planning\n",
      daydockPlugins,
    );
    expect(findCapacityAnchors(rendered)[0].availableMinutes).toBe(180);
    expect(findTimeBlockAnchors(rendered)[0].plannedMinutes).toBe(45);
  });

  it("materializes static time entries without timer state", () => {
    const rendered = materializeTemplateCommands("# Today\n\n/time 2h School\n", daydockPlugins);
    expect(findTimeEntryAnchors(rendered)[0]).toMatchObject({ minutes: 120, title: "School" });
    expect(Object.keys(parseDocumentState(rendered).timeBlocks)).toHaveLength(0);
  });
});

describe("template directives that a command rejects", () => {
  it("leaves an unreadable duration on the page instead of deleting it", () => {
    const template = "# Today\n\n/block 3 days\n\n/capacity 4h Work\n";
    expect(materializeTemplateCommands(template, daydockPlugins)).toBe(template);
  });

  it("still resolves the good directives around a rejected one", () => {
    const rendered = materializeTemplateCommands(
      "# Today\n\n/block 3 days\n\n/capacity 3h\n",
      daydockPlugins,
    );
    expect(rendered).toContain("/block 3 days");
    expect(findCapacityAnchors(rendered)[0].availableMinutes).toBe(180);
  });
});
