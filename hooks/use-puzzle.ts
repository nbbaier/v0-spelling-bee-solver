"use client";

import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  clearAllWordsAction,
  clearWordsForSlotsAction,
  deletePuzzleAction,
  savePuzzleAction,
  setWordAction,
} from "@/app/actions";
import { isSampleId } from "@/lib/keys";
import type { HintSlot, MatrixData, Puzzle } from "@/lib/types";

interface PuzzleResponse {
  puzzle: Puzzle | null;
}

interface DatesResponse {
  dates: string[];
}

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load puzzle");
  }
  return res.json();
};

const DATES_KEY = "/api/puzzle/dates";
const keyForDate = (d: string, r?: string | null): string =>
  `/api/puzzle?date=${d}${r ? `&room=${encodeURIComponent(r)}` : ""}`;

export function usePuzzle(date: string, room?: string | null) {
  const [saving, setSaving] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();

  // The key includes the room so two rooms' views of one date never share a
  // cache entry. A real date without a resolved room yet (plain /<date> before
  // the client resolver runs) pauses fetching instead of briefly reading the
  // legacy non-room words; the sample needs no room and fetches immediately.
  const isSample = isSampleId(date);
  const resolvedRoom = isSample ? null : (room ?? null);
  const key = isSample || resolvedRoom ? keyForDate(date, resolvedRoom) : null;
  const { data, isLoading, mutate } = useSWR<PuzzleResponse>(key, fetcher, {
    revalidateOnFocus: false,
  });
  // The date index is one shared cache entry, so the saved-vs-unsaved answer is
  // the same no matter which date is currently active.
  const {
    data: datesData,
    error: datesErrorRaw,
    mutate: reloadDates,
  } = useSWR<DatesResponse>(DATES_KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const puzzle = data?.puzzle ?? null;
  const dates = datesData?.dates ?? [];
  // Whether the authoritative index has loaded. Until it has (or if it failed),
  // an empty `dates` is not proof that nothing is saved, so callers must not make
  // saved-vs-unsaved routing decisions yet.
  const datesReady = datesData !== undefined;
  // Surface a load failure (only meaningful before any list has been cached) so
  // the UI can offer a retry instead of leaving the pickers silently disabled.
  const datesError = !datesReady && datesErrorRaw !== undefined;

  // Apply an update to the single date-index cache entry.
  const updateDates = useCallback(
    (update: (current: string[]) => string[]) => {
      if (!datesData) {
        // No authoritative list cached yet — revalidate to pull the server's
        // list (which already reflects the save/delete we just persisted) rather
        // than optimistically mutating from an empty array and clobbering it.
        return globalMutate<DatesResponse>(DATES_KEY);
      }
      return globalMutate<DatesResponse>(
        DATES_KEY,
        { dates: update(datesData.dates) },
        { revalidate: false }
      );
    },
    [globalMutate, datesData]
  );

  // Create/replace the puzzle for the current date (or an explicit id, e.g. "sample").
  const savePuzzle = useCallback(
    async (
      matrix: MatrixData,
      hints: HintSlot[],
      targetId?: string
    ): Promise<string> => {
      const id = targetId ?? date;
      const next: Puzzle = { date: id, ...matrix, hints };
      const response: PuzzleResponse = { puzzle: next };

      setSaving(true);
      try {
        if (id === date) {
          // Same-date save: the bound mutate targets the active key, so the
          // optimistic write lands where it's displayed.
          await mutate(
            async () => {
              await savePuzzleAction(id, matrix, hints);
              return response;
            },
            { optimisticData: response, revalidate: false }
          );
        } else {
          // Cross-date save: persist first, then write the target key's cache
          // via the global mutator. The bound mutate is tied to the current
          // (previous) key, and navigating first would race an empty fetch for
          // the target key. Room-scoped: the browser keeps its current room on
          // the cross-date navigation that follows this save.
          await savePuzzleAction(id, matrix, hints);
          await globalMutate(keyForDate(id, resolvedRoom), response, {
            revalidate: false,
          });
        }
        if (!isSampleId(id)) {
          await updateDates((current) =>
            Array.from(new Set([id, ...current]))
              .sort()
              .reverse()
          );
        }
        return id;
      } finally {
        setSaving(false);
      }
    },
    [date, resolvedRoom, mutate, globalMutate, updateDates]
  );

  // Record or clear a found word, with optimistic UI.
  const setWord = useCallback(
    (slotId: string, word: string | null) => {
      const cleaned =
        word && word.trim().length > 0 ? word.trim().toUpperCase() : null;
      const apply = (current: PuzzleResponse | undefined): PuzzleResponse => {
        if (!current?.puzzle) {
          return { puzzle: null };
        }
        return {
          puzzle: {
            ...current.puzzle,
            hints: current.puzzle.hints.map((s) =>
              s.id === slotId ? { ...s, word: cleaned } : s
            ),
          },
        };
      };
      mutate(
        async (current) => {
          await setWordAction(date, slotId, cleaned, resolvedRoom);
          return apply(current);
        },
        { optimisticData: apply, revalidate: false }
      );
    },
    [date, resolvedRoom, mutate]
  );

  // Remove the current puzzle and return to the loader.
  const deletePuzzle = useCallback(async () => {
    setSaving(true);
    try {
      await mutate(
        async () => {
          await deletePuzzleAction(date);
          return { puzzle: null };
        },
        { optimisticData: { puzzle: null }, revalidate: false }
      );
      if (!isSampleId(date)) {
        await updateDates((current) => current.filter((d) => d !== date));
      }
    } finally {
      setSaving(false);
    }
  }, [date, mutate, updateDates]);

  // Clear entered words for the current puzzle. Pass a list of slot IDs to clear
  // only those slots; omit it to clear every word.
  const clearWords = useCallback(
    (slotIds?: string[]) => {
      const targetIds = slotIds ? new Set(slotIds) : null;
      const clearScoped = (
        current: PuzzleResponse | undefined
      ): PuzzleResponse => {
        if (!current?.puzzle) {
          return { puzzle: null };
        }
        return {
          puzzle: {
            ...current.puzzle,
            hints: current.puzzle.hints.map((s) =>
              targetIds && !targetIds.has(s.id) ? s : { ...s, word: null }
            ),
          },
        };
      };
      mutate(
        async (current) => {
          if (targetIds && slotIds) {
            await clearWordsForSlotsAction(date, slotIds, resolvedRoom);
          } else {
            await clearAllWordsAction(date, resolvedRoom);
          }
          return clearScoped(current);
        },
        {
          optimisticData: clearScoped,
          revalidate: false,
        }
      );
    },
    [date, resolvedRoom, mutate]
  );

  return {
    clearWords,
    date,
    dates,
    datesError,
    datesReady,
    deletePuzzle,
    isLoading,
    isSample,
    puzzle,
    reloadDates,
    savePuzzle,
    saving,
    setWord,
  };
}
