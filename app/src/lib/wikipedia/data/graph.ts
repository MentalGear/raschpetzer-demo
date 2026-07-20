/**
 * Adapter from the Wikipedia demo's `Article` corpus to `@kit/core/graph`'s generic
 * `Graph<Id>` (nodes/edges keyed by `slug`). Builds one directed graph from every
 * **`en`-source article's internal wikilinks only** — non-source locale variants
 * share the same `slug` as their `en` counterpart (D3-style: `slug` is the canonical
 * cross-locale key, see `types.ts`), so scanning them too would only re-derive
 * duplicate edges from a different-language body. This mirrors the existing scope of
 * `wikiStore.backlinks` (also `en`-source only).
 *
 * `@kit/core` never sees `Article`/`Entity` — this file is the one place that
 * resolves a `Graph<string>` id back to an `Article` (via `wikiStore.bySlug`), same
 * pattern as `../diff/blockDiff.ts` adapting `@kit/core`'s generic `diffNodes`.
 */
import { buildGraph, related, type Graph } from '@kit/core'
import type { Article } from './types'
import { outboundSlugs } from '../state/wikiStore.svelte'
import { wikiStore } from '../state/wikiStore.svelte'

/**
 * Build the article link-graph: nodes = every given article's `slug`, edges = each
 * article's internal wikilink targets (reusing `outboundSlugs`, the same edge
 * extraction `wikiStore.backlinks` uses). Pass `wikiStore.sourceArticles` (the
 * `en`-only corpus) — see the module doc for why non-source locales are excluded.
 */
export function buildArticleGraph(articles: readonly Article[]): Graph<string> {
	const edges: [string, string][] = []
	for (const a of articles) {
		for (const target of outboundSlugs(a)) edges.push([a.slug, target])
	}
	return buildGraph(
		articles.map((a) => a.slug),
		edges,
	)
}

/**
 * The top `limit` articles related to `slug` by shared-outbound-link overlap
 * (`@kit/core`'s `related()`), resolved to `en`-source `Article`s for the reading
 * surface. `[]` for an unknown slug, a slug with no outbound links, or no overlap.
 *
 * Rebuilds the graph on every call rather than memoizing it like `wikiStore.backlinks`
 * (a `$derived.by`): this is a deliberate difference, not an oversight — it guarantees
 * the ranking can never go stale against `wikiStore.sourceArticles`, and rebuilding is
 * cheap at this demo corpus's scale. Revisit if the corpus grows enough for
 * `buildGraph`'s O(V+E) cost to matter per call.
 */
export function relatedArticles(slug: string, limit = 5): Article[] {
	const graph = buildArticleGraph(wikiStore.sourceArticles)
	return related(graph, slug, { limit })
		.map((r) => wikiStore.bySlug(r.id, 'en'))
		.filter((a): a is Article => a !== undefined)
}
