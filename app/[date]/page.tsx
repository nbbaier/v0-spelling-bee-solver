import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SolverApp } from "@/components/solver-app";
import { isSampleId, isValidPuzzleId } from "@/lib/keys";

interface DatePageProps {
  params: Promise<{ date: string }>;
}

export default async function DatePage({ params }: DatePageProps) {
  const { date } = await params;
  if (isSampleId(date)) {
    redirect("/sample");
  }
  if (!isValidPuzzleId(date)) {
    notFound();
  }
  return (
    <Suspense>
      <SolverApp date={date} />
    </Suspense>
  );
}
