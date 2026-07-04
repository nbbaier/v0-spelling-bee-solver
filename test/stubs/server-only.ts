// Test stub for the `server-only` marker package. The real module throws when
// evaluated outside a React Server Component, which would break importing
// lib/sbsolver.ts (and its pure parse helpers) under vitest. Aliased in
// vitest.config.ts. Intentionally empty.
export {};
