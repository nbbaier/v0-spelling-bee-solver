import { describe, expect, it } from "vitest";
import { isValidPuzzleId } from "./keys";

describe("isValidPuzzleId", () => {
  it("rejects a well-formed but impossible calendar date", () => {
    expect(isValidPuzzleId("2019-99-99")).toBe(false);
  });

  it("accepts a real calendar date", () => {
    expect(isValidPuzzleId("2019-02-28")).toBe(true);
  });

  it("accepts the sample id", () => {
    expect(isValidPuzzleId("sample")).toBe(true);
  });
});
