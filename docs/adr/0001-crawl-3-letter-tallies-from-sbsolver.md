# Crawl per-prefix pages for 3-letter tallies instead of adopting sbsolver's 2-letter grain

This app groups hints by **3-letter prefix** (see [CONTEXT.md](../../CONTEXT.md) → Prefix grain), but a sbsolver puzzle page only lists hints at **2-letter** grain; the 3-letter tally lives on a separate page per 2-letter prefix. To populate the hint list from a sbsolver URL we therefore **crawl**: fetch the main page, then fetch every 2-letter prefix's page (bounded concurrency pool of ~5) and scrape its 3-letter cells. We chose this over the simpler alternative of switching the whole app to 2-letter grain, because the finer grain is core to the solver UX and we did not want a scraping convenience to dictate the product's data model.

## Consequences

- A single puzzle load fans out to **1 + N HTTP requests** (N = number of 2-letter prefixes, typically ~15–25) against a third-party site we don't control — the reason one "fetch" is not one request.
- Partial failure is expected and handled gracefully: the main page must succeed, but failed child pages are reported and left for manual entry rather than aborting the load. Because the result fills editable textareas, gaps are user-patchable.
- The strategy is encapsulated in the `fetchPuzzleFromUrl` server action, so reversing this decision (e.g. moving to 2-letter grain, or to a different data source) is contained to that boundary.
