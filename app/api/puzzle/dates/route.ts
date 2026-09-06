import { NextResponse } from "next/server";
import { listDates } from "@/lib/puzzle-store";

export async function GET() {
  const dates = await listDates();
  return NextResponse.json({ dates });
}
