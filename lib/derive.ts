import type { Puzzle } from "./types";

export interface Derived {
  // found[letter][length] = number of words entered for that cell
  found: Record<string, Record<number, number>>;
  foundWords: number;
  lengthFound: Record<number, number>;
  // per-length progress
  lengthTotals: Record<number, number>;
  letterFound: Record<string, number>;
  // per-letter progress
  letterTotals: Record<string, number>;
  totalWords: number;
}

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
  for (const slot of puzzle.hints) {
    if (!slot.word) {
      continue;
    }
    const w = slot.word.trim().toUpperCase();
    if (w.length === 0) {
      continue;
    }
    const letter = w[0];
    const len = w.length;
    foundWords++;
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
    totalWords,
    foundWords,
    lengthTotals,
    lengthFound,
    letterTotals,
    letterFound,
  };
}
