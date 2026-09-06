import "server-only";
import { parse } from "node-html-parser";

// Scrapes a sbsolver.com puzzle page into the text formats the existing
// SetupPanel textareas expect:
//   - matrixText: tab-separated grid (see lib/parse.ts → parseMatrix)
//   - hintsText:  "PREFIX xN" tallies (see lib/parse.ts → parseHints)
//
// sbsolver only lists hints at 2-letter grain on the main page; the 3-letter
// tally we need lives on a separate page per 2-letter prefix. We therefore
// crawl: parse the main page, then fetch each prefix's page with a small
// concurrency pool. See docs/adr/0001-crawl-3-letter-tallies-from-sbsolver.md.

const ALLOWED_HOST = "www.sbsolver.com";
const POOL_SIZE = 5;

const PUZZLE_PATH_RE = /^\/(?:nt|n|s)\/([A-Za-z0-9]+)/;
/** Prefix links may be `/nt/<id>/<prefix>` or `/nt/<id>/<number>/<prefix>`. */
const PREFIX_HREF_RE = /\/nt\/[A-Za-z]+(?:\/\d+)?\/([a-z]{2})(?:[#?].*)?$/;
const THREE_LETTER_RE = /[A-Za-z]{2,}\s*[x×*]\s*\d+/;
const TITLE_DATE_RE = /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/;
/** Hive yellow-hexagon alt text, e.g. `"center letter R"`. */
const CENTER_ALT_RE = /^center letter ([A-Za-z])$/;
const FIRST_UPPERCASE_RE = /[A-Z]/;
const LETTER_RE = /[A-Za-z]/g;

/** Parsed fields from a sbsolver puzzle page, as text the setup form consumes. */
export interface ScrapeResult {
  /** Uppercase center letter, or `null` if it could not be read. */
  centerLetter: string | null;
  /** Puzzle date as `YYYY-MM-DD`, or `null` if it could not be read. */
  date: string | null;
  /** 2-letter prefixes whose 3-letter page failed to fetch or parse. */
  failedPrefixes: string[];
  /** Space-separated `"PREFIX xN"` tallies. */
  hintsText: string;
  /**
   * Authoritative 7-letter set (uppercase, deduped), or `""` if `#string`
   * could not be read. See CONTEXT.md → Letter set.
   */
  letterSet: string;
  /** Tab-separated grid including totals; `parseMatrix` ignores non-data cells. */
  matrixText: string;
  /**
   * Pangram count from the stats block, or `null` if unreadable.
   * See CONTEXT.md → Pangram.
   */
  pangramCount: number | null;
}

const MONTHS: Record<string, number> = {
  april: 4,
  august: 8,
  december: 12,
  february: 2,
  january: 1,
  july: 7,
  june: 6,
  march: 3,
  may: 5,
  november: 11,
  october: 10,
  september: 9,
};

function clean(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates and normalizes a sbsolver URL to `https://www.sbsolver.com/nt/<id>`.
 * Accepts `/nt/`, `/n/`, and `/s/` puzzle paths.
 */
function validateUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch (error) {
    throw new Error("That doesn't look like a valid URL.", { cause: error });
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("URL must start with http(s).");
  }
  if (u.hostname !== ALLOWED_HOST) {
    throw new Error(`Only ${ALLOWED_HOST} URLs are supported.`);
  }
  const m = u.pathname.match(PUZZLE_PATH_RE);
  if (!m) {
    throw new Error(
      "That's not a sbsolver puzzle page (expected a /s/…, /nt/…, or /n/… URL)."
    );
  }
  u.protocol = "https:";
  u.pathname = `/nt/${m[1]}`;
  return u;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "spelling-bee-solver (fetch convenience)" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Request to ${url} failed (HTTP ${res.status}).`);
  }
  return res.text();
}

type Root = ReturnType<typeof parse>;

/** Rebuilds the tab-separated grid from `table.bee-grid`, cells verbatim. */
function parseMatrixTable(root: Root): string {
  const table = root.querySelector("table.bee-grid");
  if (!table) {
    throw new Error(
      "Couldn't find the grid on that page — is it a hints page?"
    );
  }
  const lines = table
    .querySelectorAll("tr")
    .map((tr) =>
      tr
        .querySelectorAll("td")
        .map((td) => clean(td.text))
        .join("\t")
    )
    .filter((line) => line.trim().length > 0);
  return lines.join("\n");
}

/** Deduped 2-letter prefix pages to crawl, in page order. */
function parsePrefixLinks(
  root: Root,
  baseUrl: string
): { prefix: string; url: string }[] {
  const seen = new Set<string>();
  const links: { prefix: string; url: string }[] = [];
  for (const a of root.querySelectorAll("td.bee-two a")) {
    const href = a.getAttribute("href");
    if (!href) {
      continue;
    }
    const m = href.match(PREFIX_HREF_RE);
    if (!m) {
      continue;
    }
    const prefix = m[1].toUpperCase();
    if (seen.has(prefix)) {
      continue;
    }
    seen.add(prefix);
    links.push({
      prefix,
      url: new URL(href.split("#")[0], baseUrl).toString(),
    });
  }
  return links;
}

/** 3-letter tallies from `td.bee-three` (e.g. `"DRO x 4"`). */
function parseThreeLetterCells(root: Root): string[] {
  return root
    .querySelectorAll("td.bee-three")
    .map((td) => clean(td.text))
    .filter((t) => THREE_LETTER_RE.test(t));
}

/**
 * Puzzle date from the page `<title>` (e.g. `"June 2, 2026 | …"`).
 * Does not use HTML build comments — those are generation timestamps, not the puzzle date.
 */
function parseDate(root: Root): string | null {
  const title = root.querySelector("title")?.text ?? "";
  const dm = title.match(TITLE_DATE_RE);
  if (dm) {
    const month = MONTHS[dm[1].toLowerCase()];
    if (month) {
      return `${dm[3]}-${String(month).padStart(2, "0")}-${dm[2].padStart(2, "0")}`;
    }
  }
  return null;
}

/**
 * Center letter from the hive image alt (`"center letter R"`), falling back to
 * the first uppercase character in `#string` (e.g. `"Rdginow"`).
 */
function parseCenterLetter(root: Root): string | null {
  for (const img of root.querySelectorAll("img")) {
    const alt = img.getAttribute("alt") ?? "";
    const m = alt.match(CENTER_ALT_RE);
    if (m) {
      return m[1].toUpperCase();
    }
  }
  const value = root.querySelector("input#string")?.getAttribute("value") ?? "";
  const m = value.match(FIRST_UPPERCASE_RE);
  return m ? m[0] : null;
}

/**
 * Letter set from `#string` (e.g. `"Rdginow"`): every letter, uppercased,
 * duplicates dropped, order preserved. Returns `""` when the input is absent.
 */
export function parseLetterSet(root: Root): string {
  const value = root.querySelector("input#string")?.getAttribute("value") ?? "";
  const letters = value.match(LETTER_RE);
  if (!letters) {
    return "";
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ch of letters) {
    const upper = ch.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      result.push(upper);
    }
  }
  return result.join("");
}

/**
 * Pangram count from the stats `<b>pangrams:</b>` sibling text, or `null`
 * when absent or unreadable.
 */
export function parsePangramCount(root: Root): number | null {
  for (const b of root.querySelectorAll("b")) {
    if (clean(b.text) !== "pangrams:") {
      continue;
    }
    const count = Number.parseInt(clean(b.nextSibling?.rawText ?? ""), 10);
    return Number.isFinite(count) ? count : null;
  }
  return null;
}

/** Fetches prefix pages with a bounded pool, preserving page order. */
async function crawlThreeLetter(
  links: { prefix: string; url: string }[]
): Promise<{ hintsText: string; failedPrefixes: string[] }> {
  const perPrefix: (string[] | null)[] = new Array(links.length).fill(null);
  async function worker(index: number): Promise<void> {
    if (index >= links.length) {
      return;
    }

    const link = links[index];
    try {
      const html = await fetchHtml(link.url);
      perPrefix[index] = parseThreeLetterCells(parse(html));
    } catch {
      perPrefix[index] = null;
    }

    await worker(index + POOL_SIZE);
  }

  const workers = Array.from(
    { length: Math.min(POOL_SIZE, links.length) },
    (_, index) => worker(index)
  );
  await Promise.all(workers);

  const tallies: string[] = [];
  const failedPrefixes: string[] = [];
  perPrefix.forEach((cells, i) => {
    if (cells === null) {
      failedPrefixes.push(links[i].prefix);
    } else {
      tallies.push(...cells);
    }
  });

  return { failedPrefixes, hintsText: tallies.join("  ") };
}

/**
 * Fetches `rawUrl`, crawls 3-letter prefix pages, and returns scrape fields
 * for the setup form.
 *
 * @throws {Error} If the URL is invalid, the page is not a puzzle, or no hints can be read.
 */
export async function scrapePuzzle(rawUrl: string): Promise<ScrapeResult> {
  const url = validateUrl(rawUrl);
  const root = parse(await fetchHtml(url.toString()));

  const matrixText = parseMatrixTable(root);
  const date = parseDate(root);
  const centerLetter = parseCenterLetter(root);
  const letterSet = parseLetterSet(root);
  const pangramCount = parsePangramCount(root);
  const links = parsePrefixLinks(root, url.toString());

  if (links.length === 0) {
    throw new Error("Couldn't find the 2-letter hint list on that page.");
  }

  const { hintsText, failedPrefixes } = await crawlThreeLetter(links);

  if (hintsText.trim().length === 0) {
    throw new Error(
      "Fetched the page but couldn't read any hints — the site may have changed."
    );
  }

  return {
    centerLetter,
    date,
    failedPrefixes,
    hintsText,
    letterSet,
    matrixText,
    pangramCount,
  };
}
