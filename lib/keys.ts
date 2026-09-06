/**
 * Redis key scheme. Puzzle id is an ISO date (`YYYY-MM-DD`) or {@link SAMPLE_ID}.
 *
 * - `sbs:<ID>:matrix` — JSON matrix payload
 * - `sbs:<ID>:prefixes` — JSON hint slots
 * - `sbs:<ID>:words` — hash of slotId → word
 * - `sbs:dates` — set of real puzzle dates (sample is never added)
 */

/** Sentinel id for the development dummy puzzle. */
export const SAMPLE_ID = "sample";

/** Redis key builders for puzzle data and the date index. */
export const keys = {
  dates: () => "sbs:dates",
  matrix: (id: string) => `sbs:${id}:matrix`,
  prefixes: (id: string) => `sbs:${id}:prefixes`,
  words: (id: string) => `sbs:${id}:words`,
};

/** Formats `date` as local `YYYY-MM-DD`. */
export function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` as a local-calendar `Date`. */
export function parseLocalDate(iso: string): Date {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(date: string): boolean {
  return DATE_RE.test(date);
}

/** Whether `id` is {@link SAMPLE_ID} or a `YYYY-MM-DD` string. */
export function isValidPuzzleId(id: string): boolean {
  return id === SAMPLE_ID || isValidDate(id);
}

/** Whether `id` is the development dummy sentinel. */
export function isSampleId(id: string): boolean {
  return id === SAMPLE_ID;
}
