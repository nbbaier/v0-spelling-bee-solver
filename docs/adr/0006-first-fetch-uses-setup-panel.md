# First fetch of a globally-new date lands in the setup panel with manual confirm (decision B)

When a user navigates to a date that has no entry in the global `sbs:dates` index (no definition fetched by anyone yet), the app fires the sbsolver scrape automatically but **routes through the setup panel for review**, requiring a "Load" click to confirm before the definition is saved. We rejected auto-scrape-and-save (scrape silently, save, render the solver with no review step).

## Considered options

- **Auto-scrape-and-save (rejected).** Land at a new date, scrape, save the definition, render the solver. Frictionless. Rejected because it removes the gut-check and turns scrape failures into dead ends — if the fetch fails, there's no panel already open with the manual-paste fields ready.
- **Setup panel with manual confirm (chosen).** The scrape fires on entry and fills the panel's fields; the user reviews and clicks Load. Costs one click for the first visitor of each new date.

## Consequences

- **The friction is paid once per date, not once per user per date.** Confirming saves the definition globally and registers the date in `sbs:dates`; every subsequent visitor (any user, any room) skips the panel and lands in the solver. The first-fetch ceremony is a shared cost, not a recurring one.
- **The gut-check is mostly redundant for date mismatches** — ADR 0002 already compares the scraped `<title>` date against the requested date server-side and surfaces a mismatch as an error. The panel's remaining review value is concrete: `failedPrefixes` (which 3-letter hints couldn't be fetched, so the user knows to add them manually) and center-letter confirmation (the pills let the user correct a misread before commit).
- **Scrape failures degrade gracefully.** The manual-paste fields (URL paste, hand-grid) are already in the panel, so a failed fetch leaves the user in the right surface to recover, rather than at a dead-end error with no path forward.
- **`failedPrefixes` still needs to surface somewhere after auto-loads** for the common case where the first visitor confirms quickly. Today it lives in the panel's `FetchStatusMessages`; post-confirm it likely needs to persist as a banner on the solver view until acknowledged. (UI placement detail, not part of this decision.)
