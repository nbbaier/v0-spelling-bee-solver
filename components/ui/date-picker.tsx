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
  disabledDates?: Date[];
  enabledDateIndicator?: boolean;
  onDateChange: (date: Date) => void;
  value: Date;
}

export function DatePicker({
  value,
  onDateChange,
  disabledDates = [],
  enabledDateIndicator = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

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
          disabled={(_date) => {
            // Don't disable any dates - just show indicators
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
