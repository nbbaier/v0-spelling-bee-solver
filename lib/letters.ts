import type { Puzzle } from "./types";

const LETTER_RE = /[A-Za-z]/;

/**
 * Letters a valid answer may use: the union of {@link Puzzle.letterSet} and
 * the grid's start letters.
 *
 * Unioning start letters keeps validation from becoming stricter than
 * start-letters-only when the stored set is empty, incomplete, or malformed.
 * A complete set already contains every start letter, so the union is a no-op.
 * See CONTEXT.md → Letter set.
 */
export function allowedLetters(
  puzzle: Pick<Puzzle, "letterSet" | "startLetters">
): string[] {
  const allowed = new Set(puzzle.startLetters.map((l) => l.toUpperCase()));
  for (const ch of normalizeLetterSet(puzzle.letterSet)) {
    allowed.add(ch);
  }
  return Array.from(allowed);
}

/** Whether every character in `word` appears in `allowed`. */
export function hasOnlyAllowedLetters(
  word: string,
  allowed: string[]
): boolean {
  const set = new Set(allowed.map((l) => l.toUpperCase()));
  return word
    .toUpperCase()
    .split("")
    .every((ch) => set.has(ch));
}

/**
 * Canonical letter-set form: uppercase letters only, duplicates removed,
 * first-seen order preserved.
 */
export function normalizeLetterSet(raw: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of raw.toUpperCase()) {
    if (LETTER_RE.test(ch) && !seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out.join("");
}

/**
 * Whether a confirmed letter set is authoritative: exactly seven letters and a
 * superset of every grid start letter. Requiring the start letters prevents a
 * 7-letter set that omitted one from being unioned to eight allowed letters.
 */
export function isCompleteLetterSet(
  letterSet: string,
  startLetters: string[]
): boolean {
  const normalized = normalizeLetterSet(letterSet);
  if (normalized.length !== 7) {
    return false;
  }
  return startLetters.every((l) => normalized.includes(l.toUpperCase()));
}
