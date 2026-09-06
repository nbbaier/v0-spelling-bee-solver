import type { HintSlot } from "./types";

const LETTER_RE = /^[A-Za-z]$/;
const NEWLINE_RE = /\r?\n/;
const TRAILING_WS_RE = /\s+$/;
const INT_RE = /^\d+$/;
const HINT_RE = /([A-Za-z]{2,})\s*[x×*]\s*(\d+)/g;

/** Output of {@link parseMatrix}; `centerLetter` is always `null` (the grid has none). */
export interface MatrixParseResult {
  centerLetter: string | null;
  grid: Record<string, Record<number, number>>;
  lengths: number[];
  /** Row labels of the grid (start letters of answers). */
  startLetters: string[];
}

/** Splits raw input into trimmed, non-empty lines. */
function toLines(raw: string): string[] {
  return raw
    .split(NEWLINE_RE)
    .map((l) => l.replace(TRAILING_WS_RE, ""))
    .filter((l) => l.trim().length > 0);
}

/** First row that contains an integer cell (the word-length header). */
function findHeader(lines: string[]): { index: number; cells: string[] } {
  for (const [index, line] of lines.entries()) {
    const cells = line.split("\t").map((c) => c.trim());
    if (cells.some((c) => INT_RE.test(c))) {
      return { cells, index };
    }
  }
  return { cells: [], index: -1 };
}

/** Adds a data row's counts into `grid` when the row starts with a letter. */
function addRow(
  line: string,
  columnLengths: (number | null)[],
  grid: Record<string, Record<number, number>>,
  startLetters: string[]
): void {
  const cells = line.split("\t").map((c) => c.trim());
  const [label] = cells;
  if (!LETTER_RE.test(label)) {
    return;
  }

  const letter = label.toUpperCase();
  if (!grid[letter]) {
    grid[letter] = {};
    startLetters.push(letter);
  }

  for (const [columnIndex, cell] of cells.entries()) {
    const len = columnLengths[columnIndex];
    if (typeof len !== "number") {
      continue;
    }
    const value = cell === "" ? 0 : Number.parseInt(cell, 10);
    if (!Number.isNaN(value) && value > 0) {
      grid[letter][len] = (grid[letter][len] ?? 0) + value;
    }
  }
}

/**
 * Parses a tab-separated sbsolver grid into {@link MatrixParseResult}.
 *
 * Expected shape:
 * ```
 * [label]  4   5   6   7   Σ
 * A        1   2       1   4
 * B            3   1       4
 * Σ        1   5   1   1   8
 * ```
 *
 * Non-integer header cells and non-letter rows (totals) are ignored.
 * Empty cells count as 0. Totals are not stored from the paste.
 *
 * @throws {Error} If no header or letter rows are found.
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

  const columnLengths: (number | null)[] = header.cells.map((c) =>
    INT_RE.test(c) ? Number.parseInt(c, 10) : null
  );
  const lengths = columnLengths.filter((n): n is number => n !== null);
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
 * Parses `"PREFIX xN"` tallies (e.g. `"DON x1 DOO x1 DRO x4"`) into one
 * {@link HintSlot} per word. Slots are sorted by prefix; order within a prefix
 * follows the input so filled words stay top-down.
 *
 * @throws {Error} If no valid hints are found.
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

  return slots.sort((a, b) => a.prefix.localeCompare(b.prefix));
}
