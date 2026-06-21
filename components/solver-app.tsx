"use client";

import { useCallback, useMemo, useState } from "react";
import { HintsList } from "@/components/hints-list";
import { MatrixGrid } from "@/components/matrix-grid";
import { ProgressSummary } from "@/components/progress-summary";
import { SetupPanel } from "@/components/setup-panel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { usePuzzle } from "@/hooks/use-puzzle";
import { derive } from "@/lib/derive";
import { parseLocalDate, toLocalISO } from "@/lib/keys";
import type { HintSlot, MatrixData } from "@/lib/types";

export function SolverApp() {
  const {
    date,
    setDate,
    isSample,
    puzzle,
    isLoading,
    saving,
    savePuzzle,
    setWord,
    deletePuzzle,
    dates,
    clearAllWords,
  } = usePuzzle();
  const [forceLoader, setForceLoader] = useState(false);

  const derived = useMemo(() => (puzzle ? derive(puzzle) : null), [puzzle]);

  const handleDateChange = useCallback(
    (next: string) => {
      setForceLoader(false);
      setDate(next);
    },
    [setDate]
  );

  // Convert date strings to Date objects for the date picker
  const disabledDates = useMemo(
    () => dates.map((d) => parseLocalDate(d)),
    [dates]
  );

  // onLoad receives the target id (a date string or "sample") from SetupPanel.
  // Pass it through to savePuzzle so the hook can switch the SWR key atomically.
  const handleLoad = useCallback(
    async (matrix: MatrixData, hints: HintSlot[], id: string) => {
      await savePuzzle(matrix, hints, id);
      setForceLoader(false);
    },
    [savePuzzle]
  );

  const showLoader = !isLoading && (!(puzzle && derived) || forceLoader);

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="py-20 text-center text-muted-foreground text-sm">
          Loading puzzle…
        </div>
      );
    }

    if (showLoader) {
      return (
        <div className="space-y-4">
          {puzzle && forceLoader ? (
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                A puzzle already exists for this date. Loading will replace it.
              </span>
              <Button
                onClick={() => setForceLoader(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          ) : null}
          <SetupPanel
            date={date}
            onDateChange={handleDateChange}
            onLoad={handleLoad}
            saving={saving}
          />
        </div>
      );
    }

    if (puzzle && derived) {
      return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <ProgressSummary derived={derived} />
            <MatrixGrid derived={derived} puzzle={puzzle} />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <HintsList
              allowedLetters={puzzle.letters}
              date={date}
              hints={puzzle.hints}
              onClearAllWords={clearAllWords}
              onSetWord={setWord}
            />
            <Button
              className="text-muted-foreground"
              onClick={deletePuzzle}
              size="sm"
              variant="ghost"
            >
              Delete this puzzle
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-lg text-primary-foreground">
            B
          </div>
          <div>
            <h1 className="font-bold text-foreground text-xl tracking-tight">
              Spelling Bee Solver
            </h1>
            <p className="text-muted-foreground text-sm">
              Track the grid and hints as you find words
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSample ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-medium text-primary-foreground/80 text-xs">
              Sample data
            </span>
          ) : (
            <DatePicker
              disabledDates={disabledDates}
              enabledDateIndicator
              onDateChange={(d) => handleDateChange(toLocalISO(d))}
              value={parseLocalDate(date)}
            />
          )}
          {saving ? (
            <span className="text-muted-foreground text-xs">Saving…</span>
          ) : null}
          {puzzle && !showLoader ? (
            <Button onClick={() => setForceLoader(true)} variant="outline">
              Load new puzzle
            </Button>
          ) : null}
        </div>
      </header>

      {renderBody()}
    </main>
  );
}
