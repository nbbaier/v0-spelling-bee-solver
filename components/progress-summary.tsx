"use client";

import type { Derived } from "@/lib/derive";

export function ProgressSummary({ derived }: { derived: Derived }) {
  const { foundWords, totalWords } = derived;
  const pct = totalWords > 0 ? Math.round((foundWords / totalWords) * 100) : 0;
  const remaining = Math.max(0, totalWords - foundWords);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Progress
          </p>
          <p className="mt-1 font-bold text-2xl text-card-foreground tabular-nums">
            {foundWords}
            <span className="text-muted-foreground">{` / ${totalWords}`}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-2xl text-card-foreground tabular-nums">
            {pct}%
          </p>
          <p className="text-muted-foreground text-xs">{remaining} to go</p>
        </div>
      </div>
      <div
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={pct}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
