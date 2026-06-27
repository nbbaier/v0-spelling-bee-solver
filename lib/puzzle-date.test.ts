import { describe, expect, it } from "vitest";
import {
  FIRST_PUZZLE_ISO,
  isPuzzleDateInRange,
  puzzleNumberForDate,
} from "./puzzle-date";

// Characterization tests for the date↔puzzle-number math. Numbering is #1 on
// 2018-05-09, one per day with no gaps.

describe("puzzleNumberForDate", () => {
  it("maps the first puzzle date to #1", () => {
    expect(puzzleNumberForDate(FIRST_PUZZLE_ISO)).toBe(1);
  });

  it("advances by one per calendar day", () => {
    expect(puzzleNumberForDate("2018-05-10")).toBe(2);
    expect(puzzleNumberForDate("2018-05-11")).toBe(3);
  });

  it("counts a full (non-leap) year as 365 days later", () => {
    expect(puzzleNumberForDate("2019-05-09")).toBe(366);
  });

  it("is immune to leap days when crossing Feb 29", () => {
    // 2020 is a leap year, so this span is 366 days.
    expect(puzzleNumberForDate("2020-05-09")).toBe(366 + 366);
  });

  it("yields a number below 1 for dates before the first puzzle", () => {
    expect(puzzleNumberForDate("2018-05-08")).toBe(0);
  });
});

describe("isPuzzleDateInRange", () => {
  it("accepts the first puzzle date", () => {
    expect(isPuzzleDateInRange(FIRST_PUZZLE_ISO)).toBe(true);
  });

  it("rejects dates before the first puzzle", () => {
    expect(isPuzzleDateInRange("2018-05-08")).toBe(false);
  });

  it("rejects far-future dates with no published puzzle", () => {
    expect(isPuzzleDateInRange("2099-01-01")).toBe(false);
  });

  it("rejects calendar-invalid dates that pass a lexical check", () => {
    expect(isPuzzleDateInRange("2019-99-99")).toBe(false);
    expect(isPuzzleDateInRange("2021-02-29")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isPuzzleDateInRange("not-a-date")).toBe(false);
    expect(isPuzzleDateInRange("2018-5-9")).toBe(false);
  });
});
