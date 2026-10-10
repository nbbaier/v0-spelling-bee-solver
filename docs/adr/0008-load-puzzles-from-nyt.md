# Load dated puzzles from the NYT, falling back to hand-paste

sbsolver.com put its whole site behind a Cloudflare bot challenge (`cf-mitigated: challenge`, HTTP 403 on every path, including `robots.txt`), so the date scrape from ADR 0002 stopped working. Changing the User-Agent doesn't help, and headless Chromium can't clear the challenge either. We now load a picked date from the NYT's own page, `https://www.nytimes.com/puzzles/spelling-bee/<YYYY-MM-DD>`, which embeds `window.gameData` with the letters, pangrams and full answer list. From the answers we derive the matrix (start letter × length) and the 3-letter prefix tallies on the server, in `lib/nyt.ts`.

We rejected getting past the challenge (challenge-solving services, residential proxies): it's fragile, and it overrides the site owner's choice to block bots.

## Consequences

- **The NYT only serves about the last two weeks.** An older date 404s, and the setup panel tells the user to paste the grid and hints instead. Today's date also 404s until it's published (around 3 a.m. ET), which gets its own message.
- **One request instead of 1 + N.** The crawl from ADR 0001 no longer runs for date loads, and tallies are exact, so `failedPrefixes` is always empty on this path.
- **Answers stay on the server.** Only the derived counts reach the client and Redis, so the solver still works from hints, not spoilers.
- **No date-mismatch check is needed.** The URL is the date, and the entry is picked by its `printDate`.
- The sbsolver scraper and its URL-paste option are left in place; they work again if sbsolver lifts the challenge.
