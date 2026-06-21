// sbsolver.com numbers puzzles sequentially from #1 = May 9, 2018, with one
// puzzle per day and no gaps. The NYT Spelling Bee runs daily, so a puzzle's
// number is a pure function of its date — no network call is needed to resolve
// it. Verified linear against the live site across #1 (2018-05-09), #500, #1000,
// #2000, #2900 (2026-04-16), #2965 (2026-06-20), and #2966 (2026-06-21).
//
// This lets the setup flow turn a date the user picks straight into the
// canonical "/nt/<number>" URL that lib/sbsolver.ts scrapes.

export const FIRST_PUZZLE_ISO = "2018-05-09";
const FIRST_PUZZLE_NUMBER = 1;
const DAY_MS = 86_400_000;

// Parse a YYYY-MM-DD string at UTC noon. Anchoring to noon keeps the whole-day
// division immune to DST/timezone offsets that could otherwise round a date to
// the wrong day.
function utcNoon(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
}

// The puzzle number for a given ISO (YYYY-MM-DD) date. May be <1 for dates
// before the first puzzle — callers should range-check with isPuzzleDateInRange.
export function puzzleNumberForDate(iso: string): number {
  const days = Math.round((utcNoon(iso) - utcNoon(FIRST_PUZZLE_ISO)) / DAY_MS);
  return FIRST_PUZZLE_NUMBER + days;
}

// The ISO date for a given puzzle number — inverse of puzzleNumberForDate.
export function dateForPuzzleNumber(n: number): string {
  const ms = utcNoon(FIRST_PUZZLE_ISO) + (n - FIRST_PUZZLE_NUMBER) * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

// The latest puzzle date available, as the NYT (US Eastern) calendar date. A
// user east of Eastern could otherwise pick a local "today" whose puzzle isn't
// published yet; clamping to Eastern matches sbsolver's own dating.
export function latestPuzzleDateISO(): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the ISO shape we want.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// True when an ISO date has a published puzzle: on or after the first puzzle and
// no later than today (Eastern).
export function isPuzzleDateInRange(iso: string): boolean {
  return iso >= FIRST_PUZZLE_ISO && iso <= latestPuzzleDateISO();
}
