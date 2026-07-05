# scripts

One-off operational scripts. Not part of the app runtime.

## `migrate-letters-to-start-letters.ts`

One-time migration that rebuilds saved matrices under the current shape: the
`MatrixData.letters` → `startLetters` rename **and** the `letterSet` backfill.

### Do I need to run it?

Only if the KV/Redis instance your app reads **already holds saved puzzles**.
Two shapes need it: puzzles saved before the rename stored their grid rows under
`letters`, so after deploy `getPuzzle` reads `startLetters` as `undefined` and
their matrix/progress break; puzzles saved before the `letterSet` slice have no
letter set, so word validation falls back to start letters and misses the #19
fix (a word using a puzzle letter that begins no answer). Both are repaired by a
refetch. Puzzles saved after both slices write the full shape and need nothing.

Check whether any puzzles are saved (read-only, mutates nothing):

```bash
node --env-file=.env.local --import tsx -e \
  "import {redis} from './lib/redis.ts'; import {keys} from './lib/keys.ts'; console.log(await redis.smembers(keys.dates()))"
```

- `[]` → nothing to migrate, skip it. (A `sample` puzzle isn't in this set; just
  re-load it from the setup panel if needed.)
- non-empty → run the migration once **after** the new code is live.

### Running

```bash
pnpm migrate:start-letters
```

Needs `KV_REST_API_URL` / `KV_REST_API_TOKEN` (loaded from `.env.local`). It
refetches each saved puzzle from sbsolver and rewrites only the matrix key when
the rebuilt matrix differs — entered words and hint slots are preserved, so it's
safe to run on data with progress. It is idempotent: already-current matrices
are skipped after comparison, rather than just because fields are present. Run
it against each KV store that has its own saved data (production, preview,
local) using that environment's credentials.
