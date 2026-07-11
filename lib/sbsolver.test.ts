import { parse } from "node-html-parser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseMatrix } from "./parse";
import { parseLetterSet, parsePangramCount, scrapePuzzle } from "./sbsolver";

// The #string input on a sbsolver puzzle page lists all seven puzzle letters
// with the center capitalized (e.g. "Rdginow"). parseLetterSet is the fix for
// #19: the scraper used to read this only for the center letter and discard the
// other six, which are the authoritative letter set.

function inputHtml(value: string): string {
  return `<form><input id="string" value="${value}" /></form>`;
}

function puzzleHtml({
  id,
  value,
  center,
  rows,
}: {
  id: string;
  value: string;
  center: string;
  rows: string[];
}): string {
  const rowHtml = rows
    .map(
      (letter) => `
      <tr class="bee grid-row">
        <td class="bee bee-left">${letter}</td>
        <td class="grid-cell">1</td>
        <td class="bee-right grid-cell"><i>1</i></td>
      </tr>`
    )
    .join("");

  return `
    <html>
      <head><title>July 1, 2026 | 2-Letter Spelling Bee Hints</title></head>
      <body>
        <input id="string" value="${value}" />
        <img alt="center letter ${center}" />
        <b>words:</b> 55<br>
        <b>pangrams:</b> 3<br>
        <b>perfect:</b> 1<br>
        <table class="bee bee-grid">
          <tr class="bee">
            <td class="bee-top bee-left">&nbsp;</td>
            <td class="bee-top grid-cell">4</td>
            <td class="bee-top bee-right grid-cell"><i>tot</i></td>
          </tr>
          ${rowHtml}
          <tr class="bee grid-row">
            <td class="bee bee-left"><i>tot</i></td>
            <td class="grid-cell"><i>${rows.length}</i></td>
            <td class="bee-right grid-cell"><i>${rows.length}</i></td>
          </tr>
        </table>
        <table>
          <tr>
            <td class="bee-two"><a href="/nt/${value}/${id}/ba#3ltr">BA x 1</a></td>
          </tr>
        </table>
      </body>
    </html>`;
}

function prefixHtml(): string {
  return '<table><tr><td class="bee-three">BAT x1</td></tr></table>';
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("parsePangramCount", () => {
  it("parses the count from the stats block", () => {
    const root = parse("<b>words:</b> 55<br><b>pangrams:</b> 3<br>");

    expect(parsePangramCount(root)).toBe(3);
  });

  it("tolerates extra whitespace and &nbsp; around the number", () => {
    const root = parse("<b>pangrams:&nbsp;</b> &nbsp; 12 <br>");

    expect(parsePangramCount(root)).toBe(12);
  });

  it("returns null when the page has no pangrams element", () => {
    const root = parse("<b>words:</b> 55<br>");

    expect(parsePangramCount(root)).toBeNull();
  });

  it("returns null when the trailing text is not a number", () => {
    const root = parse("<b>pangrams:</b> lots<br>");

    expect(parsePangramCount(root)).toBeNull();
  });
});

describe("scrapePuzzle", () => {
  it.each([
    {
      center: "E",
      id: "2976",
      rows: ["C", "D", "E", "H", "I", "P", "U"],
      value: "Ecdhipu",
    },
    {
      center: "B",
      id: "2979",
      rows: ["A", "B", "H", "L", "T"],
      value: "Baehilt",
    },
    {
      center: "O",
      id: "2975",
      rows: ["A", "D", "H", "M", "N", "W"],
      value: "Oadhmnw",
    },
  ])("keeps matrix rows, all letters, and center letter independent for /s/$id", async ({
    center,
    id,
    rows,
    value,
  }) => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (url === `https://www.sbsolver.com/nt/${id}`) {
          return Promise.resolve(
            new Response(puzzleHtml({ center, id, rows, value }))
          );
        }
        if (url === `https://www.sbsolver.com/nt/${value}/${id}/ba`) {
          return Promise.resolve(new Response(prefixHtml()));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

    const result = await scrapePuzzle(`https://www.sbsolver.com/s/${id}`);
    const matrix = parseMatrix(result.matrixText);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://www.sbsolver.com/nt/${id}`,
      expect.any(Object)
    );
    expect(result.letterSet).toBe(value.toUpperCase());
    expect(result.centerLetter).toBe(center);
    expect(result.pangramCount).toBe(3);
    expect(matrix.startLetters).toEqual(rows);
    expect(result.hintsText).toBe("BAT x1");
  });
});
