<script lang="ts">
	/**
	 * Media library: every figure/gallery image across the article corpus, grouped by
	 * date (the owning article's `updatedAt`) — lifted from the photos app's day-grouped
	 * Library view (apps/photos/src/routes/+page.svelte + PhotoGrid), swapping real
	 * thumbnails for Figure.svelte's placeholder-gradient treatment (this app draws no
	 * external images). Clicking a tile opens the source article.
	 */
	import { goto } from '$app/navigation'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import MediaGrid from '$lib/wikipedia/components/MediaGrid.svelte'

	function open(index: number) {
		const item = wikiStore.media[index]
		if (item) goto(href(`/${item.articleSlug}`))
	}
</script>

<svelte:head><title>Media — Wikipedia</title></svelte:head>

<div class="media-page">
	<div class="header">
		<h1 class="text-2xl font-bold tracking-tight">Media</h1>
		<span class="text-sm text-muted-foreground">{wikiStore.media.length} images</span>
	</div>
	<div class="grid-area">
		<MediaGrid
			items={wikiStore.media}
			sections={wikiStore.mediaSections}
			scrollKey="media"
			onOpen={open}
		/>
	</div>
</div>

<style>
	.media-page {
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
	.grid-area {
		position: relative;
		overflow: hidden;
		padding: 0 0.5rem;
		flex: 1;
		min-height: 0;
	}
</style>
