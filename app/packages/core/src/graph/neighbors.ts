/**
 * Direct-neighbour lookups over a `Graph<Id>`. `outbound`/`inbound` read one
 * direction; `neighbors` is the deduped union used by "related" surfaces that don't
 * care which way an edge points.
 */
import type { Graph } from './types'

/**
 * The ids `id` links to. Empty set for an unknown id. Returns the graph's live
 * internal set typed as `ReadonlySet` (compile-time only, see `Graph` in `./types`) —
 * callers must not cast it back to `Set` and mutate it.
 */
export function outbound<Id>(graph: Graph<Id>, id: Id): ReadonlySet<Id> {
	return graph.out.get(id) ?? new Set<Id>()
}

/** The ids that link to `id`. Empty set for an unknown id. Same live-set caveat as `outbound`. */
export function inbound<Id>(graph: Graph<Id>, id: Id): ReadonlySet<Id> {
	return graph.in.get(id) ?? new Set<Id>()
}

/** Union of outbound + inbound neighbours, deduped, excluding `id` itself. */
export function neighbors<Id>(graph: Graph<Id>, id: Id): Id[] {
	const set = new Set<Id>(outbound(graph, id))
	for (const n of inbound(graph, id)) set.add(n)
	set.delete(id)
	return [...set]
}
