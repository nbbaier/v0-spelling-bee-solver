import { notFound } from "next/navigation";
import { RoomRedirector } from "@/components/room-redirector";
import { isValidRoomName } from "@/lib/rooms";

interface RoomPageProps {
  params: Promise<{ room: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { room } = await params;
  // The room name is user-controlled URL/key material; refuse malformed ones.
  if (!isValidRoomName(room)) {
    notFound();
  }
  return <RoomRedirector room={room} />;
}
