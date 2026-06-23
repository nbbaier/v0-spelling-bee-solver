# Puzzle URLs live at the root as `/YYYY-MM-DD`, no namespace

A puzzle's canonical URL is **`/YYYY-MM-DD`** — the same ISO string used as its Redis storage key and glossary identity (see `CONTEXT.md` → Puzzle, ADR 0002). No `/p/` prefix, no dashless variant. Non-date top-level routes are reserved for app surfaces: `/sample` (the non-date sample identity) and `/puzzles` (the saved-puzzles index). `/` redirects to today's `YYYY-MM-DD`, with "today" resolved in US Eastern per ADR 0002.

## Considered options

- **`/YYYY-MM-DD` (chosen).** One date format everywhere — storage key, glossary, URL. `/` → today is the cleanest entry. No conversions at any boundary.
- **`/p/YYYY-MM-DD`.** Namespaces puzzles, freeing the root for arbitrary future routes. Rejected: the app is single-purpose, the namespace is speculative overhead, and `/puzzles` already doesn't collide with any date-shaped string.
- **`/YYYYMMDD` (dashless).** Shorter. Rejected: diverges from every other representation of the date in the system (Redis keys, `CONTEXT.md`, ISO convention) and would force a format conversion at every storage/UI boundary.

## Consequences

- **Root routes are a namespace by exclusion.** No future top-level route may look like a `YYYY-MM-DD` date string. This is the real cost of the decision; it feels acceptable for a single-purpose app but is the thing to revisit if the app grows a multi-purpose frontend.
- **URLs are stable and bookmarkable.** A puzzle's URL is derivable from its identity alone — no database lookup, no opaque ID. This is the enabling property for #8 (per-URL browser persistence) and #14 (cross-instance sync: same URL = same state to synchronize).
- **The `/` redirect target is time-dependent.** It resolves to "today" server-side, so it is not itself a stable bookmark — users who bookmark a specific day land on that day. The Eastern-time anchoring (ADR 0002) applies here too.
- **The sample puzzle lives at `/sample`.** It is the one non-date puzzle identity, so it gets the one non-date top-level route alongside `/puzzles`.
