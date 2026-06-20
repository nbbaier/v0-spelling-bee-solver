"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseHints, parseMatrix } from "@/lib/parse"
import { SAMPLE_HINTS, SAMPLE_MATRIX } from "@/lib/sample"
import type { HintSlot, MatrixData } from "@/lib/types"

const MATRIX_EXAMPLE = `\t4\t5\t6\t7\nD\t2\t3\t1\t1\nO\t1\t2\t\t\nN\t\t1\t1\t`
const HINTS_EXAMPLE = "DON x1  DOO x1  DRO x4  NOD x2"

type Props = {
  date: string
  onDateChange: (date: string) => void
  onLoad: (matrix: MatrixData, hints: HintSlot[]) => void
  saving?: boolean
}

export function SetupPanel({ date, onDateChange, onLoad, saving }: Props) {
  const [matrixText, setMatrixText] = useState("")
  const [hintsText, setHintsText] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleLoad() {
    setError(null)
    try {
      const { letters, lengths, grid } = parseMatrix(matrixText)
      const hints = parseHints(hintsText)
      onLoad({ letters, lengths, grid }, hints)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse the puzzle.")
    }
  }

  function loadSample() {
    setMatrixText(SAMPLE_MATRIX)
    setHintsText(SAMPLE_HINTS)
    setError(null)
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-card-foreground">Load a puzzle</h2>
            <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
              Paste the grid and hint list copied from sbsolver. Progress is saved to your Redis store by date.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={loadSample}>
            Load sample
          </Button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="puzzle-date">Puzzle date</Label>
            <Input
              id="puzzle-date"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-auto"
            />
            <p className="text-xs text-muted-foreground">Defaults to today. Change it to load a past day&apos;s puzzle.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matrix">Grid matrix (tab-separated)</Label>
            <Textarea
              id="matrix"
              value={matrixText}
              onChange={(e) => setMatrixText(e.target.value)}
              placeholder={MATRIX_EXAMPLE}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Letters down the left, word lengths across the top. Totals are ignored and recomputed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hints">Hint list</Label>
            <Textarea
              id="hints"
              value={hintsText}
              onChange={(e) => setHintsText(e.target.value)}
              placeholder={HINTS_EXAMPLE}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{'Format: "PREFIX xN", e.g. DRO x4.'}</p>
          </div>

          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            onClick={handleLoad}
            className="w-full"
            disabled={!matrixText.trim() || !hintsText.trim() || saving}
          >
            {saving ? "Saving…" : "Load puzzle"}
          </Button>
        </div>
      </div>
    </div>
  )
}
