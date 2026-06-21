export interface HintSlot {
  id: string;
  prefix: string;
  word: string | null;
}

// The static puzzle definition stored at sbs:<DATE>:matrix
export interface MatrixData {
  // The puzzle's center letter (uppercase), or null when unknown. Every valid
  // Spelling Bee answer must contain this letter; sbsolver marks it by
  // capitalizing it in the URL path and on the hive's yellow hexagon.
  centerLetter: string | null;
  // grid[letter][length] = total number of words for that cell
  grid: Record<string, Record<number, number>>;
  // Sorted ascending list of word lengths (column headers)
  lengths: number[];
  // Uppercase letters present in the grid (row headers)
  letters: string[];
}

export type Puzzle = MatrixData & {
  // ISO date (YYYY-MM-DD) this puzzle belongs to
  date: string;
  // Expanded hint slots (one per word), grouped by 3-letter prefix
  hints: HintSlot[];
};
