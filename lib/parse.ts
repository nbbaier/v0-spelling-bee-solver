import type { HintSlot } from "./types";

const LETTER_RE = /^[A-Za-z]$/;

export type MatrixParseResult = {
  letters: string[];
  lengths: number[];
  grid: Record<string, Record<number, number>>;
};

/**
 * Parses the tab-separated grid copied from sbsolver.
 *
 * Expected shape (tabs between cells):
 *   [label]  4   5   6   7   Σ
 *   A        1   2       1   4
 *   B            3   1       4
 *   Σ        1   5   1   1   8
 *
 * - The first row contains word-length numbers (any non-integer header cell,
 *   such as a total "Σ", is ignored).
 * - Each data row starts with a single letter. Rows that do not start with a
 *   single letter (e.g. the "Σ" total row) are ignored.
 * - Empty cells count as 0. Totals are recomputed by the app, so they are not
 *   stored here.
 */
export function parseMatrix(raw: string): MatrixParseResult {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    throw new Error(
      "No matrix data found. Paste the grid copied from sbsolver."
    );
  }

  // Find the header row: the first row containing at least one integer cell.
  let headerIndex = -1;
  let headerCells: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split("\t").map((c) => c.trim());
    if (cells.some((c) => /^\d+$/.test(c))) {
      headerIndex = i;
      headerCells = cells;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error(
      "Could not find a row of word lengths. Make sure cells are tab-separated."
    );
  }

  // Map each column index to a word length (or null for label/total columns).
  const columnLengths: (number | null)[] = headerCells.map((c) =>
    /^\d+$/.test(c) ? Number.parseInt(c, 10) : null
  );
  const lengths = columnLengths.filter((n): n is number => n !== null);
  // De-dupe and sort ascending.
  const uniqueLengths = Array.from(new Set(lengths)).sort((a, b) => a - b);

  const letters: string[] = [];
  const grid: Record<string, Record<number, number>> = {};

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cells = lines[i].split("\t").map((c) => c.trim());
    const label = cells[0];
    if (!LETTER_RE.test(label)) {
      continue; // skip totals / blank rows
    }

    const letter = label.toUpperCase();
    if (!grid[letter]) {
      grid[letter] = {};
      letters.push(letter);
    }

    for (let c = 0; c < cells.length; c++) {
      const len = columnLengths[c];
      if (len == null) {
        continue;
      }
      const value = cells[c] === "" ? 0 : Number.parseInt(cells[c], 10);
      if (!Number.isNaN(value) && value > 0) {
        grid[letter][len] = (grid[letter][len] ?? 0) + value;
      }
    }
  }

  if (letters.length === 0) {
    throw new Error(
      "No letter rows found. Each row should start with a single letter."
    );
  }

  letters.sort();

  return { letters, lengths: uniqueLengths, grid };
}

/**
 * Parses the hint list, e.g. "DON x1 DOO x1 DRO x4".
 * Expands each prefix into N slots (one per word).
 */
export function parseHints(raw: string): HintSlot[] {
  const slots: HintSlot[] = [];
  const re = /([A-Za-z]{2,})\s*[x×*]\s*(\d+)/g;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = re.exec(raw)) !== null) {
    const prefix = match[1].toUpperCase();
    const count = Number.parseInt(match[2], 10);
    for (let i = 0; i < count; i++) {
      slots.push({ id: `${prefix}-${counter++}`, prefix, word: null });
    }
  }

  if (slots.length === 0) {
    throw new Error(
      'No hints found. Use the "PREFIX xN" format, e.g. "DRO x4".'
    );
  }

  return slots;
}
