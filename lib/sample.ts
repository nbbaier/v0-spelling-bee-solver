/** Center letter of the development dummy puzzle. */
export const SAMPLE_CENTER_LETTER = "O";
/** Authoritative 7-letter set of the development dummy puzzle. */
export const SAMPLE_LETTER_SET = "DGNORUI";
/** Pangram count of the development dummy puzzle. */
export const SAMPLE_PANGRAM_COUNT = 1;

/**
 * Tab-separated matrix paste for the development dummy puzzle, including
 * totals row/column that `parseMatrix` ignores.
 */
export const SAMPLE_MATRIX = [
  "\t4\t5\t6\t7\tΣ",
  "D\t2\t3\t1\t1\t7",
  "G\t1\t2\t1\t\t4",
  "N\t\t1\t2\t1\t4",
  "O\t2\t1\t1\t\t4",
  "R\t1\t1\t\t1\t3",
  "Σ\t6\t8\t5\t3\t22",
].join("\n");

/** `"PREFIX xN"` hint tallies for the development dummy puzzle. */
export const SAMPLE_HINTS = [
  "DON x2  DOO x1  DRO x2  DUN x2",
  "GON x2  GRO x2",
  "NOD x2  NOO x2",
  "ODO x2  ORD x2",
  "RID x2  ROO x1",
].join("\n");
