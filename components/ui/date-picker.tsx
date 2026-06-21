"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DatePickerProps {
  disabled?: boolean;
  disabledDates?: Date[];
  enabledDateIndicator?: boolean;
  maxDate?: Date;
  minDate?: Date;
  onDateChange: (date: Date) => void;
  value: Date;
}

export function DatePicker({
  value,
  onDateChange,
  disabled = false,
  disabledDates = [],
  enabledDateIndicator = false,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Compare as YYYY-MM-DD strings so out-of-range days are disabled without
  // tripping over time-of-day or timezone differences.
  const minISO = minDate ? localISO(minDate) : null;
  const maxISO = maxDate ? localISO(maxDate) : null;

  // Create a set of date strings for O(1) lookup
  const enabledDateSet = useMemo(() => {
    if (!(enabledDateIndicator && disabledDates)) {
      return new Set<string>();
    }
    return new Set(disabledDates.map(localISO));
  }, [disabledDates, enabledDateIndicator]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "w-auto justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
            variant="outline"
          >
            {value?.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          disabled={(date) => {
            const iso = localISO(date);
            if (minISO && iso < minISO) {
              return true;
            }
            if (maxISO && iso > maxISO) {
              return true;
            }
            return false;
          }}
          mode="single"
          modifiers={
            enabledDateIndicator
              ? {
                  hasData: (date) => enabledDateSet.has(localISO(date)),
                }
              : {}
          }
          modifiersClassNames={
            enabledDateIndicator
              ? {
                  hasData:
                    "bg-primary/20 font-semibold text-primary relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                }
              : {}
          }
          onSelect={(date) => {
            if (date) {
              onDateChange(date);
              setOpen(false);
            }
          }}
          selected={value}
        />
      </PopoverContent>
    </Popover>
  );
}
