"use client";

// /r/<room> landing: joins the room as this browser's current one, then
// replaces to the browser's last-visited date for it — or today in US Eastern
// on first visit. The puzzle itself is never rendered here.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRoom } from "@/hooks/use-room";
import { todayEasternISO } from "@/lib/rooms";

export function RoomRedirector({ room }: { room: string }) {
  const router = useRouter();
  const { ready, state } = useRoom(room);

  useEffect(() => {
    if (!ready) {
      return;
    }
    // Last-visited date is per-browser by design: rooms hold no shared cursor.
    const target = state.lastDate[room] ?? todayEasternISO();
    router.replace(`/r/${encodeURIComponent(room)}/${target}`);
  }, [ready, room, state, router]);

  return (
    <main className="mx-auto min-h-svh w-full max-w-208 px-4 py-8 sm:px-6 sm:py-12">
      <p className="py-20 text-center text-muted-foreground text-sm">
        Joining room <code className="font-medium">{room}</code>…
      </p>
    </main>
  );
}
