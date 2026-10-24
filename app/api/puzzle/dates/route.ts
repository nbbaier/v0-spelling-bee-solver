import { NextResponse } from "next/server";
import { listPuzzleDates } from "@/lib/puzzle-store";

export async function GET() {
  return NextResponse.json(await listPuzzleDates());
}
