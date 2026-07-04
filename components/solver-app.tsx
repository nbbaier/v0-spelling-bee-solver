"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HintsList } from "@/components/hints-list";
import { MatrixGrid } from "@/components/matrix-grid";
import { ProgressSummary } from "@/components/progress-summary";
import { SetupPanel } from "@/components/setup-panel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { usePuzzle } from "@/hooks/use-puzzle";
import { derive } from "@/lib/derive";
import { isSampleId, parseLocalDate, toLocalISO } from "@/lib/keys";
import { allowedLetters } from "@/lib/letters";
import { FIRST_PUZZLE_ISO, latestPuzzleDateISO } from "@/lib/puzzle-date";
import type { HintSlot, MatrixData } from "@/lib/types";

const DATE_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

function getInitialDate(param: string | null): string | undefined {
  if (!param) {
    return;
  }
  if (isSampleId(param) || DATE_PARAM_RE.test(param)) {
    return param;
  }
}

export function SolverApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDate = getInitialDate(searchParams.get("date"));
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
    datesReady,
    datesError,
    reloadDates,
    clearWords,
  } = usePuzzle(initialDate);
  const [forceLoader, setForceLoader] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("date") === date) {
      return;
    }
    params.set("date", date);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [date, router, searchParams]);
  // When the user picks a date that has no saved puzzle, we drop into the loader
  // and signal SetupPanel to scrape that date automatically. Cleared once the
  // panel consumes it (see onAutoFetchHandled) so re-selecting a date re-fires.
  const [autoFetchDate, setAutoFetchDate] = useState<string | null>(null);

  const derived = useMemo(() => (puzzle ? derive(puzzle) : null), [puzzle]);

  // For each first letter, the word lengths that still have at least one unfound
  // answer. Used by the hint list to show, per prefix group, which lengths the
  // remaining slots could be. Coarse by design (the matrix is letter × length,
  // not prefix × length) — see CONTEXT.md → Matrix.
  const availableLengthsByLetter = useMemo(() => {
    if (!(puzzle && derived)) {
      return {} as Record<string, number[]>;
    }
    const out: Record<string, number[]> = {};
    for (const letter of puzzle.startLetters) {
      const lengths: number[] = [];
      for (const len of puzzle.lengths) {
        const total = puzzle.grid[letter]?.[len] ?? 0;
        const found = derived.found[letter]?.[len] ?? 0;
        if (total - found > 0) {
          lengths.push(len);
        }
      }
      out[letter] = lengths;
    }
    return out;
  }, [puzzle, derived]);

  // Unified date selection for both pickers: a date that already has a saved
  // puzzle switches straight to it; a date without one drops into the loader and
  // flags it for an automatic scrape.
  const handleDateChange = useCallback(
    (next: string) => {
      setForceLoader(false);
      setDate(next);
      setAutoFetchDate(dates.includes(next) ? null : next);
    },
    [dates, setDate]
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

  // The header date control: a sample badge, an error/retry when the date index
  // failed to load, or the picker (disabled until the index is ready).
  const renderHeaderDateControl = () => {
    if (isSample) {
      return (
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-medium text-primary-foreground/80 text-xs">
          Sample data
        </span>
      );
    }
    if (datesError) {
      return (
        <Button onClick={() => reloadDates()} size="sm" variant="outline">
          Couldn&apos;t load dates — retry
        </Button>
      );
    }
    return (
      <DatePicker
        disabled={!datesReady}
        disabledDates={disabledDates}
        enabledDateIndicator
        maxDate={parseLocalDate(latestPuzzleDateISO())}
        minDate={parseLocalDate(FIRST_PUZZLE_ISO)}
        onDateChange={(d) => handleDateChange(toLocalISO(d))}
        value={parseLocalDate(date)}
      />
    );
  };

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
            <div className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
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
            autoFetchDate={autoFetchDate}
            date={date}
            dates={dates}
            datesError={datesError}
            datesReady={datesReady}
            onAutoFetchHandled={() => setAutoFetchDate(null)}
            onLoad={handleLoad}
            onRetryDates={() => reloadDates()}
            onSelectExisting={handleDateChange}
            saving={saving}
          />
        </div>
      );
    }

    if (puzzle && derived) {
      return (
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-6">
            <ProgressSummary derived={derived} />
            <MatrixGrid derived={derived} puzzle={puzzle} />
          </div>
          <div className="space-y-4">
            <HintsList
              allowedLetters={allowedLetters(puzzle)}
              availableLengthsByLetter={availableLengthsByLetter}
              centerLetter={puzzle.centerLetter}
              hints={puzzle.hints}
              onClearWords={clearWords}
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
    <main className="mx-auto min-h-svh w-full max-w-208 px-4 py-8 sm:px-6 sm:py-12">
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
          {renderHeaderDateControl()}
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
