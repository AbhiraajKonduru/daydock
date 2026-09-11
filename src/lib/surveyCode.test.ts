import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  generateSurveyCode,
  parseSurveyCode,
  SURVEY_CODE_MAX_AGE_MS,
} from "./surveyCode";

const now = Date.UTC(2026, 8, 10, 16, 0, 0);

describe("survey codes", () => {
  it("round-trips platform and version without storing the code in a cloud service", () => {
    const code = generateSurveyCode({
      platform: "macos",
      appVersion: "0.2.0",
      generatedAt: now,
    });

    expect(code).toMatch(/^[0-9A-Z]{4}(?:-[0-9A-Z]{2,4})+$/);
    expect(parseSurveyCode(code, now)).toEqual({
      algorithmVersion: 1,
      generatedAt: now,
      platform: "macos",
      appVersion: "0.2.0",
    });
  });

  it("accepts pasted codes with spaces, lowercase, and ambiguous characters", () => {
    const code = generateSurveyCode({
      platform: "windows",
      appVersion: "0.3.1",
      generatedAt: now,
    });
    const messy = `  ${code.toLowerCase().replaceAll("-", " ")}  `;
    expect(parseSurveyCode(messy, now)?.platform).toBe("windows");
  });

  it("rejects a tampered checksum", () => {
    const code = generateSurveyCode({
      platform: "linux",
      appVersion: "0.2.0",
      generatedAt: now,
    });
    const last = code.slice(-1) === "0" ? "1" : "0";
    expect(parseSurveyCode(`${code.slice(0, -1)}${last}`, now)).toBeNull();
  });

  it("rejects expired and far-future codes", () => {
    const code = generateSurveyCode({
      platform: "linux",
      appVersion: "0.2.0",
      generatedAt: now,
    });
    expect(parseSurveyCode(code, now + SURVEY_CODE_MAX_AGE_MS + 1000)).toBeNull();
    expect(parseSurveyCode(
      generateSurveyCode({ platform: "linux", appVersion: "0.2.0", generatedAt: now + 3 * 60 * 60 * 1000 }),
      now,
    )).toBeNull();
  });

  it("keeps the website copy identical so browser validation uses the same formula", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const desktop = readFileSync(resolve(here, "surveyCode.ts"), "utf8");
    const website = readFileSync(resolve(here, "../../website/lib/surveyCode.ts"), "utf8");
    expect(website).toBe(desktop);
  });
});
