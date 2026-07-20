<script lang="ts">
	/**
	 * Round paging-arrow icon button (prev/next chevron) for a horizontally
	 * navigable surface. Internal sub-component (INTERNAL_SUBCOMPONENT_EXCEPTIONS
	 * in conformance.test.ts) shared by `MediaLightbox`'s stage nav and
	 * `HScroller`'s rail — never imported directly by app code.
	 *
	 * Hidden by default on a fine pointer (mouse/trackpad) until the CONSUMER
	 * reveals it — add `:global(.kit-nav-arrow:not(.kit-nav-arrow-inactive))`
	 * opacity rules under the consumer's own hover selector (Svelte's
	 * per-component style scoping means this component can't itself react to a
	 * hover state on an ancestor it doesn't own; see MediaLightbox's and
	 * HScroller's own stylesheets for the two real examples). Never shown on a
	 * coarse pointer (touch) at all — swipe/native-scroll is the touch affordance
	 * instead, so a visible arrow adds nothing there and would just be one more
	 * thing sitting on top of photo content.
	 *
	 * Visual sizing/color is deliberately left to each consumer via CSS custom
	 * properties (`--nav-arrow-size`, `--nav-arrow-inset`) plus a passed-through
	 * `class` for background/foreground/border, rather than baked in here — the
	 * two current consumers intentionally look different (a large translucent
	 * pill floating over arbitrary photo content vs. a small solid app-chrome
	 * pill with a border), and forcing one shared visual would fight one of them.
	 */
	import { cn } from '@kit/ui/shadcn-utils'
	import ChevronLeft from '@lucide/svelte/icons/chevron-left'
	import ChevronRight from '@lucide/svelte/icons/chevron-right'

	interface Props {
		/** 'prev' positions left + a left-chevron; 'next' positions right + a right-chevron. */
		direction: 'prev' | 'next'
		onclick: () => void
		ariaLabel: string
		/** Lucide icon glyph size (px). */
		iconSize?: number
		/** Kept mounted but inert (opacity 0, inert to pointer) rather than
		 *  unmounted — e.g. HScroller's past-the-scroll-end case, where the arrow
		 *  may still hold keyboard focus — UNLESS it also holds keyboard focus, in
		 *  which case it's forced back to fully visible (WCAG 2.4.7: a focused
		 *  control must never be invisible). */
		inactive?: boolean
		onfocus?: () => void
		onblur?: () => void
		onwheel?: (e: WheelEvent) => void
		onmousedown?: (e: MouseEvent) => void
		tabindex?: number
		class?: string
	}
	let {
		direction,
		onclick,
		ariaLabel,
		iconSize = 22,
		inactive = false,
		onfocus,
		onblur,
		onwheel,
		onmousedown,
		tabindex,
		class: className,
	}: Props = $props()

	// Chevrons are a pointed shape, not a symmetric mass distribution: the
	// glyph's visual "weight" sits more toward its open (flat) side than its
	// pointed apex, so bounding-box-centering it (all `place-items: center`
	// below does) reads as visibly off-center once the icon is big enough for
	// the eye to notice — reported live, 2026-07-19, specifically on the
	// lightbox's larger (30px) arrows, not HScroller's smaller (22px, default)
	// ones. Same optical-alignment correction commonly applied to play-button
	// triangles: nudge the glyph a small fraction of its own size TOWARD its
	// point to visually re-center it. Scaling with `iconSize` keeps this a
	// sub-pixel no-op at HScroller's default size and only visible where it's
	// actually needed.
	const opticalNudge = $derived(Math.round(iconSize * 0.06))
</script>

<button
	type="button"
	class={cn('kit-nav-arrow', direction, className)}
	class:kit-nav-arrow-inactive={inactive}
	{onclick}
	{onfocus}
	{onblur}
	{onwheel}
	{onmousedown}
	{tabindex}
	aria-label={ariaLabel}
>
	{#if direction === 'prev'}
		<ChevronLeft
			size={iconSize}
			aria-hidden="true"
			style="transform: translateX(-{opticalNudge}px)"
		/>
	{:else}
		<ChevronRight
			size={iconSize}
			aria-hidden="true"
			style="transform: translateX({opticalNudge}px)"
		/>
	{/if}
</button>

<style>
	.kit-nav-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		display: grid;
		place-items: center;
		width: var(--nav-arrow-size, 2.5rem);
		height: var(--nav-arrow-size, 2.5rem);
		border: 0;
		border-radius: 50%;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}
	.kit-nav-arrow.prev {
		left: var(--nav-arrow-inset, 1rem);
	}
	.kit-nav-arrow.next {
		right: var(--nav-arrow-inset, 1rem);
	}
	/* Reveal-on-hover only makes sense where a hover concept exists — a coarse
	   (touch) pointer has none, and swipe/native scroll already covers touch nav,
	   so the arrow is dropped entirely there rather than shown-but-unreachable-
	   by-hover (which would just be permanently-invisible dead weight). A THIRD
	   `pointer: none` case exists per spec (no pointing device at all) — neither
	   media query below matches it, so `.kit-nav-arrow` falls through to its
	   un-media-gated base rule above with no `opacity`/`display` override,
	   i.e. plain CSS default `opacity: 1` — always visible. That's the safe
	   default for a device with nothing to hover with, so it's left
	   intentionally unhandled rather than special-cased. */
	@media (pointer: fine) {
		.kit-nav-arrow {
			opacity: 0;
		}
		.kit-nav-arrow:focus-visible {
			opacity: 1;
		}
	}
	@media (pointer: coarse) {
		.kit-nav-arrow {
			display: none;
		}
	}
	/* HScroller's past-the-scroll-end case: kept mounted (it may still hold
	   keyboard focus) but visually/pointer-wise inert. No opacity transition here
	   — the resting (non-focused) state must stay pixel-identical to unmounted. */
	.kit-nav-arrow-inactive {
		opacity: 0;
		pointer-events: none;
	}
	.kit-nav-arrow-inactive:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}
</style>
