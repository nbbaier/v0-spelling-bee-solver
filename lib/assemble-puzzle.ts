import type { HintSlot, MatrixData, Puzzle } from "./types";

// A matrix as read back from Redis. Rows persisted before the
// letters→startLetters rename carry the legacy `letters` field and no
// `startLetters`, so both are optional here. The migration script
// (scripts/migrate-letters-to-start-letters.ts) rewrites old rows, but it is
// manual and may not have run yet, so reads must tolerate either shape.
export type StoredMatrix = Omit<
  MatrixData,
  "startLetters" | "letterSet" | "pangramCount"
> & {
  startLetters?: string[];
  letters?: string[];
  // Absent on rows persisted before the letterSet slice; assemblePuzzle
  // defaults it to "" (unknown), which validation treats as "fall back to
  // startLetters".
  letterSet?: string;
  // Absent on rows persisted before the pangramCount slice; assemblePuzzle
  // defaults it to null (unknown).
  pangramCount?: number | null;
};

// Combines the stored matrix, hint prefix slots, and entered words into a
// Puzzle. Pure (no I/O) so the read-time shape mapping — including the legacy
// `letters` fallback — can be characterized in isolation.
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
    date,
    centerLetter: matrix.centerLetter ?? null,
    // Empty string when the row predates letterSet; validation then falls back
    // to startLetters (see lib/letters.ts → allowedLetters).
    letterSet: matrix.letterSet ?? "",
    // Null when the row predates pangramCount — "unknown", not zero.
    pangramCount: matrix.pangramCount ?? null,
    // Fall back to the legacy field for not-yet-migrated rows. Empty array as a
    // last resort keeps derive()/the grid from crashing on malformed data.
    startLetters: matrix.startLetters ?? matrix.letters ?? [],
    lengths: matrix.lengths,
    grid: matrix.grid,
    hints,
  };
}
