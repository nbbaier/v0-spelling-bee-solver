import { Suspense } from "react";
import { SolverApp } from "@/components/solver-app";

export default function Page() {
  return (
    <Suspense>
      <SolverApp />
    </Suspense>
  );
}
