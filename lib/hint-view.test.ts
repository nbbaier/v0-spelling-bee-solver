import { describe, expect, it } from "vitest";
import { isGroupVisible, isHintView, isSlotVisible } from "./hint-view";
import type { HintSlot } from "./types";

const found: HintSlot = { id: "DRO-0", prefix: "DRO", word: "DROOP" };
const remaining: HintSlot = { id: "DRO-1", prefix: "DRO", word: null };

describe("isSlotVisible", () => {
  it("shows every slot in All", () => {
    expect(isSlotVisible(found, "all")).toBe(true);
    expect(isSlotVisible(remaining, "all")).toBe(true);
  });

  it("hides found words in Remaining", () => {
    expect(isSlotVisible(found, "remaining")).toBe(false);
    expect(isSlotVisible(remaining, "remaining")).toBe(true);
  });

  it("hides remaining slots in Found", () => {
    expect(isSlotVisible(found, "found")).toBe(true);
    expect(isSlotVisible(remaining, "found")).toBe(false);
  });
});

describe("isGroupVisible", () => {
  const complete = [found, { ...found, id: "DRO-2", word: "DRONE" }];
  const untouched = [remaining, { ...remaining, id: "DRO-2" }];
  const partial = [found, remaining];

  it("shows every group in All", () => {
    expect(isGroupVisible(complete, "all")).toBe(true);
    expect(isGroupVisible(untouched, "all")).toBe(true);
  });

  it("hides complete groups in Remaining", () => {
    expect(isGroupVisible(complete, "remaining")).toBe(false);
    expect(isGroupVisible(partial, "remaining")).toBe(true);
  });

  it("hides groups with no found words in Found", () => {
    expect(isGroupVisible(untouched, "found")).toBe(false);
    expect(isGroupVisible(partial, "found")).toBe(true);
  });
});

describe("isHintView", () => {
  it("accepts only the three views", () => {
    expect(isHintView("found")).toBe(true);
    expect(isHintView("completed")).toBe(false);
    expect(isHintView(undefined)).toBe(false);
  });
});
