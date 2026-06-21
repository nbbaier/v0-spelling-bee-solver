# Context

A glossary of the domain language for this project. Terms only — no implementation detail.

## Puzzle

A single day's New York Times Spelling Bee, identified in this app by its **date** (`YYYY-MM-DD`). Date is the storage key. sbsolver instead identifies a puzzle by a number (`/nt/2965`) or by its letter string (`/nt/Rdginow`); neither is a date, so a puzzle's date must be read from the page itself.

## Center letter

The one puzzle letter that must appear in **every** answer. sbsolver marks it two ways on a puzzle page: the hive's yellow hexagon `<img>` has `alt="center letter R"`, and the `#string` input (and the URL path) capitalizes it (`Rdginow`). This app scrapes it from those signals and stores it on `MatrixData.centerLetter` (nullable — the tab-separated grid alone carries no center info, so a hand-pasted puzzle starts null until the user picks one in the setup panel).

## Matrix (a.k.a. Grid)

The letters × word-length table: rows are the puzzle's letters, columns are word lengths, each cell is the count of answers of that letter and length. Corresponds to sbsolver's `bee bee-grid` table.

## Hint list

The set of answer slots the solver fills in, grouped by **prefix**. One slot per answer word.

## Prefix grain

The number of leading letters a hint is grouped by. **This app groups hints by 3-letter prefix** (e.g. `DRO`, `DRY`). This is a deliberate, load-bearing choice — the hint UI assumes it.

- **2-letter tally** — sbsolver's main puzzle page lists hints at 2-letter grain (`DR x 4`). This is *coarser* than the app needs.
- **3-letter tally** — the finer breakdown (`DRO x 4`). On sbsolver this lives on a separate page per 2-letter prefix, reached by following the 2-letter tally's links. Assembling the app's 3-letter hint list from sbsolver therefore requires visiting every 2-letter prefix's page.
