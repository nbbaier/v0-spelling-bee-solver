// Redis key scheme for the Spelling Bee solver.
// Puzzle data is namespaced by puzzle ID, which is either an ISO date (YYYY-MM-DD)
// or the literal string "sample" for the dev dummy dataset.
//
//   sbs:<ID>:matrix    -> JSON of the parsed grid { letters, lengths, grid }
//   sbs:<ID>:prefixes  -> JSON of the hint slots [{ id, prefix, word: null }]
//   sbs:<ID>:words     -> hash of slotId -> word (mutable progress)
//   sbs:dates          -> set of real puzzle dates (sample is never added here)

export const SAMPLE_ID = "sample"

export const keys = {
  matrix: (id: string) => `sbs:${id}:matrix`,
  prefixes: (id: string) => `sbs:${id}:prefixes`,
  words: (id: string) => `sbs:${id}:words`,
  dates: () => `sbs:dates`,
}

// Returns today's date as an ISO YYYY-MM-DD string in local time.
export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date)
}

// Accepts either a real date or the sample sentinel.
export function isValidPuzzleId(id: string): boolean {
  return id === SAMPLE_ID || isValidDate(id)
}

export function isSampleId(id: string): boolean {
  return id === SAMPLE_ID
}
