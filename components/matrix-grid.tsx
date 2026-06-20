"use client"

import { cn } from "@/lib/utils"
import type { Derived } from "@/lib/derive"
import type { Puzzle } from "@/lib/types"

function Cell({
  found,
  total,
  emphasis = false,
}: {
  found: number
  total: number
  emphasis?: boolean
}) {
  const empty = total === 0
  const complete = total > 0 && found >= total
  return (
    <td
      className={cn(
        "border border-border px-2 py-1.5 text-center text-sm tabular-nums",
        emphasis && "font-semibold",
        empty && "bg-muted/40 text-muted-foreground/40",
        !empty && complete && "bg-primary/25 text-foreground font-semibold",
        !empty && !complete && found > 0 && "bg-primary/8 text-foreground",
      )}
    >
      {empty ? "—" : `${found}/${total}`}
    </td>
  )
}

export function MatrixGrid({ puzzle, derived }: { puzzle: Puzzle; derived: Derived }) {
  const { letters, lengths } = puzzle
  const { found, lengthTotals, lengthFound, letterTotals, letterFound, foundWords, totalWords } = derived

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border border-border bg-card px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Letter
            </th>
            {lengths.map((len) => (
              <th
                key={len}
                className="border border-border bg-card px-2 py-2 text-center text-sm font-semibold text-card-foreground"
              >
                {len}
              </th>
            ))}
            <th className="border border-border bg-secondary px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-secondary-foreground">
              Σ
            </th>
          </tr>
        </thead>
        <tbody>
          {letters.map((letter) => (
            <tr key={letter}>
              <th
                scope="row"
                className="sticky left-0 z-10 border border-border bg-card px-3 py-1.5 text-left text-sm font-bold text-card-foreground"
              >
                {letter}
              </th>
              {lengths.map((len) => (
                <Cell
                  key={len}
                  found={found[letter]?.[len] ?? 0}
                  total={puzzle.grid[letter]?.[len] ?? 0}
                />
              ))}
              <Cell found={letterFound[letter] ?? 0} total={letterTotals[letter] ?? 0} emphasis />
            </tr>
          ))}
          <tr>
            <th
              scope="row"
              className="sticky left-0 z-10 border border-border bg-secondary px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-secondary-foreground"
            >
              Σ
            </th>
            {lengths.map((len) => (
              <Cell key={len} found={lengthFound[len] ?? 0} total={lengthTotals[len] ?? 0} emphasis />
            ))}
            <Cell found={foundWords} total={totalWords} emphasis />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
