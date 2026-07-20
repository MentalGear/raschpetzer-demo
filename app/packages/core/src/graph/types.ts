/**
 * The generic adjacency-list graph shape every `@kit/core/graph` algorithm operates
 * on. Generic over `Id` (this app uses article `slug` strings) — no `Entity`/`Article`
 * import here; the app-side adapter
 * (`apps/wikipedia/src/lib/wikipedia/data/graph.ts`) builds one of these from the domain
 * model.
 *
 * `ReadonlySet`/`ReadonlyMap` here are compile-time only: `buildGraph` stores live
 * mutable `Set`/`Map` instances underneath, so a cast back to the mutable type (e.g.
 * `as Set<Id>`) would let a caller mutate the graph's internals in place. Don't.
 */
export interface Graph<Id> {
	/** every known node id. */
	nodes: ReadonlySet<Id>
	/** outbound adjacency: id → the set of ids it links to. */
	out: ReadonlyMap<Id, ReadonlySet<Id>>
	/** inbound adjacency (the reverse index), built eagerly alongside `out`. */
	in: ReadonlyMap<Id, ReadonlySet<Id>>
}

/**
 * Build a `Graph` from a node-id set and a directed edge list.
 *
 * - Dedupes edges (multiple identical `[from, to]` pairs collapse to one).
 * - **Self-loops are dropped** (`from === to` edges are ignored) — a node never
 *   neighbours/backlinks itself.
 * - **Edges referencing an id outside `nodeIds` are ignored** (not auto-added as a
 *   node) — the node set is authoritative; a dangling link target that isn't a real
 *   node (e.g. a wikilink to an article that doesn't exist in this corpus) doesn't
 *   silently grow the graph. Callers that want such targets to count should include
 *   them in `nodeIds`.
 */
export function buildGraph<Id>(
	nodeIds: Iterable<Id>,
	edges: Iterable<readonly [Id, Id]>,
): Graph<Id> {
	const nodes = new Set<Id>(nodeIds)
	const out = new Map<Id, Set<Id>>()
	const inn = new Map<Id, Set<Id>>()
	for (const id of nodes) {
		out.set(id, new Set<Id>())
		inn.set(id, new Set<Id>())
	}
	for (const [from, to] of edges) {
		if (from === to) continue // self-loops dropped
		if (!nodes.has(from) || !nodes.has(to)) continue // unknown-id edges ignored
		out.get(from)!.add(to)
		inn.get(to)!.add(from)
	}
	return { nodes, out, in: inn }
}

/**
 * Stable total order over any `Id` (string, number, or anything with a meaningful
 * `toString`), used as the deterministic tiebreak everywhere a score/degree/BFS-visit
 * order could otherwise depend on input/iteration order.
 *
 * When both `a` and `b` are `number` (and neither is `NaN`), they're compared
 * numerically — so `compareIds(2, 10)` orders `2` before `10`, not lexicographically as
 * comparing `"2"` and `"10"` as strings would. Everything else (strings, mixed types,
 * or non-numeric ids) is compared lexicographically by `String(id)`. Two distinct
 * values whose `String()` forms are equal tie (this returns `0`, relying on sort
 * stability) — an accepted edge; real usage here is `Graph<string>`, where this doesn't
 * arise.
 */
export function compareIds<Id>(a: Id, b: Id): number {
	if (typeof a === 'number' && typeof b === 'number' && !Number.isNaN(a) && !Number.isNaN(b)) {
		const diff = a - b
		return diff < 0 ? -1 : diff > 0 ? 1 : 0
	}
	const as = String(a)
	const bs = String(b)
	if (as < bs) return -1
	if (as > bs) return 1
	return 0
}
