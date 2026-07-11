// A realistic dummy puzzle for development, so you can iron out kinks
// without copying from sbsolver. The matrix is tab-separated like a real
// sbsolver paste (with a totals row/column that the parser ignores).

export const SAMPLE_CENTER_LETTER = "O";

// All seven letters of the sample puzzle (center O included). The grid only
// lists start letters D/G/N/O/R, but the answers also use U and I mid-word
// (e.g. DUN, RID), so those belong to the set even though they begin no row.
export const SAMPLE_LETTER_SET = "DGNORUI";

// Dummy pangram count — its purpose is exercising the footer display.
export const SAMPLE_PANGRAM_COUNT = 1;

export const SAMPLE_MATRIX = [
  "\t4\t5\t6\t7\tΣ",
  "D\t2\t3\t1\t1\t7",
  "G\t1\t2\t1\t\t4",
  "N\t\t1\t2\t1\t4",
  "O\t2\t1\t1\t\t4",
  "R\t1\t1\t\t1\t3",
  "Σ\t6\t8\t5\t3\t22",
].join("\n");

export const SAMPLE_HINTS = [
  "DON x2  DOO x1  DRO x2  DUN x2",
  "GON x2  GRO x2",
  "NOD x2  NOO x2",
  "ODO x2  ORD x2",
  "RID x2  ROO x1",
].join("\n");
