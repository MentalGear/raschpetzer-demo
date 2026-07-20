/**
 * Shared scroll-position memory for the kit's scroll primitives — the single
 * source of truth so the two impls don't diverge. A module-scoped store keyed by
 * an app-chosen string, surviving unmount/remount (e.g. navigating between
 * sidebar views and back) for the page's lifetime.
 *
 * Both kit scroll primitives read/write THIS store:
 *   - `VirtualGrid`'s `scrollKey` prop (virtualized grids), and
 *   - the `persistScroll` action (plain scroll containers / card-grid overviews).
 * Keep keys namespaced per app + view (e.g. `photos:albums`, `notes:all`).
 */
const memory = new Map<string, number>()

export function getScroll(key: string): number | undefined {
	return memory.get(key)
}

export function setScroll(key: string, top: number): void {
	memory.set(key, top)
}
