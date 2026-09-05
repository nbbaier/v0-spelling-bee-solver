"use client";

import { useCallback, useEffect, useState } from "react";
import { loadRoomState, saveRoomState } from "@/lib/room-storage";
import {
  setLastDate as applySetLastDate,
  EMPTY_ROOM_STATE,
  generateRoomName,
  joinRoom,
  type RoomState,
} from "@/lib/rooms";

export interface UseRoomResult {
  // Kept for #28's join-by-name flow; this slice only uses the resolver.
  join: (name: string) => void;
  ready: boolean;
  // The room this browser should act as. With an explicit /r/<room> prop it is
  // available immediately (SSR-safe); otherwise it resolves client-side after
  // load, generating a personal room on first-ever visit.
  room: string | null;
  setLastDate: (name: string, date: string) => void;
  state: RoomState;
}

export function useRoom(explicit?: string, date?: string): UseRoomResult {
  const [state, setState] = useState<RoomState>(EMPTY_ROOM_STATE);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (explicit !== undefined) {
      // Visiting /r/<room>: adopt that room — joined, current, and (for
      // dated visits) marked as the last-visited date for THIS browser.
      let next = joinRoom(loadRoomState(), explicit);
      if (date !== undefined) {
        next = applySetLastDate(next, explicit, date);
      }
      saveRoomState(next);
      setState(next);
      return;
    }
    // Plain /<date> visit: use the browser's current-room pointer; a first-
    // ever visit generates a personal room, joins it, and persists it.
    let next = loadRoomState();
    if (!next.current) {
      next = joinRoom(next, generateRoomName());
      saveRoomState(next);
    }
    setState(next);
    setResolved(true);
  }, [explicit, date]);

  const join = useCallback((name: string) => {
    setState((current) => {
      const next = joinRoom(current, name);
      saveRoomState(next);
      return next;
    });
  }, []);

  const setLastDate = useCallback((name: string, dateValue: string) => {
    setState((current) => {
      const next = applySetLastDate(current, name, dateValue);
      saveRoomState(next);
      return next;
    });
  }, []);

  return {
    join,
    ready: explicit !== undefined || resolved,
    room: explicit ?? state.current,
    setLastDate,
    state,
  };
}
