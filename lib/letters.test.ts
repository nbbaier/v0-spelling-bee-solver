import { describe, expect, it } from "vitest";
import {
  allowedLetters,
  hasOnlyAllowedLetters,
  isCompleteLetterSet,
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

  it("always includes every start letter, even when the set omits one", () => {
    // An incomplete hand-confirmed set that dropped a start letter must not make
    // validation stricter than start-letters-only (a start letter is always a
    // puzzle letter), so R-words stay valid.
    const allowed = allowedLetters({
      letterSet: "DO",
      startLetters: ["D", "O", "R"],
    });

    expect(allowed).toEqual(expect.arrayContaining(["D", "O", "R"]));
    expect(hasOnlyAllowedLetters("ROD", allowed)).toBe(true);
  });

  it("tolerates separators and duplicates in a stored set", () => {
    const allowed = allowedLetters({
      letterSet: "d-g n o",
      startLetters: ["D"],
    });

    expect(new Set(allowed)).toEqual(new Set(["D", "G", "N", "O"]));
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

describe("isCompleteLetterSet", () => {
  it("accepts a 7-letter set that contains every start letter", () => {
    expect(isCompleteLetterSet("DGNORUI", ["D", "G", "N", "O", "R"])).toBe(
      true
    );
  });

  it("rejects a 7-letter set that omits a start letter (typo'd extra)", () => {
    // Seven unique letters, but missing start letter R and carrying a stray X;
    // marking this authoritative would let X slip past validation via the union.
    expect(isCompleteLetterSet("DGNOUIX", ["D", "G", "N", "O", "R"])).toBe(
      false
    );
  });

  it("rejects a set with fewer than seven letters", () => {
    expect(isCompleteLetterSet("DGNOR", ["D", "G", "N", "O", "R"])).toBe(false);
  });

  it("ignores separators and duplicates when checking", () => {
    expect(isCompleteLetterSet("d-g n o r u i", ["D", "R"])).toBe(true);
  });
});

describe("normalizeLetterSet", () => {
  it("uppercases, strips non-letters, and dedupes while preserving order", () => {
    expect(normalizeLetterSet("r d g i n o w")).toBe("RDGINOW");
    expect(normalizeLetterSet("Aabc-b!d")).toBe("ABCD");
  });
});
