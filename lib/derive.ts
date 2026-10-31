import { normalizeLetterSet } from "./letters";
import type { Puzzle } from "./types";

/**
 * Whether `word` uses every letter of `letterSet` (letters may repeat; case is
 * ignored). Always `false` when the letter set is unknown (empty).
 * See GLOSSARY.md → Pangram.
 */
export function isPangram(word: string, letterSet: string): boolean {
  const letters = normalizeLetterSet(letterSet);
  if (letters.length === 0) {
    return false;
  }
  const upper = word.trim().toUpperCase();
  return letters.split("").every((ch) => upper.includes(ch));
}

/** Completion follows the same entered-word and matrix totals as progress. */
export function isPuzzleComplete(puzzle: Puzzle): boolean {
  const { foundWords, totalWords } = derive(puzzle);
  return totalWords > 0 && foundWords >= totalWords;
}

/** Running counts of found vs remaining answers, by start letter and word length. */
export interface Derived {
  /** `found[letter][length]` = number of entered words in that cell. */
  found: Record<string, Record<number, number>>;
  /** Number of hint slots that currently have a word. */
  foundWords: number;
  /** Entered-word count keyed by word length. */
  lengthFound: Record<number, number>;
  /** Matrix totals keyed by word length. */
  lengthTotals: Record<number, number>;
  /** Entered-word count keyed by start letter. */
  letterFound: Record<string, number>;
  /** Matrix totals keyed by start letter. */
  letterTotals: Record<string, number>;
  /** Number of entered words that are pangrams (0 when the letter set is unknown). */
  pangramsFound: number;
  /** Sum of all matrix cells (total answers). */
  totalWords: number;
}

/**
 * Computes found/remaining tallies from a puzzle's matrix and entered words.
 *
 * @param puzzle - The puzzle to derive statistics from.
 * @returns An object containing the derived statistics.
 */
export function derive(puzzle: Puzzle): Derived {
  const found: Record<string, Record<number, number>> = {};
  const lengthTotals: Record<number, number> = {};
  const lengthFound: Record<number, number> = {};
  const letterTotals: Record<string, number> = {};
  const letterFound: Record<string, number> = {};

  for (const letter of puzzle.startLetters) {
    found[letter] = {};
    letterTotals[letter] = 0;
    letterFound[letter] = 0;
  }
  for (const len of puzzle.lengths) {
    lengthTotals[len] = 0;
    lengthFound[len] = 0;
  }

  let totalWords = 0;
  for (const letter of puzzle.startLetters) {
    for (const len of puzzle.lengths) {
      const t = puzzle.grid[letter]?.[len] ?? 0;
      totalWords += t;
      lengthTotals[len] += t;
      letterTotals[letter] += t;
    }
  }

  let foundWords = 0;
  let pangramsFound = 0;
  for (const slot of puzzle.hints) {
    if (!slot.word) {
      continue;
    }
    const w = slot.word.trim().toUpperCase();
    if (w.length === 0) {
      continue;
    }
    const [letter] = w;
    const len = w.length;
    foundWords += 1;
    if (isPangram(w, puzzle.letterSet)) {
      pangramsFound += 1;
    }
    if (found[letter] === undefined) {
      found[letter] = {};
    }
    found[letter][len] = (found[letter][len] ?? 0) + 1;
    if (lengthFound[len] !== undefined) {
      lengthFound[len] += 1;
    }
    if (letterFound[letter] !== undefined) {
      letterFound[letter] += 1;
    }
  }

  return {
    found,
    foundWords,
    lengthFound,
    lengthTotals,
    letterFound,
    letterTotals,
    pangramsFound,
    totalWords,
  };
}
