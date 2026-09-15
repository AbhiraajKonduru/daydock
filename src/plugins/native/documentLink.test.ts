import { describe, expect, it } from "vitest";
import type { SlashCommandContext } from "../api";
import { daydockPlugins } from "../registry";
import { materializeTemplateCommands } from "../templateCommands";
import { documentLinkPlugin, rankDocumentNames } from "./documentLink";

const command = documentLinkPlugin.commands![0];

function context(document: string, commandFrom: number): SlashCommandContext {
  return {
    document,
    lineFrom: 0,
    lineTo: document.length,
    lineText: document,
    commandFrom,
    commandTo: document.length,
    prefix: document.slice(0, commandFrom),
  };
}

describe("document link command", () => {
  it("ranks prefix and word matches ahead of other substring matches", () => {
    expect(rankDocumentNames(["Evening Routine", "Grout", "Morning Routine", "Routines"], "rout")).toEqual([
      "Routines",
      "Evening Routine",
      "Morning Routine",
      "Grout",
    ]);
  });

  it("lists every document alphabetically before anything is typed", () => {
    expect(rankDocumentNames(["beta", "Alpha", "gamma", "Alpha"], "")).toEqual(["Alpha", "beta", "gamma"]);
  });

  it("offers matching documents, then a new document for the typed name", () => {
    expect(command.suggest!("morn", { documents: ["Morning Routine", "Weekly Review"] })).toEqual([
      { label: "Morning Routine", icon: "file", argumentsText: "Morning Routine" },
      { label: "morn", detail: "New document", icon: "file-plus", argumentsText: "morn" },
    ]);
  });

  it("does not offer to create a document that already exists", () => {
    expect(command.suggest!("morning routine", { documents: ["Morning Routine"] })).toEqual([
      { label: "Morning Routine", icon: "file", argumentsText: "Morning Routine" },
    ]);
  });

  it("replaces the command with a wiki link", () => {
    expect(command.run(context("- [ ] Review /doc mor", 13), "Morning Routine")).toEqual({
      document: "- [ ] Review [[Morning Routine]]",
      selection: 32,
    });
  });

  it("leaves an empty command editable", () => {
    expect(command.run(context("/doc ", 0), "  ")).toBeNull();
  });

  it("materializes a typed template directive", () => {
    expect(materializeTemplateCommands("# Today\n\n/doc Morning Routine\n", daydockPlugins)).toBe(
      "# Today\n\n[[Morning Routine]]\n",
    );
  });
});
