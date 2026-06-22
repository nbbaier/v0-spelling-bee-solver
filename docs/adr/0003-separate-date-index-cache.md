# Keep the saved-date index in its own cache entry, gated on readiness

Both date pickers need to know which dates already have a saved puzzle: selecting a date *with* data loads it directly, while a date *without* data drops into the fetch flow. We store this set of saved dates as a **dedicated SWR cache entry** (`/api/puzzle/dates`, served by `app/api/puzzle/dates/route.ts`), separate from the per-date puzzle entries (`/api/puzzle?date=<d>`). The index is one shared answer that doesn't change with the active date, so binding it to any single date's key would make it go stale as the user navigates.

## Consequences

- **Routing decisions are gated on `datesReady`.** Until the index has actually loaded, an empty `dates` array is *not* proof that nothing is saved. Callers must not decide saved-vs-unsaved (and the pickers stay disabled) until the index resolves — otherwise a slow first load would route a saved date into a needless re-fetch.
- **Index failure is recoverable, not silent.** If `/api/puzzle/dates` fails on first load, `datesError` is exposed and both pickers show a retry control instead of staying disabled forever. A *transient* error after a successful load keeps the stale-but-usable cached list rather than tripping the error state.
- **Saves/deletes update the index optimistically** through the global mutator, except when no authoritative list is cached yet — there we revalidate from the server rather than mutating from an empty array and clobbering it.
- The two-cache split adds a second fetch on load, accepted as the cost of a single coherent index that survives date navigation. The whole concern is encapsulated in `usePuzzle`, so consumers see only `dates`, `datesReady`, `datesError`, and `reloadDates`.
