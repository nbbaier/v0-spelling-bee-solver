import type { Puzzle } from "./types";

const LETTER_RE = /[A-Za-z]/;

// The letters a valid answer may use. Prefer the authoritative 7-letter
// `letterSet` (so a word using a puzzle letter that begins no answer still
// validates — the #19 regression). Fall back to the grid's start letters for a
// puzzle whose set is unknown: a row persisted before `letterSet` existed, or a
// hand-pasted grid the user never confirmed. See CONTEXT.md → Letter set.
export function allowedLetters(
  puzzle: Pick<Puzzle, "letterSet" | "startLetters">
): string[] {
  if (puzzle.letterSet.length > 0) {
    return puzzle.letterSet.toUpperCase().split("");
  }
  return puzzle.startLetters;
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
