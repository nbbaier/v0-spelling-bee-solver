import { describe, expect, it } from "vitest";
import { assemblePuzzle, type StoredMatrix } from "./assemble-puzzle";
import type { HintSlot } from "./types";

const PREFIXES: HintSlot[] = [
  { id: "DON-0", prefix: "DON", word: null },
  { id: "DON-1", prefix: "DON", word: null },
];

const NEW_MATRIX: StoredMatrix = {
  centerLetter: "O",
  grid: { D: { 4: 2 }, O: { 4: 1 } },
  lengths: [4],
  startLetters: ["D", "O"],
};

describe("assemblePuzzle", () => {
  it("maps a current-shape matrix and merges entered words into hint slots", () => {
    const puzzle = assemblePuzzle("2024-01-01", NEW_MATRIX, PREFIXES, {
      "DON-0": "DOOR",
    });

    expect(puzzle.startLetters).toEqual(["D", "O"]);
    expect(puzzle.centerLetter).toBe("O");
    expect(puzzle.lengths).toEqual([4]);
    expect(puzzle.grid).toEqual(NEW_MATRIX.grid);
    expect(puzzle.hints).toEqual([
      { id: "DON-0", prefix: "DON", word: "DOOR" },
      { id: "DON-1", prefix: "DON", word: null },
    ]);
  });

  it("falls back to the legacy letters field for a not-yet-migrated row", () => {
    // A matrix persisted before the rename: `letters`, no `startLetters`.
    const legacy: StoredMatrix = {
      centerLetter: "O",
      grid: { D: { 4: 2 }, O: { 4: 1 } },
      lengths: [4],
      letters: ["D", "O"],
    };

    const puzzle = assemblePuzzle("2024-01-01", legacy, PREFIXES, null);

    // Without the fallback this would be undefined and crash derive(puzzle).
    expect(puzzle.startLetters).toEqual(["D", "O"]);
  });

  it("yields empty startLetters rather than undefined when both fields are absent", () => {
    const malformed = {
      centerLetter: null,
      grid: {},
      lengths: [],
    } as StoredMatrix;

    const puzzle = assemblePuzzle("2024-01-01", malformed, [], null);

    expect(puzzle.startLetters).toEqual([]);
  });
});
