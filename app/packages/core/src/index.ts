/**
 * `@kit/core` — framework-agnostic pure TS the kit/apps share (no Svelte/DOM).
 *
 * Today: `layout` (justified/square grid math), `menu` (the config contract
 * + pure `resolveMenu` for the config-driven component API), `content`
 * (structured-content diff / three-way merge / anchor resolution + discussion data
 * model), `graph` (generic link-graph algorithms: neighbours, related-by-overlap),
 * and `media` (zoom/pan geometry + trackpad-swipe gesture reducer for a full-screen
 * media viewer). Future sublayers per
 * docs/kit/00-app-kit-plan.md: `core/pure` (hash, dedup) and `core/platform`
 * (canvas/WebGL/WASM). Dependency direction is one-way — `apps → ui → core`, and apps
 * may import `core` directly for purely functional needs.
 */
export * from './layout'
export * from './menu'
export * from './content'
export * from './graph'
export * from './media'
