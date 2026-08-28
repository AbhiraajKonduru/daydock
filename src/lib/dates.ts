import type { NotebookFile } from "../types";

const DAY_MS = 86_400_000;

export function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function shiftDate(key: string, amount: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function longDate(key: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(dateFromKey(key));
}

export function shortDate(key: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dateFromKey(key));
}

export function isoWeek(date = new Date()): { year: number; week: number } {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return {
    year: utc.getUTCFullYear(),
    week: Math.ceil(((utc.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7),
  };
}

export function dailyPath(key = dateKey()): string {
  return `Daily/${key}.md`;
}

export function weeklyPath(date = new Date()): string {
  const { year, week } = isoWeek(date);
  return `Weekly/${year}-W${String(week).padStart(2, "0")}.md`;
}

function legacyDailyTemplate(key: string, streak: number): string {
  return `# ${longDate(key)}\n\n🔥 System streak: ${streak}\n\n## Win\n\n- [ ] \n\n## Tasks\n\n- [ ] \n\n## Notes\n\n\n\n## Journal\n\n`;
}

export function dailyTemplate(key: string, legacyStreak?: number): string {
  if (legacyStreak !== undefined) return legacyDailyTemplate(key, legacyStreak);
  return `# ${longDate(key)}\n\n## Win\n\n- [ ] \n\n## Tasks\n\n- [ ] \n\n## Limits\n\n- [ ] \n\n## Notes\n\n\n\n## Journal\n\n`;
}

export function weeklyTemplate(date = new Date()): string {
  const { year, week } = isoWeek(date);
  return `# Week ${week}, ${year}\n\n## Goals\n\n- [ ] \n\n## Recurring\n\n- [ ] \n\n## Upcoming\n\n- [ ] \n\n## Backlog\n\n- [ ] \n`;
}

export function documentTemplate(name: string): string {
  return `# ${name}\n\n`;
}

function plannedMeaningfully(content: string): boolean {
  const relevant = content.match(/## (?:Win|Tasks)\s+([\s\S]*?)(?=\n## |$)/gi) ?? [];
  return relevant.some((section) => /^\s*-\s*\[[ xX]\]\s+\S.*$/m.test(section));
}

export function calculateSystemStreak(files: NotebookFile[], today = dateKey()): number {
  const meaningfulDays = new Set(
    files
      .filter((file) => /^Daily\/\d{4}-\d{2}-\d{2}\.md$/.test(file.path))
      .filter((file) => plannedMeaningfully(file.content))
      .map((file) => file.path.slice(6, 16)),
  );

  if (meaningfulDays.size === 0) return 0;

  const earliest = [...meaningfulDays].sort()[0];
  let cursor = meaningfulDays.has(today) ? today : shiftDate(today, -1);
  let missedInARow = 0;
  let streak = 0;

  while (cursor >= shiftDate(earliest, -1)) {
    if (meaningfulDays.has(cursor)) {
      streak += 1;
      missedInARow = 0;
    } else {
      missedInARow += 1;
      if (missedInARow === 2) break;
    }
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

export function setSystemStreak(content: string, streak: number): string {
  const line = `🔥 System streak: ${streak}`;
  if (/^🔥 System streak: \d+\s*$/m.test(content)) {
    return content.replace(/^🔥 System streak: \d+\s*$/m, line);
  }
  const headingEnd = content.indexOf("\n");
  return headingEnd >= 0
    ? `${content.slice(0, headingEnd)}\n\n${line}${content.slice(headingEnd)}`
    : `${content}\n\n${line}\n`;
}

export function titleForFile(file: NotebookFile): string {
  const heading = file.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || file.name;
}

export function countCompleted(content: string): { done: number; total: number } {
  const matches = [...content.matchAll(/-\s*\[([ xX])\]\s+\S/g)];
  return {
    done: matches.filter((match) => match[1].toLowerCase() === "x").length,
    total: matches.length,
  };
}
