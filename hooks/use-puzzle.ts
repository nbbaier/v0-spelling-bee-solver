"use client"

import { useCallback, useEffect, useState } from "react"
import type { Puzzle } from "@/lib/types"

const STORAGE_KEY = "spelling-bee-puzzle-v1"

export function usePuzzle() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setPuzzle(JSON.parse(raw) as Puzzle)
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true)
  }, [])

  // Persist whenever the puzzle changes (after hydration).
  useEffect(() => {
    if (!hydrated) return
    try {
      if (puzzle) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzle))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore quota errors
    }
  }, [puzzle, hydrated])

  const setWord = useCallback((slotId: string, word: string | null) => {
    setPuzzle((prev) => {
      if (!prev) return prev
      const cleaned = word && word.trim().length > 0 ? word.trim().toUpperCase() : null
      return {
        ...prev,
        hints: prev.hints.map((s) => (s.id === slotId ? { ...s, word: cleaned } : s)),
      }
    })
  }, [])

  const reset = useCallback(() => setPuzzle(null), [])

  return { puzzle, setPuzzle, setWord, reset, hydrated }
}
