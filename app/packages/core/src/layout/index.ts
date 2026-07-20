/**
 * `@kit/core/layout` — framework-agnostic justified/square grid layout math.
 *
 * Pure TS (no Svelte / SvelteKit / DOM): node-testable with golden files.
 * Consumed by the `ui` kit (VirtualGrid) and directly by apps that group items
 * (e.g. photos `grouping.ts`).
 */
export * from './justified'
export * from './gridModel'
export * from './section'
