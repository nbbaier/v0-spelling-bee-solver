"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { HintsList } from "@/components/hints-list"
import { MatrixGrid } from "@/components/matrix-grid"
import { ProgressSummary } from "@/components/progress-summary"
import { SetupPanel } from "@/components/setup-panel"
import { usePuzzle } from "@/hooks/use-puzzle"
import { derive } from "@/lib/derive"

export function SolverApp() {
  const { puzzle, setPuzzle, setWord, reset, hydrated } = usePuzzle()
  const derived = useMemo(() => (puzzle ? derive(puzzle) : null), [puzzle])

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            B
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Spelling Bee Solver</h1>
            <p className="text-sm text-muted-foreground">Track the grid and hints as you find words</p>
          </div>
        </div>
        {puzzle ? (
          <Button variant="outline" onClick={reset}>
            New puzzle
          </Button>
        ) : null}
      </header>

      {!hydrated ? null : !puzzle || !derived ? (
        <SetupPanel onLoad={setPuzzle} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <ProgressSummary derived={derived} />
            <MatrixGrid puzzle={puzzle} derived={derived} />
          </div>
          <div className="lg:col-span-2">
            <HintsList hints={puzzle.hints} onSetWord={setWord} />
          </div>
        </div>
      )}
    </main>
  )
}
