import { NextResponse } from "next/server";
import { isValidPuzzleId } from "@/lib/keys";
import { getPuzzle } from "@/lib/puzzle-store";
import { isValidRoomName } from "@/lib/rooms";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const room = searchParams.get("room");

  if (!(date && isValidPuzzleId(date))) {
    return NextResponse.json(
      { error: "A valid date (YYYY-MM-DD) or 'sample' is required" },
      { status: 400 }
    );
  }

  // Room is optional (the sample never sends one) but must be well-formed when
  // present — it becomes key material server-side.
  if (room !== null && !isValidRoomName(room)) {
    return NextResponse.json({ error: "Invalid room name" }, { status: 400 });
  }

  // The date index is served separately (/api/puzzle/dates) so it isn't
  // duplicated and left stale across per-date caches.
  const puzzle = await getPuzzle(date, room);
  return NextResponse.json({ puzzle });
}
