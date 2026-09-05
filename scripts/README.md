# scripts

One-off operational scripts. Not part of the app runtime.

## `migrate-words-to-room.ts`

One-time migration that copies legacy global word progress
(`sbs:<date>:words`) into a room-scoped hash (`sbs:room:<name>:<date>:words`).
After the rooms feature, real dates read only the room-scoped key, so legacy
progress is invisible until it is copied into a room the browsers use.

### Do I need to run it?

Only if legacy progress still matters — i.e. users entered words before rooms
shipped and expect to see them after deploy. Rooms created in the new UI start
empty and need nothing.

### Running

```bash
pnpm migrate:words-to-room -- purple-elephant-kite --dry-run
pnpm migrate:words-to-room -- purple-elephant-kite
```

The room name is a required argument (validated; the script refuses malformed
names) — pick/generated one per group of solvers and tell them to join via
`/r/<name>`. Needs `KV_REST_API_URL` / `KV_REST_API_TOKEN` from `.env.local`.

It is idempotent: identical re-runs are no-ops, and existing room fields are
overwritten with the same values. Copies never delete: the legacy keys stay
until you have verified each room's progress, then remove them manually. Run
the dry run first — it prints, per date, how many words **would** be copied
and writes nothing. Not part of any deploy; run once against production after
the rooms release, with `--dry-run` first.

## `migrate-letters-to-start-letters.ts`

One-time migration that rebuilds saved matrices under the current shape: the
`MatrixData.letters` → `startLetters` rename and the `letterSet` and
`pangramCount` backfills.

### Do I need to run it?

Only if the KV/Redis instance your app reads **already holds saved puzzles**.
Legacy rows can need it for three reasons: puzzles saved before the rename stored
their grid rows under `letters`, so after deploy `getPuzzle` reads
`startLetters` as `undefined` and their matrix/progress break; puzzles saved
before the `letterSet` slice have no letter set, so word validation falls back to
start letters and misses the #19 fix (a word using a puzzle letter that begins no
answer); and rows saved before the pangram-count feature have no count to
display. All three cases are repaired by a refetch. Puzzles saved after these
slices write the full shape and need nothing.

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
pnpm migrate:start-letters -- --dry-run
pnpm migrate:start-letters
```

Needs `KV_REST_API_URL` / `KV_REST_API_TOKEN` (loaded from `.env.local`). It
refetches each saved puzzle from sbsolver and rewrites only the matrix key when
the rebuilt matrix differs — entered words and hint slots are preserved, so it's
safe to run on data with progress. It is idempotent: already-current matrices
are skipped after comparison, rather than just because fields are present. Run
the dry run first; it reports matrices as `would-migrate` without writing them.
Run the real migration only after the pangram-count feature is deployed, against
each KV store that has its own saved data (production, preview, local) using that
environment's credentials.
