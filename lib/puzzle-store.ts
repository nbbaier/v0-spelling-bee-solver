import "server-only"
import { redis } from "./redis"
import { keys } from "./keys"
import type { HintSlot, MatrixData, Puzzle } from "./types"

// Reads a full puzzle (matrix + hints + entered words) for a date.
// Returns null if no puzzle has been saved for that date.
export async function getPuzzle(date: string): Promise<Puzzle | null> {
  const [matrix, prefixes, words] = await Promise.all([
    redis.get<MatrixData>(keys.matrix(date)),
    redis.get<HintSlot[]>(keys.prefixes(date)),
    redis.hgetall<Record<string, string>>(keys.words(date)),
  ])

  if (!matrix || !prefixes) return null

  const hints: HintSlot[] = prefixes.map((slot) => ({
    ...slot,
    word: words?.[slot.id] ?? null,
  }))

  return { date, letters: matrix.letters, lengths: matrix.lengths, grid: matrix.grid, hints }
}

// Saves the static puzzle definition (matrix + prefix slots) for a date and
// registers the date in the index set. Does not touch entered words.
export async function savePuzzle(date: string, matrix: MatrixData, hints: HintSlot[]): Promise<void> {
  const blankSlots = hints.map((s) => ({ id: s.id, prefix: s.prefix, word: null }))
  await Promise.all([
    redis.set(keys.matrix(date), matrix),
    redis.set(keys.prefixes(date), blankSlots),
    redis.sadd(keys.dates(), date),
  ])
}

// Records or clears a single found word.
export async function setWord(date: string, slotId: string, word: string | null): Promise<void> {
  if (word && word.trim().length > 0) {
    await redis.hset(keys.words(date), { [slotId]: word.trim().toUpperCase() })
  } else {
    await redis.hdel(keys.words(date), slotId)
  }
}

// Removes a puzzle and its progress for a date.
export async function deletePuzzle(date: string): Promise<void> {
  await Promise.all([
    redis.del(keys.matrix(date)),
    redis.del(keys.prefixes(date)),
    redis.del(keys.words(date)),
    redis.srem(keys.dates(), date),
  ])
}

// Lists all saved puzzle dates, most recent first.
export async function listDates(): Promise<string[]> {
  const dates = await redis.smembers(keys.dates())
  return (dates ?? []).sort().reverse()
}
