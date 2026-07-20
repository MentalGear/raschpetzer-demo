/**
 * "Related" ranking — the cheap, well-known common-neighbours heuristic (a Jaccard
 * overlap of outbound link sets), no library needed. v1 scope: link-overlap only, no
 * categories/tags (that's a future extra signal the app adapter could blend in without
 * changing this shape — see docs/research/graph-core-libs-2026-07.md §5.4).
 */
import { compareIds, type Graph } from './types'
import { outbound } from './neighbors'

export interface RelatedResult<Id> {
	id: Id
	score: number
}

export interface RelatedOptions {
	/** cap the result list to the top N by score (after sorting). Omit for all. */
	limit?: number
}

/**
 * Score every other node in the graph by shared-outbound-link overlap with `id`:
 * `|shared| / |union|` of each node's outbound link set (Jaccard similarity). Nodes
 * with no overlap are omitted. Sorted by score desc, then by id (via `compareIds`) for
 * a deterministic order when scores tie.
 *
 * Only `id` itself is excluded — a node's direct neighbours are *not* automatically
 * filtered out (they can legitimately share the most links with `id`); a consuming UI
 * that already renders a backlinks/outbound-links panel is the right place to dedupe
 * against those, since that's a display concern, not a scoring one.
 */
export function related<Id>(
	graph: Graph<Id>,
	id: Id,
	opts: RelatedOptions = {},
): RelatedResult<Id>[] {
	const mine = outbound(graph, id)
	const results: RelatedResult<Id>[] = []
	if (mine.size > 0) {
		for (const other of graph.nodes) {
			if (other === id) continue
			const theirs = outbound(graph, other)
			if (theirs.size === 0) continue
			let shared = 0
			for (const link of mine) if (theirs.has(link)) shared++
			if (shared === 0) continue
			const union = mine.size + theirs.size - shared
			results.push({ id: other, score: shared / union })
		}
	}
	results.sort((a, b) => b.score - a.score || compareIds(a.id, b.id))
	// Math.max(0, …) clamps a negative limit to 0 results instead of `slice`'s
	// from-the-end behavior (`slice(0, -1)` would silently drop the last result).
	return typeof opts.limit === 'number' ? results.slice(0, Math.max(0, opts.limit)) : results
}
