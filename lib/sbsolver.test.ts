import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import { parseLetterSet } from "./sbsolver";

// The #string input on a sbsolver puzzle page lists all seven puzzle letters
// with the center capitalized (e.g. "Rdginow"). parseLetterSet is the fix for
// #19: the scraper used to read this only for the center letter and discard the
// other six, which are the authoritative letter set.

function inputHtml(value: string): string {
  return `<form><input id="string" value="${value}" /></form>`;
}

describe("parseLetterSet", () => {
  it("extracts all seven letters, uppercased, from the #string value", () => {
    const root = parse(inputHtml("Rdginow"));

    expect(parseLetterSet(root)).toBe("RDGINOW");
  });

  it("preserves order and drops any duplicate letters", () => {
    const root = parse(inputHtml("Aabcbd"));

    expect(parseLetterSet(root)).toBe("ABCD");
  });

  it("returns the empty string when the #string input is absent", () => {
    const root = parse("<form><input id='other' value='x' /></form>");

    expect(parseLetterSet(root)).toBe("");
  });
});
