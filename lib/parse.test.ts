import { describe, expect, it } from "vitest";
import { parseHints, parseMatrix } from "./parse";
import { SAMPLE_HINTS, SAMPLE_MATRIX } from "./sample";

// Characterization tests: these lock in the parser's CURRENT observable
// behavior so a later refactor (e.g. renaming the letters field) can be proven
// to change nothing. They assert values, not implementation.

describe("parseMatrix", () => {
  it("parses the sample grid into sorted row letters, lengths, and counts", () => {
    const result = parseMatrix(SAMPLE_MATRIX);

    expect(result.startLetters).toEqual(["D", "G", "N", "O", "R"]);
    expect(result.lengths).toEqual([4, 5, 6, 7]);
    expect(result.centerLetter).toBeNull();
    expect(result.grid).toEqual({
      D: { 4: 2, 5: 3, 6: 1, 7: 1 },
      G: { 4: 1, 5: 2, 6: 1 },
      N: { 5: 1, 6: 2, 7: 1 },
      O: { 4: 2, 5: 1, 6: 1 },
      R: { 4: 1, 5: 1, 7: 1 },
    });
  });

  it("uppercases row labels and ignores totals rows/columns", () => {
    const raw = ["\t4\t5\tΣ", "a\t1\t2\t3", "Σ\t1\t2\t3"].join("\n");
    const result = parseMatrix(raw);

    expect(result.startLetters).toEqual(["A"]);
    expect(result.lengths).toEqual([4, 5]);
    expect(result.grid).toEqual({ A: { 4: 1, 5: 2 } });
  });

  it("treats empty cells as zero and omits them from the grid", () => {
    const raw = ["\t4\t5", "D\t\t2"].join("\n");
    const result = parseMatrix(raw);

    expect(result.grid).toEqual({ D: { 5: 2 } });
  });

  it("throws when there is no data", () => {
    expect(() => parseMatrix("   ")).toThrow("No matrix data");
  });

  it("throws when no header row of word lengths is present", () => {
    expect(() => parseMatrix("D\tx\ty")).toThrow("row of word lengths");
  });

  it("throws when no letter rows are present", () => {
    expect(() => parseMatrix("\t4\t5")).toThrow("No letter rows");
  });
});

describe("parseHints", () => {
  it("expands the sample tallies into one slot per word", () => {
    const slots = parseHints(SAMPLE_HINTS);

    // 2+1+2+2 + 2+2 + 2+2 + 2+2 + 2+1 = 22
    expect(slots).toHaveLength(22);
    expect(slots[0]).toEqual({ id: "DON-0", prefix: "DON", word: null });
    expect(slots.every((s) => s.word === null)).toBe(true);
  });

  it("creates N slots for a PREFIX xN tally with a unique id each", () => {
    const slots = parseHints("DRO x4");

    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.id)).toEqual([
      "DRO-0",
      "DRO-1",
      "DRO-2",
      "DRO-3",
    ]);
    expect(slots.every((s) => s.prefix === "DRO")).toBe(true);
  });

  it("uppercases prefixes and accepts × and * as the separator", () => {
    const slots = parseHints("dro ×1 gon *1");

    expect(slots.map((s) => s.prefix)).toEqual(["DRO", "GON"]);
  });

  it("throws when no hints can be found", () => {
    expect(() => parseHints("nothing here")).toThrow("No hints found");
  });
});
