"use server";

import { isValidPuzzleId } from "@/lib/keys";
import { isPuzzleDateInRange, puzzleNumberForDate } from "@/lib/puzzle-date";
import {
  clearAllWords,
  clearWordsForSlots,
  deletePuzzle,
  savePuzzle,
  setWord,
} from "@/lib/puzzle-store";
import { type ScrapeResult, scrapePuzzle } from "@/lib/sbsolver";
import type { HintSlot, MatrixData } from "@/lib/types";

/** Outcome of fetching a puzzle from sbsolver for the setup form. */
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
 * Scrapes the sbsolver puzzle for `dateIso` via `/nt/<number>`.
 *
 * Rejects a scrape whose page date does not match `dateIso` (including a missing
 * date), so a numbering gap cannot store one day's puzzle under another date.
 */
export async function fetchPuzzleByDateAction(
  dateIso: string
): Promise<FetchPuzzleResult> {
  if (!isPuzzleDateInRange(dateIso)) {
    return { error: "No puzzle is available for that date.", ok: false };
  }
  const url = `https://www.sbsolver.com/nt/${puzzleNumberForDate(dateIso)}`;
  const result = await fetchPuzzleFromUrlAction(url);
  if (result.ok && result.date !== dateIso) {
    return {
      error: result.date
        ? `That date resolved to the puzzle for ${result.date}. sbsolver's numbering may have shifted — try the URL option.`
        : "Couldn't confirm the puzzle's date on that page — try the URL option.",
      ok: false,
    };
  }
  return result;
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
