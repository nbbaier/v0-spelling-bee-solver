import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SolverApp } from "@/components/solver-app";
import { isSampleId, isValidPuzzleId } from "@/lib/keys";
import { isRealIsoDate } from "@/lib/puzzle-date";
import { isValidRoomName } from "@/lib/rooms";

interface RoomDatePageProps {
  params: Promise<{ room: string; date: string }>;
}

export default async function RoomDatePage({ params }: RoomDatePageProps) {
  const { room, date } = await params;
  if (!isValidRoomName(room)) {
    notFound();
  }
  if (isSampleId(date)) {
    redirect("/sample");
  }
  if (!(isValidPuzzleId(date) && isRealIsoDate(date))) {
    notFound();
  }
  return (
    <Suspense>
      <SolverApp date={date} room={room} />
    </Suspense>
  );
}
