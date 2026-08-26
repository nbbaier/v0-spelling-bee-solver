import { redirect } from "next/navigation";
import { isSampleId, isValidPuzzleId } from "@/lib/keys";
import { isRealIsoDate, latestPuzzleDateISO } from "@/lib/puzzle-date";

interface PageProps {
  searchParams: Promise<{ date?: string | string[] }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { date } = await searchParams;
  if (typeof date === "string" && isSampleId(date)) {
    redirect("/sample");
  }
  if (
    typeof date === "string" &&
    isValidPuzzleId(date) &&
    isRealIsoDate(date)
  ) {
    redirect(`/${date}`);
  }
  redirect(`/${latestPuzzleDateISO()}`);
}
