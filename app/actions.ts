"use server";

import { isValidPuzzleId } from "@/lib/keys";
import { fetchNytPuzzle, NytNotFoundError } from "@/lib/nyt";
import { isPuzzleDateInRange, latestPuzzleDateISO } from "@/lib/puzzle-date";
import {
  clearAllWords,
  clearWordsForSlots,
  deletePuzzle,
  savePuzzle,
  setWord,
} from "@/lib/puzzle-store";
import { type ScrapeResult, scrapePuzzle } from "@/lib/sbsolver";
import type { HintSlot, MatrixData } from "@/lib/types";

/** Outcome of fetching a puzzle (NYT or sbsolver) for the setup form. */
export type FetchPuzzleResult =
  | ({ ok: true } & ScrapeResult)
  | { ok: false; error: string };

/**
 * Scrapes an sbsolver puzzle URL into setup-form text fields via
 * {@link scrapePuzzle}, mapping thrown errors to `{ ok: false }`.
 */
export async function fetchPuzzleFromUrlAction(
  url: string
): Promise<FetchPuzzleResult> {
  try {
    return { ok: true, ...(await scrapePuzzle(url)) };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not fetch that puzzle.",
      ok: false,
    };
  }
}

/**
 * Loads the puzzle for `dateIso` from the NYT's own page (see
 * docs/adr/0008-load-puzzles-from-nyt.md). The NYT only serves roughly the last
 * two weeks; an older date fails with a message pointing at the paste fields.
 */
export async function fetchPuzzleByDateAction(
  dateIso: string
): Promise<FetchPuzzleResult> {
  if (!isPuzzleDateInRange(dateIso)) {
    return { error: "No puzzle is available for that date.", ok: false };
  }
  try {
    return { ok: true, ...(await fetchNytPuzzle(dateIso)) };
  } catch (e) {
    if (e instanceof NytNotFoundError) {
      return {
        error:
          dateIso === latestPuzzleDateISO()
            ? "Today's puzzle isn't on the NYT site yet (it goes live around 3 a.m. ET). Try again later, or paste the grid and hints below."
            : "The NYT only keeps the last two weeks of puzzles. Paste the grid and hints below to load this one.",
        ok: false,
      };
    }
    return {
      error: e instanceof Error ? e.message : "Could not fetch that puzzle.",
      ok: false,
    };
  }
}

/** Persists a puzzle definition. Throws if `date` is not a valid puzzle id. */
export async function savePuzzleAction(
  date: string,
  matrix: MatrixData,
  hints: HintSlot[]
) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await savePuzzle(date, matrix, hints);
}

/** Sets or clears the word for one hint slot. Throws if `date` is invalid. */
export async function setWordAction(
  date: string,
  slotId: string,
  word: string | null
) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await setWord(date, slotId, word);
}

/** Deletes a puzzle and its progress. Throws if `date` is invalid. */
export async function deletePuzzleAction(date: string) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await deletePuzzle(date);
}

/** Clears all entered words for a puzzle. Throws if `date` is invalid. */
export async function clearAllWordsAction(date: string) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await clearAllWords(date);
}

/** Clears entered words for the given slot ids. Throws if `date` is invalid. */
export async function clearWordsForSlotsAction(
  date: string,
  slotIds: string[]
) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await clearWordsForSlots(date, slotIds);
}
