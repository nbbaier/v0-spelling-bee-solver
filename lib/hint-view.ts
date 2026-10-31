import type { HintSlot } from "@/lib/types";

// Which slots the hint list shows (see "View" in GLOSSARY.md).
export const HINT_VIEWS = ["all", "remaining", "found"] as const;
export type HintView = (typeof HINT_VIEWS)[number];

export function isHintView(value: unknown): value is HintView {
  return HINT_VIEWS.includes(value as HintView);
}

export function isSlotVisible(slot: HintSlot, view: HintView): boolean {
  if (view === "remaining") {
    return !slot.word;
  }
  if (view === "found") {
    return Boolean(slot.word);
  }
  return true;
}

// A group shows when the view leaves at least one of its slots visible:
// Remaining drops complete groups, Found drops groups with no found words.
export function isGroupVisible(slots: HintSlot[], view: HintView): boolean {
  return slots.some((slot) => isSlotVisible(slot, view));
}
