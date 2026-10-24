"use client";

import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toLocalISO } from "@/lib/keys";

interface DatePickerProps {
  completedDates?: string[];
  disabled?: boolean;
  disabledDates?: Date[];
  enabledDateIndicator?: boolean;
  maxDate?: Date;
  minDate?: Date;
  onDateChange: (date: Date) => void;
  value: Date;
}

function PuzzleDayButton({
  children,
  modifiers,
  ...props
}: ComponentProps<typeof CalendarDayButton>) {
  const status = modifiers.complete ? "Complete" : "Incomplete";
  const hasPuzzle = modifiers.hasData;

  return (
    <CalendarDayButton
      {...props}
      aria-label={
        hasPuzzle ? `${props["aria-label"]}, ${status}` : props["aria-label"]
      }
      className={hasPuzzle ? "pb-2" : undefined}
      modifiers={modifiers}
      title={hasPuzzle ? status : undefined}
    >
      {children}
      {hasPuzzle ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] leading-none ${modifiers.complete ? "font-bold text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}
        >
          {modifiers.complete ? "✓" : "○"}
        </span>
      ) : null}
    </CalendarDayButton>
  );
}

export function DatePicker({
  value,
  onDateChange,
  disabled = false,
  disabledDates = [],
  enabledDateIndicator = false,
  completedDates = [],
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Compare as YYYY-MM-DD strings so out-of-range days are disabled without
  // tripping over time-of-day or timezone differences.
  const minISO = minDate ? toLocalISO(minDate) : null;
  const maxISO = maxDate ? toLocalISO(maxDate) : null;

  // Create a set of date strings for O(1) lookup
  const enabledDateSet = useMemo(() => {
    if (!(enabledDateIndicator && disabledDates)) {
      return new Set<string>();
    }
    return new Set(disabledDates.map(toLocalISO));
  }, [disabledDates, enabledDateIndicator]);
  const completedDateSet = useMemo(
    () => new Set(completedDates),
    [completedDates]
  );

  const isDateDisabled = useCallback(
    (date: Date) => {
      const iso = toLocalISO(date);
      if (minISO && iso < minISO) {
        return true;
      }
      if (maxISO && iso > maxISO) {
        return true;
      }
      return false;
    },
    [maxISO, minISO]
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        onDateChange(date);
        setOpen(false);
      }
    },
    [onDateChange]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className="w-auto justify-start text-left font-normal"
            disabled={disabled}
            variant="outline"
          >
            {value.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          className="[--cell-size:--spacing(9)]"
          components={{ DayButton: PuzzleDayButton }}
          defaultMonth={value}
          disabled={isDateDisabled}
          mode="single"
          modifiers={
            enabledDateIndicator
              ? {
                  complete: (date) => completedDateSet.has(toLocalISO(date)),
                  hasData: (date) => enabledDateSet.has(toLocalISO(date)),
                }
              : {}
          }
          modifiersClassNames={
            enabledDateIndicator
              ? {
                  hasData: "bg-primary/20 font-semibold text-foreground",
                }
              : {}
          }
          onSelect={handleDateSelect}
          selected={value}
        />
        {enabledDateIndicator ? (
          <div className="flex justify-center gap-4 border-t px-3 py-2 text-muted-foreground text-xs">
            <span>
              <span
                aria-hidden="true"
                className="font-bold text-emerald-700 dark:text-emerald-400"
              >
                ✓
              </span>{" "}
              Complete
            </span>
            <span>
              <span aria-hidden="true">○</span> Incomplete
            </span>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
