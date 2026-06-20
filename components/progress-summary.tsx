"use client"

import type { Derived } from "@/lib/derive"

export function ProgressSummary({ derived }: { derived: Derived }) {
  const { foundWords, totalWords } = derived
  const pct = totalWords > 0 ? Math.round((foundWords / totalWords) * 100) : 0
  const remaining = Math.max(0, totalWords - foundWords)

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Progress</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-card-foreground">
            {foundWords}
            <span className="text-muted-foreground">{` / ${totalWords}`}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-card-foreground">{pct}%</p>
          <p className="text-xs text-muted-foreground">{remaining} to go</p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
