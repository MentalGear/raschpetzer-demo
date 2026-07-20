<script lang="ts">
	/**
	 * "Related articles" — a ranked recommendation list next to the backlinks ("What
	 * links here") panel, scored by `@kit/core/graph`'s `related()` (shared-outbound-
	 * link overlap) via the `relatedArticles` adapter (`$lib/wikipedia/data/graph`).
	 * Mirrors the backlinks panel's markup/styling exactly (labelled `<section>`, a
	 * wrapped pill list of real links) so the two read as one family of "more like
	 * this" panels. Renders nothing when there's no overlap yet (same empty-guard
	 * pattern as backlinks) — the demo corpus's current wikilinks are sparse enough
	 * that this is common, not a bug (see `data/graph.test.ts`).
	 */
	import { href } from '$lib/paths'
	import { relatedArticles } from '$lib/wikipedia/data/graph'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import { Separator } from '@kit/ui/shadcn-components/ui/separator'

	let {
		slug,
		exclude = [],
		limit = 5,
	}: { slug: string; exclude?: string[]; limit?: number } = $props()

	const related = $derived(relatedArticles(slug, limit).filter((a) => !exclude.includes(a.slug)))
</script>

{#if related.length > 0}
	<section class="mt-8" aria-labelledby="related-heading">
		<Separator class="mb-4" />
		<h2 id="related-heading" class="mb-2 text-sm font-semibold text-foreground">
			Related articles
		</h2>
		<ul class="flex flex-wrap gap-2">
			{#each related as a (a.id)}
				<li>
					<a href={href(`/${a.slug}`)}>
						<Badge variant="outline" class="hover:bg-accent">{a.title}</Badge>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
