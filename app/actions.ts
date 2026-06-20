"use server"

import { isValidDate } from "@/lib/keys"
import * as store from "@/lib/puzzle-store"
import type { HintSlot, MatrixData } from "@/lib/types"

export async function savePuzzleAction(date: string, matrix: MatrixData, hints: HintSlot[]) {
  if (!isValidDate(date)) throw new Error("Invalid date")
  await store.savePuzzle(date, matrix, hints)
}

export async function setWordAction(date: string, slotId: string, word: string | null) {
  if (!isValidDate(date)) throw new Error("Invalid date")
  await store.setWord(date, slotId, word)
}

export async function deletePuzzleAction(date: string) {
  if (!isValidDate(date)) throw new Error("Invalid date")
  await store.deletePuzzle(date)
}
