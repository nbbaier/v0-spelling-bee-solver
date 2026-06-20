"use client";

import * as React from "react";
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
	value: Date;
	onDateChange: (date: Date) => void;
	disabledDates?: Date[];
	enabledDateIndicator?: boolean;
}

export function DatePicker({
	value,
	onDateChange,
	disabledDates = [],
	enabledDateIndicator = false,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	// Create a set of date strings for O(1) lookup
	const enabledDateSet = React.useMemo(() => {
		if (!enabledDateIndicator || !disabledDates) return new Set<string>();
		return new Set(disabledDates.map(localISO));
	}, [disabledDates, enabledDateIndicator]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						className={cn(
							"w-auto justify-start text-left font-normal",
							!value && "text-muted-foreground",
						)}
					>
						{value?.toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						})}
					</Button>
				}
			/>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={(date) => {
						if (date) {
							onDateChange(date);
							setOpen(false);
						}
					}}
					disabled={(_date) => {
						// Don't disable any dates - just show indicators
						return false;
					}}
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
				/>
			</PopoverContent>
		</Popover>
	);
}
