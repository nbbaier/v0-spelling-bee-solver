import "server-only";
import { assemblePuzzle, type StoredMatrix } from "./assemble-puzzle";
import { isSampleId, keys } from "./keys";
import { redis } from "./redis";
import type { HintSlot, MatrixData, Puzzle } from "./types";

// Words live either in the legacy global hash (sample only after the words
// migration) or in a room-scoped hash. `room` null/absent → legacy key.
function wordsKey(id: string, room?: string | null): string {
  return room ? keys.roomWords(room, id) : keys.words(id);
}

// Reads a full puzzle (matrix + hints + entered words) for a date.
// Returns null if no puzzle has been saved for that date.
export async function getPuzzle(
  date: string,
  room?: string | null
): Promise<Puzzle | null> {
  const [matrix, prefixes, words] = await Promise.all([
    // StoredMatrix, not MatrixData: a row saved before the rename has `letters`
    // and no `startLetters`. assemblePuzzle tolerates either until migrated.
    redis.get<StoredMatrix>(keys.matrix(date)),
    redis.get<HintSlot[]>(keys.prefixes(date)),
    redis.hgetall<Record<string, string>>(wordsKey(date, room)),
  ]);

  if (!(matrix && prefixes)) {
    return null;
  }

  return assemblePuzzle(date, matrix, prefixes, words);
}

// Saves the static puzzle definition (matrix + prefix slots) for a date/id and
// registers it in the date index set (skipped for the sample sentinel).
// Does not touch entered words.
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

// Records or clears a single found word.
export async function setWord(
  date: string,
  slotId: string,
  word: string | null,
  room?: string | null
): Promise<void> {
  const key = wordsKey(date, room);
  if (word && word.trim().length > 0) {
    await redis.hset(key, { [slotId]: word.trim().toUpperCase() });
  } else {
    await redis.hdel(key, slotId);
  }
}

// Removes a puzzle and its progress for a date/id.
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
  // Deliberately NOT enumerating sbs:room:* keys for this date — deleting a
  // definition doesn't hunt down every room's words. Rooms whose progress
  // references a deleted definition simply resolve to nothing.
}

// Clears all entered words for a puzzle, resetting the progress.
export async function clearAllWords(
  date: string,
  room?: string | null
): Promise<void> {
  await redis.del(wordsKey(date, room));
}

// Clears entered words for a specific set of slot IDs.
export async function clearWordsForSlots(
  date: string,
  slotIds: string[],
  room?: string | null
): Promise<void> {
  if (!slotIds.length) {
    return;
  }
  await redis.hdel(wordsKey(date, room), ...slotIds);
}

// Lists all saved puzzle dates, most recent first.
export async function listDates(): Promise<string[]> {
  const dates = await redis.smembers(keys.dates());
  return (dates ?? []).sort().reverse();
}
