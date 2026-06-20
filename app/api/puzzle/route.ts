import { NextResponse } from "next/server"
import { getPuzzle, listDates } from "@/lib/puzzle-store"
import { isValidPuzzleId } from "@/lib/keys"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")

  if (!date || !isValidPuzzleId(date)) {
    return NextResponse.json({ error: "A valid date (YYYY-MM-DD) or 'sample' is required" }, { status: 400 })
  }

  const [puzzle, dates] = await Promise.all([getPuzzle(date), listDates()])
  return NextResponse.json({ puzzle, dates })
}
