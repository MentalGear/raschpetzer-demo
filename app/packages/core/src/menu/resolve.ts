/**
 * Resolve a menu config against runtime context — pure, unit-tested.
 *
 * Drops items whose `when` is false, recurses into submenus (dropping any left
 * empty), then tidies separators (no leading/trailing/adjacent separators).
 */
import type { CommandCtx, MenuItem } from './types'
import { isSeparator, isSubmenu } from './types'

export function resolveMenu<Icon>(items: MenuItem<Icon>[], ctx: CommandCtx): MenuItem<Icon>[] {
	const kept: MenuItem<Icon>[] = []
	for (const item of items) {
		if (item.when && !item.when(ctx)) continue
		if (isSubmenu(item)) {
			const children = resolveMenu(item.children, ctx)
			if (children.length === 0) continue // drop a submenu left empty by filtering
			kept.push({ ...item, children })
			continue
		}
		kept.push(item)
	}
	return tidySeparators(kept)
}

function tidySeparators<Icon>(items: MenuItem<Icon>[]): MenuItem<Icon>[] {
	const out: MenuItem<Icon>[] = []
	for (const item of items) {
		if (isSeparator(item) && (out.length === 0 || isSeparator(out[out.length - 1]))) {
			continue // skip leading + collapse adjacent
		}
		out.push(item)
	}
	while (out.length > 0 && isSeparator(out[out.length - 1])) out.pop() // drop trailing
	return out
}
