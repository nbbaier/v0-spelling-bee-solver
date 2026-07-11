/**
 * One-time migration: rebuild persisted matrices under the current shape,
 * backfilling `startLetters` (renamed from `letters`) and `letterSet`.
 *
 * Puzzles saved before the rename stored their grid row labels under
 * `MatrixData.letters`; the field is now `startLetters` (see lib/types.ts).
 * Puzzles saved before the letterSet slice have no `letterSet` at all, so on
 * read it defaults to "" and word validation falls back to `startLetters` —
 * missing the #19 fix. Rather than rewrite the key blindly, this refetches each
 * saved puzzle from sbsolver and rebuilds the matrix with the current parser, so
 * the stored data is regenerated under both fields from the authoritative source
 * (sbsolver's `#string` supplies the full seven-letter set).
 *
 * Entered words (sbs:<date>:words) and hint prefix slots (sbs:<date>:prefixes)
 * are never touched, so user progress and slot ids are preserved. Only the
 * matrix key is rewritten. The scrape is authoritative for the center letter
 * and letter set when it can read them; otherwise the script preserves any
 * existing stored values.
 *
 * Idempotent: the script compares the rebuilt matrix to the stored one and
 * skips rows that already match the current scraper/parser output.
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

function sameArray<T>(a: T[] | undefined, b: T[]): boolean {
  return Boolean(a && a.length === b.length && a.every((v, i) => v === b[i]));
}

function sameGrid(
  a: Record<string, Record<number, number>> | undefined,
  b: Record<string, Record<number, number>>
): boolean {
  if (!a) {
    return false;
  }
  const aLetters = Object.keys(a).sort();
  const bLetters = Object.keys(b).sort();
  if (!sameArray(aLetters, bLetters)) {
    return false;
  }
  for (const letter of bLetters) {
    const aLengths = Object.keys(a[letter] ?? {}).sort();
    const bLengths = Object.keys(b[letter] ?? {}).sort();
    if (!sameArray(aLengths, bLengths)) {
      return false;
    }
    for (const length of bLengths) {
      if (a[letter]?.[Number(length)] !== b[letter]?.[Number(length)]) {
        return false;
      }
    }
  }
  return true;
}

function sameMatrix(existing: StoredMatrix | null, next: MatrixData): boolean {
  return Boolean(
    existing &&
      existing.centerLetter === next.centerLetter &&
      existing.letterSet === next.letterSet &&
      sameArray(existing.lengths, next.lengths) &&
      sameArray(existing.startLetters, next.startLetters) &&
      sameGrid(existing.grid, next.grid)
  );
}

async function migrateDate(date: string): Promise<Outcome> {
  const existing = await redis.get<StoredMatrix>(keys.matrix(date));

  const url = `https://www.sbsolver.com/nt/${puzzleNumberForDate(date)}`;
  const scrape = await scrapePuzzle(url);

  // The date→number mapping is unverified until the scraped page confirms its
  // own date. Require an exact match — mirroring fetchPuzzleByDateAction, a
  // missing page date is a verification failure, not a pass — so a gap, redirect,
  // or unreadable markup can never rewrite this date's matrix with another day's
  // grid (which would be silently mismatched against the preserved prefixes/words).
  if (scrape.date !== date) {
    return {
      date,
      status: "failed",
      reason: scrape.date
        ? `scrape resolved to ${scrape.date}, not ${date}`
        : "could not confirm the puzzle's date on the scraped page",
    };
  }

  const parsed = parseMatrix(scrape.matrixText);
  const matrix: MatrixData = {
    centerLetter: scrape.centerLetter ?? existing?.centerLetter ?? null,
    // Prefer the fresh scrape because it reflects the current extraction rules.
    // Fall back to a stored value only if the page shape stops exposing the set.
    letterSet: scrape.letterSet || existing?.letterSet || "",
    // Preserve whatever is stored; scraping the count into old rows is #25.
    pangramCount: existing?.pangramCount ?? null,
    grid: parsed.grid,
    lengths: parsed.lengths,
    startLetters: parsed.startLetters,
  };

  if (sameMatrix(existing, matrix)) {
    return {
      date,
      status: "skipped",
      reason: "already matches current scrape",
    };
  }

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
