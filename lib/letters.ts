import type { Puzzle } from "./types";

const LETTER_RE = /[A-Za-z]/;

// The letters a valid answer may use: the union of the authoritative 7-letter
// `letterSet` and the grid's start letters.
//
// The set adds the mid-word-only letters that fix #19 (a valid word using a
// puzzle letter that begins no answer). Unioning in the start letters guarantees
// validation is never *stricter* than start-letters-only — every start letter is
// by definition a puzzle letter, so an incomplete, unknown (""), or malformed
// stored set degrades to at-least-startLetters instead of wrongly rejecting
// valid words. In the normal case a complete set already contains every start
// letter, so the union is just the set itself. See CONTEXT.md → Letter set.
export function allowedLetters(
  puzzle: Pick<Puzzle, "letterSet" | "startLetters">
): string[] {
  const allowed = new Set(puzzle.startLetters.map((l) => l.toUpperCase()));
  for (const ch of normalizeLetterSet(puzzle.letterSet)) {
    allowed.add(ch);
  }
  return Array.from(allowed);
}

// Returns true if every character in `word` is in the allowed set.
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

// Normalizes a raw letter-set string (e.g. a scrape value or user input) to the
// canonical form stored on MatrixData: uppercase letters only, duplicates
// removed, order preserved.
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
