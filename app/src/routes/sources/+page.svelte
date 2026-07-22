<script lang="ts">
	/**
	 * Sources: every citation across the article corpus, deduped to one row per underlying
	 * source (`wikiStore.sources` — `data/sources.ts`), rendered through the `@kit/ui`
	 * `DataTable` composite — the same generic list-with-search/sort/facets composite the
	 * Notes app's `/table` route showcases; this page is a straightforward, single-facet
	 * consumer of it (search + sort + a "Type" facet), not the full Notes-style
	 * clickable-header/toolbarWrapper treatment, since a source list has no need for a
	 * dense multi-column grid layout — each row is one card of bibliographic detail.
	 */
	import { href } from '$lib/paths'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { DataTable, type ColumnSpec, type FacetSpec } from '@kit/ui'
	import type { SourceEntry } from '$lib/wikipedia/data/sources'

	const columns: ColumnSpec<SourceEntry>[] = [
		{ id: 'title', header: 'Title', accessor: (s) => s.title },
		{ id: 'authors', header: 'Authors', accessor: (s) => s.authors ?? '' },
		{ id: 'year', header: 'Year', accessor: (s) => s.year ?? '', filterable: false },
		{ id: 'publisher', header: 'Publisher', accessor: (s) => s.publisher ?? '' },
	]
	const facets: FacetSpec<SourceEntry>[] = [
		{ id: 'kind', label: 'Type', values: (s) => [s.kind] },
	]
</script>

<svelte:head><title>Sources — Raschpëtzer</title></svelte:head>

<div class="sources-page">
	<div class="header">
		<h1 class="text-2xl font-bold tracking-tight">Sources</h1>
		<span class="text-sm text-muted-foreground">{wikiStore.sources.length} sources</span>
	</div>
	<div class="table-area">
		{#snippet row(item: SourceEntry)}
			<div class="border-b border-border px-1 py-3">
				<p class="flex flex-wrap items-baseline gap-2 font-medium">
					{#if item.url}
						<a
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
						>
							{item.title}
						</a>
					{:else}
						<span>{item.title}</span>
					{/if}
					<span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
						>{item.kind}</span
					>
				</p>
				<p class="text-sm text-muted-foreground">
					{[item.authors, item.year, item.publisher].filter(Boolean).join(' · ') || '—'}
				</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Cited in {item.articles.length}
					{item.articles.length === 1 ? 'article' : 'articles'}:
					{#each item.articles as a, i (a.slug)}
						{#if i > 0}<span>, </span>{/if}<a
							href={href(`/${a.slug}`)}
							class="underline underline-offset-2">{a.title}</a
						>
					{/each}
				</p>
			</div>
		{/snippet}
		<DataTable
			items={wikiStore.sources}
			{columns}
			{facets}
			{row}
			ariaLabel="Sources"
			searchPlaceholder="Search sources by title, author, or publisher…"
			emptyTitle="No sources found"
			emptyDescription="Try a different search term or clear the active filters."
		/>
	</div>
</div>

<style>
	.sources-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}
	.header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.9rem;
		border-bottom: 1px solid var(--border);
	}
	.table-area {
		position: relative;
		overflow-y: auto;
		padding: 0.5rem 1rem;
		flex: 1;
		min-height: 0;
	}
</style>
