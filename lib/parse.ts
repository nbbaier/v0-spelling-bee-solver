import type { HintSlot } from "./types";

const LETTER_RE = /^[A-Za-z]$/;
const NEWLINE_RE = /\r?\n/;
const TRAILING_WS_RE = /\s+$/;
const INT_RE = /^\d+$/;
const HINT_RE = /([A-Za-z]{2,})\s*[x×*]\s*(\d+)/g;

export interface MatrixParseResult {
  grid: Record<string, Record<number, number>>;
  lengths: number[];
  letters: string[];
}

/** Splits raw input into trimmed, non-empty lines. */
function toLines(raw: string): string[] {
  return raw
    .split(NEWLINE_RE)
    .map((l) => l.replace(TRAILING_WS_RE, ""))
    .filter((l) => l.trim().length > 0);
}

/** Finds the first row containing an integer cell (the word-length header). */
function findHeader(lines: string[]): { index: number; cells: string[] } {
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split("\t").map((c) => c.trim());
    if (cells.some((c) => INT_RE.test(c))) {
      return { index: i, cells };
    }
  }
  return { index: -1, cells: [] };
}

/** Adds a single data row's counts into the grid, if it starts with a letter. */
function addRow(
  line: string,
  columnLengths: (number | null)[],
  grid: Record<string, Record<number, number>>,
  letters: string[]
): void {
  const cells = line.split("\t").map((c) => c.trim());
  const label = cells[0];
  if (!LETTER_RE.test(label)) {
    return; // skip totals / blank rows
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
  const lines = toLines(raw);

  if (lines.length === 0) {
    throw new Error(
      "No matrix data found. Paste the grid copied from sbsolver."
    );
  }

  const header = findHeader(lines);
  if (header.index === -1) {
    throw new Error(
      "Could not find a row of word lengths. Make sure cells are tab-separated."
    );
  }

  // Map each column index to a word length (or null for label/total columns).
  const columnLengths: (number | null)[] = header.cells.map((c) =>
    INT_RE.test(c) ? Number.parseInt(c, 10) : null
  );
  const lengths = columnLengths.filter((n): n is number => n !== null);
  // De-dupe and sort ascending.
  const uniqueLengths = Array.from(new Set(lengths)).sort((a, b) => a - b);

  const letters: string[] = [];
  const grid: Record<string, Record<number, number>> = {};

  for (let i = header.index + 1; i < lines.length; i++) {
    addRow(lines[i], columnLengths, grid, letters);
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
  let counter = 0;

  HINT_RE.lastIndex = 0;
  let match = HINT_RE.exec(raw);
  while (match !== null) {
    const prefix = match[1].toUpperCase();
    const count = Number.parseInt(match[2], 10);
    for (let i = 0; i < count; i++) {
      slots.push({ id: `${prefix}-${counter}`, prefix, word: null });
      counter++;
    }
    match = HINT_RE.exec(raw);
  }

  if (slots.length === 0) {
    throw new Error(
      'No hints found. Use the "PREFIX xN" format, e.g. "DRO x4".'
    );
  }

  return slots;
}
