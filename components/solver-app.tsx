"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HintsList } from "@/components/hints-list"
import { MatrixGrid } from "@/components/matrix-grid"
import { ProgressSummary } from "@/components/progress-summary"
import { SetupPanel } from "@/components/setup-panel"
import { usePuzzle } from "@/hooks/use-puzzle"
import { derive } from "@/lib/derive"
import type { HintSlot, MatrixData } from "@/lib/types"

export function SolverApp() {
  const { date, setDate, isSample, loadSample, puzzle, isLoading, saving, savePuzzle, setWord, deletePuzzle } = usePuzzle()
  const [forceLoader, setForceLoader] = useState(false)

  const derived = useMemo(() => (puzzle ? derive(puzzle) : null), [puzzle])

  const handleDateChange = useCallback(
    (next: string) => {
      setForceLoader(false)
      setDate(next)
    },
    [setDate],
  )

  // onLoad receives the target id (a date string or "sample") from SetupPanel.
  // Pass it through to savePuzzle so the hook can switch the SWR key atomically.
  const handleLoad = useCallback(
    async (matrix: MatrixData, hints: HintSlot[], id: string) => {
      await savePuzzle(matrix, hints, id)
      setForceLoader(false)
    },
    [savePuzzle],
  )

  const showLoader = !isLoading && (!puzzle || !derived || forceLoader)

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

        <div className="flex items-center gap-3">
          {isSample ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-foreground/80">
              Sample data
            </span>
          ) : (
            <Input
              type="date"
              aria-label="Puzzle date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-auto"
            />
          )}
          {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
          {puzzle && !showLoader ? (
            <Button variant="outline" onClick={() => setForceLoader(true)}>
              Load new puzzle
            </Button>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading puzzle…</div>
      ) : showLoader ? (
        <div className="space-y-4">
          {puzzle && forceLoader ? (
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">A puzzle already exists for this date. Loading will replace it.</span>
              <Button variant="ghost" size="sm" onClick={() => setForceLoader(false)}>
                Cancel
              </Button>
            </div>
          ) : null}
          <SetupPanel date={date} onDateChange={handleDateChange} onLoad={handleLoad} saving={saving} />
        </div>
      ) : derived ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <ProgressSummary derived={derived} />
            <MatrixGrid puzzle={puzzle!} derived={derived} />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <HintsList hints={puzzle!.hints} onSetWord={setWord} />
            <Button variant="ghost" size="sm" onClick={deletePuzzle} className="text-muted-foreground">
              Delete this puzzle
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
