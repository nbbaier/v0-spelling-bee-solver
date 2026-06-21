// sbsolver.com numbers puzzles sequentially from #1 = May 9, 2018, one per day
// with no gaps, so a puzzle's number is a pure function of its date — no network
// lookup needed to resolve it. This lets the setup flow turn a picked date
// straight into the canonical "/nt/<number>" URL that lib/sbsolver.ts scrapes.

export const FIRST_PUZZLE_ISO = "2018-05-09";
const FIRST_PUZZLE_NUMBER = 1;
const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parse a YYYY-MM-DD string at UTC noon. Anchoring to noon keeps the whole-day
// division immune to DST/timezone offsets that could otherwise round to the
// wrong day.
function utcNoon(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
}

// True only for a real calendar date in strict YYYY-MM-DD form. Guards against
// inputs like "2019-99-99" that pass a lexical range check but normalize to a
// different date via Date.UTC.
function isRealIsoDate(iso: string): boolean {
  const m = iso.match(ISO_DATE_RE);
  if (!m) {
    return false;
  }
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// The puzzle number for a given ISO (YYYY-MM-DD) date. May be <1 for dates
// before the first puzzle — callers should range-check with isPuzzleDateInRange.
export function puzzleNumberForDate(iso: string): number {
  const days = Math.round((utcNoon(iso) - utcNoon(FIRST_PUZZLE_ISO)) / DAY_MS);
  return FIRST_PUZZLE_NUMBER + days;
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

// True when an ISO date is a real calendar date with a published puzzle: on or
// after the first puzzle and no later than today (Eastern).
export function isPuzzleDateInRange(iso: string): boolean {
  return (
    isRealIsoDate(iso) &&
    iso >= FIRST_PUZZLE_ISO &&
    iso <= latestPuzzleDateISO()
  );
}
