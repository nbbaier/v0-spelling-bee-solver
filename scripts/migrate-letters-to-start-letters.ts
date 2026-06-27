/**
 * One-time migration: persisted matrices `letters` -> `startLetters`.
 *
 * Puzzles saved before this rename stored their grid row labels under
 * `MatrixData.letters`; the field is now `startLetters` (see lib/types.ts).
 * Rather than rewrite the key blindly, this refetches each saved puzzle from
 * sbsolver and rebuilds the matrix with the current parser, so the stored data
 * is regenerated under the new field name from the authoritative source.
 *
 * Entered words (sbs:<date>:words) and hint prefix slots (sbs:<date>:prefixes)
 * are never touched, so user progress and slot ids are preserved. Only the
 * matrix key is rewritten. A puzzle's existing center letter is kept (it may
 * have been set manually), falling back to the scrape only when none is stored.
 *
 * Idempotent: a matrix that already has `startLetters` is skipped.
 *
 * Run:  pnpm migrate:start-letters
 * Needs KV_REST_API_URL / KV_REST_API_TOKEN (loaded from .env.local).
 */
import { keys } from "../lib/keys";
import { parseMatrix } from "../lib/parse";
import { puzzleNumberForDate } from "../lib/puzzle-date";
import { redis } from "../lib/redis";
import { scrapePuzzle } from "../lib/sbsolver";
import type { MatrixData } from "../lib/types";

// The raw stored shape can be either the old (`letters`) or new (`startLetters`)
// form, so read it loosely and narrow on the keys we care about.
type StoredMatrix = Partial<MatrixData> & { letters?: string[] };

type Outcome =
  | { date: string; status: "migrated" }
  | { date: string; status: "skipped"; reason: string }
  | { date: string; status: "failed"; reason: string };

async function migrateDate(date: string): Promise<Outcome> {
  const existing = await redis.get<StoredMatrix>(keys.matrix(date));

  if (existing && Array.isArray(existing.startLetters)) {
    return { date, status: "skipped", reason: "already has startLetters" };
  }

  const url = `https://www.sbsolver.com/nt/${puzzleNumberForDate(date)}`;
  const scrape = await scrapePuzzle(url);

  // Guard against the date→number mapping resolving to a different day (a gap or
  // upstream renumbering), which would otherwise store one puzzle under another.
  if (scrape.date && scrape.date !== date) {
    return {
      date,
      status: "failed",
      reason: `scrape resolved to ${scrape.date}, not ${date}`,
    };
  }

  const parsed = parseMatrix(scrape.matrixText);
  const matrix: MatrixData = {
    centerLetter: existing?.centerLetter ?? scrape.centerLetter ?? null,
    grid: parsed.grid,
    lengths: parsed.lengths,
    startLetters: parsed.startLetters,
  };

  await redis.set(keys.matrix(date), matrix);
  return { date, status: "migrated" };
}

async function main(): Promise<void> {
  if (!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)) {
    process.stderr.write(
      "Missing KV_REST_API_URL / KV_REST_API_TOKEN. Add them to .env.local.\n"
    );
    process.exit(1);
  }

  const dates = (await redis.smembers(keys.dates())) ?? [];
  process.stdout.write(`Found ${dates.length} saved puzzle(s).\n`);

  const outcomes: Outcome[] = [];
  for (const date of dates.sort()) {
    try {
      const outcome = await migrateDate(date);
      outcomes.push(outcome);
      process.stdout.write(`  ${date}: ${outcome.status}\n`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      outcomes.push({ date, status: "failed", reason });
      process.stdout.write(`  ${date}: failed — ${reason}\n`);
    }
  }

  const counts = { migrated: 0, skipped: 0, failed: 0 };
  for (const o of outcomes) {
    counts[o.status]++;
  }
  process.stdout.write(
    `\nDone. ${counts.migrated} migrated, ${counts.skipped} skipped, ${counts.failed} failed.\n`
  );

  const failures = outcomes.filter((o) => o.status === "failed");
  if (failures.length > 0) {
    process.stdout.write("\nFailures (left unchanged):\n");
    for (const f of failures) {
      // reason is present on the failed variant.
      const reason = "reason" in f ? f.reason : "unknown";
      process.stdout.write(`  ${f.date}: ${reason}\n`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(1);
});
