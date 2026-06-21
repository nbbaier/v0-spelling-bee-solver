"use server";

import { isValidPuzzleId } from "@/lib/keys";
import * as store from "@/lib/puzzle-store";
import { scrapePuzzle } from "@/lib/sbsolver";
import type { HintSlot, MatrixData } from "@/lib/types";

// Discriminated result so user-facing error messages survive Next's
// production server-action error masking (thrown errors get sanitized).
export type FetchPuzzleResult =
  | {
      ok: true;
      matrixText: string;
      hintsText: string;
      date: string | null;
      failedPrefixes: string[];
    }
  | { ok: false; error: string };

export async function fetchPuzzleFromUrlAction(
  url: string
): Promise<FetchPuzzleResult> {
  try {
    const { matrixText, hintsText, date, failedPrefixes } =
      await scrapePuzzle(url);
    return { ok: true, matrixText, hintsText, date, failedPrefixes };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not fetch that puzzle.",
    };
  }
}

export async function savePuzzleAction(
  date: string,
  matrix: MatrixData,
  hints: HintSlot[]
) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await store.savePuzzle(date, matrix, hints);
}

export async function setWordAction(
  date: string,
  slotId: string,
  word: string | null
) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await store.setWord(date, slotId, word);
}

export async function deletePuzzleAction(date: string) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await store.deletePuzzle(date);
}

export async function clearAllWordsAction(date: string) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await store.clearAllWords(date);
}

export async function clearWordsForSlotsAction(
  date: string,
  slotIds: string[]
) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await store.clearWordsForSlots(date, slotIds);
}
