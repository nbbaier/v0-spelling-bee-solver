# Current Changes Review — 2026-06-21

## Current verdict

**Mostly clean.**

The first review's four findings and two of the three follow-up findings have been addressed. One date-verification edge case remains.

Priority measures impact; the review categories identify the underlying design concern.

## Remaining finding

### P2: Missing scraped dates bypass date-route verification

**Area:** `app/actions.ts`, `fetchPuzzleByDateAction`; `components/setup-panel.tsx`, `handleDateSelect`

**Categories:** Codebase Consistency; Composition and Boundaries

The action now rejects a non-null scraped date that differs from the requested date. However, its condition requires `result.date` to be truthy, so a successful scrape with `date: null` still passes. The client then falls back to the requested date with `result.date ?? next`.

This bypasses verification precisely when an upstream markup change prevents the scraper from reading the page date. Treat a missing page date as a verification failure in `fetchPuzzleByDateAction`; only return success when the parsed date equals `dateIso`.

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

### Resolved: Saving a fetched date mutated the previous SWR key

**Area:** `hooks/use-puzzle.ts`, `savePuzzle`

**Categories:** Composition and Boundaries; React / Next.js Quality

The previous implementation called `setDate(targetId)` and then immediately used the `mutate` function bound to the prior SWR key. The target puzzle could be written into the previous date's cache while the new key raced the server save.

Cross-date saves now persist first, seed the explicit target key with SWR's global mutator, and then switch dates. Same-date saves retain the bound optimistic mutation path.

### Resolved: Previous puzzle data remained loadable during a replacement fetch

**Area:** `components/setup-panel.tsx`, Load button

**Categories:** React / Next.js Quality; Minimality

The Load button previously remained enabled while a replacement date or URL fetch was pending, so the prior puzzle could be saved during that request.

The existing `fetching` state is now included in the button's disabled condition.


## Validation

- `pnpm exec ultracite check` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm build` passed.
- No automated tests were found in the repository.
