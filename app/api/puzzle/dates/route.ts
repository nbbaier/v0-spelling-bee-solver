import { NextResponse } from "next/server";
import { listDates } from "@/lib/puzzle-store";

// The date index lives on its own endpoint so the client can cache it under a
// single SWR key, rather than duplicating it into every per-date puzzle
// response (where save/delete mutations would leave other entries stale).
export async function GET() {
  const dates = await listDates();
  return NextResponse.json({ dates });
}
