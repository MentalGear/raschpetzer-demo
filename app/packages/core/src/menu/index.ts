/**
 * `@kit/core/menu` — the framework-agnostic config contract for the
 * config-driven component API: menu/nav/command types + the pure `resolveMenu`
 * + the pure keybinding resolver (parseChord / matchChord).
 *
 * No Svelte/DOM. Item types are generic over the icon type; `@kit/ui`
 * specializes them and adds the reactive registry + renderers. See docs/kit/04.
 */
export * from './types'
export * from './resolve'
export * from './keybindings'
