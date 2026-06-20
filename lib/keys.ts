// Redis key scheme for the Spelling Bee solver.
// All puzzle data is namespaced by ISO date (YYYY-MM-DD).
//
//   sbs:<DATE>:matrix    -> JSON of the parsed grid { letters, lengths, grid }
//   sbs:<DATE>:prefixes  -> JSON of the hint slots [{ id, prefix, word: null }]
//   sbs:<DATE>:words     -> hash of slotId -> word (mutable progress)
//   sbs:dates            -> set of dates that have a saved puzzle

export const keys = {
  matrix: (date: string) => `sbs:${date}:matrix`,
  prefixes: (date: string) => `sbs:${date}:prefixes`,
  words: (date: string) => `sbs:${date}:words`,
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
