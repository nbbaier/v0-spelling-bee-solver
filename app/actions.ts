"use server"

import { isValidPuzzleId } from "@/lib/keys"
import * as store from "@/lib/puzzle-store"
import type { HintSlot, MatrixData } from "@/lib/types"

export async function savePuzzleAction(date: string, matrix: MatrixData, hints: HintSlot[]) {
  if (!isValidPuzzleId(date)) throw new Error("Invalid puzzle id")
  await store.savePuzzle(date, matrix, hints)
}

export async function setWordAction(date: string, slotId: string, word: string | null) {
  if (!isValidPuzzleId(date)) throw new Error("Invalid puzzle id")
  await store.setWord(date, slotId, word)
}

export async function deletePuzzleAction(date: string) {
  if (!isValidPuzzleId(date)) throw new Error("Invalid puzzle id")
  await store.deletePuzzle(date)
}
