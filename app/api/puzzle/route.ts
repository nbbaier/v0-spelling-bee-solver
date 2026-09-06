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

  const puzzle = await getPuzzle(date);
  return NextResponse.json({ puzzle });
}
