import { Suspense } from "react";
import { SolverApp } from "@/components/solver-app";
import { SAMPLE_ID } from "@/lib/keys";

export default function SamplePage() {
  return (
    <Suspense>
      <SolverApp date={SAMPLE_ID} />
    </Suspense>
  );
}
