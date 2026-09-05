"use client";

// Thin, untested localStorage wrapper for browser room state. All decision
// logic lives in the pure reducers in lib/rooms.ts.

import { EMPTY_ROOM_STATE, parseRoomState, type RoomState } from "./rooms";

const STORAGE_KEY = "sbs:rooms:v1";

export function loadRoomState(): RoomState {
  if (typeof window === "undefined") {
    return EMPTY_ROOM_STATE;
  }
  try {
    return parseRoomState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_ROOM_STATE;
  }
}

export function saveRoomState(state: RoomState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (quota, privacy mode): rooms still work by name;
    // losing the pointer costs a rejoin, which is accepted design.
  }
}

export { STORAGE_KEY };
