// Shared source of truth for consuming the monorepo's kit packages (@kit/core,
// @kit/ui, @kit/tokens) as source (no build step) from every app + the root.
// Single copy (not duplicated per-app) — apps/*/svelte.config.ts and
// apps/*/vite.config.ts import `kitAlias`/`kitFsAllow` from here via `../../kit.config.ts`;
// the root's own svelte.config.ts/vite.config.ts import via `./kit.config.ts`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const workspaceRoot = fileURLToPath(new URL('.', import.meta.url))

const pkgDir = (name: string) => path.join(workspaceRoot, 'packages', name)

/**
 * Derive Vite/SvelteKit aliases for a kit package FROM ITS OWN package.json
 * "exports" map, instead of hand-writing a `'@kit/x/*': '.../src/*'` wildcard.
 *
 * Why: a hand-written wildcard alias resolves the specifier to a filesystem path
 * BEFORE Node's exports-map resolution ever runs, so it silently grants access to
 * every file under the package — even ones the package's own package.json
 * deliberately does NOT declare as public (e.g. @kit/ui's individual composite
 * .svelte files, meant to be reached only via the shared barrel or a composite's
 * own dedicated subpath like `@kit/ui/media-editor`). A real app could write
 * `import { default as MediaEditor } from '@kit/ui/composites/MediaEditor.svelte'`
 * — a static import reaching the file directly — and it would resolve fine,
 * undetected by any lint rule or test, defeating any dedicated-subpath split like
 * MediaEditor's (its whole point is keeping heavy deps out of a chunk built via
 * eager import). Found by an independent-expert-review architecture pass during
 * MediaEditor's promotion (2026-07-18) — see docs/backlog.md's former "wildcard
 * alias bypasses exports" entry (resolved by this file).
 *
 * By deriving the alias map from `exports` itself, the alias can never grant
 * MORE than the package's own package.json already declares public — there is no
 * second, hand-maintained list to let drift out of sync. Adding a new sanctioned
 * subpath (like `./media-editor`) to a package's `exports` automatically extends
 * every consumer's alias map too, with no separate kit.config.ts edit to remember.
 *
 * The bare "." (package-root) subpath is deliberately NOT aliased here — SvelteKit/
 * Vite's alias matching for a plain string key is a PREFIX match, not exact
 * (confirmed empirically: aliasing '@kit/ui' to a specific file made Vite append
 * any deeper specifier's remainder onto that FILE path, e.g. resolving
 * '@kit/ui/shadcn-components/ui/breadcrumb' to '.../index.ts/shadcn-components/
 * ui/breadcrumb' — nonsense — and doing so BEFORE the more specific
 * '@kit/ui/shadcn-components/*' alias below ever got a chance to match). Aliasing
 * '.' to a DIRECTORY instead would "fix" that concatenation bug but reopen the
 * exact reach-around this file exists to close (SvelteKit's own docs: a directory-
 * target alias "will match a directory and its contents"). Since every kit
 * package is a real bun workspace member (`node_modules/@kit/x` is a symlink to
 * `packages/x`), the bare specifier already resolves correctly — and safely,
 * respecting the exports map — via Node's normal package resolution with no
 * alias needed at all.
 */
function kitPackageAliases(specifier: string, dir: string): Record<string, string> {
	const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
	const exportsMap = pkg.exports as Record<string, string> | undefined
	if (!exportsMap)
		throw new Error(`${specifier}'s package.json has no "exports" map to derive aliases from`)
	const aliases: Record<string, string> = {}
	for (const [subpath, target] of Object.entries(exportsMap)) {
		if (subpath === '.') continue // see doc comment above — deliberately not aliased
		if (typeof target !== 'string') continue // skip conditional exports objects, if any appear later
		const aliasKey = `${specifier}/${subpath.slice(2)}`
		const aliasTarget = path.join(dir, target)
		aliases[aliasKey] = aliasTarget
		// A non-wildcard `.ts` target also gets a `.js`-suffixed alias entry pointing at
		// the SAME file: vendored shadcn code (and TS's own "bundler" moduleResolution
		// convention) routinely imports a `.ts` source via an explicit `.js` specifier
		// (e.g. `from '@kit/ui/shadcn-utils.js'`) — the extensionless entry above alone
		// doesn't cover that literal specifier. A wildcard target (`shadcn-components/*`)
		// needs no such twin: Vite substitutes the trailing segment verbatim, so a `.js`
		// suffix already passes through unchanged.
		if (!aliasKey.endsWith('*') && aliasTarget.endsWith('.ts')) {
			aliases[`${aliasKey}.js`] = aliasTarget
		}
	}
	return aliases
}

export const kitAlias: Record<string, string> = {
	...kitPackageAliases('@kit/core', pkgDir('core')),
	...kitPackageAliases('@kit/ui', pkgDir('ui')),
	...kitPackageAliases('@kit/tokens', pkgDir('tokens')),
}

// Allow Vite's dev server + Tailwind content scanning to reach kit source.
export const kitFsAllow: string[] = [workspaceRoot]
