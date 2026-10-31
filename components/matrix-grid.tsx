"use client";

import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import { type PointerEvent, useCallback, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type CellPosition,
  type Highlight,
  highlightFor,
  TOTAL,
} from "@/lib/crosshair";
import type { Derived } from "@/lib/derive";
import { normalizeLetterSet } from "@/lib/letters";
import type { Puzzle } from "@/lib/types";

// The crosshair is drawn with inset shadows so it sits over whatever
// background a cell already has (found shading, center tint, sticky fill).
// Gold edge lines along the band keep it distinct from found shading.
// Class names stay literal so Tailwind can find them.
const HIGHLIGHT_CLASS: Record<Highlight, string | false> = {
  column:
    "shadow-[inset_1px_0_0_var(--primary),inset_-1px_0_0_var(--primary),inset_0_0_0_100vmax_color-mix(in_oklch,var(--primary)_14%,transparent)]",
  focus:
    "shadow-[inset_0_0_0_2px_var(--primary),inset_0_0_0_100vmax_color-mix(in_oklch,var(--primary)_32%,transparent)]",
  none: false,
  row: "shadow-[inset_0_1px_0_var(--primary),inset_0_-1px_0_var(--primary),inset_0_0_0_100vmax_color-mix(in_oklch,var(--primary)_14%,transparent)]",
};

// Hover state for the crosshair. Touch pointers are ignored so a tap never
// leaves a highlight behind.
function useCrosshair() {
  const [hovered, setHovered] = useState<CellPosition | null>(null);
  return {
    cellProps: (position: CellPosition) => ({
      className: HIGHLIGHT_CLASS[highlightFor(hovered, position)],
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType !== "touch") {
          setHovered(position);
        }
      },
    }),
    clear: () => setHovered(null),
  };
}

type CellProps = ReturnType<ReturnType<typeof useCrosshair>["cellProps"]>;

function Cell({
  found,
  total,
  emphasis = false,
  crosshair,
}: {
  found: number;
  total: number;
  emphasis?: boolean;
  crosshair: CellProps;
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
        !(empty || complete) && found > 0 && "bg-primary/8 text-foreground",
        crosshair.className
      )}
      onPointerEnter={crosshair.onPointerEnter}
    >
      {empty ? "—" : `${found}/${total}`}
    </td>
  );
}

function SumHeader({
  className,
  crosshair,
  scope,
}: {
  className: string;
  crosshair: CellProps;
  scope?: "row";
}) {
  return (
    <th
      className={cn(
        "border border-border bg-secondary font-medium text-secondary-foreground text-xs uppercase tracking-wide",
        className,
        crosshair.className
      )}
      onPointerEnter={crosshair.onPointerEnter}
      scope={scope}
    >
      Σ
    </th>
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
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-1.5">
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
    <p className="flex flex-1 items-center gap-1.5">
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
  const crosshair = useCrosshair();
  const [expanded, setExpanded] = useState(true);
  const tableId = useId();
  const toggleExpanded = useCallback(() => setExpanded((open) => !open), []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {/* Only the table scrolls; the footer stays put below it. */}
      <div className="overflow-x-auto" hidden={!expanded} id={tableId}>
        <table
          className="w-full border-collapse border-hidden"
          onPointerLeave={crosshair.clear}
        >
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border border-border bg-card px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Letter
              </th>
              {lengths.map((len) => {
                const header = crosshair.cellProps({ col: len, row: null });
                return (
                  <th
                    className={cn(
                      "border border-border bg-card px-2 py-2 text-center font-semibold text-card-foreground text-sm",
                      header.className
                    )}
                    key={len}
                    onPointerEnter={header.onPointerEnter}
                  >
                    {len}
                  </th>
                );
              })}
              <SumHeader
                className="px-2 py-2 text-center"
                crosshair={crosshair.cellProps({ col: TOTAL, row: null })}
              />
            </tr>
          </thead>
          <tbody>
            {startLetters.map((letter) => {
              const isCenter = letter === centerLetter;
              const header = crosshair.cellProps({ col: null, row: letter });
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
                        : "bg-card",
                      header.className
                    )}
                    onPointerEnter={header.onPointerEnter}
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
                      crosshair={crosshair.cellProps({ col: len, row: letter })}
                      found={found[letter]?.[len] ?? 0}
                      key={len}
                      total={puzzle.grid[letter]?.[len] ?? 0}
                    />
                  ))}
                  <Cell
                    crosshair={crosshair.cellProps({ col: TOTAL, row: letter })}
                    emphasis
                    found={letterFound[letter] ?? 0}
                    total={letterTotals[letter] ?? 0}
                  />
                </tr>
              );
            })}
            <tr>
              <SumHeader
                className="sticky left-0 z-10 px-3 py-1.5 text-left"
                crosshair={crosshair.cellProps({ col: null, row: TOTAL })}
                scope="row"
              />
              {lengths.map((len) => (
                <Cell
                  crosshair={crosshair.cellProps({ col: len, row: TOTAL })}
                  emphasis
                  found={lengthFound[len] ?? 0}
                  key={len}
                  total={lengthTotals[len] ?? 0}
                />
              ))}
              <Cell
                crosshair={crosshair.cellProps({ col: TOTAL, row: TOTAL })}
                emphasis
                found={foundWords}
                total={totalWords}
              />
            </tr>
          </tbody>
        </table>
      </div>
      {/* Collapsed, the card shrinks to this strip: the table hides and the
          footer stays. The open state resets on reload (remembering it is #8). */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-muted-foreground text-xs",
          expanded && "border-border border-t"
        )}
      >
        <MatrixFooter
          centerLetter={centerLetter}
          letterSet={letterSet}
          pangramCount={puzzle.pangramCount}
          pangramsFound={pangramsFound}
        />
        <Button
          aria-controls={tableId}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide matrix" : "Show matrix"}
          className="ml-auto shrink-0 text-muted-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground aria-expanded:hover:bg-muted aria-expanded:hover:text-foreground"
          onClick={toggleExpanded}
          size="icon-xs"
          title={expanded ? "Hide matrix" : "Show matrix"}
          variant="ghost"
        >
          <HugeiconsIcon
            className={cn("transition-transform", expanded && "rotate-180")}
            icon={ArrowDown01Icon}
            size={14}
          />
        </Button>
      </div>
    </div>
  );
}
