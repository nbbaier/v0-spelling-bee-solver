# Agent guide

Next.js app that helps solve the NYT Spelling Bee. Puzzles are scraped from sbsolver.com, stored in Upstash Redis keyed by date, and solved in the browser.

## Code map

Data flows top to bottom:

- `lib/sbsolver.ts`: scrapes a puzzle page plus its 3-letter tally pages (`scrapePuzzle`). Parsing helpers are tested in `lib/sbsolver.test.ts`.
- `lib/parse.ts`: parses a hand-pasted matrix and hint list (the setup panel's paste path).
- `lib/puzzle-store.ts`: Redis reads and writes. Key shapes live in `lib/keys.ts`; stored rows become a `Puzzle` via `lib/assemble-puzzle.ts`.
- `app/actions.ts`: server actions for fetching, saving and editing puzzles. `app/api/puzzle/route.ts` and `app/api/puzzle/dates/route.ts` are the read endpoints.
- `hooks/use-puzzle.ts`: SWR client state. It reads through the API routes and writes through the actions.
- `components/solver-app.tsx`: the page shell. It composes `setup-panel`, `matrix-grid`, `hints-list` and `progress-summary`. `components/ui/` holds shadcn primitives.

Routes: `app/page.tsx` redirects to a date, `app/[date]/page.tsx` renders it, and `app/sample/page.tsx` serves the built-in sample (`lib/sample.ts`). Domain types are in `lib/types.ts`; derived counts are in `lib/derive.ts`; date math is in `lib/puzzle-date.ts`.

## Checks

`pnpm check` runs ultracite, `tsc --noEmit`, then vitest. CI runs it on every PR. Tests sit next to their modules as `lib/*.test.ts`. `pnpm fix` auto-formats.

## Docs

- `GLOSSARY.md`: domain terms (letter set, matrix, prefix grain, room). Use its vocabulary.
- `docs/adr/`: design decisions. Read the ones that touch your area before changing it.
- `scripts/README.md`: one-off Redis migrations.
- `CODING_STANDARDS.md`: style rules for review.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (github.com/nbbaier/v0-spelling-bee-solver) via the `gh` CLI; external PRs are not treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix) — `wontfix` and `ready-for-agent` already exist in the repo. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
