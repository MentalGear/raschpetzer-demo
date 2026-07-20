/**
 * `@kit/core/graph` — pure, generic algorithms over an `Id`-keyed adjacency-list link
 * graph: neighbours and common-neighbours "related" ranking. No Svelte/DOM, no domain
 * import (`Entity`/`Article`/`Mark` stay in the app adapter,
 * `apps/wikipedia/src/lib/wikipedia/data/graph.ts`). See docs/research/graph-core-libs-2026-07.md
 * for the design rationale (hand-rolled vs. adopting graphology).
 */
export * from './types'
export * from './neighbors'
export * from './related'
