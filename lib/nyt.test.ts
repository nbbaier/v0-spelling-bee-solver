import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deriveFields,
  fetchNytPuzzle,
  NytNotFoundError,
  parseGameData,
} from "./nyt";
import { parseHints, parseMatrix } from "./parse";

// Recorded NYT page for 2026-09-28, trimmed to its window.gameData script.
const FIXTURE = readFileSync(
  new URL("../test/fixtures/nyt/2026-09-28.html", import.meta.url),
  "utf8"
);

function stubFetch(status: number, body = ""): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseGameData", () => {
  it("picks the entry printed on the requested date", () => {
    const puzzle = parseGameData(FIXTURE, "2026-09-28");
    expect(puzzle?.centerLetter).toBe("t");
    expect(puzzle?.answers).toHaveLength(45);
  });

  it("returns null when the page has no entry for the date", () => {
    expect(parseGameData(FIXTURE, "2026-01-01")).toBeNull();
  });

  it("throws when the page has no gameData", () => {
    expect(() => parseGameData("<html></html>", "2026-09-28")).toThrow(
      "Couldn't find the puzzle data"
    );
  });
});

describe("deriveFields", () => {
  const fields = deriveFields({
    answers: ["dowry", "drown", "drowning", "wrong", "rowing"],
    centerLetter: "r",
    outerLetters: ["d", "g", "i", "n", "o", "w"],
    pangrams: ["drowning"],
    printDate: "2026-06-02",
  });

  it("builds a grid parseMatrix reads back", () => {
    expect(parseMatrix(fields.matrixText)).toEqual({
      centerLetter: null,
      grid: { D: { 5: 2, 8: 1 }, R: { 6: 1 }, W: { 5: 1 } },
      lengths: [5, 6, 8],
      startLetters: ["D", "R", "W"],
    });
  });

  it("tallies answers by 3-letter prefix", () => {
    expect(fields.hintsText).toBe("DOW x1  DRO x2  ROW x1  WRO x1");
    expect(parseHints(fields.hintsText)).toHaveLength(5);
  });

  it("carries the letters, pangram count and date", () => {
    expect(fields).toMatchObject({
      centerLetter: "R",
      date: "2026-06-02",
      failedPrefixes: [],
      letterSet: "RDGINOW",
      pangramCount: 1,
    });
  });
});

describe("fetchNytPuzzle", () => {
  it("derives fields from the recorded page", async () => {
    stubFetch(200, FIXTURE);
    const fields = await fetchNytPuzzle("2026-09-28");
    expect(fields.letterSet).toBe("TCDNORU");
    expect(fields.pangramCount).toBe(2);
    expect(parseHints(fields.hintsText)).toHaveLength(45);
    expect(parseMatrix(fields.matrixText).grid.C).toEqual({
      4: 2,
      5: 2,
      6: 2,
      7: 6,
      9: 1,
    });
  });

  it("throws NytNotFoundError on a 404", async () => {
    stubFetch(404);
    await expect(fetchNytPuzzle("2026-01-01")).rejects.toBeInstanceOf(
      NytNotFoundError
    );
  });

  it("throws NytNotFoundError when the page lacks the requested date", async () => {
    stubFetch(200, FIXTURE);
    await expect(fetchNytPuzzle("2026-01-01")).rejects.toBeInstanceOf(
      NytNotFoundError
    );
  });

  it("reports other HTTP failures", async () => {
    stubFetch(503);
    await expect(fetchNytPuzzle("2026-09-28")).rejects.toThrow("HTTP 503");
  });
});
