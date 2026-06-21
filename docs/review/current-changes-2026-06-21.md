# Current Changes Review — 2026-06-21

## Verdict

**Needs cleanup.**

Priority measures impact; the review categories identify the underlying design concern.

## Findings

### P1: Date selection loses the fetched result

**Area:** `components/setup-panel.tsx`, `handleDateSelect`

**Categories:** Composition and Boundaries; React / Next.js Quality

`onDateChange(next)` changes the parent SWR key before scraping finishes. `SolverApp` enters its loading state and unmounts `SetupPanel`, so the completed request updates an unmounted component. When the form remounts, its fields are blank.

The existing local `fetchedDate` state was explicitly designed to avoid changing the parent key before Load. Keep the selected date local through the fetch, apply it to the parent when the user loads the puzzle, and prevent or ignore overlapping requests.

### P2: Server-side date validation accepts impossible dates

**Area:** `lib/puzzle-date.ts`, `isPuzzleDateInRange`

**Categories:** Codebase Consistency; Composition and Boundaries

The range check compares strings without first proving that the input is a real calendar date. For example, `2019-99-99` passes the lexical bounds, after which `Date.UTC` normalizes it to a date in 2027 and generates the wrong puzzle URL.

The server action is the trust boundary. Add strict `YYYY-MM-DD` parsing with a calendar round-trip check before applying the range comparison. No robust existing date validator was found; `lib/keys.ts` currently checks only the string shape.

### P3: Fetch actions duplicate the scrape/result boundary

**Area:** `app/actions.ts`, `fetchPuzzleFromUrlAction` and `fetchPuzzleByDateAction`

**Categories:** Reuse Existing Code; Minimality; Helper Slop

The two actions repeat the same `try`/`catch`, scrape call, success mapping, and error mapping.

Keep one internal fetch implementation. The date action should validate the date, construct the numbered URL, and delegate to that shared implementation.

### P3: Unused inverse helper and comment-heavy proof

**Area:** `lib/puzzle-date.ts`, module header and `dateForPuzzleNumber`

**Categories:** Helper Slop; Comment Slop; Minimality

`dateForPuzzleNumber` has no call sites, while a long module comment carries the evidence for the mapping's correctness.

Delete the unused inverse unless it gains a real consumer, and trim the verification prose. Focused tests would provide stronger evidence if test infrastructure is introduced.

## Validation

- `pnpm exec ultracite check` passed.
- `pnpm exec tsc --noEmit` passed.
- No automated tests were found in the repository.
