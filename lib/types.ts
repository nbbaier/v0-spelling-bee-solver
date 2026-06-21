export type HintSlot = {
  id: string;
  prefix: string;
  word: string | null;
};

// The static puzzle definition stored at sbs:<DATE>:matrix
export type MatrixData = {
  // Sorted ascending list of word lengths (column headers)
  lengths: number[];
  // Uppercase letters present in the grid (row headers)
  letters: string[];
  // grid[letter][length] = total number of words for that cell
  grid: Record<string, Record<number, number>>;
};

export type Puzzle = MatrixData & {
  // ISO date (YYYY-MM-DD) this puzzle belongs to
  date: string;
  // Expanded hint slots (one per word), grouped by 3-letter prefix
  hints: HintSlot[];
};
