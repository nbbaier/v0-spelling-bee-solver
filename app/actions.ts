"use server";

import { isSampleId, isValidPuzzleId } from "@/lib/keys";
import { isPuzzleDateInRange, puzzleNumberForDate } from "@/lib/puzzle-date";
import {
  clearAllWords,
  clearWordsForSlots,
  deletePuzzle,
  savePuzzle,
  setWord,
} from "@/lib/puzzle-store";
import { isValidRoomName } from "@/lib/rooms";
import { scrapePuzzle } from "@/lib/sbsolver";
import type { HintSlot, MatrixData } from "@/lib/types";

// Word progress is always room-scoped for real dates; the sample puzzle stays
// outside the room system entirely. Enforced at every entry point so a missing
// or malformed room can never route words into the legacy global hash.
function assertWordsScope(date: string, room?: string | null): void {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  if (isSampleId(date)) {
    if (typeof room === "string") {
      throw new Error("The sample puzzle cannot belong to a room");
    }
    return;
  }
  if (!(room && isValidRoomName(room))) {
    throw new Error("A valid room is required");
  }
}

// Discriminated result so user-facing error messages survive Next's
// production server-action error masking (thrown errors get sanitized).
export type FetchPuzzleResult =
  | {
      ok: true;
      centerLetter: string | null;
      letterSet: string;
      matrixText: string;
      hintsText: string;
      date: string | null;
      pangramCount: number | null;
      failedPrefixes: string[];
    }
  | { ok: false; error: string };

async function fetchPuzzle(url: string): Promise<FetchPuzzleResult> {
  try {
    const {
      matrixText,
      hintsText,
      date,
      centerLetter,
      letterSet,
      pangramCount,
      failedPrefixes,
    } = await scrapePuzzle(url);
    return {
      centerLetter,
      date,
      failedPrefixes,
      hintsText,
      letterSet,
      matrixText,
      ok: true,
      pangramCount,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not fetch that puzzle.",
      ok: false,
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
    return { error: "No puzzle is available for that date.", ok: false };
  }
  // sbsolver accepts the numeric puzzle id directly (/nt/<number>), so the date
  // resolves to a URL with no extra lookup. See lib/puzzle-date.ts.
  const url = `https://www.sbsolver.com/nt/${puzzleNumberForDate(dateIso)}`;
  const result = await fetchPuzzle(url);
  // The date→number mapping assumes contiguous daily numbering; a gap, redirect,
  // or upstream change could resolve to a different day. The page states its own
  // date, so only accept a scrape whose date matches the request — and treat a
  // missing date (markup we couldn't read) as a verification failure too, rather
  // than silently storing one day's puzzle under another date.
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
  word: string | null,
  room?: string | null
) {
  assertWordsScope(date, room);
  await setWord(date, slotId, word, room);
}

export async function deletePuzzleAction(date: string) {
  if (!isValidPuzzleId(date)) {
    throw new Error("Invalid puzzle id");
  }
  await deletePuzzle(date);
}

export async function clearAllWordsAction(date: string, room?: string | null) {
  assertWordsScope(date, room);
  await clearAllWords(date, room);
}

export async function clearWordsForSlotsAction(
  date: string,
  slotIds: string[],
  room?: string | null
) {
  assertWordsScope(date, room);
  await clearWordsForSlots(date, slotIds, room);
}
