<script lang="ts">
	/**
	 * Generic horizontal-scroll chrome — domain-free, reusable across apps. Wraps
	 * arbitrary scrollable content (bring-your-own-data via the `content` snippet)
	 * with edge fades, hover-reveal prev/next paging arrows (auto-hidden at the
	 * ends, hidden until the rail is hovered on a fine pointer, never shown on
	 * touch — see NavArrow.svelte), reduced-motion-aware
	 * smooth scroll, and (unless `ariaHidden`) Left/Right keyboard paging.
	 *
	 * Extracted from the Photos Lightbox filmstrip (`LightboxFilmstrip.svelte`),
	 * which keeps its own item windowing/virtualization and delegates only this
	 * chrome. HScroller owns no data about what scrolls — it doesn't virtualize;
	 * a consumer with thousands of items still windows them itself and renders
	 * only the visible slice into `content` (see docs/backlog.md's "Shared
	 * virtualization primitive" note for why that isn't unified here).
	 */
	import { cn } from '@kit/ui/shadcn-utils'
	import { untrack, type Snippet } from 'svelte'
	import { prefersReducedMotion } from '../reducedMotion.svelte'
	import { getScroll, setScroll } from '../scrollMemory'
	import NavArrow from './NavArrow.svelte'

	interface Props {
		/** the scrollable content */
		content: Snippet
		/** total scrollable width in px, if known ahead of time — skips a DOM
		 *  `scrollWidth` measurement pass so edge-fade/arrow visibility reacts
		 *  immediately when content size changes for reasons that don't also
		 *  resize/scroll the track. Omit to fall back to measuring `scrollWidth`
		 *  opportunistically on scroll/resize. */
		contentWidth?: number
		/** left/right gradient fades over off-screen content (default true) */
		edgeFade?: boolean
		/** prev/next paging arrows — auto-hidden at the ends, hover-revealed on a
		 *  fine pointer, never shown on touch (default true) */
		arrows?: boolean
		/** fraction of the visible width an arrow/keyboard page moves (default 0.8) */
		pageBy?: number
		/** pointer-only chrome: root gets `aria-hidden`, controls are non-focusable
		 *  (`tabindex="-1"`) and no keyboard paging is attached. Use when the scroll
		 *  is a redundant enhancement over a real keyboard path elsewhere (the
		 *  filmstrip's case — Lightbox's own arrow-key nav already exists). */
		ariaHidden?: boolean
		/** accessible label for the scrollable region; required unless ariaHidden */
		ariaLabel?: string
		/** persists/restores scrollLeft under this key across unmount/remount,
		 *  via the shared @kit/ui scrollMemory store (same store VirtualGrid's
		 *  scrollKey and the persistScroll action use). */
		scrollKey?: string
		/** extra px inset from each scroll bound before edge-fade/arrow visibility
		 *  considers that direction "exhausted" (default 0). For a consumer that
		 *  reserves scrollable padding at both ends so an edge item can still reach
		 *  the visual center (a common "always-centered active item" carousel
		 *  technique) — without this, HScroller's raw scroll-bounds check would keep
		 *  showing an arrow/fade for reserved empty padding, not real content. */
		edgeInset?: number
		/** merges onto the root wrapper (rule 13). */
		class?: string
		/** merges onto the scrolling track — use for content padding/inset or an
		 *  entrance animation the generic chrome doesn't assume. */
		trackClass?: string
		/** fires on every scroll/resize with the track's current scroll position and
		 *  viewport width. HScroller owns the scrolling element, so a consumer that
		 *  needs to window/virtualize its own content (e.g. the filmstrip) reads its
		 *  live scroll state through here rather than reaching for the DOM node
		 *  directly. */
		onScroll?: (state: { scrollLeft: number; trackWidth: number; scrollWidth: number }) => void
	}
	let {
		content,
		contentWidth,
		edgeFade = true,
		arrows = true,
		pageBy = 0.8,
		ariaHidden = false,
		ariaLabel,
		scrollKey,
		edgeInset = 0,
		class: className,
		trackClass,
		onScroll,
	}: Props = $props()

	// Dev-only contract check (mirrors this repo's established "deferred prop
	// invariant" idiom — see composite-contract.md's deprecation-policy section):
	// a non-ariaHidden track is a focusable, keyboard-pageable region, so it needs
	// an accessible name. One-time, not reactive — this isn't a prop that flips at
	// runtime in practice; untrack signals that intentionally (silences Svelte's
	// state_referenced_locally warning for a deliberate initial-value-only read).
	untrack(() => {
		if (import.meta.env.DEV && !ariaHidden && !ariaLabel) {
			console.warn(
				'[HScroller] `ariaLabel` is required unless `ariaHidden` is set — otherwise the ' +
					'scroll track ships as a focusable, unlabeled region (WCAG 4.1.2).',
			)
		}
	})

	let trackEl = $state<HTMLDivElement>()
	let trackWidth = $state(0)
	let scrollLeft = $state(0)
	let measuredScrollWidth = $state(0)
	const scrollWidth = $derived(contentWidth ?? measuredScrollWidth)

	const canLeft = $derived(scrollLeft > edgeInset + 2)
	// guard on trackWidth>0 so it isn't spuriously true before the ResizeObserver
	// measures (which would flash the right fade/arrow for a frame on mount)
	const canRight = $derived(
		trackWidth > 0 && scrollLeft < scrollWidth - trackWidth - edgeInset - 2,
	)

	// Sync internal state WITHOUT persisting to scrollKey's store — used for the
	// two "just seed local state after a direct DOM write" call sites (this
	// effect's initial measurement, and the scrollKey-restore effect below).
	// Persisting there would race: whichever effect runs first (Svelte doesn't
	// guarantee mount-time effect order is meaningful to depend on) would read
	// the pre-restore scrollLeft (0) and clobber the OTHER effect's not-yet-
	// applied restore in the shared store before it ever reads it back. Only
	// genuine scroll/resize events (below) persist.
	//
	// `notify` (default true) additionally gates the onScroll callback — when a
	// consumer supplies BOTH scrollKey and onScroll, the mount effect's initial
	// call passes `false` so it doesn't fire onScroll with a transient pre-restore
	// value; the scrollKey-restore effect is guaranteed to run in the same mount
	// flush (lastRestoredKey starts undefined) and notifies with the correct,
	// already-restored value instead.
	function syncScrollState(notify = true) {
		if (!trackEl) return
		scrollLeft = trackEl.scrollLeft
		if (contentWidth == null) measuredScrollWidth = trackEl.scrollWidth
		if (notify) onScroll?.({ scrollLeft, trackWidth, scrollWidth })
	}

	function readScroll() {
		syncScrollState()
		if (trackEl && scrollKey) setScroll(scrollKey, scrollLeft)
	}

	// Mount/measure/observe — deliberately depends on `trackEl` ONLY (see the
	// untrack below). Kept separate from scrollKey-restore (next effect) so a
	// live scrollKey change can't also tear down/recreate the ResizeObserver —
	// same split VirtualGrid uses for the same reason (its dedicated scrollKey
	// effect vs. its ResizeObserver effect).
	$effect(() => {
		const el = trackEl
		if (!el) return
		trackWidth = el.clientWidth
		// untrack: syncScrollState() reads trackWidth/scrollWidth back (into the
		// onScroll payload) — without untrack, that read makes THIS effect depend
		// on state it just wrote, so the ResizeObserver's later write to trackWidth
		// (below) would retrigger this whole effect on every real resize: tearing
		// down/recreating the observer on every resize instead of only on genuine
		// mount/remount. Same self-dependency hazard VirtualGrid.svelte's mount
		// effect documents and avoids (see its ResizeObserver comment) — same fix
		// here. (syncScrollState, not readScroll — see its own doc comment above.)
		// notify=false when scrollKey is set: the scrollKey-restore effect below
		// runs in this same mount flush and will notify with the correct,
		// already-restored value — this call's scrollLeft is still the pre-restore
		// DOM value at this point.
		untrack(() => syncScrollState(!scrollKey))
		// Coalesce a resize burst into one update per frame, mirroring VirtualGrid's
		// ResizeObserver handling — avoids rebuilding on every callback during e.g. a
		// drag-resize of an ancestor.
		let raf = 0
		const ro = new ResizeObserver(() => {
			if (raf) return
			raf = requestAnimationFrame(() => {
				raf = 0
				trackWidth = el.clientWidth
				readScroll()
			})
		})
		ro.observe(el)
		return () => {
			if (raf) cancelAnimationFrame(raf)
			ro.disconnect()
		}
	})

	// scrollKey restore — its own effect, gated by lastRestoredKey (mirrors
	// VirtualGrid.svelte's identical guard) so it fires once per genuine
	// mount/scrollKey-change, not on every trackWidth write the effect above
	// makes. Un-gated, this would also tear down/recreate the ResizeObserver
	// (if combined with the effect above) or re-run its own restore on every
	// resize (if reading trackWidth un-untracked) — same self-dependency class
	// of bug as the one `untrack` fixes above, just via a different dependency.
	let lastRestoredKey: string | undefined
	$effect(() => {
		if (!scrollKey || !trackEl) return
		if (scrollKey === lastRestoredKey) return
		trackEl.scrollLeft = getScroll(scrollKey) ?? 0
		lastRestoredKey = scrollKey
		// syncScrollState, not readScroll — see its doc comment above (avoids
		// racing the OTHER mount-time effect's own initial sync over who writes
		// the store first).
		untrack(() => syncScrollState())
	})

	function page(dir: -1 | 1) {
		if (!trackEl) return
		trackEl.scrollBy({
			left: dir * trackWidth * pageBy,
			behavior: prefersReducedMotion() ? 'auto' : 'smooth',
		})
	}

	// The overlaid arrows sit over the track as siblings, so a wheel there would
	// be a dead zone — forward it to the track so scrolling over an arrow still works.
	function fwdWheel(e: WheelEvent) {
		if (!trackEl) return
		e.preventDefault()
		trackEl.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
	}

	// let a vertical mouse wheel scroll the horizontal track (trackpads can
	// already scroll it horizontally; this covers a plain wheel mouse)
	function onTrackWheel(e: WheelEvent) {
		if (!trackEl) return
		if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
			e.preventDefault()
			trackEl.scrollLeft += e.deltaY
		}
	}

	function onTrackKeydown(e: KeyboardEvent) {
		// don't hijack platform shortcuts (e.g. macOS Cmd+ArrowLeft "start of line")
		if (e.metaKey || e.ctrlKey || e.altKey) return
		// Content is bring-your-own-markup, and a consumer's item can itself be a text input
		// (or any element with native ArrowLeft/ArrowRight semantics — caret movement, text
		// selection, a <select>'s option cycling). This handler lives on the TRACK and sees
		// every keydown that bubbles up from inside it, so without this guard a keystroke aimed
		// at repositioning a caret inside a nested <input> gets hijacked into paging the whole
		// strip instead — the input's own arrow-key handling never runs (found by expert review:
		// the wikipedia app's gallery editor nests Alt/Caption/Credit text inputs directly inside
		// the track, and ArrowLeft/ArrowRight silently stopped moving the caret). Only page when
		// the key DIDN'T originate inside a control that owns these keys itself.
		const target = e.target as HTMLElement | null
		if (target?.closest('input, textarea, select, [contenteditable]')) return
		if (e.key === 'ArrowRight') {
			e.preventDefault()
			page(1)
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault()
			page(-1)
		}
	}

	// Keep a keyboard-focused arrow mounted past the moment canLeft/canRight would
	// otherwise unmount it (see the template below): removing a focused element
	// from the DOM drops focus to <body> per the HTML spec, silently losing a
	// keyboard user's place — and inside a focus-trapped dialog (e.g. Lightbox's
	// trapTab), a focus loss to <body> can let the browser's native Tab order
	// escape the trap entirely. In ariaHidden mode these never become true: the
	// arrows are tabindex="-1" (so Tab/keyboard focus can never land there at
	// all) AND mousedown suppresses mouse-click focus (see noFocus below) — so
	// this is a no-op there, zero behavior change for the filmstrip, the only
	// current consumer. (Assumes `arrows` itself doesn't flip true→false while a
	// focused instance is live — not exercised by any consumer today.)
	let leftFocused = $state(false)
	let rightFocused = $state(false)

	// Keep click-focus out of a pointer-only (ariaHidden) rail: clicking an arrow
	// would otherwise move focus onto a control that isn't in the accessibility
	// tree (axe aria-hidden-focus / WCAG 4.1.2). preventDefault on mousedown
	// suppresses the focus without blocking the click.
	function noFocus(e: MouseEvent) {
		e.preventDefault()
	}

	/**
	 * **Allowed imperative escape hatch** — centering on an externally-tracked
	 * position (e.g. the active item in a consumer-owned index) can't be expressed
	 * reactively: the consumer drives the *when*, and the track owns the scroll
	 * position. `contentX` is a pixel offset in content space (e.g. an item's
	 * center); HScroller computes the left-edge scroll target using its own
	 * measured track width, so the consumer never needs to know it. Domain-free:
	 * HScroller doesn't know about "items"/stride, only pixels. Use via
	 * `bind:this` then `hscroller.centerOn(px)`.
	 */
	export function centerOn(contentX: number, opts: { jump?: boolean } = {}): void {
		if (!trackEl) return
		// live read, not the cached $state `trackWidth` — this is a low-frequency
		// imperative call (not the hot scroll path), so the cost is negligible, and
		// a live read can't be stale in the narrow window between an actual layout
		// resize and the ResizeObserver's callback delivering the update.
		const target = Math.max(0, contentX - trackEl.clientWidth / 2)
		trackEl.scrollTo({
			left: target,
			behavior: opts.jump || prefersReducedMotion() ? 'auto' : 'smooth',
		})
	}
</script>

<div class={cn('hs-wrap', className)} aria-hidden={ariaHidden || undefined}>
	{#if edgeFade}
		<div class="hs-fade left" class:show={canLeft}></div>
		<div class="hs-fade right" class:show={canRight}></div>
	{/if}
	{#if arrows && (canLeft || leftFocused)}
		<NavArrow
			direction="prev"
			class="hs-arrow"
			inactive={!canLeft}
			iconSize={22}
			tabindex={ariaHidden ? -1 : undefined}
			ariaLabel="Scroll left"
			onmousedown={ariaHidden ? noFocus : undefined}
			onfocus={() => (leftFocused = true)}
			onblur={() => (leftFocused = false)}
			onwheel={fwdWheel}
			onclick={() => page(-1)}
		/>
	{/if}
	{#if arrows && (canRight || rightFocused)}
		<NavArrow
			direction="next"
			class="hs-arrow"
			inactive={!canRight}
			iconSize={22}
			tabindex={ariaHidden ? -1 : undefined}
			ariaLabel="Scroll right"
			onmousedown={ariaHidden ? noFocus : undefined}
			onfocus={() => (rightFocused = true)}
			onblur={() => (rightFocused = false)}
			onwheel={fwdWheel}
			onclick={() => page(1)}
		/>
	{/if}
	<!-- No ARIA widget role fits "generic scrollable content region" (the composite
	     content is arbitrary, bring-your-own-markup) — WAI-ARIA has no role for this,
	     so per rule 9 (document deviations the standard patterns don't cover) this is
	     a bare focusable div: tabindex makes it a tab stop for native keyboard-scroll
	     + our Left/Right paging enhancement, same convention widely used for scroll
	     regions (e.g. MDN's carousel examples). Deviation documented in hscroller.md. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class={cn('hs-track', trackClass)}
		bind:this={trackEl}
		tabindex={ariaHidden ? -1 : 0}
		aria-label={ariaHidden ? undefined : ariaLabel}
		onscroll={readScroll}
		onwheel={onTrackWheel}
		onkeydown={ariaHidden ? undefined : onTrackKeydown}
	>
		{@render content()}
	</div>
</div>

<style>
	.hs-wrap {
		position: relative;
		/* Without min-width:0 a full-width virtualized/overflowing track's automatic
		   minimum size is its (huge) content width, which blows out a flex/grid
		   ancestor. Constrain it so `.hs-track` (overflow-x:auto) clamps to its
		   container and scrolls. See LightboxFilmstrip's original comment — same fix. */
		min-width: 0;
	}
	.hs-track {
		position: relative;
		overflow-x: auto;
		scrollbar-width: none;
		/* swipe/drag the track without it chaining to page/history nav */
		overscroll-behavior-x: contain;
		outline: none;
	}
	.hs-track:focus-visible {
		box-shadow: inset 0 0 0 2px var(--ring);
	}
	.hs-track::-webkit-scrollbar {
		display: none;
	}
	/* Fade/arrow colors are CSS custom properties (a themeable surface, see the
	   component doc) defaulting to semantic tokens — kept off raw `background`/
	   `color` values so the composite itself stays token-pure (rule 8) while a
	   consumer with different chrome needs (e.g. the Lightbox filmstrip, which
	   pins these directly to the same --background/--foreground semantic tokens
	   MediaLightbox's own chrome (--media-lightbox-overlay-bg/--media-lightbox-overlay-fg) defaults to,
	   for visual consistency with the rest of the theme-adaptive viewer chrome —
	   same bg-with-background/fg-with-foreground pairing, not inverted) can
	   override them from an ancestor without forking the source. */
	.hs-fade {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 3.5rem;
		z-index: 2;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s ease;
	}
	.hs-fade.show {
		opacity: 1;
	}
	.hs-fade.left {
		left: 0;
		background: linear-gradient(to right, var(--hs-fade-color, var(--background)), transparent);
	}
	.hs-fade.right {
		right: 0;
		background: linear-gradient(to left, var(--hs-fade-color, var(--background)), transparent);
	}
	/* Structure (position/size/border-radius/cursor), the hover-reveal-on-fine-
	   pointer / hidden-on-touch behavior, and the inactive/focus-visible dance are
	   all owned by NavArrow itself (`.kit-nav-arrow`) — this only supplies the
	   HScroller-flavored visuals (a small solid app-chrome pill with a border) via
	   :global(), since NavArrow renders in ITS OWN component scope, not this
	   file's. See NavArrow.svelte's doc comment for why. */
	:global(.hs-arrow) {
		z-index: 3;
		--nav-arrow-size: 1.9rem;
		--nav-arrow-inset: 0.35rem;
		background: var(--hs-arrow-bg, var(--popover));
		color: var(--hs-arrow-fg, var(--popover-foreground));
		box-shadow: 0 0 0 1px var(--hs-arrow-border, var(--border));
	}
	:global(.hs-arrow:hover) {
		background: var(--hs-arrow-hover-bg, var(--accent));
	}
	:global(.hs-arrow:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	/* Reveal on hovering the rail — skip an arrow that's inactive (past the
	   scroll end): it has nothing to do even once visible, and re-showing it on
	   hover would contradict the boundary it's signaling. */
	.hs-wrap:hover :global(.kit-nav-arrow:not(.kit-nav-arrow-inactive)) {
		opacity: 1;
	}
</style>
