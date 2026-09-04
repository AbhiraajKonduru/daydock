import { describe, expect, it } from "vitest";
import {
  documentDisplayName,
  documentFileStem,
  documentNameIssue,
  documentPath,
  documentTitle,
  rewriteDocumentLinks,
} from "./documents";

describe("document names", () => {
  it("uses underscores for whitespace in file names", () => {
    expect(documentFileStem("  Project   Ideas  ")).toBe("Project_Ideas");
    expect(documentPath("Project Ideas")).toBe("Docs/Project_Ideas.md");
  });

  it("renders filename underscores as spaces", () => {
    expect(documentDisplayName("Project_Ideas")).toBe("Project Ideas");
    expect(documentTitle({
      path: "Docs/Project_Ideas.md",
      name: "Project_Ideas",
      content: "# A completely independent heading\n",
      loaded: true,
      modified: 0,
    })).toBe("Project Ideas");
  });

  it("rejects invalid and Windows-reserved names", () => {
    expect(documentNameIssue("bad/name")).toMatch(/cannot contain/i);
    expect(documentNameIssue("NUL")).toMatch(/reserved/i);
    expect(documentNameIssue("trailing.")).toMatch(/cannot end/i);
    expect(documentNameIssue("Good name")).toBeNull();
  });

  it("rewrites wiki and Markdown links without touching their labels", () => {
    const content = "[[Old Name]]\n[Read this](Old_Name.md)\n[Full](Docs/Old_Name.md)\n[[Other]]";
    expect(rewriteDocumentLinks(content, "Docs/Old_Name.md", "Docs/New_Name.md")).toBe(
      "[[New Name]]\n[Read this](New_Name.md)\n[Full](Docs/New_Name.md)\n[[Other]]",
    );
  });
});
