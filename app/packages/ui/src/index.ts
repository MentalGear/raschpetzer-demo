/**
 * `@kit/ui` — domain-free Svelte 5 UI shared across apps. Self-contained:
 * it owns both the composites (`./composites/*`) AND the shadcn primitives they
 * build on (`@kit/ui/shadcn-components`, `@kit/ui/shadcn-utils`, `@kit/ui/shadcn-hooks`).
 *
 * Built on `@kit/core` (pure layout math). Dependency direction is one-way
 * (`apps → ui → core`); ui never imports an app/domain ($lib) or SvelteKit.
 *
 * Apps import composites from the barrel (`@kit/ui`) and primitives by subpath
 * (e.g. `@kit/ui/shadcn-components/ui/button`).
 *
 * Exception: `MediaEditor` is NOT re-exported here — it pulls in konva/svelte-konva/
 * exifr/piexif-ts (~350KB). Any static import of anything from this barrel (even one
 * unrelated named export) forces Rollup to eagerly bundle the whole output chunk this
 * file compiles into, which would defeat callers that lazy-load MediaEditor behind a
 * dynamic `import()` (verified empirically: adding it here put konva/exifr/piexif-ts in
 * the root layout's eager chunk). It's exported via the dedicated `@kit/ui/media-editor`
 * subpath instead — see `./media-editor.ts` — so it never shares an output chunk with
 * anything statically imported from `@kit/ui` itself. `MediaLightbox` (below) IS safe to
 * export from this barrel despite offering an optional MediaEditor-backed edit mode: its
 * only compile-time reference to MediaEditor is a type-only import (erased, zero runtime
 * cost) plus its own internal `import()` — never a static value import — so it carries the
 * same "opt-in edit pulls in the heavy chunk, browsing never does" property MediaEditor's
 * own dedicated subpath exists to guarantee, without needing one of its own.
 */
export { default as VirtualGrid } from './composites/VirtualGrid.svelte'
export type { RevealItemOptions } from './composites/VirtualGrid.svelte'
export { default as FilterRows } from './composites/FilterRows.svelte'
export { default as Sortable } from './composites/Sortable.svelte'
export type { FilterFieldDef, FilterOperatorDef, FilterRow } from './composites/FilterRows.svelte'
export { default as ContextMenu } from './composites/ContextMenu.svelte'
export { default as SidebarNav } from './composites/SidebarNav.svelte'
export { default as AppShell } from './composites/AppShell.svelte'
export { default as ThemeToggle } from './composites/ThemeToggle.svelte'
export { default as SegmentedControl } from './composites/SegmentedControl.svelte'
export type { SegmentedOption } from './composites/SegmentedControl.svelte'
export { default as StatFooter } from './composites/StatFooter.svelte'
export { default as CommandPalette } from './composites/CommandPalette.svelte'
export { default as SearchOverlay } from './composites/SearchOverlay.svelte'
export type { SearchScopeOption } from './composites/SearchOverlay.svelte'
export { default as DataTable } from './composites/DataTable.svelte'
export type { ColumnSpec, FacetSpec, SortOption, FacetEntry } from './composites/DataTable.svelte'
// A consumer rendering its OWN external "Filters" trigger (DataTable's `hideToolbarTrigger`)
// needs the identical active-filter count DataTable's own built-in trigger shows.
export { activeFilterCount } from './composites/DataTable.helpers'
export { default as PathBar } from './composites/PathBar.svelte'
export type { PathBarSegment } from './composites/PathBar.svelte'
export { default as HScroller } from './composites/HScroller.svelte'
export { default as MediaLightbox } from './composites/MediaLightbox.svelte'
export type { Rect, MediaLightboxSlideContext } from './composites/MediaLightbox.svelte'
export { persistScroll } from './persistScroll'
export { prefersReducedMotion } from './reducedMotion.svelte'
export { useKeybindings } from './keybindings.svelte'

// Config-driven component API (docs/kit/04): command registry + the icon-
// specialized config types apps author against, plus the pure helpers re-
// exported from @kit/core so apps can get everything from the @kit/ui barrel.
export {
	CommandRegistry,
	setCommandRegistry,
	getCommandRegistry,
	getCommandRegistryOptional,
} from './composites/commands'
export type {
	Icon,
	MenuItem,
	MenuConfig,
	NavItem,
	NavGroup,
	NavConfig,
} from './composites/commands'
export { resolveMenu, isSeparator, isSubmenu } from '@kit/core'
export { parseChord, matchChord, chordsEqual } from '@kit/core'
export type {
	Command,
	CommandCtx,
	CommandId,
	When,
	Keybinding,
	KeybindingConfig,
	MenuSeparator,
	NormalizedChord,
} from '@kit/core'
