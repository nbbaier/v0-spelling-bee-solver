// Crosshair hover for the matrix: the hovered cell's row and column light up.
// Rows are keyed by start letter and columns by word length; TOTAL keys the
// Σ row and Σ column. Row headers have no column and column headers no row.

export const TOTAL = "total";

export interface CellPosition {
  col: number | typeof TOTAL | null;
  row: string | null;
}

// "focus" is the hovered cell itself; "row" and "column" are the rest of the
// lit lines. Lit lines cross only at the hovered cell, so no cell is both.
export type Highlight = "none" | "row" | "column" | "focus";

export function highlightFor(
  hovered: CellPosition | null,
  cell: CellPosition
): Highlight {
  if (!hovered) {
    return "none";
  }
  if (hovered.row === cell.row && hovered.col === cell.col) {
    return "focus";
  }
  // A Σ cell lights only its own line: a row's total its row, a column's
  // total its column. The grand total sits on both Σ lines and lights both.
  // Headers (a null axis) are not Σ cells, even the Σ row and column headers.
  const isRowTotal =
    hovered.col === TOTAL && hovered.row !== null && hovered.row !== TOTAL;
  const isColTotal =
    hovered.row === TOTAL && hovered.col !== null && hovered.col !== TOTAL;
  const litRow = isColTotal ? null : hovered.row;
  const litCol = isRowTotal ? null : hovered.col;
  if (litRow !== null && cell.row === litRow) {
    return "row";
  }
  if (litCol !== null && cell.col === litCol) {
    return "column";
  }
  return "none";
}
