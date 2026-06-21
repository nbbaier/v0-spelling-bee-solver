import { NextResponse } from "next/server";
import { isValidPuzzleId } from "@/lib/keys";
import { getPuzzle } from "@/lib/puzzle-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!(date && isValidPuzzleId(date))) {
    return NextResponse.json(
      { error: "A valid date (YYYY-MM-DD) or 'sample' is required" },
      { status: 400 }
    );
  }

  // The date index is served separately (/api/puzzle/dates) so it isn't
  // duplicated and left stale across per-date caches.
  const puzzle = await getPuzzle(date);
  return NextResponse.json({ puzzle });
}
