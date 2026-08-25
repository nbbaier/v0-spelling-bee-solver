import type { HintSlot } from "./types";

const LETTER_RE = /^[A-Za-z]$/;
const NEWLINE_RE = /\r?\n/;
const TRAILING_WS_RE = /\s+$/;
const INT_RE = /^\d+$/;
const HINT_RE = /([A-Za-z]{2,})\s*[x×*]\s*(\d+)/g;

export interface MatrixParseResult {
  // The tab-separated grid carries no center-letter information, so the parser
  // always yields null. The setup flow fills this in from the sbsolver scrape
  // or the manual selector before saving.
  centerLetter: string | null;
  grid: Record<string, Record<number, number>>;
  lengths: number[];
  // Row labels of the grid (start letters of answers). See MatrixData.startLetters.
  startLetters: string[];
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
  for (const [index, line] of lines.entries()) {
    const cells = line.split("\t").map((c) => c.trim());
    if (cells.some((c) => INT_RE.test(c))) {
      return { cells, index };
    }
  }
  return { cells: [], index: -1 };
}

/** Adds a single data row's counts into the grid, if it starts with a letter. */
function addRow(
  line: string,
  columnLengths: (number | null)[],
  grid: Record<string, Record<number, number>>,
  startLetters: string[]
): void {
  const cells = line.split("\t").map((c) => c.trim());
  const [label] = cells;
  if (!LETTER_RE.test(label)) {
    return; // skip totals / blank rows
  }

  const letter = label.toUpperCase();
  if (!grid[letter]) {
    grid[letter] = {};
    startLetters.push(letter);
  }

    if (len == null) {
    const value = cell === "" ? 0 : Number.parseInt(cell, 10);
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

  const startLetters: string[] = [];
  const grid: Record<string, Record<number, number>> = {};

  for (const line of lines.slice(header.index + 1)) {
    addRow(line, columnLengths, grid, startLetters);
  }

  if (startLetters.length === 0) {
    throw new Error(
      "No letter rows found. Each row should start with a single letter."
    );
  }

  return { centerLetter: null, grid, lengths: uniqueLengths, startLetters };
}

/**
 * Parses the hint list, e.g. "DON x1 DOO x1 DRO x4".
 * Expands each prefix into N slots (one per word) and sorts the resulting
 * slots alphabetically by prefix, preserving input order within each
 * prefix so filled words appear top-down.
 */
export function parseHints(raw: string): HintSlot[] {
  const slots: HintSlot[] = [];

  HINT_RE.lastIndex = 0;
  let match = HINT_RE.exec(raw);
  while (match !== null) {
    const prefix = match[1].toUpperCase();
    const count = Number.parseInt(match[2], 10);
    for (let i = 0; i < count; i += 1) {
      slots.push({ id: `${prefix}-${slots.length}`, prefix, word: null });
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
