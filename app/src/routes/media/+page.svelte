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
		<!-- MediaLightbox's info slot is `display:contents` by design (docs/kit/components/
		     media-lightbox.md's "layered, not stacked" layout) — it contributes no box of its
		     own, so THIS root element must supply its own position/background, same as the
		     component's own reference story (MediaLightbox.stories.svelte's `info` snippet).
		     Without that, the panel toggles on (button `aria-pressed` flips, content mounts)
		     but renders as an unstyled, unpositioned flow div with no background — invisible
		     against the dark stage, reading as "nothing happens" (found live: the info button
		     appeared to do nothing at all). -->
		<div class="info-panel flex flex-col gap-2 text-sm">
			{#if item.caption}<p>{item.caption}</p>{/if}
			<p class="text-muted-foreground">{item.alt}</p>
			{#if item.credit}<p class="text-muted-foreground italic">{item.credit}</p>{/if}
			{#if item.figureLabel}
				<p class="text-muted-foreground">{item.figureLabel} — 2018 brochure</p>
			{:else if item.mediaDateInferred}
				<p class="text-muted-foreground">{new Date(item.mediaDate).getUTCFullYear()}</p>
			{/if}
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

	/* The lightbox's info slot is `display:contents` (see the snippet's own comment) — this
	   root element supplies its own right-side-panel position and background, matching
	   MediaLightbox's reference story. Same overlay tokens as the lightbox chrome itself
	   (falls back to --background/--foreground), not a hardcoded color, so it stays
	   theme-correct. Bottom sheet on narrow viewports instead of a cramped side panel — this
	   page never passes a filmstrip, so there's no bottom chrome to leave room for. */
	.info-panel {
		position: absolute;
		top: 3.25rem;
		right: 0;
		bottom: 0;
		width: min(320px, 100vw);
		overflow-y: auto;
		padding: 1rem;
		background: var(--media-lightbox-overlay-bg, var(--background));
		color: var(--media-lightbox-overlay-fg, var(--foreground));
		border-left: 1px solid var(--border);
		/* MediaLightbox's header is z-index:3 and its nav arrows are z-index:2, both inside
		   the same stacking context (`.stage` doesn't isolate) — without an explicit z-index
		   here this panel paints BELOW that chrome wherever they geometrically overlap it
		   (an explicit z-index always wins over z-index:auto, regardless of DOM order),
		   defeating the "right-side panel" it's meant to be. Match the filmstrip slot's own
		   z-index:3. */
		z-index: 3;
	}
	@media (max-width: 640px) {
		.info-panel {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: auto;
			max-height: 40vh;
			border-left: none;
			border-top: 1px solid var(--border);
		}
	}
</style>
