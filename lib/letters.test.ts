import { describe, expect, it } from "vitest";
import {
  allowedLetters,
  hasOnlyAllowedLetters,
  normalizeLetterSet,
} from "./letters";

describe("allowedLetters", () => {
  it("uses the authoritative letterSet when present", () => {
    expect(
      allowedLetters({ letterSet: "DGNORUI", startLetters: ["D", "G"] })
    ).toEqual(["D", "G", "N", "O", "R", "U", "I"]);
  });

  it("falls back to startLetters when letterSet is empty (legacy rows)", () => {
    expect(allowedLetters({ letterSet: "", startLetters: ["D", "O"] })).toEqual(
      ["D", "O"]
    );
  });
});

describe("hasOnlyAllowedLetters", () => {
  it("accepts a word using a puzzle letter that begins no answer (#19)", () => {
    // "I" and "U" are in the letter set but begin no grid row (start letters
    // are D/G/N/O/R). The word RADIU… stand-in "GUIDON" uses U and I mid-word.
    const allowed = allowedLetters({
      letterSet: "DGNORUI",
      startLetters: ["D", "G", "N", "O", "R"],
    });

    // The regression: validating against start letters alone would reject this.
    expect(hasOnlyAllowedLetters("GUIDON", allowed)).toBe(true);
    expect(hasOnlyAllowedLetters("GUIDON", ["D", "G", "N", "O", "R"])).toBe(
      false
    );
  });

  it("rejects a word containing a letter outside the puzzle", () => {
    const allowed = allowedLetters({
      letterSet: "DGNORUI",
      startLetters: ["D"],
    });

    expect(hasOnlyAllowedLetters("DOZING", allowed)).toBe(false); // Z not in set
  });
});

describe("normalizeLetterSet", () => {
  it("uppercases, strips non-letters, and dedupes while preserving order", () => {
    expect(normalizeLetterSet("r d g i n o w")).toBe("RDGINOW");
    expect(normalizeLetterSet("Aabc-b!d")).toBe("ABCD");
  });
});
