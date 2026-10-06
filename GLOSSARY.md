# Context

A glossary of the domain language for this project. Terms only — no implementation detail.

## Puzzle

A single day's New York Times Spelling Bee, identified in this app by its **date** (`YYYY-MM-DD`). Date is the storage key. sbsolver instead identifies a puzzle by a number (`/nt/2965`) or by its letter string (`/nt/Rdginow`); neither is a date, so a puzzle's date must be read from the page itself.

## Room

A persistent group of solvers who work through puzzles together over time. Identified by a **generated memorable name** (e.g. `purple-elephant-kite`) — this name is simultaneously the join mechanism (knowing it = joining), the shareable handle, and the URL slug. A room spans dates (unlike a puzzle, which is for one day): it holds, per date, the group's entered words. Distinct from a Puzzle: the puzzle is the static daily *definition*; the room is *who's solving* and *what they've found so far*, across many days.

## Letter set

The **seven** letters that make up a puzzle. Distinct from the matrix's rows (see Matrix): a puzzle always has exactly seven letters, but the matrix only lists letters that *begin* at least one answer, so the letter set cannot be recovered from the matrix. Its authoritative source is sbsolver's letter string (the `#string` input value / URL path, e.g. `Rdginow`), which lists all seven with the center letter capitalized. A hand-pasted grid carries no letter string, so a hand-pasted puzzle's letter set may be incomplete and must be confirmed by the user.

## Center letter

The one puzzle letter that must appear in **every** answer. sbsolver marks it two ways on a puzzle page: the hive's yellow hexagon `<img>` has `alt="center letter R"`, and the `#string` input (and the URL path) capitalizes it (`Rdginow`). This app scrapes it from those signals and stores it on `MatrixData.centerLetter` (nullable — the tab-separated grid alone carries no center info, so a hand-pasted puzzle starts null until the user picks one in the setup panel).

## Pangram

An answer that uses **all seven** letters of the puzzle's letter set. A puzzle has at least one by definition (NYT guarantees it). The pangram *count* is a static property of the puzzle definition, alongside the grid and center letter — it is not derived from progress. It cannot be computed from the matrix alone, which only knows start letters, not the full letter set.

## Matrix (a.k.a. Grid)

The start-letter × word-length table: rows are **start letters** (the first letter of an answer), columns are word lengths, each cell is the count of answers that *begin* with that letter and have that length. Corresponds to sbsolver's `bee bee-grid` table.

Rows are **not** the puzzle's seven letters (see Letter set): a puzzle letter that begins zero answers — even one used heavily mid-word — produces no row. So the matrix is a view over the answers grouped by start letter, never the source of the letter set.

## Hint list

The set of answer slots the solver fills in, grouped by **prefix**. One slot per answer word.

## Prefix grain

The number of leading letters a hint is grouped by. **This app groups hints by 3-letter prefix** (e.g. `DRO`, `DRY`). This is a deliberate, load-bearing choice — the hint UI assumes it.

- **2-letter tally** — sbsolver's main puzzle page lists hints at 2-letter grain (`DR x 4`). This is *coarser* than the app needs.
- **3-letter tally** — the finer breakdown (`DRO x 4`). On sbsolver this lives on a separate page per 2-letter prefix, reached by following the 2-letter tally's links. Assembling the app's 3-letter hint list from sbsolver therefore requires visiting every 2-letter prefix's page.
