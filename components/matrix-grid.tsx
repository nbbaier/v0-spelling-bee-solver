"use client";

import { cn } from "cn";
import type { Derived } from "@/lib/derive";
import { normalizeLetterSet } from "@/lib/letters";
import type { Puzzle } from "@/lib/types";

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

// Pangram progress after the letter pills: "1/2 pangrams" when the total is
// known (singular follows the total), else the found count alone ("1 pangram").
function PangramNote({
  pangramCount,
  pangramsFound,
}: {
  pangramCount: number | null;
  pangramsFound: number;
}) {
  const noun = (pangramCount ?? pangramsFound) === 1 ? "pangram" : "pangrams";
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium font-mono text-muted-foreground text-xs tabular-nums transition-colors">
      {pangramCount === null
        ? `${pangramsFound} ${noun}`
        : `${pangramsFound}/${pangramCount} ${noun}`}
    </span>
  );
}

function MatrixFooter({
  centerLetter,
  letterSet,
  pangramCount,
  pangramsFound,
}: {
  centerLetter: string | null;
  letterSet: string[];
  pangramCount: number | null;
  pangramsFound: number;
}) {
  if (letterSet.length > 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-border border-t px-3 py-2 text-muted-foreground text-xs">
        {/* <span>Letters:</span> */}
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
        <PangramNote
          pangramCount={pangramCount}
          pangramsFound={pangramsFound}
        />
      </div>
    );
  }

  if (!centerLetter) {
    return null;
  }

  return (
    <p className="flex items-center gap-1.5 border-border border-t px-3 py-2 text-muted-foreground text-xs">
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
    pangramsFound,
    totalWords,
  } = derived;
  const letterSet = normalizeLetterSet(puzzle.letterSet).split("");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {/* Only the table scrolls; the footer stays put below it. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-hidden">
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
                      // Sticky cells need an opaque fill or scrolled cells show
                      // through; the center tint is mixed into the card colour.
                      isCenter
                        ? "bg-[color-mix(in_oklch,var(--primary)_15%,var(--card))]"
                        : "bg-card"
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
      </div>
      <MatrixFooter
        centerLetter={centerLetter}
        letterSet={letterSet}
        pangramCount={puzzle.pangramCount}
        pangramsFound={pangramsFound}
      />
    </div>
  );
}
