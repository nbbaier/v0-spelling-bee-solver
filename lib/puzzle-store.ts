import "server-only";
import { assemblePuzzle, type StoredMatrix } from "./assemble-puzzle";
import { isSampleId, keys } from "./keys";
import { redis } from "./redis";
import type { HintSlot, MatrixData, Puzzle } from "./types";

/**
 * Loads matrix, prefix slots, and entered words for `date`.
 *
 * Reads the matrix as {@link StoredMatrix} so pre-rename rows (`letters` instead
 * of `startLetters`) still assemble. Returns `null` if matrix or prefixes are missing.
 */
export async function getPuzzle(date: string): Promise<Puzzle | null> {
  const [matrix, prefixes, words] = await Promise.all([
    redis.get<StoredMatrix>(keys.matrix(date)),
    redis.get<HintSlot[]>(keys.prefixes(date)),
    redis.hgetall<Record<string, string>>(keys.words(date)),
  ]);

  if (!(matrix && prefixes)) {
    return null;
  }

  return assemblePuzzle(date, matrix, prefixes, words);
}

/**
 * Persists the static puzzle definition (matrix + blank prefix slots).
 * Registers `date` in the date index unless it is the sample sentinel.
 * Does not modify entered words.
 */
export async function savePuzzle(
  date: string,
  matrix: MatrixData,
  hints: HintSlot[]
): Promise<void> {
  const blankSlots = hints.map((s) => ({
    id: s.id,
    prefix: s.prefix,
    word: null,
  }));
  const ops: Promise<unknown>[] = [
    redis.set(keys.matrix(date), matrix),
    redis.set(keys.prefixes(date), blankSlots),
  ];
  if (!isSampleId(date)) {
    ops.push(redis.sadd(keys.dates(), date));
  }
  await Promise.all(ops);
}

/**
 * Sets or clears the entered word for one hint slot.
 * Non-empty values are trimmed and stored uppercase; empty/`null` deletes the hash field.
 */
export async function setWord(
  date: string,
  slotId: string,
  word: string | null
): Promise<void> {
  if (word && word.trim().length > 0) {
    await redis.hset(keys.words(date), { [slotId]: word.trim().toUpperCase() });
  } else {
    await redis.hdel(keys.words(date), slotId);
  }
}

/**
 * Deletes a puzzle's matrix, prefixes, and words.
 * Removes `date` from the date index unless it is the sample sentinel.
 */
export async function deletePuzzle(date: string): Promise<void> {
  const ops: Promise<unknown>[] = [
    redis.del(keys.matrix(date)),
    redis.del(keys.prefixes(date)),
    redis.del(keys.words(date)),
  ];
  if (!isSampleId(date)) {
    ops.push(redis.srem(keys.dates(), date));
  }
  await Promise.all(ops);
}

/** Deletes all entered words for a puzzle, leaving the definition in place. */
export async function clearAllWords(date: string): Promise<void> {
  await redis.del(keys.words(date));
}

/** Deletes entered words for the given slot ids. No-op if `slotIds` is empty. */
export async function clearWordsForSlots(
  date: string,
  slotIds: string[]
): Promise<void> {
  if (!slotIds.length) {
    return;
  }
  await redis.hdel(keys.words(date), ...slotIds);
}

/** Saved puzzle dates, most recent first. Sample is never included. */
export async function listDates(): Promise<string[]> {
  const dates = await redis.smembers(keys.dates());
  return (dates ?? []).sort().reverse();
}
