import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredMatrix } from "./assemble-puzzle";
import { keys } from "./keys";
import { listPuzzleDates } from "./puzzle-store";
import { redis } from "./redis";
import type { HintSlot } from "./types";

vi.mock("./redis", () => ({
  redis: { get: vi.fn(), hgetall: vi.fn(), smembers: vi.fn() },
}));

const MATRIX: StoredMatrix = {
  centerLetter: "O",
  grid: { D: { 4: 2 } },
  lengths: [4],
  // Calendar status must work with legacy saved puzzles too.
  letters: ["D"],
};
const PREFIXES: HintSlot[] = [
  { id: "DOO-0", prefix: "DOO", word: null },
  { id: "DOO-1", prefix: "DOO", word: null },
];

describe("listPuzzleDates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("includes completion for saved puzzles in newest-first order", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["2024-01-01", "2024-01-02"]);
    vi.mocked(redis.get).mockImplementation((key) =>
      Promise.resolve(key.endsWith(":matrix") ? MATRIX : PREFIXES)
    );
    vi.mocked(redis.hgetall).mockImplementation((key) =>
      Promise.resolve(
        key === keys.words("2024-01-01")
          ? { "DOO-0": "DOOR", "DOO-1": "DOOM" }
          : { "DOO-0": "DOOR" }
      )
    );

    await expect(listPuzzleDates()).resolves.toEqual({
      completedDates: ["2024-01-01"],
      dates: ["2024-01-02", "2024-01-01"],
    });
  });

  it("ignores blank words and words for slots outside the current definition", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["2024-01-01"]);
    vi.mocked(redis.get).mockImplementation((key) =>
      Promise.resolve(key.endsWith(":matrix") ? MATRIX : PREFIXES)
    );
    vi.mocked(redis.hgetall).mockResolvedValue({
      "DOO-0": "DOOR",
      "DOO-1": "   ",
      "OLD-0": "DOOM",
    });

    expect((await listPuzzleDates()).completedDates).toEqual([]);
  });

  it("uses the matrix total when a scrape has fewer hint slots than answers", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["2024-01-01"]);
    vi.mocked(redis.get).mockImplementation((key) =>
      Promise.resolve(key.endsWith(":matrix") ? MATRIX : PREFIXES.slice(0, 1))
    );
    vi.mocked(redis.hgetall).mockResolvedValue({ "DOO-0": "DOOR" });

    expect((await listPuzzleDates()).completedDates).toEqual([]);
  });

  it("does not mark missing or empty definitions complete", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["2024-01-01", "2024-01-02"]);
    vi.mocked(redis.get).mockImplementation((key) => {
      if (key === keys.matrix("2024-01-01")) {
        return Promise.resolve(null);
      }
      return Promise.resolve(
        key.endsWith(":matrix") ? { ...MATRIX, grid: {} } : PREFIXES
      );
    });
    vi.mocked(redis.hgetall).mockResolvedValue(null);

    expect((await listPuzzleDates()).completedDates).toEqual([]);
  });

  it("returns an empty index without fetching puzzles when nothing is saved", async () => {
    vi.mocked(redis.smembers).mockResolvedValue([]);

    await expect(listPuzzleDates()).resolves.toEqual({
      completedDates: [],
      dates: [],
    });
    expect(redis.get).not.toHaveBeenCalled();
  });
});
