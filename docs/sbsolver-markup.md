# sbsolver.com page markup

What `lib/sbsolver.ts` reads from sbsolver pages, so you don't have to re-derive it with curl. Trimmed real pages live in `test/fixtures/sbsolver/` and are exercised by `lib/sbsolver.test.ts`. The fixtures were recorded on 2026-10-05; if the scraper breaks, fetch a fresh page, compare it with them, and update both.

## URLs

| Path | Page |
| --- | --- |
| `/s/<n>` | Answers page for puzzle number `n`. Users paste these. |
| `/n/<n>`, `/nt/<n>`, `/nt/<Letters>` | Hints page. The scraper normalizes every input URL to `/nt/<id>`. |
| `/nt/<Letters>/<n>/<xx>` | Hints page with the 3-letter tally for 2-letter prefix `xx` expanded. |

`<Letters>` is the letter string, center letter first and capitalized (`Ecdhipu`). Puzzle numbers are sequential by date (`lib/puzzle-date.ts`).

## Hints page (`/nt/<id>`)

| Field | Element | Example |
| --- | --- | --- |
| Date | `<title>` text | `July 1, 2026 \| 2-Letter Spelling Bee Hints \| …` |
| Letter set | `input#string` `value` | `Ecdhipu` |
| Center letter | hive `<img alt="center letter E">`; fallback: first uppercase letter of `#string` | `E` |
| Pangram count | text after `<b …>pangrams:</b>` (the `<b>` carries tooltip attributes) | `2` |
| Matrix | `table.bee-grid`: header row of word lengths, one row per start letter, totals row; empty cells are `-` | |
| 2-letter tally | `td.bee-two > a`, text `CE&nbsp;x&nbsp;2`, absolute `href` to that prefix's 3-letter page | |

The page has no 3-letter tally of its own, so the scraper crawls every `td.bee-two` link (ADR 0001).

## Prefix page (`/nt/<Letters>/<n>/<xx>`)

The same page with one extra row: `td.bee-three` cells (`CED&nbsp;x&nbsp;2`) inserted under the expanded prefix. The expanded prefix's `td.bee-two` also gets the class `bee-threes`. The page repeats all the `bee-two` links, so read only the `bee-three` cells from it.
