<script lang="ts">
	/**
	 * Media library: every figure/gallery image across the article corpus, grouped by
	 * date (the owning article's `updatedAt`) — lifted from the photos app's day-grouped
	 * Library view (apps/photos/src/routes/+page.svelte + PhotoGrid). Real vendored images
	 * (`isRealImageSrc`) render as actual thumbnails; the mock corpus still gets
	 * Figure.svelte's placeholder-gradient treatment (no external images there). Clicking a
	 * tile opens it in a lightbox (same `MediaLightbox` composite `GalleryNodeView.svelte`
	 * uses) rather than navigating away — the source article is still one click from there.
	 */
	import { href } from '$lib/paths'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { MediaLightbox, type RevealItemOptions } from '@kit/ui'
	import type { MediaLightboxSlideContext } from '@kit/ui'
	import MediaGrid from '$lib/wikipedia/components/MediaGrid.svelte'
	import { isRealImageSrc } from '$lib/wikipedia/components/figureVisual'
	import { galleryPlaceholderSrc } from '$lib/wikipedia/components/galleryPlaceholder'
	import { editedLabel } from '$lib/wikipedia/data/types'
	import { REF_NOW } from '$lib/wikipedia/data/mock'

	let lightboxOpen = $state(false)
	let lightboxIndex = $state(0)

	function open(index: number) {
		lightboxIndex = index
		lightboxOpen = true
	}

	const current = $derived(wikiStore.media[lightboxIndex])
	const lightboxAlt = $derived(
		current
			? `Image ${lightboxIndex + 1} of ${wikiStore.media.length}: ${current.alt}, from ${current.articleTitle}`
			: '',
	)
	const lightboxTitle = $derived(current?.caption ?? current?.alt ?? '')

	// Fly-in/out animation: reveal (scroll into view if needed) the clicked tile in the
	// virtualized grid, then resolve its on-screen rect — mirrors Photos' own
	// PhotoBrowser.svelte's `flyRect`/`grid.reveal` pattern exactly (MediaGrid.svelte
	// forwards VirtualGrid's `revealItem`; VirtualGrid itself sets `id="tile-<i>"` on
	// every tile). `focus: reason === 'close'` — an OPEN-time reveal must leave the
	// lightbox's own just-opened dialog focus alone; only the CLOSE-time reveal should
	// hand focus back to the grid.
	let grid = $state<{ reveal: (i: number, opts?: RevealItemOptions) => void }>()
	function flyRect(reason: 'open' | 'close'): Promise<DOMRect | null> {
		const i = lightboxIndex
		return new Promise((resolve) => {
			grid?.reveal(i, {
				center: true,
				ifNeeded: true,
				margin: 80,
				focus: reason === 'close',
				onDone: () =>
					resolve(document.getElementById(`tile-${i}`)?.getBoundingClientRect() ?? null),
			})
		})
	}
</script>

<svelte:head><title>Media — Raschpëtzer</title></svelte:head>

<div class="media-page">
	<div class="header">
		<h1 class="text-2xl font-bold tracking-tight">Media</h1>
		<span class="text-sm text-muted-foreground">{wikiStore.media.length} images</span>
	</div>
	<div class="grid-area">
		<MediaGrid
			bind:this={grid}
			items={wikiStore.media}
			sections={wikiStore.mediaSections}
			scrollKey="media"
			onOpen={open}
		/>
	</div>
</div>

{#snippet slide(item: (typeof wikiStore.media)[number], ctx: MediaLightboxSlideContext)}
	<div data-testid="lightbox-img" class="absolute inset-0">
		<img
			src={isRealImageSrc(item.src)
				? item.src
				: galleryPlaceholderSrc(item.tone, 1600, item.ratio ?? 16 / 9)}
			srcset={isRealImageSrc(item.src) ? item.srcset : undefined}
			alt={lightboxAlt}
			draggable="false"
			style:transform={ctx.transform}
		/>
	</div>
{/snippet}

<!-- Never `{#if lightboxOpen}`-gate this: MediaLightbox manages its own mount/unmount so its
     close animation and `returnFocus` can run (same invariant as GalleryNodeView.svelte). -->
<MediaLightbox
	items={wikiStore.media}
	index={lightboxIndex}
	open={lightboxOpen}
	alt={lightboxAlt}
	title={lightboxTitle}
	prevLabel="Previous image"
	nextLabel="Next image"
	onClose={() => (lightboxOpen = false)}
	onIndex={(i) => (lightboxIndex = i)}
	{flyRect}
	openAnimation="fly"
	{slide}
	infoLabel="Source article"
>
	{#snippet info(item: (typeof wikiStore.media)[number])}
		<div class="flex flex-col gap-2 text-sm">
			{#if item.caption}<p>{item.caption}</p>{/if}
			<p class="text-muted-foreground">{item.alt}</p>
			{#if item.credit}<p class="text-muted-foreground italic">{item.credit}</p>{/if}
			<p class="text-muted-foreground">Edited {editedLabel(item.updatedAt, REF_NOW)}</p>
			<a href={href(`/${item.articleSlug}`)} class="underline underline-offset-2">
				View article: {item.articleTitle}
			</a>
		</div>
	{/snippet}
</MediaLightbox>

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
