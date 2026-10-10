import "server-only";
import type { ScrapeResult } from "./sbsolver";

// Loads a puzzle from the NYT's own Spelling Bee page and derives the setup
// form's text fields from its answer list. The page embeds `window.gameData`
// with the letters and every answer, so the grid and 3-letter tallies are
// computed exactly in one request. Answers never leave the server.
// The NYT only serves the last ~two weeks; older dates 404 and fall back to
// hand-pasting. See docs/adr/0008-load-puzzles-from-nyt.md.

const GAME_DATA_MARKER = "window.gameData";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PREFIX_LENGTH = 3;
const TRAILING_SEMICOLON_RE = /;$/;

/** One puzzle entry from `window.gameData` (`today`, `yesterday`, …). */
export interface NytPuzzle {
  answers: string[];
  centerLetter: string;
  outerLetters: string[];
  pangrams: string[];
  printDate: string;
}

/** Thrown when the NYT has no page for the date (outside its archive window). */
export class NytNotFoundError extends Error {
  constructor(date: string) {
    super(`The NYT has no Spelling Bee page for ${date}.`);
    this.name = "NytNotFoundError";
  }
}

function isNytPuzzle(value: unknown): value is NytPuzzle {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.printDate === "string" &&
    typeof v.centerLetter === "string" &&
    Array.isArray(v.outerLetters) &&
    Array.isArray(v.answers) &&
    Array.isArray(v.pangrams)
  );
}

/**
 * Finds the puzzle printed on `date` in a NYT Spelling Bee page's
 * `window.gameData`, or `null` when the page carries no entry for that date.
 *
 * @throws {Error} If the page has no readable `window.gameData`.
 */
export function parseGameData(html: string, date: string): NytPuzzle | null {
  const start = html.indexOf(GAME_DATA_MARKER);
  const braceStart = start === -1 ? -1 : html.indexOf("{", start);
  const end = braceStart === -1 ? -1 : html.indexOf("</script>", braceStart);
  if (end === -1) {
    throw new Error(
      "Couldn't find the puzzle data on the NYT page — the site may have changed."
    );
  }
  let data: unknown;
  try {
    data = JSON.parse(
      html.slice(braceStart, end).trim().replace(TRAILING_SEMICOLON_RE, "")
    );
  } catch (error) {
    throw new Error(
      "Couldn't read the puzzle data on the NYT page — the site may have changed.",
      { cause: error }
    );
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }
  for (const entry of Object.values(data)) {
    if (isNytPuzzle(entry) && entry.printDate === date) {
      return entry;
    }
  }
  return null;
}

/**
 * Derives the setup form's fields from a NYT puzzle: the start-letter ×
 * length grid and the 3-letter prefix tallies, both counted from the answers.
 */
export function deriveFields(puzzle: NytPuzzle): ScrapeResult {
  const words = puzzle.answers.map((w) => w.toUpperCase());

  const grid = new Map<string, Map<number, number>>();
  const lengthSet = new Set<number>();
  const tallies = new Map<string, number>();
  for (const word of words) {
    const row = grid.get(word[0]) ?? new Map<number, number>();
    row.set(word.length, (row.get(word.length) ?? 0) + 1);
    grid.set(word[0], row);
    lengthSet.add(word.length);
    const prefix = word.slice(0, PREFIX_LENGTH);
    tallies.set(prefix, (tallies.get(prefix) ?? 0) + 1);
  }

  const lengths = [...lengthSet].sort((a, b) => a - b);
  const header = ["", ...lengths].join("\t");
  const rows = [...grid.keys()].sort().map((letter) => {
    const row = grid.get(letter);
    return [letter, ...lengths.map((len) => row?.get(len) ?? "")].join("\t");
  });

  const hintsText = [...tallies.keys()]
    .sort()
    .map((prefix) => `${prefix} x${tallies.get(prefix)}`)
    .join("  ");

  const centerLetter = puzzle.centerLetter.toUpperCase();
  const letterSet = [
    ...new Set([
      centerLetter,
      ...puzzle.outerLetters.map((l) => l.toUpperCase()),
    ]),
  ].join("");

  return {
    centerLetter,
    date: puzzle.printDate,
    failedPrefixes: [],
    hintsText,
    letterSet,
    matrixText: [header, ...rows].join("\n"),
    pangramCount: puzzle.pangrams.length,
  };
}

/**
 * Fetches the NYT Spelling Bee page for `date` (`YYYY-MM-DD`) and returns the
 * setup form's fields.
 *
 * @throws {NytNotFoundError} If the NYT has no page for that date.
 * @throws {Error} On any other HTTP failure or unreadable page.
 */
export async function fetchNytPuzzle(date: string): Promise<ScrapeResult> {
  if (!ISO_DATE_RE.test(date)) {
    throw new Error("Expected a YYYY-MM-DD date.");
  }
  const url = `https://www.nytimes.com/puzzles/spelling-bee/${date}`;
  const res = await fetch(url, { redirect: "follow" });
  if (res.status === 404) {
    throw new NytNotFoundError(date);
  }
  if (!res.ok) {
    throw new Error(`Request to ${url} failed (HTTP ${res.status}).`);
  }
  const puzzle = parseGameData(await res.text(), date);
  if (!puzzle) {
    throw new NytNotFoundError(date);
  }
  if (puzzle.answers.length === 0) {
    throw new Error("The NYT page for that date lists no answers.");
  }
  return deriveFields(puzzle);
}
