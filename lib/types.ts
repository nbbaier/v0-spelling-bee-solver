export type HintSlot = {
  id: string
  prefix: string
  word: string | null
}

export type Puzzle = {
  // Sorted ascending list of word lengths (column headers)
  lengths: number[]
  // Uppercase letters present in the grid (row headers)
  letters: string[]
  // grid[letter][length] = total number of words for that cell
  grid: Record<string, Record<number, number>>
  // Expanded hint slots (one per word), grouped by 3-letter prefix
  hints: HintSlot[]
  // ISO date string for when the puzzle was loaded
  loadedAt: string
}
