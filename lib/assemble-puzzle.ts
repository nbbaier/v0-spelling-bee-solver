import type { HintSlot, MatrixData, Puzzle } from "./types";

/**
 * Matrix as read back from Redis.
 *
 * Rows persisted before the `letters` → `startLetters` rename, or before
 * `letterSet` / `pangramCount` existed, omit those fields. {@link assemblePuzzle}
 * fills in defaults until `scripts/migrate-letters-to-start-letters.ts` has run.
 */
export type StoredMatrix = Omit<
  MatrixData,
  "startLetters" | "letterSet" | "pangramCount"
> & {
  startLetters?: string[];
  /** Legacy row-label field; treated as {@link MatrixData.startLetters}. */
  letters?: string[];
  /** Absent on older rows; defaults to `""` (unknown). */
  letterSet?: string;
  /** Absent on older rows; defaults to `null` (unknown). */
  pangramCount?: number | null;
};

/**
 * Combines stored matrix, prefix slots, and entered words into a {@link Puzzle}.
 * Pure: maps the legacy `letters` field onto `startLetters` when needed.
 *
 * @param date - Puzzle date or sample id.
 * @param matrix - Stored matrix, possibly using legacy field names.
 * @param prefixes - Hint slots as stored (typically `word: null`).
 * @param words - Hash of slot id → entered word, or `null` if none.
 */
export function assemblePuzzle(
  date: string,
  matrix: StoredMatrix,
  prefixes: HintSlot[],
  words: Record<string, string> | null
): Puzzle {
  const hints: HintSlot[] = prefixes.map((slot) => ({
    ...slot,
    word: words?.[slot.id] ?? null,
  }));

  return {
    centerLetter: matrix.centerLetter ?? null,
    date,
    grid: matrix.grid,
    hints,
    lengths: matrix.lengths,
    letterSet: matrix.letterSet ?? "",
    pangramCount: matrix.pangramCount ?? null,
    startLetters: matrix.startLetters ?? matrix.letters ?? [],
  };
}
