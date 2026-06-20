"use client";

import { useState } from "react";
import { fetchPuzzleFromUrlAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_ID } from "@/lib/keys";
import { parseHints, parseMatrix } from "@/lib/parse";
import { SAMPLE_HINTS, SAMPLE_MATRIX } from "@/lib/sample";
import type { HintSlot, MatrixData } from "@/lib/types";

const MATRIX_PLACEHOLDER = `\t4\t5\t6\t7\nD\t2\t3\t1\t1\nO\t1\t2\t\t\nN\t\t1\t1\t`;
const HINTS_PLACEHOLDER = "DON x1  DOO x1  DRO x4  NOD x2";

type Mode = "date" | "sample";

type Props = {
	date: string;
	onDateChange: (date: string) => void;
	onLoad: (matrix: MatrixData, hints: HintSlot[], id: string) => void;
	saving?: boolean;
};

export function SetupPanel({ date, onDateChange, onLoad, saving }: Props) {
	const [mode, setMode] = useState<Mode>("date");
	const [matrixText, setMatrixText] = useState("");
	const [hintsText, setHintsText] = useState("");
	const [error, setError] = useState<string | null>(null);

	// URL-fetch state.
	const [url, setUrl] = useState("");
	const [fetching, setFetching] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	// Date scraped from the page. We hold it locally (rather than calling
	// onDateChange) so the fetched textareas aren't lost to a remount when the
	// SWR key changes; it becomes the save target at Load time.
	const [fetchedDate, setFetchedDate] = useState<string | null>(null);
	const [failedPrefixes, setFailedPrefixes] = useState<string[]>([]);

	async function handleFetch() {
		setFetchError(null);
		setError(null);
		setFetching(true);
		try {
			const result = await fetchPuzzleFromUrlAction(url);
			if (!result.ok) {
				setFetchError(result.error);
				return;
			}
			setMatrixText(result.matrixText);
			setHintsText(result.hintsText);
			setFetchedDate(result.date);
			setFailedPrefixes(result.failedPrefixes);
		} catch {
			setFetchError("Couldn't reach the puzzle. Check the URL and try again.");
		} finally {
			setFetching(false);
		}
	}

	// The user manually picking a date overrides any scraped date.
	function handleManualDate(next: string) {
		setFetchedDate(null);
		onDateChange(next);
	}

	function handleLoad() {
		setError(null);
		if (mode === "sample") {
			try {
				const { letters, lengths, grid } = parseMatrix(SAMPLE_MATRIX);
				const hints = parseHints(SAMPLE_HINTS);
				onLoad({ letters, lengths, grid }, hints, SAMPLE_ID);
			} catch (e) {
				setError(
					e instanceof Error ? e.message : "Could not parse the sample.",
				);
			}
			return;
		}
		try {
			const { letters, lengths, grid } = parseMatrix(matrixText);
			const hints = parseHints(hintsText);
			onLoad({ letters, lengths, grid }, hints, fetchedDate ?? date);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not parse the puzzle.");
		}
	}

	const canSubmit =
		mode === "sample" ||
		(matrixText.trim().length > 0 && hintsText.trim().length > 0);

	return (
		<div className="mx-auto w-full max-w-2xl">
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<div className="mb-6 space-y-1.5">
					<h2 className="text-lg font-semibold text-card-foreground">
						Load a puzzle
					</h2>
					<p className="max-w-md text-sm text-muted-foreground leading-relaxed">
						Paste from sbsolver to track a real puzzle, or load sample data for
						development.
					</p>
				</div>

				{/* Mode toggle */}
				<div className="mb-6 flex gap-2 rounded-lg border border-border bg-muted/40 p-1">
					<button
						type="button"
						onClick={() => {
							setMode("date");
							setError(null);
						}}
						className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							mode === "date"
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Real puzzle
					</button>
					<button
						type="button"
						onClick={() => {
							setMode("sample");
							setError(null);
						}}
						className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							mode === "sample"
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Sample data
					</button>
				</div>

				<div className="space-y-5">
					{mode === "date" ? (
						<>
							<div className="space-y-2">
								<Label htmlFor="puzzle-url">Fetch from sbsolver URL</Label>
								<div className="flex gap-2">
									<Input
										id="puzzle-url"
										type="url"
										inputMode="url"
										value={url}
										onChange={(e) => {
											setUrl(e.target.value);
											if (fetchError) setFetchError(null);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter" && url.trim() && !fetching) {
												e.preventDefault();
												handleFetch();
											}
										}}
										placeholder="https://www.sbsolver.com/nt/…"
										className="font-mono text-sm"
									/>
									<Button
										type="button"
										variant="outline"
										onClick={handleFetch}
										disabled={fetching || url.trim().length === 0}
									>
										{fetching ? "Fetching…" : "Fetch"}
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Paste a puzzle URL to fill the grid and hints below
									automatically. You can still edit them before loading.
								</p>
								{fetchError ? (
									<p
										role="alert"
										className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
									>
										{fetchError}
									</p>
								) : null}
								{fetchedDate ? (
									<p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-foreground">
										Fetched the puzzle for{" "}
										<span className="font-semibold">{fetchedDate}</span>
										{fetchedDate !== date
											? " — it will be saved under that date."
											: "."}
									</p>
								) : null}
								{failedPrefixes.length > 0 ? (
									<p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-foreground">
										Couldn&apos;t fetch the 3-letter hints for{" "}
										<span className="font-mono font-semibold">
											{failedPrefixes.join(", ")}
										</span>
										. Add those by hand in the hint list below.
									</p>
								) : null}
							</div>

							<div className="space-y-2">
								<Label>Puzzle date</Label>
								<DatePicker
									value={(() => {
										const s = fetchedDate ?? date;
										const [y, m, d] = s.split("-").map(Number);
										return new Date(y, m - 1, d);
									})()}
									onDateChange={(d) => {
										const y = d.getFullYear();
										const m = String(d.getMonth() + 1).padStart(2, "0");
										const day = String(d.getDate()).padStart(2, "0");
										handleManualDate(`${y}-${m}-${day}`);
									}}
								/>

								<p className="text-xs text-muted-foreground">
									Defaults to today. Change it to load a past day&apos;s puzzle.
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="matrix">Grid matrix (tab-separated)</Label>
								<Textarea
									id="matrix"
									value={matrixText}
									onChange={(e) => setMatrixText(e.target.value)}
									placeholder={MATRIX_PLACEHOLDER}
									rows={6}
									className="font-mono text-sm"
								/>
								<p className="text-xs text-muted-foreground">
									Letters down the left, word lengths across the top. Totals
									rows/columns are ignored.
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="hints">Hint list</Label>
								<Textarea
									id="hints"
									value={hintsText}
									onChange={(e) => setHintsText(e.target.value)}
									placeholder={HINTS_PLACEHOLDER}
									rows={4}
									className="font-mono text-sm"
								/>
								<p className="text-xs text-muted-foreground">
									{'Format: "PREFIX xN", e.g. DRO x4.'}
								</p>
							</div>
						</>
					) : (
						<div className="rounded-lg border border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground leading-relaxed space-y-1">
							<p className="font-medium text-foreground">
								Sample puzzle loaded
							</p>
							<p>
								A realistic dummy dataset will be saved under{" "}
								<code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
									sbs:sample:*
								</code>{" "}
								— separate from any real puzzle data. Use it to test the
								interface without touching your dated puzzles.
							</p>
						</div>
					)}

					{error ? (
						<p
							role="alert"
							className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
						>
							{error}
						</p>
					) : null}

					<Button
						onClick={handleLoad}
						className="w-full"
						disabled={!canSubmit || saving}
					>
						{saving
							? "Saving…"
							: mode === "sample"
								? "Load sample data"
								: "Load puzzle"}
					</Button>
				</div>
			</div>
		</div>
	);
}
