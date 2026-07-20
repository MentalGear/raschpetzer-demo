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
	import { MediaLightbox } from '@kit/ui'
	import type { MediaLightboxSlideContext } from '@kit/ui'
	import MediaGrid from '$lib/wikipedia/components/MediaGrid.svelte'
	import { isRealImageSrc } from '$lib/wikipedia/components/figureVisual'
	import { galleryPlaceholderSrc } from '$lib/wikipedia/components/galleryPlaceholder'

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
</script>

<svelte:head><title>Media — Raschpëtzer Wiki</title></svelte:head>

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
	{slide}
	infoLabel="Source article"
>
	{#snippet info(item: (typeof wikiStore.media)[number])}
		<p class="text-sm">
			{#if item.credit}<span class="text-muted-foreground">{item.credit}</span><br />{/if}
			<a href={href(`/${item.articleSlug}`)} class="underline underline-offset-2">
				View article: {item.articleTitle}
			</a>
		</p>
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
