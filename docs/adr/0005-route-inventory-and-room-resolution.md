# Route inventory: date routes resolve to the current room; rooms live under `/r/`

Four interacting decisions shape the route table: a puzzle's identity is its date (ADR 0004), a Room is a persistent collaborative group spanning dates (`CONTEXT.md` → Room), a browser holds many rooms with a "current room" pointer, and dates absent from the global `sbs:dates` index land in the setup panel (decision B). The routes fall out of composing those.

## Route table

- **`/`** → redirect to `/YYYY-MM-DD` (today, US Eastern per ADR 0002). No UI of its own.
- **`/YYYY-MM-DD`** → the puzzle-identity route. Reads the current-room pointer from localStorage and behaves as `/r/<currentRoom>/<YYYY-MM-DD>`. First-ever visit (no current room) generates a personal room, sets it current, and proceeds. Date pickers navigate here.
- **`/r/<roomName>`** → that room, at the visiting browser's last-visited date for that room (or today on first visit). Sets it as current room. The collaboration share link.
- **`/r/<roomName>/<YYYY-MM-DD>`** → that room, that date. **Sets only the visiting browser's last-visited date for that room; other participants are unaffected.** The room itself has no current-date pointer — each browser tracks its own. The canonical bookmarkable/shareable "this room, this date" URL.
- **`/sample`** → the sample puzzle, ephemeral, outside the room system. The one non-date, non-room identity, for trying the app without generating a room.
- **`/puzzles`** → index of the user's rooms (reframed from a flat puzzle list — once rooms own progress, a flat date list is ambiguous).

## Considered options

- **Date route as the only route** (no `/r/` namespace). Rejected: under collaboration, progress is room-scoped, so the date alone can't identify a shared solve. Two pairs collaborating on the same date would collide.
- **One room per browser** (no current-room pointer). Rejected: front-loading the array is barely more complex and avoids a painful migration if multi-room ever becomes realistic.
- **Shared room-level current-date pointer.** Rejected: requires a coordinated mutable field on the room (who can advance it? what if someone's mid-word when it moves?). Per-browser last-visited-date removes the coordination entirely — each browser owns its own pointer, same storage pattern as the current-room pointer. Both participants default to today for the daily ritual; they diverge only when someone explicitly navigates elsewhere, which is exactly when independence is desirable.

## Consequences

- **`/YYYY-MM-DD` is room-relative, not absolute.** The same date URL can show different progress for different users (their current rooms differ). This is the enabling property for collaboration and the thing that breaks any assumption that the date URL is a global view.
- **The current-room pointer is load-bearing client state.** Stored in localStorage; losing it (new browser, cleared storage) means rejoining a room by name. Personal multi-device sync rides on this — you join the same room (by name) on each device.
- **#20 is fixed by the route model, not a separate change.** Landing at `/` → redirect → `/YYYY-MM-DD` → today's date is not in the global `sbs:dates` index → setup panel auto-fetches. The bug was that no route was wired to the auto-fetch; the route resolves against the global date index (not room progress) and the fetch fires on entry. Note the gating asymmetry: the setup panel is the "first fetch" ceremony for a *globally-new date*, independent of room progress — the definition is shared once fetched, and every subsequent visitor (any user, any room) skips the panel and goes straight to the solver with whatever progress their room has.
- **Each browser holds a last-visited date per room**, alongside its current-room pointer. The room itself has no current-date field — there's no coordinated mutable cursor. Presence reports each participant's current date ("Sam on 2026-06-22, Alex on 2026-06-21").
- **`/sample` is the one special case.** It sidesteps both the date identity and the room model. Worth keeping an eye on; if rooms subsume it naturally (a reserved demo room name), this route could disappear later.
