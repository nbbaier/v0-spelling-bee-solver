/** One expandable prefix tally from the hints list, plus any word entered for it. */
export interface HintSlot {
  /** Stable id of the form `PREFIX-n`, unique within a puzzle. */
  id: string;
  /** Uppercase 2- or 3-letter prefix this slot belongs to. */
  prefix: string;
  /** Entered answer for this slot, or `null` if empty. */
  word: string | null;
}

/** Static puzzle definition stored at `sbs:<DATE>:matrix`. */
export interface MatrixData {
  /**
   * Puzzle center letter (uppercase), or `null` when unknown.
   * Every valid Spelling Bee answer must contain this letter.
   */
  centerLetter: string | null;

  /** `grid[letter][length]` = number of answers for that cell. */
  grid: Record<string, Record<number, number>>;

  /** Word lengths that appear as grid columns, sorted ascending. */
  lengths: number[];

  /**
   * Authoritative 7-letter set, uppercase with no separators (e.g. `"RDGINOW"`).
   * Empty when unknown (hand-pasted puzzle, or a row persisted before this field).
   * See CONTEXT.md → Letter set.
   */
  letterSet: string;

  /**
   * Number of pangrams (answers using all seven letters), or `null` when unknown.
   * See CONTEXT.md → Pangram.
   */
  pangramCount: number | null;

  /**
   * Uppercase row labels: start letters of answers. Not the full 7-letter set —
   * a puzzle letter that begins no answer never appears here.
   * See CONTEXT.md → Matrix.
   */
  startLetters: string[];
}

/** Stored matrix plus the puzzle date and expanded hint slots. */
export type Puzzle = MatrixData & {
  /** ISO date (`YYYY-MM-DD`) or the sample sentinel id. */
  date: string;
  /** Hint slots (one per word), grouped by prefix. */
  hints: HintSlot[];
};
