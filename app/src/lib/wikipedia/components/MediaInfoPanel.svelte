<script lang="ts">
	/**
	 * The `info` panel content + positioning for a `MediaLightbox` instance — shared by the
	 * Media page (`routes/media/+page.svelte`) and the in-article inline gallery
	 * (`content/editor/GalleryNodeView.svelte`), so an image's metadata is defined and rendered
	 * ONCE regardless of which lightbox it's viewed through, rather than each call site hand-
	 * rolling its own version of this markup (found live: the in-article gallery lightbox had
	 * no info button at all, only the Media page did).
	 *
	 * `MediaLightbox`'s `info` slot is `display:contents` by design (see its own reference
	 * story, `MediaLightbox.stories.svelte`) — it contributes no box of its own, so THIS
	 * component's root element supplies its own right-side-panel position/background. Without
	 * that, the panel toggles on (the button's `aria-pressed` flips, content mounts) but renders
	 * as an unstyled, unpositioned flow div with no background — invisible against the dark
	 * stage, reading as "nothing happens" (the exact bug this component's introduction fixed on
	 * the Media page first).
	 */
	interface Props {
		alt: string
		caption?: string
		credit?: string
		/** e.g. "Fig. 3-1" — a brochure-scan figure. */
		figureLabel?: string
		/** A credited photograph's own year (not shown for a brochure figure — `figureLabel`
		 *  already implies the brochure's publication date). */
		sourceYear?: number
		/** Pre-formatted ("Edited 3 days ago") — omit to hide that line entirely; the in-article
		 *  gallery lightbox omits it (you're already reading that article, its own edit date
		 *  isn't a useful per-image annotation the way it is on the cross-article Media page). */
		editedLabel?: string
		/** Both required together to show the "View article" link — omit both for the in-article
		 *  gallery lightbox, where you're already on that article. */
		articleHref?: string
		articleTitle?: string
	}
	let {
		alt,
		caption,
		credit,
		figureLabel,
		sourceYear,
		editedLabel,
		articleHref,
		articleTitle,
	}: Props = $props()
</script>

<div class="info-panel flex flex-col gap-2 text-sm">
	{#if caption}<p>{caption}</p>{/if}
	<p class="text-muted-foreground">{alt}</p>
	{#if credit}<p class="text-muted-foreground italic">{credit}</p>{/if}
	{#if figureLabel}
		<p class="text-muted-foreground">{figureLabel} — 2018 brochure</p>
	{:else if sourceYear}
		<p class="text-muted-foreground">{sourceYear}</p>
	{/if}
	{#if editedLabel}<p class="text-muted-foreground">Edited {editedLabel}</p>{/if}
	{#if articleHref && articleTitle}
		<a href={articleHref} class="underline underline-offset-2">
			View article: {articleTitle}
		</a>
	{/if}
</div>

<style>
	/* Same overlay tokens as the lightbox chrome itself (falls back to --background/
	   --foreground), not a hardcoded color, so it stays theme-correct. Bottom sheet on narrow
	   viewports instead of a cramped side panel. */
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
		/* MediaLightbox's header is z-index:3 and its nav arrows are z-index:2, both inside the
		   same stacking context (`.stage` doesn't isolate) — without an explicit z-index here
		   this panel paints BELOW that chrome wherever they geometrically overlap it (an
		   explicit z-index always wins over z-index:auto, regardless of DOM order), defeating
		   the "right-side panel" it's meant to be. Match the filmstrip slot's own z-index:3. */
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
