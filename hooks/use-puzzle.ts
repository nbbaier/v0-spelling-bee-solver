"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  clearAllWordsAction,
  clearWordsForSlotsAction,
  deletePuzzleAction,
  savePuzzleAction,
  setWordAction,
} from "@/app/actions";
import { isSampleId, SAMPLE_ID, todayISO } from "@/lib/keys";
import type { HintSlot, MatrixData, Puzzle } from "@/lib/types";

interface PuzzleResponse {
  dates: string[];
  puzzle: Puzzle | null;
}

const fetcher = async (url: string): Promise<PuzzleResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load puzzle");
  }
  return res.json();
};

export function usePuzzle() {
  const [date, setDate] = useState<string>(todayISO());
  const [saving, setSaving] = useState(false);

  const key = `/api/puzzle?date=${date}`;
  const { data, isLoading, mutate } = useSWR<PuzzleResponse>(key, fetcher, {
    revalidateOnFocus: false,
  });

  const puzzle = data?.puzzle ?? null;
  const dates = data?.dates ?? [];

  // Create/replace the puzzle for the current date (or an explicit id, e.g. "sample").
  const savePuzzle = useCallback(
    async (matrix: MatrixData, hints: HintSlot[], targetId?: string) => {
      const id = targetId ?? date;
      // If saving to a different id than the current SWR key, switch the date
      // first so the mutate targets the right key.
      if (targetId && targetId !== date) {
        setDate(targetId);
      }
      setSaving(true);
      const next: Puzzle = { date: id, ...matrix, hints };
      const nextDates = isSampleId(id)
        ? dates
        : Array.from(new Set([id, ...dates]))
            .sort()
            .reverse();
      try {
        await mutate(
          async () => {
            await savePuzzleAction(id, matrix, hints);
            return { puzzle: next, dates: nextDates };
          },
          {
            optimisticData: { puzzle: next, dates: nextDates },
            revalidate: false,
          }
        );
      } finally {
        setSaving(false);
      }
    },
    [date, dates, mutate]
  );

  // Record or clear a found word, with optimistic UI.
  const setWord = useCallback(
    (slotId: string, word: string | null) => {
      const cleaned =
        word && word.trim().length > 0 ? word.trim().toUpperCase() : null;
      mutate(
        async (current) => {
          await setWordAction(date, slotId, cleaned);
          if (!current?.puzzle) {
            return current as PuzzleResponse;
          }
          return {
            ...current,
            puzzle: {
              ...current.puzzle,
              hints: current.puzzle.hints.map((s) =>
                s.id === slotId ? { ...s, word: cleaned } : s
              ),
            },
          };
        },
        {
          optimisticData: (current) => {
            if (!current?.puzzle) {
              return current as PuzzleResponse;
            }
            return {
              ...current,
              puzzle: {
                ...current.puzzle,
                hints: current.puzzle.hints.map((s) =>
                  s.id === slotId ? { ...s, word: cleaned } : s
                ),
              },
            };
          },
          revalidate: false,
        }
      );
    },
    [date, mutate]
  );

  // Remove the current puzzle and return to the loader.
  const deletePuzzle = useCallback(async () => {
    setSaving(true);
    try {
      await mutate(
        async () => {
          await deletePuzzleAction(date);
          return { puzzle: null, dates: dates.filter((d) => d !== date) };
        },
        {
          optimisticData: {
            puzzle: null,
            dates: dates.filter((d) => d !== date),
          },
          revalidate: false,
        }
      );
    } finally {
      setSaving(false);
    }
  }, [date, dates, mutate]);

  // Clear entered words for the current puzzle. Pass a list of slot IDs to clear
  // only those slots; omit it to clear every word.
  const clearWords = useCallback(
    (slotIds?: string[]) => {
      const targetIds = slotIds ? new Set(slotIds) : null;
      const clearScoped = (
        current: PuzzleResponse | undefined
      ): PuzzleResponse => {
        if (!current?.puzzle) {
          return current as PuzzleResponse;
        }
        return {
          ...current,
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
            await clearWordsForSlotsAction(date, slotIds);
          } else {
            await clearAllWordsAction(date);
          }
          return clearScoped(current);
        },
        {
          optimisticData: clearScoped,
          revalidate: false,
        }
      );
    },
    [date, mutate]
  );

  const isSample = isSampleId(date);
  const loadSample = useCallback(() => setDate(SAMPLE_ID), []);

  return {
    date,
    setDate,
    isSample,
    loadSample,
    puzzle,
    dates,
    isLoading,
    saving,
    savePuzzle,
    setWord,
    deletePuzzle,
    clearWords,
  };
}
