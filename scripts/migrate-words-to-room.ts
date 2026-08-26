/**
 * One-time migration: copy legacy global word progress into a room-scoped hash.
 *
 * Before the rooms feature, entered words lived at sbs:<date>:words. Rooms
 * scope progress to sbs:room:<name>:<date>:words, and real dates now read the
 * room-scoped key only — legacy progress is invisible until copied into a room.
 * This script copies (never deletes) each non-empty legacy words hash into the
 * room named on the command line; delete the legacy keys afterwards only once
 * the operator has verified the result.
 *
 * Idempotent: re-running re-writes identical field values (a no-op for Redis);
 * slots already present in the room hash are overwritten with the same values.
 *
 * Run:      pnpm migrate:words-to-room -- <room-name>
 * Dry run:  pnpm migrate:words-to-room -- <room-name> --dry-run
 * Needs KV_REST_API_URL / KV_REST_API_TOKEN (loaded from .env.local).
 */
import { isValidRoomName } from "../lib/rooms";
import { keys } from "../lib/keys";
import { redis } from "../lib/redis";

type Outcome =
  | { date: string; count: number; status: "copied" }
  | { date: string; count: number; status: "would-copy" }
  | { date: string; status: "empty" }
  | { date: string; reason: string; status: "failed" };

async function migrateDate(
  room: string,
  date: string,
  dryRun: boolean
): Promise<Outcome> {
  const words = await redis.hgetall<Record<string, string>>(keys.words(date));
  const entries = Object.entries(words ?? {});
  if (!entries.length) {
    return { date, status: "empty" };
  }
  const target = keys.roomWords(room, date);

  if (dryRun) {
    return { count: entries.length, date, status: "would-copy" };
  }

  // Field-wise so an already-migrated slot's identical value stays identical.
  const fields: Record<string, string> = {};
  for (const [slotId, word] of entries) {
    fields[slotId] = String(word);
  }
  await redis.hset(target, fields);
  return { count: entries.length, date, status: "copied" };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const room = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

  if (!room) {
    process.stderr.write(
      "Usage: pnpm migrate:words-to-room -- <room-name> [--dry-run]\n"
    );
    process.exit(1);
  }
  if (!isValidRoomName(room)) {
    process.stderr.write(`Refusing invalid room name: ${room}\n`);
    process.exit(1);
  }

  if (!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)) {
    process.stderr.write(
      "Missing KV_REST_API_URL / KV_REST_API_TOKEN. Add them to .env.local.\n"
    );
    process.exit(1);
  }

  const dates = ((await redis.smembers(keys.dates())) ?? []).sort();
  process.stdout.write(
    `Found ${dates.length} saved puzzle(s). Legacy words go to room "${room}".\n`
  );
  if (dryRun) {
    process.stdout.write("Dry run: no room-scoped hashes will be written.\n");
  }

  const outcomes: Outcome[] = [];
  for (const date of dates) {
    try {
      // Sequential on purpose; see migrate-letters-to-start-letters.ts.
      // biome-ignore lint/performance/noAwaitInLoops: Sequential migration is intentional.
      const outcome = await migrateDate(room, date, dryRun);
      outcomes.push(outcome);
      if (outcome.status === "copied" || outcome.status === "would-copy") {
        process.stdout.write(
          `  ${date}: ${outcome.status} ${outcome.count} words → ${
            dryRun ? "(would write) " : ""
          }sbs:room:${room}:${date}:words\n`
        );
      } else if (outcome.status === "empty") {
        process.stdout.write(`  ${date}: empty (nothing to copy)\n`);
      } else {
        process.stdout.write(`  ${date}: failed — ${outcome.reason}\n`);
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      outcomes.push({ date, reason, status: "failed" });
      process.stdout.write(`  ${date}: failed — ${reason}\n`);
    }
  }

  const counts = {
    copied: 0,
    "would-copy": 0,
    empty: 0,
    failed: 0,
  };
  let totalWords = 0;
  for (const o of outcomes) {
    counts[o.status] += 1;
    if ("count" in o) {
      totalWords += o.count;
    }
  }
  process.stdout.write(
    `\nDone. ${counts.copied} copied (${totalWords} words), ${
      counts["would-copy"]
    } would copy, ${counts.empty} empty, ${counts.failed} failed.\n`
  );
  process.stdout.write(
    "Legacy sbs:<date>:words keys were NOT deleted — remove them manually after verifying.\n"
  );

  if (counts.failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(1);
});
