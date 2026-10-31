import { describe, expect, it } from "vitest";
import { type CellPosition, highlightFor, TOTAL } from "./crosshair";

const ROW_HEADER_A: CellPosition = { col: null, row: "A" };
const ROW_HEADER_B: CellPosition = { col: null, row: "B" };
const COL_HEADER_4: CellPosition = { col: 4, row: null };
const COL_HEADER_5: CellPosition = { col: 5, row: null };
const SUM_ROW_HEADER: CellPosition = { col: null, row: TOTAL };
const SUM_COL_HEADER: CellPosition = { col: TOTAL, row: null };

describe("highlightFor", () => {
  it("highlights nothing when nothing is hovered", () => {
    expect(highlightFor(null, { col: 4, row: "A" })).toBe("none");
    expect(highlightFor(null, ROW_HEADER_A)).toBe("none");
  });

  describe("hovering a body cell", () => {
    const hovered: CellPosition = { col: 5, row: "B" };

    it("focuses the cell itself", () => {
      expect(highlightFor(hovered, { col: 5, row: "B" })).toBe("focus");
    });

    it("bands its row, row header and row Σ", () => {
      expect(highlightFor(hovered, { col: 4, row: "B" })).toBe("row");
      expect(highlightFor(hovered, ROW_HEADER_B)).toBe("row");
      expect(highlightFor(hovered, { col: TOTAL, row: "B" })).toBe("row");
    });

    it("bands its column, column header and column Σ", () => {
      expect(highlightFor(hovered, { col: 5, row: "A" })).toBe("column");
      expect(highlightFor(hovered, COL_HEADER_5)).toBe("column");
      expect(highlightFor(hovered, { col: 5, row: TOTAL })).toBe("column");
    });

    it("leaves other cells and headers alone", () => {
      expect(highlightFor(hovered, { col: 4, row: "A" })).toBe("none");
      expect(highlightFor(hovered, ROW_HEADER_A)).toBe("none");
      expect(highlightFor(hovered, COL_HEADER_4)).toBe("none");
      expect(highlightFor(hovered, { col: TOTAL, row: TOTAL })).toBe("none");
    });
  });

  it("hovering a row header bands only that row", () => {
    expect(highlightFor(ROW_HEADER_B, ROW_HEADER_B)).toBe("focus");
    expect(highlightFor(ROW_HEADER_B, { col: 4, row: "B" })).toBe("row");
    expect(highlightFor(ROW_HEADER_B, { col: 4, row: "A" })).toBe("none");
    expect(highlightFor(ROW_HEADER_B, COL_HEADER_4)).toBe("none");
  });

  it("hovering a column header bands only that column", () => {
    expect(highlightFor(COL_HEADER_4, COL_HEADER_4)).toBe("focus");
    expect(highlightFor(COL_HEADER_4, { col: 4, row: "A" })).toBe("column");
    expect(highlightFor(COL_HEADER_4, { col: 5, row: "A" })).toBe("none");
    expect(highlightFor(COL_HEADER_4, ROW_HEADER_A)).toBe("none");
  });

  it("hovering a row's Σ cell focuses it and bands only that row", () => {
    const hovered: CellPosition = { col: TOTAL, row: "B" };
    expect(highlightFor(hovered, hovered)).toBe("focus");
    expect(highlightFor(hovered, ROW_HEADER_B)).toBe("row");
    expect(highlightFor(hovered, { col: TOTAL, row: "A" })).toBe("none");
    expect(highlightFor(hovered, SUM_COL_HEADER)).toBe("none");
  });

  it("hovering a column's Σ cell focuses it and bands only that column", () => {
    const hovered: CellPosition = { col: 4, row: TOTAL };
    expect(highlightFor(hovered, hovered)).toBe("focus");
    expect(highlightFor(hovered, COL_HEADER_4)).toBe("column");
    expect(highlightFor(hovered, { col: 5, row: TOTAL })).toBe("none");
    expect(highlightFor(hovered, SUM_ROW_HEADER)).toBe("none");
  });

  it("hovering the Σ headers bands the Σ row or column", () => {
    expect(highlightFor(SUM_ROW_HEADER, { col: 4, row: TOTAL })).toBe("row");
    expect(highlightFor(SUM_ROW_HEADER, { col: 4, row: "A" })).toBe("none");
    expect(highlightFor(SUM_COL_HEADER, { col: TOTAL, row: "A" })).toBe(
      "column"
    );
    expect(highlightFor(SUM_COL_HEADER, { col: 4, row: "A" })).toBe("none");
  });

  it("hovering the grand total bands both Σ lines", () => {
    const hovered: CellPosition = { col: TOTAL, row: TOTAL };
    expect(highlightFor(hovered, { col: 4, row: TOTAL })).toBe("row");
    expect(highlightFor(hovered, { col: TOTAL, row: "A" })).toBe("column");
    expect(highlightFor(hovered, { col: 4, row: "A" })).toBe("none");
  });
});
