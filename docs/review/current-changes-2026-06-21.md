# Current Changes Review — 2026-06-21

## Current verdict

**Clean.**

All findings from the review passes have been addressed. No meaningful reuse, composition, consistency, effect, or slop concerns remain.

Priority measures impact; the review categories identify the underlying design concern.

## Resolved findings

### Resolved: Date-index failure left both pickers silently disabled

**Area:** `hooks/use-puzzle.ts`, date-index SWR state; `components/solver-app.tsx` and `components/setup-panel.tsx`, disabled date pickers

**Categories:** Codebase Consistency; React / Next.js Quality; Error Handling

The hook exposed `datesReady` and correctly blocked routing until the authoritative index loaded, but discarded the request's error state. If `/api/puzzle/dates` failed during its initial load, both date pickers remained disabled without an explanation or recovery path.

The hook now exposes the initial load failure and bound date-index mutator. Both date-picker surfaces render an explicit retry action on failure while continuing to use cached index data when a later revalidation fails.

### Resolved: An unavailable date index was treated as an authoritative empty list

**Area:** `hooks/use-puzzle.ts`, shared date-index SWR state and `updateDates`; date-selection consumers in `components/solver-app.tsx` and `components/setup-panel.tsx`

**Categories:** Composition and Boundaries; Codebase Consistency; React / Next.js Quality

The dedicated `/api/puzzle/dates` cache fixed the per-key staleness problem, but the hook exposed `datesData?.dates ?? []` without distinguishing an unavailable index from a successfully loaded empty index. Date pickers could route an existing date into the scrape flow before the index loaded, and mutations could rebuild the client index from a partial list.

The hook now exposes `datesReady`, and both date pickers remain disabled until the authoritative index is available. When `updateDates` has no cached index, it revalidates from the server rather than mutating from `[]`.

### Resolved: Saved-date routing relied on stale per-key metadata

**Area:** `components/solver-app.tsx`, `handleDateChange`; `components/setup-panel.tsx`, `handleDateSelect`; `hooks/use-puzzle.ts`, SWR mutations

**Categories:** Composition and Boundaries; Codebase Consistency; React / Next.js Quality

Both date pickers branched on `dates.includes(next)`, but `dates` was duplicated inside every date-specific SWR cache entry. Save and delete mutations updated only the active or target entry, leaving other cached entries with an older date index.

The date index now has a dedicated `/api/puzzle/dates` endpoint and one shared SWR cache key. Save and delete operations update that single entry instead of leaving per-puzzle copies stale.

### Resolved: Auto-fetch could scrape twice under Strict Mode

**Area:** `components/setup-panel.tsx`, auto-fetch effect

**Categories:** React / Next.js Quality; Effect Slop; Minimality

The mount effect translated `autoFetchDate` into a server action. App Router Strict Mode replays the effect in development and could start two scrapes for one selection; the request token ignored the first result but could not cancel its external requests.

The effect now records the handled date in a ref, making signal consumption idempotent across Strict Mode's replay while still allowing a later re-selection to fire again.

### Resolved: The header picker lacked the setup picker's date bounds

**Area:** `components/solver-app.tsx`, header `DatePicker`

**Categories:** Codebase Consistency; Minimality

The setup picker disabled dates before the first supported puzzle and after the latest published date, while the header picker allowed them and entered a fetch flow that could only fail server-side validation.

Both pickers now receive the same `minDate` and `maxDate` values.

### Resolved: Date selection retained an unreachable null-date fallback

**Area:** `components/setup-panel.tsx`, `handleDateSelect`

**Categories:** Compatibility Cruft; Comment Slop; Minimality

After the server action began rejecting missing page dates, the client still used `result.date ?? next` and described the now-impossible fallback in a comment.

The date-selection path now uses the already verified requested date directly and the stale fallback comment has been removed.

### Resolved: Missing scraped dates bypassed date-route verification

**Area:** `app/actions.ts`, `fetchPuzzleByDateAction`

**Categories:** Codebase Consistency; Composition and Boundaries

The first verification fix rejected a non-null page date that differed from the request but still accepted a successful scrape with `date: null`. The client then fell back to the requested date despite having no page date to verify.

The action now requires the parsed page date to equal the requested date. Missing and mismatched dates both return an explicit error instead of allowing the puzzle to be saved.

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
