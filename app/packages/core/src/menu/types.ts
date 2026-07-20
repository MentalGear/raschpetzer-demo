/**
 * Config contract for the config-driven component API (menus, nav, commands).
 *
 * Pure & framework-agnostic — no Svelte/DOM. Item types are GENERIC over the
 * icon type (default `unknown`) so `@kit/core` stays Svelte-free; `@kit/ui`
 * specializes `Icon` to a Svelte component (Lucide). See docs/kit/04.
 */

// Branded later for exhaustiveness if the command set stabilizes (typos currently
// pass type-check; runtime dev-warn is the guard).
export type CommandId = string

/**
 * Runtime context passed to command handlers and `when` predicates. Apps pass
 * richer objects (structural typing); `target` is the entity being acted on.
 */
export interface CommandCtx {
	target?: unknown
	readOnly?: boolean
	[key: string]: unknown
}

/** Visibility/enablement predicate. Keep pure & cheap — runs on every render. */
export type When = (ctx: CommandCtx) => boolean

export interface MenuItemBase<Icon> {
	id: string
	label: string
	icon?: Icon
	/** Placement-specific gate. Primary enablement lives on the `Command`. */
	when?: When
	/** Display-only shortcut hint; the real binding lives in `KeybindingConfig`. */
	shortcut?: string
}

/** A separator entry (no behavior); may itself be gated by `when`. */
export interface MenuSeparator {
	id: string
	separator: true
	when?: When
}

/** A command-backed leaf, a submenu, or a separator. */
export type MenuItem<Icon = unknown> =
	| (MenuItemBase<Icon> & { command: CommandId; children?: never })
	| (MenuItemBase<Icon> & { children: MenuItem<Icon>[]; command?: never })
	| MenuSeparator

/** Context-menu config keyed by target type (e.g. `photoTile`, `album`). */
export type MenuConfig<Icon = unknown> = Record<string, MenuItem<Icon>[]>

/** Sidebar/nav item: a route link or a command action. */
export type NavItem<Icon = unknown> =
	| { id: string; label: string; icon?: Icon; href: string; when?: When }
	| (MenuItemBase<Icon> & { command: CommandId })

export interface NavGroup<Icon = unknown> {
	heading?: string
	items: NavItem<Icon>[]
}
export type NavConfig<Icon = unknown> = NavGroup<Icon>[]

/** A command handler plus its (optional) primary enablement predicate. */
export interface Command {
	id: CommandId
	run: (ctx: CommandCtx) => void | Promise<void>
	/** Primary enablement, reused across menus/toolbar/palette/keybindings. */
	when?: When
	/**
	 * Human-readable label for non-menu surfaces (command palette, search).
	 * Commands without a `title` are skipped by the palette.
	 */
	title?: string
	/**
	 * Palette/toolbar group heading (e.g. `"Navigation"`, `"View"`).
	 * Commands sharing the same `group` string are visually grouped in the palette.
	 */
	group?: string
	/**
	 * Display-only keybinding hint shown next to the command in the palette
	 * (e.g. `"mod+k"`, `"shift+/"`). The authoritative binding lives in a
	 * `KeybindingConfig`; this field is purely cosmetic — no key is bound by
	 * setting it here.
	 */
	keybinding?: string
}

/** A keybinding. `key` uses `mod` for Cmd (macOS) / Ctrl (elsewhere), e.g. `mod+f`, `.`. */
export interface Keybinding {
	command: CommandId
	key: string
	when?: When
}
export type KeybindingConfig = Keybinding[]

/** Narrow a menu item to a separator. */
export function isSeparator<Icon>(item: MenuItem<Icon>): item is MenuSeparator {
	return 'separator' in item && item.separator === true
}

/** Narrow a menu item to a submenu (has `children`). */
export function isSubmenu<Icon>(
	item: MenuItem<Icon>,
): item is MenuItemBase<Icon> & { children: MenuItem<Icon>[] } {
	return 'children' in item && Array.isArray(item.children)
}
