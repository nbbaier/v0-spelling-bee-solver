# Current Changes Review — 2026-06-21

## Current verdict

**Needs cleanup.**

The first review's four findings have been addressed. The follow-up review found one important cache-boundary issue and two smaller correctness issues that remain.

Priority measures impact; the review categories identify the underlying design concern.

## Resolved findings

### Resolved: Date selection lost the fetched result

**Area:** `components/setup-panel.tsx`, `handleDateSelect`

**Categories:** Composition and Boundaries; React / Next.js Quality

The original implementation changed the parent SWR key before scraping finished, which unmounted `SetupPanel` and discarded the result.

The selected date and fetched fields now remain local until Load. A monotonic request token also prevents a slower, superseded request from overwriting a newer result.

### Resolved: Server-side date validation accepted impossible dates

**Area:** `lib/puzzle-date.ts`, `isPuzzleDateInRange`

**Categories:** Codebase Consistency; Composition and Boundaries

The original lexical range check accepted values such as `2019-99-99`, which `Date.UTC` normalized into a different date.

The implementation now requires strict `YYYY-MM-DD` syntax and round-trips the parsed components to prove that the input is a real calendar date before applying the range check.

### Resolved: Fetch actions duplicated the scrape/result boundary

**Area:** `app/actions.ts`, `fetchPuzzle`

**Categories:** Reuse Existing Code; Minimality; Helper Slop

The URL and date actions originally repeated the same scrape, success mapping, and error mapping.

Both actions now delegate to one internal `fetchPuzzle` implementation.

### Resolved: Unused inverse helper and comment-heavy proof

**Area:** `lib/puzzle-date.ts`

**Categories:** Helper Slop; Comment Slop; Minimality

The unused `dateForPuzzleNumber` export has been removed, and the module commentary has been reduced.

## Remaining findings

### P1: Saving a fetched date mutates the previous SWR key

**Area:** `hooks/use-puzzle.ts`, `savePuzzle`

**Categories:** Composition and Boundaries; React / Next.js Quality

When the fetched target date differs from the active date, `savePuzzle` calls `setDate(targetId)` and then immediately calls the `mutate` function bound by `useSWR`. The state update does not update SWR's key ref before that immediate mutation, so the optimistic and final results are written to the previous date's cache entry.

Meanwhile, changing the date starts a request for the target key. That request can finish before `savePuzzleAction`, leaving the target view empty even though the save later succeeds, while the previous cache entry contains the target puzzle.

For cross-date saves, save first and then switch and revalidate, or use SWR's global mutator with the target key explicitly. Keep the bound mutation path for same-date saves.

### P2: The date route does not verify the scraped page date

**Area:** `app/actions.ts`, `fetchPuzzleByDateAction`; `components/setup-panel.tsx`, `handleDateSelect`

**Categories:** Codebase Consistency; Composition and Boundaries

The date action converts the requested date to a numeric sbsolver URL, but the client uses the requested date as the save target without checking the date parsed from the resulting page. A numbering gap, redirect, or upstream change could therefore store one day's puzzle under another date.

The URL flow already treats the scraped `result.date` as authoritative. Have `fetchPuzzleByDateAction` reject a successful scrape whose parsed date does not match `dateIso`, then use the verified result date as the save target.

### P2: Previous puzzle data remains loadable during a replacement fetch

**Area:** `components/setup-panel.tsx`, Load button

**Categories:** React / Next.js Quality; Minimality

Starting another date or URL fetch leaves the previous fields and target active while the Load button remains enabled. The user can save that previous puzzle while the replacement request is pending.

Reuse the existing `fetching` state in the real-puzzle Load button's disabled condition.

## Validation

- `pnpm exec ultracite check` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm build` passed.
- No automated tests were found in the repository.
