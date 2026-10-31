import { describe, expect, it } from "vitest";
import { derive, isPangram } from "./derive";
import type { Puzzle } from "./types";

// Characterization test for progress derivation: totals come from the grid,
// found counts come from entered words, and a word is bucketed by its first
// letter and length.

function makePuzzle(words: (string | null)[], letterSet = "DGNORUI"): Puzzle {
  return {
    centerLetter: "O",
    date: "2024-01-01",
    grid: { D: { 4: 2, 5: 1 }, O: { 4: 1 } },
    hints: words.map((word, i) => ({ id: `S-${i}`, prefix: "XXX", word })),
    lengths: [4, 5],
    letterSet,
    pangramCount: null,
    startLetters: ["D", "O"],
  };
}

describe("derive", () => {
  it("computes totals from the grid independent of entered words", () => {
    const d = derive(makePuzzle([]));

    expect(d.totalWords).toBe(4);
    expect(d.lengthTotals).toEqual({ 4: 3, 5: 1 });
    expect(d.letterTotals).toEqual({ D: 3, O: 1 });
    expect(d.foundWords).toBe(0);
    expect(d.found).toEqual({ D: {}, O: {} });
    expect(d.lengthFound).toEqual({ 4: 0, 5: 0 });
    expect(d.letterFound).toEqual({ D: 0, O: 0 });
  });

  it("buckets each entered word by first letter and length", () => {
    const d = derive(makePuzzle(["DOOR", null, "ODOR"]));

    expect(d.foundWords).toBe(2);
    expect(d.found).toEqual({ D: { 4: 1 }, O: { 4: 1 } });
    expect(d.lengthFound).toEqual({ 4: 2, 5: 0 });
    expect(d.letterFound).toEqual({ D: 1, O: 1 });
  });

  it("trims, uppercases, and skips blank entered words", () => {
    const d = derive(makePuzzle(["  door  ", "   "]));

    expect(d.foundWords).toBe(1);
    expect(d.found).toEqual({ D: { 4: 1 }, O: {} });
  });
});

describe("isPangram", () => {
  const letterSet = "DGNORUI";

  it("is true when the word uses all seven letters", () => {
    expect(isPangram("GROUNDING", letterSet)).toBe(true);
  });

  it("is false when the word misses a letter", () => {
    expect(isPangram("GROUND", letterSet)).toBe(false);
  });

  it("counts repeated letters", () => {
    expect(isPangram("ROUNDINGDOG", letterSet)).toBe(true);
  });

  it("ignores case in the word and the letter set", () => {
    expect(isPangram("grounding", letterSet)).toBe(true);
    expect(isPangram("GROUNDING", "dgnorui")).toBe(true);
  });

  it("is false when the letter set is empty", () => {
    expect(isPangram("GROUNDING", "")).toBe(false);
  });
});

describe("derive pangramsFound", () => {
  it("counts entered words that are pangrams", () => {
    const d = derive(makePuzzle(["GROUNDING", "door", null, " grounding "]));

    expect(d.pangramsFound).toBe(2);
  });

  it("is 0 with no entered words", () => {
    expect(derive(makePuzzle([])).pangramsFound).toBe(0);
  });

  it("is 0 when the letter set is unknown", () => {
    expect(derive(makePuzzle(["GROUNDING"], "")).pangramsFound).toBe(0);
  });
});
