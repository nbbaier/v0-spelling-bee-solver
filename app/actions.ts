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
import { scrapePuzzle } from "@/lib/sbsolver";
import type { HintSlot, MatrixData } from "@/lib/types";

// Discriminated result so user-facing error messages survive Next's
// production server-action error masking (thrown errors get sanitized).
export type FetchPuzzleResult =
  | {
      ok: true;
      centerLetter: string | null;
      matrixText: string;
      hintsText: string;
      date: string | null;
      failedPrefixes: string[];
    }
  | { ok: false; error: string };

async function fetchPuzzle(url: string): Promise<FetchPuzzleResult> {
  try {
    const { matrixText, hintsText, date, centerLetter, failedPrefixes } =
      await scrapePuzzle(url);
    return {
      ok: true,
      matrixText,
      hintsText,
      date,
      centerLetter,
      failedPrefixes,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not fetch that puzzle.",
    };
  }
}

export async function fetchPuzzleFromUrlAction(
  url: string
): Promise<FetchPuzzleResult> {
  return await fetchPuzzle(url);
}

export async function fetchPuzzleByDateAction(
  dateIso: string
): Promise<FetchPuzzleResult> {
  if (!isPuzzleDateInRange(dateIso)) {
    return { ok: false, error: "No puzzle is available for that date." };
  }
  // sbsolver accepts the numeric puzzle id directly (/nt/<number>), so the date
  // resolves to a URL with no extra lookup. See lib/puzzle-date.ts.
  const url = `https://www.sbsolver.com/nt/${puzzleNumberForDate(dateIso)}`;
  return await fetchPuzzle(url);
}

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

export async function deletePuzzleAction(date: string) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await deletePuzzle(date);
}

export async function clearAllWordsAction(date: string) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await clearAllWords(date);
}

export async function clearWordsForSlotsAction(
  date: string,
  slotIds: string[]
) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await clearWordsForSlots(date, slotIds);
}
