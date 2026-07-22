<script lang="ts">
	/**
	 * Sources: every citation across the article corpus in one sortable/filterable list —
	 * reconciled to match the upstream SupraAppKit wikipedia demo's own Sources page
	 * (`apps/wikipedia/src/routes/sources/+page.svelte`), itself lifted from Notes' DataTable
	 * reuse. Each row's action button (not the row itself) navigates to that citation's
	 * reference entry in its source article — a shared source cited by two articles
	 * deliberately produces two rows (see `data/sources.ts`'s own doc comment for why no
	 * cross-article dedup is attempted).
	 *
	 * Filters as a "Filters" button + collapsible panel of filter ROWS, not always-visible
	 * checkbox groups — `facetStyle="rows"` + `toolbarInCollapsible`, the same combination
	 * DataTable's own "Facets as filter rows, in a collapsible" story demonstrates: each
	 * facet becomes a `[field] [value] [remove]` row (`FilterRows`) inside a `Collapsible`
	 * triggered by a labelled Button + active-filter-count Badge, collapsed by default.
	 */
	import { goto } from '$app/navigation'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import { DataTable } from '@kit/ui'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import * as Tooltip from '@kit/ui/shadcn-components/ui/tooltip'
	import { ArrowUpRight, SquareArrowOutUpRight } from '@lucide/svelte'
	import { sourceColumns, sourceFacets } from '$lib/wikipedia/config/sources-table'
	import type { SourceItem } from '$lib/wikipedia/data/sources'

	// FIXED width for the actions column (not `auto`) — each row snippet renders its own
	// independent grid container (DataTable calls `row` once per item, not one shared
	// <table>), so an `auto`-sized last column computes a DIFFERENT width per row
	// depending on whether that row has one action button or two: the row with both
	// "Source" and "Reference" got a wider action column than every other row, visibly
	// misaligning the "Cited in" column between rows. A fixed width is identical for
	// every row regardless of how many buttons that particular row renders.
	const GRID_COLS =
		'grid-cols-[minmax(0,2fr)_minmax(0,1fr)_60px_minmax(0,1fr)_minmax(0,1fr)_76px]'

	function openReference(s: SourceItem) {
		goto(href(`/${s.articleSlug}#ref-${s.refIndex}`))
	}
</script>

<svelte:head><title>Sources — Raschpëtzer</title></svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
	<h1 class="mb-1 text-2xl font-bold tracking-tight">Sources</h1>
	<p class="mb-6 text-sm text-muted-foreground">
		{wikiStore.sources.length} citations across {wikiStore.sourceArticles.length} articles
	</p>

	<Tooltip.Provider>
		<DataTable
			items={wikiStore.sources}
			columns={sourceColumns}
			facets={sourceFacets}
			getRowId={(s) => s.id}
			ariaLabel="Sources"
			searchPlaceholder="Search sources by title, author, or publisher…"
			facetStyle="rows"
			toolbarInCollapsible
		>
			{#snippet row(s: SourceItem)}
				<div
					class="grid {GRID_COLS} items-center gap-x-3 border-b border-border px-2 py-2.5 text-sm"
				>
					<span class="truncate font-medium">{s.title}</span>
					<span class="truncate text-muted-foreground">{s.authors ?? '—'}</span>
					<span class="text-muted-foreground">{s.year ?? '—'}</span>
					<span class="truncate text-muted-foreground">{s.publisher ?? '—'}</span>
					<span class="truncate text-muted-foreground">{s.articleTitle}</span>
					<span class="flex items-center gap-1 justify-self-end">
						{#if s.url}
							<Tooltip.Root>
								<Tooltip.Trigger>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="outline"
											size="icon-sm"
											class="size-7"
											href={s.url}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="Open external source: {s.title}"
										>
											<SquareArrowOutUpRight
												class="size-3.5"
												aria-hidden="true"
											/>
										</Button>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content>Open source</Tooltip.Content>
							</Tooltip.Root>
						{/if}
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="secondary"
										size="icon-sm"
										class="size-7"
										aria-label="Go to reference in {s.articleTitle}"
										onclick={() => openReference(s)}
									>
										<ArrowUpRight class="size-3.5" aria-hidden="true" />
									</Button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>Go to reference</Tooltip.Content>
						</Tooltip.Root>
					</span>
				</div>
			{/snippet}
		</DataTable>
	</Tooltip.Provider>
</div>
