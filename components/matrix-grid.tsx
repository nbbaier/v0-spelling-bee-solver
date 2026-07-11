"use client";

import type { Derived } from "@/lib/derive";
import { normalizeLetterSet } from "@/lib/letters";
import type { Puzzle } from "@/lib/types";
import { cn } from "@/lib/utils";

function Cell({
  found,
  total,
  emphasis = false,
}: {
  found: number;
  total: number;
  emphasis?: boolean;
}) {
  const empty = total === 0;
  const complete = total > 0 && found >= total;
  return (
    <td
      className={cn(
        "border border-border px-2 py-1.5 text-center text-sm tabular-nums",
        emphasis && "font-semibold",
        empty && "bg-muted/40 text-muted-foreground/40",
        !empty && complete && "bg-primary/25 font-semibold text-foreground",
        !(empty || complete) && found > 0 && "bg-primary/8 text-foreground"
      )}
    >
      {empty ? "—" : `${found}/${total}`}
    </td>
  );
}

// "· 3 pangrams" (singular "1 pangram") after the letter pills; nothing when
// the count is unknown (null).
function PangramNote({ pangramCount }: { pangramCount: number | null }) {
  if (pangramCount === null) {
    return null;
  }
  return (
    <span>
      · {pangramCount} {pangramCount === 1 ? "pangram" : "pangrams"}
    </span>
  );
}

function MatrixFooter({
  centerLetter,
  letterSet,
  pangramCount,
}: {
  centerLetter: string | null;
  letterSet: string[];
  pangramCount: number | null;
}) {
  if (letterSet.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 text-muted-foreground text-xs">
        <span>Letters:</span>
        <span className="flex flex-wrap items-center gap-1">
          {letterSet.map((letter) => {
            const isCenter = letter === centerLetter;
            return (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 font-medium font-mono text-xs transition-colors",
                  isCenter
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
                key={letter}
                title={isCenter ? "Center letter" : undefined}
              >
                {letter}
                {isCenter ? (
                  <span className="sr-only"> center letter</span>
                ) : null}
              </span>
            );
          })}
        </span>
        <PangramNote pangramCount={pangramCount} />
      </div>
    );
  }

  if (!centerLetter) {
    return null;
  }

  return (
    <p className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground text-xs">
      <span
        aria-hidden="true"
        className="inline-block size-1.5 rounded-full bg-primary"
      />
      Center letter:
      <span className="font-mono font-semibold text-foreground">
        {centerLetter}
      </span>
    </p>
  );
}

export function MatrixGrid({
  puzzle,
  derived,
}: {
  puzzle: Puzzle;
  derived: Derived;
}) {
  const { startLetters, lengths } = puzzle;
  const centerLetter = puzzle.centerLetter ?? null;
  const {
    found,
    lengthTotals,
    lengthFound,
    letterTotals,
    letterFound,
    foundWords,
    totalWords,
  } = derived;
  const letterSet = normalizeLetterSet(puzzle.letterSet).split("");

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border border-border bg-card px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Letter
            </th>
            {lengths.map((len) => (
              <th
                className="border border-border bg-card px-2 py-2 text-center font-semibold text-card-foreground text-sm"
                key={len}
              >
                {len}
              </th>
            ))}
            <th className="border border-border bg-secondary px-2 py-2 text-center font-medium text-secondary-foreground text-xs uppercase tracking-wide">
              Σ
            </th>
          </tr>
        </thead>
        <tbody>
          {startLetters.map((letter) => {
            const isCenter = letter === centerLetter;
            return (
              <tr key={letter}>
                <th
                  aria-label={isCenter ? `Center letter ${letter}` : letter}
                  className={cn(
                    "sticky left-0 z-10 border border-border px-3 py-1.5 text-left font-bold text-card-foreground text-sm",
                    isCenter && "bg-primary/15"
                  )}
                  scope="row"
                  title={isCenter ? "Center letter" : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {letter}{" "}
                    {isCenter && (
                      <span
                        aria-hidden="true"
                        className="inline-block size-1.5 rounded-full bg-primary"
                      />
                    )}
                  </span>
                </th>
                {lengths.map((len) => (
                  <Cell
                    found={found[letter]?.[len] ?? 0}
                    key={len}
                    total={puzzle.grid[letter]?.[len] ?? 0}
                  />
                ))}
                <Cell
                  emphasis
                  found={letterFound[letter] ?? 0}
                  total={letterTotals[letter] ?? 0}
                />
              </tr>
            );
          })}
          <tr>
            <th
              className="sticky left-0 z-10 border border-border bg-secondary px-3 py-1.5 text-left font-medium text-secondary-foreground text-xs uppercase tracking-wide"
              scope="row"
            >
              Σ
            </th>
            {lengths.map((len) => (
              <Cell
                emphasis
                found={lengthFound[len] ?? 0}
                key={len}
                total={lengthTotals[len] ?? 0}
              />
            ))}
            <Cell emphasis found={foundWords} total={totalWords} />
          </tr>
        </tbody>
      </table>
      <MatrixFooter
        centerLetter={centerLetter}
        letterSet={letterSet}
        pangramCount={puzzle.pangramCount}
      />
    </div>
  );
}
