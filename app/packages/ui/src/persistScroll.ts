/**
 * Svelte action: remember and restore a plain scroll container's position under a
 * key, surviving unmount/remount (e.g. navigating between sidebar views and back).
 *
 * Domain-free kit primitive. Shares its memory store with `VirtualGrid`'s
 * `scrollKey` (see `scrollMemory.ts`) so the two are one primitive, not two
 * duplicate impls. Use this for plain scroll containers (card-grid overviews);
 * the virtualized grid has the equivalent built in via its `scrollKey` prop.
 *
 *   <div class="grid" use:persistScroll={'photos:albums'}> … </div>
 */
import { getScroll, setScroll } from './scrollMemory'

export function persistScroll(node: HTMLElement, key: string) {
	let current = key
	const onScroll = () => setScroll(current, node.scrollTop)
	const restore = () => {
		const saved = getScroll(current)
		// restore 0 too (a fresh view's top) — `!= null` not truthiness, so a
		// remembered 0 isn't treated as "nothing saved"
		if (saved != null) node.scrollTop = saved
	}
	// restore after layout so the target isn't clamped before content has height
	requestAnimationFrame(restore)
	node.addEventListener('scroll', onScroll, { passive: true })
	return {
		update(next: string) {
			current = next
			requestAnimationFrame(restore)
		},
		destroy() {
			node.removeEventListener('scroll', onScroll)
		},
	}
}
