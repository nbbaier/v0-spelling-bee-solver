"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import { deletePuzzleAction, savePuzzleAction, setWordAction } from "@/app/actions"
import { todayISO } from "@/lib/keys"
import type { HintSlot, MatrixData, Puzzle } from "@/lib/types"

type PuzzleResponse = { puzzle: Puzzle | null; dates: string[] }

const fetcher = async (url: string): Promise<PuzzleResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load puzzle")
  return res.json()
}

export function usePuzzle() {
  const [date, setDate] = useState<string>(todayISO())
  const [saving, setSaving] = useState(false)

  const key = `/api/puzzle?date=${date}`
  const { data, isLoading, mutate } = useSWR<PuzzleResponse>(key, fetcher, {
    revalidateOnFocus: false,
  })

  const puzzle = data?.puzzle ?? null
  const dates = data?.dates ?? []

  // Create/replace the puzzle for the current date.
  const savePuzzle = useCallback(
    async (matrix: MatrixData, hints: HintSlot[]) => {
      setSaving(true)
      const next: Puzzle = { date, ...matrix, hints }
      try {
        await mutate(
          async () => {
            await savePuzzleAction(date, matrix, hints)
            return { puzzle: next, dates: Array.from(new Set([date, ...dates])).sort().reverse() }
          },
          { optimisticData: { puzzle: next, dates }, revalidate: false },
        )
      } finally {
        setSaving(false)
      }
    },
    [date, dates, mutate],
  )

  // Record or clear a found word, with optimistic UI.
  const setWord = useCallback(
    (slotId: string, word: string | null) => {
      const cleaned = word && word.trim().length > 0 ? word.trim().toUpperCase() : null
      mutate(
        async (current) => {
          await setWordAction(date, slotId, cleaned)
          if (!current?.puzzle) return current as PuzzleResponse
          return {
            ...current,
            puzzle: {
              ...current.puzzle,
              hints: current.puzzle.hints.map((s) => (s.id === slotId ? { ...s, word: cleaned } : s)),
            },
          }
        },
        {
          optimisticData: (current) => {
            if (!current?.puzzle) return current as PuzzleResponse
            return {
              ...current,
              puzzle: {
                ...current.puzzle,
                hints: current.puzzle.hints.map((s) => (s.id === slotId ? { ...s, word: cleaned } : s)),
              },
            }
          },
          revalidate: false,
        },
      )
    },
    [date, mutate],
  )

  // Remove the current puzzle and return to the loader.
  const deletePuzzle = useCallback(async () => {
    setSaving(true)
    try {
      await mutate(
        async () => {
          await deletePuzzleAction(date)
          return { puzzle: null, dates: dates.filter((d) => d !== date) }
        },
        { optimisticData: { puzzle: null, dates: dates.filter((d) => d !== date) }, revalidate: false },
      )
    } finally {
      setSaving(false)
    }
  }, [date, dates, mutate])

  return { date, setDate, puzzle, dates, isLoading, saving, savePuzzle, setWord, deletePuzzle }
}
