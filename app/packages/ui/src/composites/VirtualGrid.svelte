<script module lang="ts">
	/**
	 * Options for `revealItem`. Exported so wrappers (e.g. PhotoGrid/PhotoBrowser)
	 * forward the exact contract instead of re-declaring it and drifting.
	 */
	export type RevealItemOptions = {
		/** center the item in the viewport (default) vs. a minimal-edge scroll */
		center?: boolean
		/** animate the scroll (auto-downgraded under prefers-reduced-motion) */
		smooth?: boolean
		/** Skip scrolling entirely if the item is already visible — fully within the
		 *  viewport, or within `margin` px of it. Default `false` (always scroll to
		 *  the `center`/minimal-edge target, the pre-existing behavior). Use this for
		 *  "bring back into view if it wandered off-screen" callers (e.g. the Lightbox
		 *  close-fly target) that shouldn't re-center an item that's already visible. */
		ifNeeded?: boolean
		/** Tolerance (px) around the viewport edges counted as "already visible" when
		 *  `ifNeeded` is set — a small border region just outside the strict viewport
		 *  still counts as fine, not just the exact bounds. Default `0`. Ignored
		 *  unless `ifNeeded` is true. */
		margin?: number
		/** fired once the scroll settles (or immediately, if `ifNeeded` skipped the
		 *  scroll) — read the item's final rect here */
		onDone?: () => void
		/** Also move DOM focus to the grid (and mark the revealed item as the
		 *  active/focused one for keyboard nav + `aria-activedescendant`). Default
		 *  `true` — the pre-existing behavior, and what "return focus to the grid"
		 *  callers (e.g. the Lightbox close-fly reveal) want. Set `false` for a
		 *  reveal that only needs the resulting rect/scroll position, not a focus
		 *  change — e.g. measuring a fly-animation's ORIGIN rect while a different
		 *  element (a lightbox dialog) legitimately owns focus; stealing focus back
		 *  to the grid there left it receiving arrow-key keydowns meant for the
		 *  lightbox, silently scrolling the (hidden, behind the dialog) grid in
		 *  lockstep with lightbox navigation. */
		focus?: boolean
	}
</script>

<script lang="ts" generics="T">
	// Scroll position per `scrollKey` survives unmount/remount (e.g. navigating
	// between sidebar views and back). Memory lives in the shared kit store so this
	// and the `persistScroll` action are one primitive, not two duplicate impls.
	import { getScroll, setScroll } from '../scrollMemory'
	/**
	 * Generic virtualized justified/square grid with sticky section headers and a
	 * date/section scrubber — domain-free and reusable across apps.
	 *
	 * The grid owns layout, virtualization, keyboard a11y (aria-activedescendant
	 * so focus survives tile unmount), and the scrubber. Per-item visual content
	 * is supplied by the consumer via the `tile` snippet (bring-your-own-data).
	 *
	 * Domain-free: layout math + the Section type live in `@kit/core` (the kit's
	 * pure layer), not the app. No `$lib/photos` import here (enforced by eslint).
	 */
	import { cn } from '@kit/ui/shadcn-utils'
	import { tick, untrack, onDestroy, type Snippet } from 'svelte'
	import { prefersReducedMotion } from '../reducedMotion.svelte'
	import {
		buildGridModel,
		firstVisibleRow,
		squareGridModel,
		type GridModel,
		type Section,
	} from '@kit/core'

	interface Props {
		items: T[]
		sections: Section[]
		/** per-item content — receives the item, its index, and the tile rect */
		tile: Snippet<[T, number, { width: number; height: number }]>
		targetRowHeight?: number
		gap?: number
		/**
		 * Floor (px) under which a tile's width is never compressed, even at container
		 * widths too narrow to fit the greedily-packed tile count at `targetRowHeight`/
		 * `aspect` comfortably — the grid backs off to fewer, wider tiles for that row
		 * instead (see `@kit/core`'s `justifiedLayout`/`squareGridModel`). Defaults to a
		 * conservative 120px backstop below every existing per-surface CSS *minimum* in
		 * this codebase (People's avatar grid is 130px, Collections' cards 180px) — but
		 * NOT necessarily below a consumer's existing *density*: Photos' own photo wall
		 * already justifies tiles narrower than 120px by design, so it opts out entirely
		 * (`minTileWidth={0}` in `PhotoGrid.svelte`) rather than inherit this default.
		 * Don't assume 120 is safe for a new consumer without checking — compute the
		 * real crossover for its own props (see `NoteGrid.svelte`'s `minTileWidth={130}`,
		 * picked exactly that way, not by eyeballing a few sample widths). Set 0 to
		 * disable entirely (a deliberately dense, variable-tile wall).
		 */
		minTileWidth?: number
		/** aspect ratio (w/h) per item, used by the justified layout (ignored when square) */
		aspect?: (item: T, index: number) => number
		/** uniform square-cropped wall, ignores sections */
		square?: boolean
		/** accessible label for an individual cell */
		itemLabel?: (item: T, index: number) => string
		/** accessible label for the whole grid */
		ariaLabel?: string
		/** when set, the scroll position is remembered under this key and restored
		 *  on remount (e.g. returning to a sidebar view) */
		scrollKey?: string
		onActivate?: (index: number) => void
		/** Called when the user requests the context menu for a tile (right-click OR keyboard).
		 *  `x`/`y` are viewport coordinates suitable for anchoring a floating menu. */
		onContextMenu?: (d: { index: number; x: number; y: number }) => void
		/** Extra class(es) merged onto the root `.grid-wrap` element via `cn()`. */
		class?: string
	}
	let {
		items,
		sections,
		tile,
		targetRowHeight = 180,
		gap = 3,
		minTileWidth = 120,
		aspect = () => 1,
		square = false,
		itemLabel,
		ariaLabel,
		scrollKey,
		onActivate,
		onContextMenu,
		class: className,
	}: Props = $props()

	// Domain-free view the justified layout needs (one number per item).
	const sized = $derived(items.map((it, i) => ({ aspect: aspect(it, i) })))

	// Compact header box so the title hugs the photos it labels; the breathing
	// room goes ABOVE the header (SECTION_GAP) so each group reads as attached to
	// its own title rather than floating between groups.
	const HEADER_H = 34
	const SECTION_GAP = 28
	const OVERSCAN = 800

	let scroller = $state<HTMLDivElement>()
	let containerWidth = $state(0)
	let viewportHeight = $state(0)
	let scrollTop = $state(0)
	let scrubbing = $state(false)
	let scrubLabel = $state('')
	let focusedIndex = $state(0)
	let hasFocus = $state(false)

	// Observe the scroller's box directly (robust to layout changes that don't
	// alter the element's own dimensions in clientWidth/Height bind order).
	$effect(() => {
		const el = scroller
		if (!el) return
		// Seed synchronously so the first paint isn't blank (EMPTY model) before
		// the observer fires.
		const r0 = el.getBoundingClientRect()
		containerWidth = r0.width
		viewportHeight = r0.height
		// Coalesce resize bursts into one update per frame: a drag-resize fires
		// many callbacks, and each width change rebuilds the layout model — so
		// without this the model is rebuilt every frame of the drag. Also skip
		// no-op writes so an unchanged dimension never triggers a recompute.
		// Seed the pending values from `r0` (NOT from containerWidth/viewportHeight):
		// reading the state here would make it a dependency of the effect that writes
		// it, so every dimension change would re-run the effect and rebuild the
		// ResizeObserver + force a reflow. Seeding from r0 collapses the deps to
		// `{scroller}` — the observer is created once per element.
		let raf = 0
		let pendingW = r0.width
		let pendingH = r0.height
		const ro = new ResizeObserver((entries) => {
			const r = entries[0].contentRect
			pendingW = r.width
			pendingH = r.height
			if (raf) return
			raf = requestAnimationFrame(() => {
				raf = 0
				if (pendingW !== containerWidth) containerWidth = pendingW
				if (pendingH !== viewportHeight) viewportHeight = pendingH
			})
		})
		ro.observe(el)
		return () => {
			if (raf) cancelAnimationFrame(raf)
			ro.disconnect()
		}
	})

	// Coalesce rapid `targetRowHeight` changes (a size slider dragged, bits-ui fires
	// many ticks/sec) into one layout rebuild per frame — mirrors the ResizeObserver
	// coalescing above. Without it, each tick rebuilds the whole (up to 25k) model
	// synchronously. `appliedRowHeight` is what the model actually uses.
	// Seed from the initial prop only (untrack silences state_referenced_locally — the
	// $effect below owns all subsequent updates; this is a deliberate initial snapshot).
	let appliedRowHeight = $state(untrack(() => targetRowHeight))
	let rowHeightRaf = 0
	$effect(() => {
		const t = targetRowHeight // track the prop
		// Svelte runs the cleanup (which cancels+zeroes rowHeightRaf) before every re-run,
		// so rowHeightRaf is always 0 here — no need to guard on it, only on a no-op change.
		if (t === untrack(() => appliedRowHeight)) return
		rowHeightRaf = requestAnimationFrame(() => {
			rowHeightRaf = 0
			appliedRowHeight = targetRowHeight // apply the latest value once per frame
		})
		return () => {
			if (rowHeightRaf) cancelAnimationFrame(rowHeightRaf)
			rowHeightRaf = 0
		}
	})

	const EMPTY: GridModel = { rows: [], totalHeight: 0, sectionOffsets: [] }
	const model = $derived(
		containerWidth <= 0
			? EMPTY
			: square
				? squareGridModel(items.length, {
						containerWidth,
						targetSize: appliedRowHeight,
						gap,
						minTileWidth,
					})
				: buildGridModel(sized, sections, {
						containerWidth,
						targetRowHeight: appliedRowHeight,
						gap,
						headerHeight: HEADER_H,
						sectionGap: SECTION_GAP,
						minTileWidth,
					}),
	)

	// itemIndex -> its row index in model.rows (for keyboard nav / ensureVisible).
	// Built LAZILY on first keyboard use and cached by model identity — mouse-only
	// users never pay to build this (up to 25k entries) on every model rebuild.
	let _tileRowCache: { model: GridModel; map: Map<number, number> } | null = null
	function tileRowOf(): Map<number, number> {
		if (_tileRowCache?.model === model) return _tileRowCache.map
		// plain Map (not SvelteMap): a non-reactive lookup cache, never rendered
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map<number, number>()
		for (let r = 0; r < model.rows.length; r++) {
			const row = model.rows[r]
			if (row.type === 'photos') for (const t of row.tiles) map.set(t.itemIndex, r)
		}
		_tileRowCache = { model, map }
		return map
	}

	const visibleRows = $derived.by(() => {
		const rows = model.rows
		if (rows.length === 0) return []
		const top = scrollTop - OVERSCAN
		const bottom = scrollTop + viewportHeight + OVERSCAN
		const start = firstVisibleRow(rows, top)
		const out = []
		for (let i = start; i < rows.length; i++) {
			if (rows[i].y > bottom) break
			out.push(rows[i])
		}
		return out
	})

	// aria-activedescendant must reference a RENDERED element. Tiles are
	// virtualized, so only expose the id when the focused tile is in the mounted
	// window (keyboard nav scrolls it in via ensureVisible, so it resolves a frame
	// later). Prevents pointing AT (and AT announcing) an unmounted node.
	const activeId = $derived.by(() => {
		if (!hasFocus) return undefined
		const photoRows = visibleRows.filter((r) => r.type === 'photos')
		if (photoRows.length === 0) return undefined
		const first = photoRows[0].tiles[0].itemIndex
		const lastRow = photoRows[photoRows.length - 1].tiles
		const last = lastRow[lastRow.length - 1].itemIndex
		return focusedIndex >= first && focusedIndex <= last ? `tile-${focusedIndex}` : undefined
	})

	function sectionAt(top: number): number {
		const offs = model.sectionOffsets
		if (offs.length === 0) return 0
		let lo = 0,
			hi = offs.length - 1,
			ans = 0
		while (lo <= hi) {
			const mid = (lo + hi) >> 1
			if (offs[mid].y <= top + 1) {
				ans = mid
				lo = mid + 1
			} else hi = mid - 1
		}
		return ans
	}

	const stickyHeader = $derived.by(() => {
		const offs = model.sectionOffsets
		if (offs.length === 0) return null
		const sec = sections[offs[sectionAt(scrollTop)].section]
		return sec ? { title: sec.title, subtitle: sec.subtitle, count: sec.count } : null
	})

	function onScroll() {
		if (!scroller) return
		scrollTop = scroller.scrollTop
		if (scrollKey) setScroll(scrollKey, scrollTop)
	}

	// Restore the remembered scroll position once the model has real height (so the
	// target isn't clamped to 0). Keyed to `scrollKey`, not to mount — the same
	// VirtualGrid instance is reused across e.g. zoom switches with a changing
	// scrollKey, so we must restore (or reset to 0) whenever the key changes, not
	// only on first mount.
	let lastRestoredKey: string | undefined
	$effect(() => {
		if (!scrollKey || !scroller || model.totalHeight <= 0) return
		if (scrollKey === lastRestoredKey) return
		scroller.scrollTop = getScroll(scrollKey) ?? 0
		lastRestoredKey = scrollKey
	})

	// --- keyboard navigation (aria-activedescendant) ---
	async function ensureVisible(i: number) {
		const r = tileRowOf().get(i)
		if (r == null || !scroller) return
		const row = model.rows[r]
		const top = row.y - HEADER_H
		const bottom = row.y + row.height
		if (top < scrollTop) scroller.scrollTop = Math.max(0, top)
		else if (bottom > scrollTop + viewportHeight) scroller.scrollTop = bottom - viewportHeight
		await tick()
	}

	type TileLite = { itemIndex: number; x: number; width: number }
	function moveByRow(dir: 1 | -1) {
		const r = tileRowOf().get(focusedIndex)
		if (r == null) return
		const cur = (model.rows[r] as { tiles: TileLite[] }).tiles
		const curTile = cur.find((t) => t.itemIndex === focusedIndex)!
		const cx = curTile.x + curTile.width / 2
		let nr = r + dir
		while (nr >= 0 && nr < model.rows.length && model.rows[nr].type !== 'photos') nr += dir
		if (nr < 0 || nr >= model.rows.length) return
		const tiles = (model.rows[nr] as { tiles: TileLite[] }).tiles
		let best = tiles[0]
		let bestD = Infinity
		for (const t of tiles) {
			const d = Math.abs(t.x + t.width / 2 - cx)
			if (d < bestD) {
				bestD = d
				best = t
			}
		}
		focusedIndex = best.itemIndex
		ensureVisible(focusedIndex)
	}

	function onKeydown(e: KeyboardEvent) {
		const last = items.length - 1
		// Keyboard context-menu request: ContextMenu key OR Shift+F10 (WCAG 2.1.1).
		if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
			e.preventDefault()
			if (onContextMenu) {
				const tileEl = document.getElementById(`tile-${focusedIndex}`)
				if (tileEl) {
					const rect = tileEl.getBoundingClientRect()
					onContextMenu({
						index: focusedIndex,
						x: rect.left + rect.width / 2,
						y: rect.top + rect.height / 2,
					})
				}
			}
			return
		}
		switch (e.key) {
			case 'ArrowRight':
				focusedIndex = Math.min(last, focusedIndex + 1)
				ensureVisible(focusedIndex)
				break
			case 'ArrowLeft':
				focusedIndex = Math.max(0, focusedIndex - 1)
				ensureVisible(focusedIndex)
				break
			case 'ArrowDown':
				moveByRow(1)
				break
			case 'ArrowUp':
				moveByRow(-1)
				break
			case 'Home':
				focusedIndex = 0
				ensureVisible(0)
				break
			case 'End':
				focusedIndex = last
				ensureVisible(last)
				break
			case 'Enter':
			case ' ':
				onActivate?.(focusedIndex)
				break
			default:
				return
		}
		e.preventDefault()
	}

	// Set while `revealItem` focuses the scroller, so the focus-driven
	// `ensureVisible` (a minimal-edge scroll) doesn't race the reveal's own
	// centering scroll — reveal owns the scroll target here.
	let revealing = false

	function onGridFocus(e: FocusEvent) {
		hasFocus = true
		// Only auto-scroll to the active item when the grid CONTAINER itself receives
		// focus (Tab-in). focusin bubbles, so a click on a tile also fires this — and
		// at that point focusedIndex is still stale (onclick runs after focusin), which
		// would yank the scroll to the top. Don't scroll for child focus.
		if (e.target === scroller && !revealing) ensureVisible(focusedIndex)
	}

	/**
	 * **Allowed imperative escape hatch** — scroll-to-item and focus-return cannot
	 * be expressed reactively (the consumer needs to drive the *when*, and the grid
	 * owns the scroll position). Use via `bind:this={grid}` then `grid.revealItem(i)`.
	 * This is the kit's reference example of a justified imperative export: keep
	 * imperative exports rare, documented here and in the component doc, and reserved
	 * for actions that props + callbacks cannot express.
	 *
	 * Imperatively focus a given item and scroll it into view (same overscan as
	 * keyboard nav). Used to return focus to the photo a lightbox was showing when
	 * it closes (the consumer plays the close "hero" animation).
	 */
	export function revealItem(i: number, opts: RevealItemOptions = {}): void {
		const {
			center = true,
			smooth = false,
			ifNeeded = false,
			margin = 0,
			onDone,
			focus = true,
		} = opts
		if (i < 0 || i >= items.length) return onDone?.() // out of range — still settle the caller
		focusedIndex = i
		if (focus) {
			hasFocus = true
			// Focus the scroller for a11y, but suppress its focus-driven minimal-edge
			// scroll — the reveal's own centering scroll below is the authoritative one.
			revealing = true
			scroller?.focus()
			revealing = false
		}
		// Reveal always brings the item fully on-screen; `center` (default) puts it in
		// the MIDDLE of the viewport (what the lightbox wants when returning to a photo
		// that scrolled off), vs. the minimal-edge scroll keyboard nav uses.
		scrollToItem(i, center, smooth, onDone, ifNeeded, margin)
	}

	/** Fire `cb` once a programmatic scroll settles (scrollend, with a timeout
	 *  fallback for engines that don't emit it). Single-flight: a newer call
	 *  supersedes any pending settle so a superseded reveal's `onDone` can't fire. */
	let cancelPendingScrollEnd: (() => void) | null = null
	/** rAF handle for the jump-reveal settle (double-rAF), so unmount can cancel it. */
	let jumpSettleRaf = 0
	function waitForScrollEnd(el: HTMLElement, cb: () => void) {
		cancelPendingScrollEnd?.()
		let fired = false
		const finish = () => {
			if (fired) return
			fired = true
			el.removeEventListener('scrollend', finish)
			clearTimeout(t)
			cancelPendingScrollEnd = null
			cb()
		}
		el.addEventListener('scrollend', finish, { once: true })
		const t = setTimeout(finish, 800) // smooth scroll rarely runs longer than this
		cancelPendingScrollEnd = () => {
			fired = true // neutralize the superseded settle without firing its cb
			el.removeEventListener('scrollend', finish)
			clearTimeout(t)
		}
	}

	function scrollToItem(
		i: number,
		center: boolean,
		smooth: boolean,
		onDone?: () => void,
		ifNeeded = false,
		margin = 0,
	) {
		// Supersede any pending settle regardless of mode, so a new reveal (smooth OR
		// jump) can't let a previous reveal's onDone fire late.
		cancelPendingScrollEnd?.()
		if (!scroller) return onDone?.()
		const r = tileRowOf().get(i)
		if (r == null) return onDone?.()
		const row = model.rows[r]
		// `ifNeeded`: skip scrolling (and the caller's requested `center` target)
		// entirely if the item is already fully visible, within `margin` px of the
		// viewport edges — a "bring back into view only if it wandered off" gate for
		// callers that shouldn't re-center an already-visible item (e.g. the Lightbox
		// close-fly target, which re-measures the tile it's flying back to).
		if (ifNeeded) {
			const top = row.y - HEADER_H
			const bottom = row.y + row.height
			const alreadyVisible =
				top >= scrollTop - margin && bottom <= scrollTop + viewportHeight + margin
			if (alreadyVisible) return onDone?.()
		}
		const max = Math.max(0, model.totalHeight - viewportHeight)
		let target: number
		if (center) {
			// Center on the tile's VISUAL height: row.height folds in the bottom `gap`
			// (removed here) so the photo — not the padded row box — lands in the middle.
			// (A section's LAST row additionally folds in the inter-section gap, so it can
			// still center a few px high at a section boundary — within visual tolerance.)
			const tileH = Math.max(0, row.height - gap)
			target = row.y - (viewportHeight - tileH) / 2
		} else {
			// minimal-edge (same rule as ensureVisible)
			const top = row.y - HEADER_H
			const bottom = row.y + row.height
			target = scrollTop
			if (top < scrollTop) target = top
			else if (bottom > scrollTop + viewportHeight) target = bottom - viewportHeight
		}
		target = Math.min(max, Math.max(0, target))
		const useSmooth = smooth && !prefersReducedMotion()
		if (Math.abs(target - scroller.scrollTop) < 1) return onDone?.() // already there
		if (onDone) {
			if (useSmooth) waitForScrollEnd(scroller, onDone)
			// jump: settle after the paint so the caller can read the final rect. Track the
			// rAF handles so unmount can cancel them (onDestroy) — otherwise a grid destroyed
			// within two frames of a jump reveal still fires the consumer's onDone.
			else {
				if (jumpSettleRaf) cancelAnimationFrame(jumpSettleRaf)
				jumpSettleRaf = requestAnimationFrame(() => {
					jumpSettleRaf = requestAnimationFrame(() => {
						jumpSettleRaf = 0
						onDone()
					})
				})
			}
		}
		scroller.scrollTo({ top: target, behavior: useSmooth ? 'smooth' : 'auto' })
	}

	// --- section scrubber (slider) ---
	let scrubRaf = 0
	let pendingTarget = 0
	function applyScrub() {
		scrubRaf = 0
		if (!scroller) return
		scroller.scrollTop = pendingTarget
		scrubLabel = model.sectionOffsets[sectionAt(pendingTarget)]?.title ?? ''
	}
	function scrubToFrac(frac: number) {
		frac = Math.min(1, Math.max(0, frac))
		pendingTarget = frac * Math.max(0, model.totalHeight - viewportHeight)
		if (!scrubRaf) scrubRaf = requestAnimationFrame(applyScrub)
	}
	function scrubToClientY(clientY: number) {
		if (!scroller) return
		const rect = scroller.getBoundingClientRect()
		scrubToFrac((clientY - rect.top) / rect.height)
	}
	function onScrubStart(e: PointerEvent) {
		scrubbing = true
		;(e.target as HTMLElement).setPointerCapture(e.pointerId)
		scrubToClientY(e.clientY)
	}
	function onScrubMove(e: PointerEvent) {
		if (scrubbing) scrubToClientY(e.clientY)
	}
	function onScrubEnd() {
		scrubbing = false
	}

	// Unmount teardown: cancel any in-flight scroll-settle listener/timeout and the
	// scrub rAF so a component destroyed mid-reveal or mid-scrub leaves no leaked
	// timers/listeners firing against a detached scroller. ($effect cleanups already
	// handle the resize observer and rowHeight rAF.)
	onDestroy(() => {
		cancelPendingScrollEnd?.()
		if (scrubRaf) cancelAnimationFrame(scrubRaf)
		scrubRaf = 0
		if (jumpSettleRaf) cancelAnimationFrame(jumpSettleRaf)
		jumpSettleRaf = 0
	})
	function onScrubKey(e: KeyboardEvent) {
		const page = viewportHeight || 600
		const cur = scrollTop
		const max = Math.max(1, model.totalHeight - viewportHeight)
		let next = cur
		if (e.key === 'ArrowDown' || e.key === 'PageDown') next = cur + page
		else if (e.key === 'ArrowUp' || e.key === 'PageUp') next = cur - page
		else if (e.key === 'Home') next = 0
		else if (e.key === 'End') next = max
		else return
		e.preventDefault()
		if (scroller) scroller.scrollTop = Math.min(max, Math.max(0, next))
	}

	const scrubFrac = $derived(
		model.totalHeight > viewportHeight ? scrollTop / (model.totalHeight - viewportHeight) : 0,
	)
	const thumbFrac = $derived(
		model.totalHeight > 0 ? Math.min(1, viewportHeight / model.totalHeight) : 1,
	)
	const thumbTop = $derived(scrubFrac * (1 - thumbFrac))
</script>

<div class={cn('grid-wrap', className)}>
	<div
		class="scroller"
		bind:this={scroller}
		onscroll={onScroll}
		onkeydown={onKeydown}
		onfocusin={onGridFocus}
		onfocusout={(e) => {
			// only clear when focus leaves the grid entirely (focusin/out bubble, so
			// focusing a child tile keeps the grid 'focused' and keyboard nav live)
			if (!scroller?.contains(e.relatedTarget as Node | null)) hasFocus = false
		}}
		role="grid"
		tabindex="0"
		aria-label={ariaLabel ?? `Grid, ${items.length} items`}
		aria-activedescendant={activeId}
		data-testid="photo-grid-scroller"
	>
		<div class="spacer" style:height="{model.totalHeight}px">
			{#each visibleRows as row (row.type === 'header' ? `h${row.section}` : `r${row.tiles[0].itemIndex}`)}
				{#if row.type === 'header'}
					<div
						class="hdr"
						role="row"
						style:transform="translateY({row.y}px)"
						style:height="{HEADER_H}px"
					>
						<span class="hdr-title" role="gridcell">{row.title}</span>
						{#if row.subtitle}<span class="hdr-sub" role="gridcell">{row.subtitle}</span
							>{/if}
					</div>
				{:else}
					<!-- role="row" wrapper makes the grid ARIA-conform (grid > row > gridcell);
					     a zero-height static box so layout/pixels are unchanged (tiles are absolute). -->
					<div class="tile-row" role="row">
						{#each row.tiles as t (t.itemIndex)}
							<button
								id="tile-{t.itemIndex}"
								class="tile"
								class:active={hasFocus && focusedIndex === t.itemIndex}
								role="gridcell"
								tabindex="-1"
								style:--x="{t.x}px"
								style:--y="{row.y}px"
								style:width="{t.width}px"
								style:height="{t.height}px"
								onclick={() => {
									focusedIndex = t.itemIndex
									onActivate?.(t.itemIndex)
								}}
								oncontextmenu={(e) => {
									e.preventDefault()
									focusedIndex = t.itemIndex
									onContextMenu?.({
										index: t.itemIndex,
										x: e.clientX,
										y: e.clientY,
									})
								}}
								aria-label={itemLabel?.(items[t.itemIndex], t.itemIndex)}
							>
								{@render tile(items[t.itemIndex], t.itemIndex, {
									width: t.width,
									height: t.height,
								})}
							</button>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	</div>

	{#if stickyHeader}
		<div class="sticky-hdr" aria-hidden="true">
			<span class="hdr-title">{stickyHeader.title}</span>
			{#if stickyHeader.subtitle}<span class="hdr-sub">{stickyHeader.subtitle}</span>{/if}
		</div>
	{/if}

	<div
		class="scrubber touch-target"
		class:active={scrubbing}
		role="slider"
		tabindex="0"
		aria-label="Scroll through by section"
		aria-orientation="vertical"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(scrubFrac * 100)}
		aria-valuetext={model.sectionOffsets[sectionAt(scrollTop)]?.title ?? ''}
		onpointerdown={onScrubStart}
		onpointermove={onScrubMove}
		onpointerup={onScrubEnd}
		onpointercancel={onScrubEnd}
		onkeydown={onScrubKey}
	>
		<div
			class="thumb"
			style:top="{thumbTop * 100}%"
			style:height="{Math.max(6, thumbFrac * 100)}%"
		></div>
		{#if scrubbing}<div class="scrub-label">{scrubLabel}</div>{/if}
	</div>
</div>

<style>
	.grid-wrap {
		position: relative;
		height: 100%;
		width: 100%;
	}
	.scroller {
		height: 100%;
		width: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		contain: strict;
		outline: none;
	}
	.scroller:focus-visible {
		box-shadow: inset 0 0 0 2px var(--ring);
	}
	.scroller::-webkit-scrollbar {
		display: none;
	}
	.spacer {
		position: relative;
		width: 100%;
	}
	.hdr {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0 0.25rem;
	}
	.hdr-title {
		font-weight: 600;
		font-size: 1rem;
	}
	.hdr-sub {
		color: var(--muted-foreground);
		font-size: 0.82rem;
	}
	.tile {
		position: absolute;
		top: 0;
		left: 0;
		padding: 0;
		border: 0;
		margin: 0;
		background: var(--muted);
		overflow: hidden;
		cursor: pointer;
		border-radius: 2px;
		content-visibility: auto;
		/* Position via vars on `transform` (NOT transitioned — it changes on every
		   scroll reposition). The focus zoom uses the INDEPENDENT `scale` property,
		   which composes with `transform` and transitions on its own, so growing the
		   focused tile never animates/lags the scroll repositioning.
		   transform-origin is adjusted to the tile's visual center (accounting for
		   its --x/--y translation) so the scale expands in-place regardless of the
		   tile's position in the grid. Without this, scale amplifies the translation
		   offset and tiles far from the grid origin appear misplaced. */
		transform: translate(var(--x, 0px), var(--y, 0px));
		transform-origin: calc(50% + var(--x, 0px)) calc(50% + var(--y, 0px));
	}
	.tile.active {
		outline: 3px solid var(--ring);
		outline-offset: -3px;
		z-index: 1;
	}
	/* Motion (the subtle in-place grow) is gated at the COMPOSITE level — not relying
	   on the consuming app's global CSS reset — so a reduced-motion user gets the
	   outline focus indicator without the scale animation. Both keyboard-focus
	   (`.active`) and hover reuse the same `scale`; hover additionally requires a real
	   hover pointer (skip on touch). */
	@media (prefers-reduced-motion: no-preference) {
		.tile {
			transition: scale 0.18s ease;
		}
		.tile.active {
			/* lift the keyboard-focused tile a touch so it reads as selected */
			scale: 1.05;
		}
		@media (hover: hover) {
			.tile:hover {
				scale: 1.05;
				z-index: 1;
			}
		}
		/* Click/tap feedback: scale DOWN, not the app-wide translate "bounce"
		   (deliberately not used for grid tiles — keeps the same scale-based
		   language as hover/focus, just inverted). Declared last so a press
		   always wins over hover/focus scale while the pointer is held down. */
		.tile:active {
			scale: 0.96;
			transition-duration: 0.1s;
		}
	}
	.sticky-hdr {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.4rem 0.5rem;
		background: linear-gradient(var(--background) 65%, transparent);
		pointer-events: none;
	}
	.scrubber {
		position: absolute;
		top: 2px;
		right: 0;
		/* 24px hit target meets WCAG 2.5.8 (≥24×24 CSS px). The visual thumb stays a
		   6px sliver anchored 3px from the right edge; the extra width is a transparent
		   grab margin extending leftward, so the look is unchanged. */
		width: 24px;
		height: calc(100% - 4px);
		cursor: ns-resize;
		touch-action: none;
		outline: none;
	}
	.thumb {
		position: absolute;
		right: 3px;
		width: 6px;
		min-height: 28px;
		background: var(--muted-foreground);
		border-radius: 3px;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.scrubber:hover .thumb,
	.scrubber.active .thumb,
	.scrubber:focus-visible .thumb {
		opacity: 0.85;
	}
	.scrubber:focus-visible {
		box-shadow: inset -3px 0 0 var(--ring);
	}
	.scrub-label {
		position: absolute;
		right: 18px;
		top: 0;
		transform: translateY(-50%);
		background: var(--popover);
		color: var(--popover-foreground);
		border: 1px solid var(--border);
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 0.8rem;
		white-space: nowrap;
		pointer-events: none;
	}
</style>
