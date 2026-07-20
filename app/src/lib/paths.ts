/**
 * Base-path helpers so internal links work under a GitHub Pages project subpath
 * (SvelteKit's `paths.base`, e.g. `/SupraAppKit`). `base` is `''` in dev and when
 * unset, so these are no-ops locally. Prefix every app-internal `href`/`goto`.
 */
import { base } from '$app/paths'
import type { NavConfig, NavItem } from '@kit/ui'

/** Prefix an app-internal route path with the configured base. */
export const href = (path: string): string => `${base}${path}`

/** Strip the configured base off a `page.url.pathname` → the app route path. */
export const stripBase = (pathname: string): string => pathname.slice(base.length) || '/'

/**
 * Build a `SidebarNav` `isActive(item)` from a route-path matcher: it unwraps
 * command items (no href), strips the base off the item href, and defers the
 * comparison to the app's `match` (which reads the current path reactively). Keeps
 * the identical `'href' in item ? … : false` boilerplate out of each layout.
 */
export function makeIsActive(match: (routePath: string) => boolean) {
	return (item: NavItem) => ('href' in item ? match(stripBase(item.href)) : false)
}

/**
 * Prefix every nav item's `href`/`id` with `base`, so the `NavConfig` data files
 * can stay clean (unprefixed route paths) while the rendered links respect the
 * deploy base. Command-backed items (no `href`) pass through untouched.
 */
export function navWithBase(nav: NavConfig): NavConfig {
	return nav.map((group) => ({
		...group,
		// prefix only `href` (the link) — `id` is just the #each key / match input,
		// never resolved as a URL, so keep it as the stable unprefixed route path.
		items: group.items.map((item) =>
			'href' in item ? { ...item, href: href(item.href) } : item,
		),
	}))
}
