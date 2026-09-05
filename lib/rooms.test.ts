import { describe, expect, it } from "vitest";
import {
  EMPTY_ROOM_STATE,
  generateRoomName,
  isValidRoomName,
  joinRoom,
  parseRoomState,
  setLastDate,
  todayEasternISO,
} from "./rooms";

const ROOM_SHAPE_RE = /^[a-z]+-[a-z]+-[a-z]+$/;

describe("generateRoomName", () => {
  it("produces three hyphen-joined lowercase words", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateRoomName()).toMatch(ROOM_SHAPE_RE);
    }
  });

  it("generates names that pass the room-name validator", () => {
    expect(isValidRoomName(generateRoomName())).toBe(true);
  });

  it("is deterministic under an injected random", () => {
    const a = generateRoomName(() => 0.5);
    const b = generateRoomName(() => 0.5);
    expect(a).toBe(b);
  });

  it("varies across the word lists at opposite ends of [0,1)", () => {
    const low = generateRoomName(() => 0);
    const high = generateRoomName(() => 0.999_999);
    expect(low).not.toBe(high);
  });
});

describe("isValidRoomName", () => {
  it.each([
    ["purple-elephant-kite"],
    ["bee-01"],
    ["abc"],
    [generateRoomName()],
  ])("accepts %s", (name) => {
    expect(isValidRoomName(name)).toBe(true);
  });

  it.each([
    ["Purple-Elephant-Kite"],
    ["has space"],
    ["snake_case"],
    ["bad-name!"],
    [""],
    ["ab"],
    // One character over the 48-char limit.
    ["a".repeat(49)],
  ])("rejects %s", (name) => {
    expect(isValidRoomName(name)).toBe(false);
  });

  it("accepts a date-shaped string (the /r/ prefix disambiguates routes)", () => {
    expect(isValidRoomName("2026-07-06")).toBe(true);
  });
});

describe("joinRoom", () => {
  it("adds the room to joined and sets it current", () => {
    const next = joinRoom(EMPTY_ROOM_STATE, "purple-elephant-kite");

    expect(next.current).toBe("purple-elephant-kite");
    expect(next.joined).toEqual(["purple-elephant-kite"]);
  });

  it("deduplicates joined while preserving insertion order", () => {
    const first = joinRoom(EMPTY_ROOM_STATE, "amber-otter-kite");
    const second = joinRoom(first, "cobalt-falcon-drum");
    const third = joinRoom(second, "amber-otter-kite");

    expect(third.joined).toEqual(["amber-otter-kite", "cobalt-falcon-drum"]);
    expect(third.current).toBe("amber-otter-kite");
  });
});

describe("setLastDate", () => {
  it("records and overwrites per room without touching others", () => {
    const state = setLastDate(
      EMPTY_ROOM_STATE,
      "amber-otter-kite",
      "2026-07-01"
    );
    const both = setLastDate(state, "cobalt-falcon-drum", "2026-07-02");
    const overwritten = setLastDate(both, "amber-otter-kite", "2026-07-05");

    expect(overwritten.lastDate).toEqual({
      "amber-otter-kite": "2026-07-05",
      "cobalt-falcon-drum": "2026-07-02",
    });
  });
});

describe("parseRoomState", () => {
  it("returns the empty state for null input", () => {
    expect(parseRoomState(null)).toEqual(EMPTY_ROOM_STATE);
  });

  it("returns the empty state for garbage JSON", () => {
    expect(parseRoomState("{oops")).toEqual(EMPTY_ROOM_STATE);
  });

  it("returns the empty state for wrong-shaped JSON", () => {
    expect(parseRoomState(JSON.stringify("just a string"))).toEqual(
      EMPTY_ROOM_STATE
    );
    expect(parseRoomState(JSON.stringify([1, 2]))).toEqual(EMPTY_ROOM_STATE);
    expect(parseRoomState(JSON.stringify({ current: 42 }))).toEqual(
      EMPTY_ROOM_STATE
    );
    expect(parseRoomState(JSON.stringify({ joined: "nope" }))).toEqual(
      EMPTY_ROOM_STATE
    );
  });

  it("round-trips a valid state through parse", () => {
    let state = joinRoom(EMPTY_ROOM_STATE, "amber-otter-kite");
    state = joinRoom(state, "cobalt-falcon-drum");
    state = joinRoom(state, "amber-otter-kite");
    state = setLastDate(state, "cobalt-falcon-drum", "2026-07-02");

    const parsed = parseRoomState(JSON.stringify(state));

    expect(parsed).toEqual(state);
  });
});

describe("todayEasternISO", () => {
  it("maps a UTC instant to the US Eastern calendar date", () => {
    // 2026-07-06T03:30Z is 23:30 on July 5 in EDT.
    expect(todayEasternISO(new Date("2026-07-06T03:30:00Z"))).toBe(
      "2026-07-05"
    );
    // Midday UTC lands on the same Eastern date in both DST regimes.
    expect(todayEasternISO(new Date("2026-07-06T16:00:00Z"))).toBe(
      "2026-07-06"
    );
    // Winter: EST is UTC-5.
    expect(todayEasternISO(new Date("2026-01-15T05:00:00Z"))).toBe(
      "2026-01-15"
    );
  });
});
