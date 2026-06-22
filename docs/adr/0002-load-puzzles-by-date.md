# Load puzzles by picked date, deriving sbsolver's puzzle number client-side

The original setup flow asked the user to paste a sbsolver puzzle URL. We replaced this with a **date picker as the primary input, keeping URL paste as a fallback**. The enabling discovery: sbsolver numbers puzzles sequentially from `#1 = May 9, 2018`, one per day with no gaps, so a puzzle's number is a pure function of its date (`puzzleNumberForDate` in [lib/puzzle-date.ts](../../lib/puzzle-date.ts)) — verified linear across the full ~8-year range. A picked date becomes the canonical `/nt/<number>` URL that `lib/sbsolver.ts` already scrapes, with no extra network lookup to resolve it.

We kept URL paste rather than removing it because the derivation depends on sbsolver's numbering staying gap-free; the URL path is the escape hatch if that assumption ever breaks for a given puzzle.

## Consequences

- **Out-of-range dates can't be trusted to fail loudly.** Out-of-range puzzle numbers don't 404 cleanly — sbsolver redirects to a gridless homepage or returns 503. So the range is guarded *client-side* (`isPuzzleDateInRange`: real calendar date, between the first puzzle and today) before a request is ever made.
- **The numbering assumption is verified server-side, not trusted.** `fetchPuzzleByDateAction` scrapes the resolved page, then compares the scraped `<title>` date against the requested date. A mismatch is surfaced as an error pointing the user at the URL fallback, rather than silently loading the wrong day's puzzle. This is the safety net for the linear-mapping assumption.
- **Date math is anchored at UTC noon** to keep the whole-day division immune to DST/timezone rounding, and "today" is computed in US Eastern (`latestPuzzleDateISO`) to match sbsolver's own dating — a user east of Eastern can't pick a local "today" whose puzzle isn't published yet.
- Reversing the decision is contained: the date→number logic lives entirely in `lib/puzzle-date.ts`, and the scrape path is unchanged.
