"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type FetchPuzzleResult,
  fetchPuzzleByDateAction,
  fetchPuzzleFromUrlAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseLocalDate, SAMPLE_ID } from "@/lib/keys";
import { isCompleteLetterSet, normalizeLetterSet } from "@/lib/letters";
import { parseHints, parseMatrix } from "@/lib/parse";
import { FIRST_PUZZLE_ISO, latestPuzzleDateISO } from "@/lib/puzzle-date";
import {
  SAMPLE_CENTER_LETTER,
  SAMPLE_HINTS,
  SAMPLE_LETTER_SET,
  SAMPLE_MATRIX,
} from "@/lib/sample";
import type { HintSlot, MatrixData } from "@/lib/types";
import { cn } from "@/lib/utils";

const MATRIX_PLACEHOLDER =
  "\t4\t5\t6\t7\nD\t2\t3\t1\t1\nO\t1\t2\t\t\nN\t\t1\t1\t";
const HINTS_PLACEHOLDER = "DON x1  DOO x1  DRO x4  NOD x2";

type Mode = "date" | "sample";

interface Props {
  // A date the parent wants scraped automatically (the user picked a date with
  // no saved puzzle). Consumed once via onAutoFetchHandled.
  autoFetchDate: string | null;
  date: string;
  // Dates that already have a saved puzzle — shown as indicators in the picker
  // and used to load existing puzzles directly instead of re-scraping.
  dates: string[];
  // The date index failed to load; the picker stays disabled but offers a retry.
  datesError: boolean;
  // Whether the date index has loaded; routing can't be decided until it has.
  datesReady: boolean;
  onAutoFetchHandled: () => void;
  onLoad: (matrix: MatrixData, hints: HintSlot[], id: string) => void;
  onRetryDates: () => void;
  // Switch the app to an already-saved puzzle for this date (no scrape).
  onSelectExisting: (date: string) => void;
  saving?: boolean;
}

function loadButtonLabel(saving: boolean, mode: Mode): string {
  if (saving) {
    return "Saving…";
  }
  return mode === "sample" ? "Load sample data" : "Load puzzle";
}

function CenterLetterPicker({
  letters,
  value,
  onChange,
}: {
  letters: string[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Center letter</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          aria-pressed={value === null}
          className={cn(
            "rounded-full px-2.5 py-0.5 font-medium text-xs transition-colors",
            value === null
              ? "bg-muted text-muted-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          )}
          onClick={() => onChange(null)}
          type="button"
        >
          Unknown
        </button>
        {letters.map((l) => {
          const selected = value === l;
          return (
            <button
              aria-pressed={selected}
              className={cn(
                "rounded-full px-2.5 py-0.5 font-medium font-mono text-xs transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/60"
              )}
              key={l}
              onClick={() => onChange(selected ? null : l)}
              type="button"
            >
              {l}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        The required letter for every answer. Fetched from sbsolver
        automatically; pick it manually if you pasted the grid by hand.
      </p>
    </div>
  );
}

// The puzzle's full 7-letter set. sbsolver supplies all seven; a hand-pasted
// grid only reveals the letters that begin an answer, so the user must confirm
// the rest (letters used only mid-word are otherwise lost — the #19 regression).
function LetterSetInput({
  value,
  onChange,
  complete,
}: {
  value: string;
  onChange: (next: string) => void;
  complete: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="letter-set">Letter set</Label>
      <Input
        autoCapitalize="characters"
        className="font-mono text-base uppercase md:text-sm"
        id="letter-set"
        onChange={(e) => onChange(e.target.value)}
        placeholder="RDGINOW"
        value={value}
      />
      {complete ? (
        <p className="text-muted-foreground text-xs">
          All seven puzzle letters. Fetched from sbsolver automatically.
        </p>
      ) : (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-foreground text-xs">
          Confirm all 7 puzzle letters. A pasted grid only lists letters that
          begin an answer, so add any that appear only in the middle of a word.
        </p>
      )}
    </div>
  );
}

// Inline status under the date picker: a fetch error, a "saved under another
// date" note, or a partial-3-letter-hints warning.
function FetchStatusMessages({
  fetchError,
  fetchedDate,
  date,
  failedPrefixes,
}: {
  fetchError: string | null;
  fetchedDate: string | null;
  date: string;
  failedPrefixes: string[];
}) {
  return (
    <>
      {fetchError ? (
        <p
          className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
          role="alert"
        >
          {fetchError}
        </p>
      ) : null}
      {fetchedDate && fetchedDate !== date ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-foreground text-xs">
          Fetched the puzzle for{" "}
          <span className="font-semibold">{fetchedDate}</span> — it will be
          saved under that date.
        </p>
      ) : null}
      {failedPrefixes.length > 0 ? (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-foreground text-xs">
          Couldn&apos;t fetch the 3-letter hints for{" "}
          <span className="font-mono font-semibold">
            {failedPrefixes.join(", ")}
          </span>
          . Add those by hand in the hint list below.
        </p>
      ) : null}
    </>
  );
}

export function SetupPanel({
  date,
  dates,
  datesReady,
  datesError,
  onRetryDates,
  autoFetchDate,
  onAutoFetchHandled,
  onSelectExisting,
  onLoad,
  saving,
}: Props) {
  const [mode, setMode] = useState<Mode>("date");
  const [matrixText, setMatrixText] = useState("");
  const [hintsText, setHintsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [centerLetter, setCenterLetter] = useState<string | null>(null);
  // The puzzle's 7-letter set. Filled from a scrape, or seeded from the pasted
  // grid's start letters for the user to complete (see the effect below).
  const [letterSet, setLetterSet] = useState("");

  // URL-fetch state.
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // The resolved save target (picked date, or the URL page's own date). Held
  // locally rather than pushed to the parent SWR key, so a fetch never remounts
  // this panel and discards the fields; it's committed to the parent at Load.
  const [fetchedDate, setFetchedDate] = useState<string | null>(null);
  const [failedPrefixes, setFailedPrefixes] = useState<string[]>([]);

  // Live-parse the matrix so the center-letter pills reflect the letters the
  // user has actually entered. A failed parse (e.g. mid-typing) just yields an
  // empty list — the load-time parse will surface the real error.
  const parsedLetters = useMemo(() => {
    if (matrixText.trim().length === 0) {
      return [];
    }
    try {
      return parseMatrix(matrixText).startLetters;
    } catch {
      return [];
    }
  }, [matrixText]);

  // Canonical form of the entered set, and whether it's authoritative: all seven
  // letters AND every grid start letter (so allowedLetters' union stays a no-op;
  // see lib/letters.ts → isCompleteLetterSet).
  const normalizedLetterSet = useMemo(
    () => normalizeLetterSet(letterSet),
    [letterSet]
  );
  const letterSetComplete = isCompleteLetterSet(letterSet, parsedLetters);
  // The center letter must be one of the puzzle's letters, so offer the full
  // set when known; fall back to the grid's start letters until it is.
  const centerLetterOptions = useMemo(
    () =>
      normalizedLetterSet.length > 0
        ? normalizedLetterSet.split("")
        : parsedLetters,
    [normalizedLetterSet, parsedLetters]
  );

  // Seed the letter-set field from a hand-pasted grid's start letters so the
  // user has a starting point to confirm/complete. Only seeds when empty, so a
  // scraped set (already all seven) and the user's own edits are never clobbered.
  useEffect(() => {
    if (letterSet.length === 0 && parsedLetters.length > 0) {
      setLetterSet(parsedLetters.join(""));
    }
  }, [parsedLetters, letterSet]);

  // Dates with a saved puzzle, as Date objects for the picker's indicators.
  const datesWithData = useMemo(() => dates.map(parseLocalDate), [dates]);

  // Monotonic token so a slow earlier request can't overwrite the fields after a
  // newer one has already landed (e.g. the user picks several dates quickly).
  const requestToken = useRef(0);

  // Fill the editable fields from a successful scrape (shared by the date and
  // URL paths). `targetDate` becomes the save target: the picked date for the
  // date path, or the page's own date (which may be null) for the URL path.
  const applyResult = useCallback(
    (
      result: Extract<
        Awaited<ReturnType<typeof fetchPuzzleByDateAction>>,
        { ok: true }
      >,
      targetDate: string | null
    ) => {
      setMatrixText(result.matrixText);
      setHintsText(result.hintsText);
      setFetchedDate(targetDate);
      setFailedPrefixes(result.failedPrefixes);
      setCenterLetter(result.centerLetter);
      setLetterSet(result.letterSet);
    },
    []
  );

  // Runs a scrape and applies it only if no newer request has started. Keeps the
  // resolved date local (via applyResult → fetchedDate) rather than touching the
  // parent SWR key, so this panel isn't remounted mid-fetch.
  const runFetch = useCallback(
    async (
      fetcher: () => Promise<FetchPuzzleResult>,
      targetDate: (result: FetchPuzzleResult & { ok: true }) => string | null,
      reachError: string
    ) => {
      const token = ++requestToken.current;
      setFetchError(null);
      setError(null);
      setFetching(true);
      try {
        const result = await fetcher();
        if (token !== requestToken.current) {
          return; // a newer request superseded this one
        }
        if (result.ok) {
          applyResult(result, targetDate(result));
        } else {
          setFetchError(result.error);
        }
      } catch {
        if (token === requestToken.current) {
          setFetchError(reachError);
        }
      } finally {
        if (token === requestToken.current) {
          setFetching(false);
        }
      }
    },
    [applyResult]
  );

  // Picking a date is the primary way to load a puzzle. If that date already has
  // a saved puzzle, switch to it directly; otherwise resolve it to the sbsolver
  // puzzle number server-side and scrape it, with the picked date as the save
  // target.
  const handleDateSelect = useCallback(
    (next: string) => {
      if (dates.includes(next)) {
        onSelectExisting(next);
        return;
      }
      runFetch(
        () => fetchPuzzleByDateAction(next),
        () => next,
        "Couldn't reach sbsolver. Try again."
      );
    },
    [dates, onSelectExisting, runFetch]
  );

  function handleFetch() {
    runFetch(
      () => fetchPuzzleFromUrlAction(url),
      (result) => result.date,
      "Couldn't reach the puzzle. Check the URL and try again."
    );
  }

  // When the parent drops us into the loader for a date with no saved puzzle,
  // scrape it automatically. A handled-date ref makes consumption idempotent so
  // Strict Mode's double-invoked effect can't start two scrapes for one
  // selection; clearing the signal lets a later re-selection re-fire.
  const handledAutoFetch = useRef<string | null>(null);
  useEffect(() => {
    if (!autoFetchDate) {
      handledAutoFetch.current = null;
      return;
    }
    if (handledAutoFetch.current === autoFetchDate) {
      return;
    }
    handledAutoFetch.current = autoFetchDate;
    handleDateSelect(autoFetchDate);
    onAutoFetchHandled();
  }, [autoFetchDate, handleDateSelect, onAutoFetchHandled]);

  function handleLoad() {
    setError(null);
    if (mode === "sample") {
      try {
        const { startLetters, lengths, grid } = parseMatrix(SAMPLE_MATRIX);
        const hints = parseHints(SAMPLE_HINTS);
        onLoad(
          {
            centerLetter: SAMPLE_CENTER_LETTER,
            letterSet: SAMPLE_LETTER_SET,
            startLetters,
            lengths,
            grid,
          },
          hints,
          SAMPLE_ID
        );
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not parse the sample."
        );
      }
      return;
    }
    try {
      const { startLetters, lengths, grid } = parseMatrix(matrixText);
      const hints = parseHints(hintsText);
      onLoad(
        {
          centerLetter,
          // Persist the set only when it holds all seven letters. An incomplete
          // hand-confirmed set is stored as "" (unknown) so nothing downstream
          // trusts it as authoritative; validation then falls back to the grid's
          // start letters. See lib/letters.ts → allowedLetters.
          letterSet: letterSetComplete ? normalizedLetterSet : "",
          startLetters,
          lengths,
          grid,
        },
        hints,
        fetchedDate ?? date
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse the puzzle.");
    }
  }

  const canSubmit =
    mode === "sample" ||
    (matrixText.trim().length > 0 && hintsText.trim().length > 0);

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 space-y-1.5">
          <h2 className="font-semibold text-card-foreground text-lg">
            Load a puzzle
          </h2>
          <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
            Pick a date to load that day&apos;s puzzle from sbsolver, or load
            sample data for development.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex gap-2 rounded-lg border border-border bg-muted/40 p-1">
          <button
            className={`flex-1 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
              mode === "date"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setMode("date");
              setError(null);
            }}
            type="button"
          >
            Real puzzle
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
              mode === "sample"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setMode("sample");
              setError(null);
            }}
            type="button"
          >
            Sample data
          </button>
        </div>

        <div className="space-y-5">
          {mode === "date" ? (
            <>
              <div className="space-y-2">
                <Label>Puzzle date</Label>
                <div className="flex items-center gap-3">
                  <DatePicker
                    disabled={!datesReady}
                    disabledDates={datesWithData}
                    enabledDateIndicator
                    maxDate={parseLocalDate(latestPuzzleDateISO())}
                    minDate={parseLocalDate(FIRST_PUZZLE_ISO)}
                    onDateChange={(d) => {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      handleDateSelect(`${y}-${m}-${day}`);
                    }}
                    value={parseLocalDate(fetchedDate ?? date)}
                  />
                  {fetching ? (
                    <span className="text-muted-foreground text-xs">
                      Fetching…
                    </span>
                  ) : null}
                  {datesError ? (
                    <Button
                      onClick={onRetryDates}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Couldn&apos;t load saved dates — retry
                    </Button>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  Defaults to today. Pick any date back to May 9, 2018 to load
                  that day&apos;s puzzle automatically. Highlighted dates are
                  already saved and open instantly.
                </p>
                <FetchStatusMessages
                  date={date}
                  failedPrefixes={failedPrefixes}
                  fetchError={fetchError}
                  fetchedDate={fetchedDate}
                />
              </div>

              <details className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <summary className="cursor-pointer font-medium text-muted-foreground text-sm">
                  Paste a sbsolver URL instead
                </summary>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="puzzle-url">sbsolver URL</Label>
                  <div className="flex gap-2">
                    <Input
                      className="font-mono text-base md:text-sm"
                      id="puzzle-url"
                      inputMode="url"
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (fetchError) {
                          setFetchError(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && url.trim() && !fetching) {
                          e.preventDefault();
                          handleFetch();
                        }
                      }}
                      placeholder="https://www.sbsolver.com/nt/…"
                      type="url"
                      value={url}
                    />
                    <Button
                      disabled={fetching || url.trim().length === 0}
                      onClick={handleFetch}
                      type="button"
                      variant="outline"
                    >
                      {fetching ? "Fetching…" : "Fetch"}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Useful for a specific link. The grid and hints fill in
                    below; you can still edit them before loading.
                  </p>
                </div>
              </details>

              <div className="space-y-2">
                <Label htmlFor="matrix">Grid matrix (tab-separated)</Label>
                <Textarea
                  className="font-mono text-base md:text-sm"
                  id="matrix"
                  onChange={(e) => setMatrixText(e.target.value)}
                  placeholder={MATRIX_PLACEHOLDER}
                  rows={6}
                  value={matrixText}
                />
                <p className="text-muted-foreground text-xs">
                  Letters down the left, word lengths across the top. Totals
                  rows/columns are ignored.
                </p>
              </div>

              <LetterSetInput
                complete={letterSetComplete}
                onChange={setLetterSet}
                value={letterSet}
              />

              <CenterLetterPicker
                letters={centerLetterOptions}
                onChange={setCenterLetter}
                value={centerLetter}
              />

              <div className="space-y-2">
                <Label htmlFor="hints">Hint list</Label>
                <Textarea
                  className="font-mono text-base md:text-sm"
                  id="hints"
                  onChange={(e) => setHintsText(e.target.value)}
                  placeholder={HINTS_PLACEHOLDER}
                  rows={4}
                  value={hintsText}
                />
                <p className="text-muted-foreground text-xs">
                  {'Format: "PREFIX xN", e.g. DRO x4.'}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-1 rounded-lg border border-border bg-muted/30 px-4 py-4 text-muted-foreground text-sm leading-relaxed">
              <p className="font-medium text-foreground">
                Sample puzzle loaded
              </p>
              <p>
                A realistic dummy dataset will be saved under{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  sbs:sample:*
                </code>{" "}
                — separate from any real puzzle data. Use it to test the
                interface without touching your dated puzzles.
              </p>
            </div>
          )}

          {error ? (
            <p
              className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button
            className="w-full"
            disabled={!canSubmit || saving || fetching}
            onClick={handleLoad}
          >
            {loadButtonLabel(Boolean(saving), mode)}
          </Button>
        </div>
      </div>
    </div>
  );
}
