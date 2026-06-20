import "server-only"
import { parse } from "node-html-parser"

// Scrapes a sbsolver.com puzzle page into the text formats the existing
// SetupPanel textareas expect:
//   - matrixText: tab-separated grid (see lib/parse.ts → parseMatrix)
//   - hintsText:  "PREFIX xN" tallies (see lib/parse.ts → parseHints)
//
// sbsolver only lists hints at 2-letter grain on the main page; the 3-letter
// tally we need lives on a separate page per 2-letter prefix. We therefore
// crawl: parse the main page, then fetch each prefix's page with a small
// concurrency pool. See docs/adr/0001-crawl-3-letter-tallies-from-sbsolver.md.

const ALLOWED_HOST = "www.sbsolver.com"
const POOL_SIZE = 5

export type ScrapeResult = {
  matrixText: string
  hintsText: string
  // ISO YYYY-MM-DD scraped from the page, or null if it couldn't be found.
  date: string | null
  // 2-letter prefixes whose 3-letter page failed to fetch/parse.
  failedPrefixes: string[]
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

// Collapse &nbsp;/whitespace to single spaces and trim.
function clean(text: string): string {
  return text.replace(/&nbsp;/gi, " ").replace(/ /g, " ").replace(/\s+/g, " ").trim()
}

function validateUrl(raw: string): URL {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    throw new Error("That doesn't look like a valid URL.")
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("URL must start with http(s).")
  }
  if (u.hostname !== ALLOWED_HOST) {
    throw new Error(`Only ${ALLOWED_HOST} URLs are supported.`)
  }
  // Accept both the "/nt/<id>" (2-letter tally) and "/n/<id>" (Basic) puzzle
  // pages. The Basic page has the grid but no 2-letter tally to crawl, so
  // normalize either form to "/nt/<id>" — the page that carries the hints.
  const m = u.pathname.match(/^\/(?:nt|n)\/([A-Za-z0-9]+)/)
  if (!m) {
    throw new Error("That's not a sbsolver puzzle page (expected a /nt/… or /n/… URL).")
  }
  u.protocol = "https:"
  u.pathname = `/nt/${m[1]}`
  return u
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "spelling-bee-solver (fetch convenience)" },
    redirect: "follow",
  })
  if (!res.ok) throw new Error(`Request to ${url} failed (HTTP ${res.status}).`)
  return res.text()
}

type Root = ReturnType<typeof parse>

// Rebuild the tab-separated grid from the `bee bee-grid` table. We emit each
// cell verbatim ("-" for empties, "tot"/Σ rows and columns included); parseMatrix
// ignores non-letter rows and non-integer header cells, so no cleanup is needed.
function parseMatrixTable(root: Root): string {
  const table = root.querySelector("table.bee-grid")
  if (!table) throw new Error("Couldn't find the grid on that page — is it a hints page?")
  const lines = table
    .querySelectorAll("tr")
    .map((tr) => tr.querySelectorAll("td").map((td) => clean(td.text)).join("\t"))
    .filter((line) => line.trim().length > 0)
  return lines.join("\n")
}

// Collect the 2-letter prefix pages to crawl, in page order, deduped.
function parsePrefixLinks(root: Root): { prefix: string; url: string }[] {
  const seen = new Set<string>()
  const links: { prefix: string; url: string }[] = []
  for (const a of root.querySelectorAll("td.bee-two a")) {
    const href = a.getAttribute("href")
    if (!href) continue
    const m = href.match(/\/nt\/[A-Za-z]+\/([a-z]{2})(?:[#?].*)?$/)
    if (!m) continue
    const prefix = m[1].toUpperCase()
    if (seen.has(prefix)) continue
    seen.add(prefix)
    links.push({ prefix, url: href.split("#")[0] })
  }
  return links
}

// On a single prefix's page, the `bee-three` cells hold its 3-letter tallies,
// e.g. "DRO x 4". parseHints accepts the spaces-around-x form as-is.
function parseThreeLetterCells(root: Root): string[] {
  return root
    .querySelectorAll("td.bee-three")
    .map((td) => clean(td.text))
    .filter((t) => /[A-Za-z]{2,}\s*[x×*]\s*\d+/.test(t))
}

function parseDate(root: Root): string | null {
  // The puzzle's own date is the human date in the <title> / crumb,
  // e.g. "June 2, 2026 | 2-Letter Spelling Bee Hints".
  //
  // Do NOT use the trailing build comment (<!-- ... 2026-06-20 ... -->): that's
  // the page-generation timestamp (i.e. today), not the puzzle's date — it only
  // matched by coincidence when fetching the current day's puzzle.
  const title = root.querySelector("title")?.text ?? ""
  const dm = title.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/)
  if (dm) {
    const month = MONTHS[dm[1].toLowerCase()]
    if (month) {
      return `${dm[3]}-${String(month).padStart(2, "0")}-${dm[2].padStart(2, "0")}`
    }
  }
  return null
}

// Fetch every prefix page with a bounded concurrency pool, preserving page order.
async function crawlThreeLetter(
  links: { prefix: string; url: string }[],
): Promise<{ hintsText: string; failedPrefixes: string[] }> {
  const perPrefix: (string[] | null)[] = new Array(links.length).fill(null)
  let cursor = 0

  async function worker() {
    while (cursor < links.length) {
      const index = cursor++
      const link = links[index]
      try {
        const html = await fetchHtml(link.url)
        perPrefix[index] = parseThreeLetterCells(parse(html))
      } catch {
        perPrefix[index] = null // marks failure
      }
    }
  }

  const workers = Array.from({ length: Math.min(POOL_SIZE, links.length) }, worker)
  await Promise.all(workers)

  const tallies: string[] = []
  const failedPrefixes: string[] = []
  perPrefix.forEach((cells, i) => {
    if (cells === null) failedPrefixes.push(links[i].prefix)
    else tallies.push(...cells)
  })

  return { hintsText: tallies.join("  "), failedPrefixes }
}

export async function scrapePuzzle(rawUrl: string): Promise<ScrapeResult> {
  const url = validateUrl(rawUrl)
  const root = parse(await fetchHtml(url.toString()))

  const matrixText = parseMatrixTable(root)
  const date = parseDate(root)
  const links = parsePrefixLinks(root)

  if (links.length === 0) {
    throw new Error("Couldn't find the 2-letter hint list on that page.")
  }

  const { hintsText, failedPrefixes } = await crawlThreeLetter(links)

  if (hintsText.trim().length === 0) {
    throw new Error("Fetched the page but couldn't read any hints — the site may have changed.")
  }

  return { matrixText, hintsText, date, failedPrefixes }
}
