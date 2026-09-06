/**
 * sbsolver numbers puzzles sequentially from #1 = 2018-05-09, one per day
 * with no gaps. Puzzle number is therefore a pure function of date.
 */

/** ISO date of sbsolver puzzle #1. */
export const FIRST_PUZZLE_ISO = "2018-05-09";
const FIRST_PUZZLE_NUMBER = 1;
const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * UTC timestamp for noon on `iso` (`YYYY-MM-DD`).
 * Noon avoids DST/timezone rounding when dividing by whole days.
 */
function utcNoon(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
}

/**
 * Whether `iso` is a real calendar date in strict `YYYY-MM-DD` form.
 * Rejects values like `"2019-99-99"` that parse but normalize to another date.
 */
export function isRealIsoDate(iso: string): boolean {
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

/**
 * Sequential sbsolver puzzle number for `iso`.
 * May be less than 1 for dates before {@link FIRST_PUZZLE_ISO}; callers should
 * check {@link isPuzzleDateInRange}.
 */
export function puzzleNumberForDate(iso: string): number {
  const days = Math.round((utcNoon(iso) - utcNoon(FIRST_PUZZLE_ISO)) / DAY_MS);
  return FIRST_PUZZLE_NUMBER + days;
}

/**
 * Latest published puzzle date as `YYYY-MM-DD` in US Eastern time, matching
 * sbsolver's calendar so a local "today" east of Eastern cannot outrun publication.
 */
export function latestPuzzleDateISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).format(new Date());
}

/**
 * Whether `iso` is a real calendar date with a published puzzle: on or after
 * {@link FIRST_PUZZLE_ISO} and no later than {@link latestPuzzleDateISO}.
 */
export function isPuzzleDateInRange(iso: string): boolean {
  return (
    isRealIsoDate(iso) &&
    iso >= FIRST_PUZZLE_ISO &&
    iso <= latestPuzzleDateISO()
  );
}
