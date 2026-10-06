# Coding Standards

Read during review. `pnpm check` (ultracite, `tsc --noEmit`, vitest) runs in CI and already enforces Ultracite's Biome rules from the core, react and next presets, so this file lists only what lint can't settle. `pnpm fix` auto-fixes most lint findings.

## Types

- Annotate parameters and return types where the inferred type isn't obvious from the code.
- Narrow with type guards and control flow; reach for `as` only when the compiler can't follow, and say why.
- Name magic numbers as constants (`POOL_SIZE`, not a bare `5`).

## Control flow and errors

- Return early for error and edge cases instead of nesting the happy path.
- Pull complex conditions into well-named booleans.
- Keep functions focused, group related code, and separate concerns.
- Use `async`/`await` rather than `.then` chains.
- Catch an error only where you can handle it: recover, add context, or surface it to the user. Otherwise let it propagate.
- Remove `console.log` debugging before merging (Biome's `noConsole` is off).

## UI

- Keep heading levels in order and use semantic elements and ARIA where lint can't see intent.
- Validate and sanitize user input at the boundary (server actions, API routes, scraped HTML).

## Tests

These aren't linted: the repo doesn't extend Ultracite's vitest preset.

- Put assertions inside `it()`/`test()` blocks.
- Use `async`/`await`, not `done` callbacks.
- Don't commit `.only` or `.skip`.
- Keep suites flat; avoid deep `describe` nesting.

## What only a reviewer can check

- **Correctness:** does the logic match the issue or spec, including edge cases and failure states?
- **Naming:** do names use the vocabulary in `GLOSSARY.md`?
- **Architecture:** does the change respect the data flow in `AGENTS.md` and the decisions in `docs/adr/`?
- **User experience:** loading, error and empty states; keyboard and screen-reader use.
- **Comments:** explain why, not what; prefer self-explanatory code.
