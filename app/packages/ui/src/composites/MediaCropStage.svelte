<!--
	MediaCropStage — the runes-native crop surface (replaces Cropper.js's web components).
	Renders the source image (with an optional straighten/rotate CSS transform), a dark shade
	outside the crop, the crop stencil with a rule-of-thirds grid, and 8 drag handles. Pointer
	drag moves/resizes the stencil via the cropEngine; arrow keys nudge the focused stencil,
	Shift+arrow resizes from a chosen handle (press H to cycle it — see onStencilKey).

	Interaction model (stencil + handles + shade + grid) learned/adapted from svelte-chop-chop's
	CropOverlay/CropStencil/DragHandle/GridOverlay (MIT © 2026 We Are Singular —
	https://github.com/we-are-singular/svelte-chop-chop). Reimplemented on our cropEngine; no dep.
-->
<script lang="ts">
	import { prefersReducedMotion } from '../reducedMotion.svelte'
	import {
		rotateDeltaToImageSpace,
		pivotWithin,
		fillScaleAt,
		type Rect,
	} from './coordinateSystem'
	import type { CropEngine, ResizeHandle } from './cropEngine.svelte'

	interface Props {
		src: string
		engine: CropEngine
		/** Coarse rotation (90° steps, degrees). Image + shade + crop stencil rotate together as one
		 *  rigid unit (Apple-Photos style) — the crop box stays aligned to the image without any
		 *  change to the crop math itself. */
		rotation?: number
		/** Fine straighten tilt (degrees, typically ±45). Unlike `rotation`, this tilts ONLY the
		 *  image within a FIXED crop box (the box stays axis-aligned — that's the point of
		 *  straightening a level horizon), auto-zoomed (fillScale) about the crop box's own centre
		 *  so no transparent corners show through inside the box. */
		straighten?: number
		/** Mirror toggles — grouped with `rotation` on the SAME rigid unit (image + shade + stencil
		 *  flip together, same as they rotate together) since both are coarse, one-shot orientation
		 *  changes. Composed as the INNERMOST part of the rotator's transform (applied to the image's
		 *  own local content before the rotation reorients it as a whole) so the live preview matches
		 *  `mediaExport.ts`'s bake order exactly (rotate, then flip, in canvas-transform terms — the
		 *  innermost/last-applied operation in CSS is the first one applied to local content). */
		flipHorizontal?: boolean
		flipVertical?: boolean
		/** Fired when a move/resize interaction ends — the point to record a crop command. */
		onCropChange?: () => void
	}
	let {
		src,
		engine,
		rotation = 0,
		straighten = 0,
		flipHorizontal = false,
		flipVertical = false,
		onCropChange,
	}: Props = $props()

	let stageEl = $state<HTMLDivElement>()
	const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
	const HANDLE_LABEL: Record<ResizeHandle, string> = {
		nw: 'top-left corner',
		n: 'top edge',
		ne: 'top-right corner',
		e: 'right edge',
		se: 'bottom-right corner',
		s: 'bottom edge',
		sw: 'bottom-left corner',
		w: 'left edge',
	}
	const reduceMotion = $derived(prefersReducedMotion())

	// A diagonal handle's CSS cursor (nwse-resize/nesw-resize) is assigned by its LOCAL corner name
	// and doesn't know about the ambient mirror. When exactly ONE axis is flipped (XOR — both
	// flipped is a 180° rotation, which preserves diagonal-cursor correctness on its own), a local
	// 'nw' handle visually renders at the screen's top-RIGHT, where 'nesw-resize' is the
	// geometrically correct cursor, not 'nwse-resize' (found by expert review — the underlying
	// drag/resize math is unaffected, this is purely a hover-affordance mismatch).
	const crossFlipped = $derived(flipHorizontal !== flipVertical)
	function handleCursor(h: ResizeHandle): string | undefined {
		if (!crossFlipped) return undefined
		if (h === 'nw' || h === 'se') return 'nesw-resize'
		if (h === 'ne' || h === 'sw') return 'nwse-resize'
		return undefined
	}

	// Which handle Shift+Arrow resizes from (see onStencilKey). A mouse/touch user gets all 8
	// independent handles; a keyboard user only has one active at a time, cycled with H — without
	// this, Shift+Arrow always anchored at 'se' (bottom-right), so a keyboard user could never
	// resize from the other 7 handles at all (MINOR finding from the 2026-07-17 expert review).
	let keyboardResizeHandle = $state<ResizeHandle>('se')
	let handleAnnouncement = $state('')
	function cycleResizeHandle() {
		const i = HANDLES.indexOf(keyboardResizeHandle)
		keyboardResizeHandle = HANDLES[(i + 1) % HANDLES.length]
		handleAnnouncement = `Resize handle: ${HANDLE_LABEL[keyboardResizeHandle]}`
	}

	// The rotator (image + shade + stencil) is a rigid unit rotated about its own centre. At an odd
	// 90° step its on-screen bounding box swaps width/height, so scale it to fit the container
	// (Apple-Photos style — the canvas shrinks/grows to fit as it spins) rather than clip/underuse
	// the available space.
	const isQuarterTurn = $derived(((Math.round(rotation) % 180) + 180) % 180 === 90)
	const rotationFitScale = $derived.by(() => {
		const cs = engine.containerSize
		const ir = engine.imageRect
		if (!isQuarterTurn || ir.width <= 0 || ir.height <= 0 || cs.width <= 1) return 1
		return Math.min(cs.width / ir.height, cs.height / ir.width)
	})

	// Track container size → engine (drives the fitted imageRect + stencil geometry).
	$effect(() => {
		const el = stageEl
		if (!el) return
		const ro = new ResizeObserver(() => {
			const r = el.getBoundingClientRect()
			if (r.width > 0 && r.height > 0)
				engine.setContainerSize({ width: r.width, height: r.height })
		})
		ro.observe(el)
		return () => ro.disconnect()
	})

	const ir = $derived(engine.imageRect)
	const vr = $derived(engine.viewportRect)

	// While a crop move/resize is IN PROGRESS (pointer drag or a held arrow-key repeat burst), `vr`
	// changes on every intermediate tick — freeze straighten's reference rect to its value from
	// BEFORE the interaction started, so the tilted image stays visually stable while the box moves
	// (an ordinary crop already looks this way: the box moves over a static image). Released back to
	// the live `vr` the instant the interaction commits, for a single clean re-pivot/re-zoom that
	// matches what the bake will actually produce for the new crop (bug report: "when straighten is
	// active, cropping drifts the image" — the pivot was re-deriving from `vr` on every single
	// pointermove tick, so the image visibly swam mid-drag, not just once at the end).
	let straightenFrozenVr = $state<Rect | undefined>()
	const straightenVr = $derived(straightenFrozenVr ?? vr)

	// Straighten pivots about the CROP BOX's own centre (not the whole image's), so the fixed box
	// stays perfectly framed (no drift) regardless of where it sits within the image — but the
	// auto-zoom covers the FULL image rect `ir` from that same pivot (fillScaleAt), not just the
	// box, so the shaded surround still shows a dimmed continuation of the photo instead of real
	// gaps through to the stage background (bug report: off-centre crop box + straighten left
	// diagonal black corners, 2026-07-18 — `ir` always contains the crop box, so covering `ir`
	// covers the box too; see fillScaleAt's own doc comment).
	const straightenPivot = $derived(pivotWithin(straightenVr, ir))
	const straightenFill = $derived(
		fillScaleAt(straighten, straightenPivot, { width: ir.width, height: ir.height }),
	)

	// --- pointer drag (move the body, or resize from a handle) ---
	// Track the captured element + pointerId so release/cancel target the right node and a second
	// pointer can't drive a stale drag.
	let drag: {
		kind: 'move' | ResizeHandle
		x: number
		y: number
		el: HTMLElement
		pointerId: number
	} | null = null
	function onPointerDown(e: PointerEvent, kind: 'move' | ResizeHandle) {
		e.preventDefault()
		e.stopPropagation()
		const el = e.currentTarget as HTMLElement
		el.setPointerCapture(e.pointerId)
		drag = { kind, x: e.clientX, y: e.clientY, el, pointerId: e.pointerId }
		straightenFrozenVr = vr
	}
	// The rotator's transform is `rotate(rotation) scale(rotationFitScale) scaleX(flipH)
	// scaleY(flipV)` — flip is the INNERMOST op (applied to local content first), then the
	// quarter-turn fit-scale, rotation the OUTERMOST. Converting a screen delta back to the
	// image's own local frame must undo them in the OPPOSITE order: first undo the rotation
	// (rotateDeltaToImageSpace, a pure rotation — unaffected by the uniform scale, which commutes
	// with it), THEN divide out rotationFitScale (a screen pixel is `rotationFitScale` local
	// pixels at an odd 90° step — e.g. rotationFitScale 1.67 means a 100px on-screen drag must
	// move the crop box by only 60 local px, not 100; skipping this made every drag/resize at
	// 90°/270° overshoot or undershoot by exactly that factor — bug report, 2026-07-17), THEN
	// undo the flip by negating whichever axis is mirrored — same correction the pointer-drag and
	// keyboard-nudge paths both need, so it's shared here.
	function toLocalDelta(screenDelta: { x: number; y: number }) {
		const rotated = rotateDeltaToImageSpace(screenDelta, rotation)
		const scale = rotationFitScale || 1
		const d = { x: rotated.x / scale, y: rotated.y / scale }
		return {
			x: flipHorizontal ? -d.x : d.x,
			y: flipVertical ? -d.y : d.y,
		}
	}
	function onPointerMove(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.pointerId) return
		const screenDelta = { x: e.clientX - drag.x, y: e.clientY - drag.y }
		drag.x = e.clientX
		drag.y = e.clientY
		// The crop box is visually rotated (and possibly flipped) with the image (rotator transform
		// below); re-derive the delta in the image's OWN (unrotated, unflipped) frame so dragging
		// still feels natural on screen — e.g. "drag right" always visually moves the box right,
		// regardless of rotation/flip.
		const delta = toLocalDelta(screenDelta)
		if (drag.kind === 'move') engine.moveBy(delta)
		else engine.resizeBy(drag.kind, delta)
	}
	// End a drag. `commit` records a crop command (pointerup); a cancel (onpointercancel — OS
	// back-gesture, alt-tab mid-drag) resets state WITHOUT committing, so no stuck drag.
	function endDrag(commit: boolean, e: PointerEvent) {
		if (!drag || e.pointerId !== drag.pointerId) return
		drag.el.releasePointerCapture?.(drag.pointerId)
		drag = null
		straightenFrozenVr = undefined
		if (commit) onCropChange?.()
	}

	// --- keyboard: arrows move the crop, Shift+arrows resize it (a real keyboard resize path so a
	// keyboard user isn't limited to the numeric fields). Commit once on keyup so holding a key
	// (auto-repeat) is a single undo step, not one per repeat tick. H cycles which handle
	// Shift+Arrow resizes from (see `keyboardResizeHandle` above). ---
	function onStencilKey(e: KeyboardEvent) {
		if (e.key.toLowerCase() === 'h') {
			e.preventDefault()
			cycleResizeHandle()
			return
		}
		const step = 8 // viewport px
		const screenD = { x: 0, y: 0 }
		if (e.key === 'ArrowLeft') screenD.x = -step
		else if (e.key === 'ArrowRight') screenD.x = step
		else if (e.key === 'ArrowUp') screenD.y = -step
		else if (e.key === 'ArrowDown') screenD.y = step
		else return
		e.preventDefault()
		// Freeze on the FIRST tick of a repeat burst only (same reasoning as the pointer-drag path
		// above) — an auto-repeating held arrow key fires this on every tick, and re-freezing each
		// time would just track the live vr again, defeating the point.
		straightenFrozenVr ??= vr
		// same on-screen-direction correction as the pointer path above
		const d = toLocalDelta(screenD)
		if (e.shiftKey) engine.resizeBy(keyboardResizeHandle, d)
		else engine.moveBy(d)
	}
	function onStencilKeyUp(e: KeyboardEvent) {
		if (!e.key.startsWith('Arrow')) return
		straightenFrozenVr = undefined
		onCropChange?.()
	}
</script>

<div
	class="crop-stage"
	bind:this={stageEl}
	onpointermove={onPointerMove}
	onpointerup={(e) => endDrag(true, e)}
	onpointercancel={(e) => endDrag(false, e)}
>
	{#if src && ir.width > 0}
		<!-- The rotator: image + shade + stencil rotate together as ONE rigid unit (Apple-Photos
		     style) — the crop box stays perfectly aligned to the image with no change to the crop
		     math (vr/ir stay in the image's own unrotated frame; only this wrapper's CSS transform
		     changes). A quarter-turn also gets a compensating scale so the rotated bounding box fits
		     the container instead of overflowing. Transition animates rotate button clicks; instant
		     under reduced motion. -->
		<div
			class="rotator"
			class:animate={!reduceMotion}
			style:transform="rotate({rotation}deg) scale({rotationFitScale}) scaleX({flipHorizontal
				? -1
				: 1}) scaleY({flipVertical ? -1 : 1})"
		>
			<!-- the image: fitted to the container in the coarse-rotator's own frame, then tilted +
			     auto-zoomed IN PLACE for straighten, pivoted at the crop box's centre (transform-origin)
			     so the FIXED box (shade/stencil below) stays fully covered with no transparent
			     corners. No CSS transition here — this must track a live slider 1:1, not lag. -->
			<img
				class="crop-image"
				{src}
				alt=""
				draggable="false"
				style:left="{ir.x}px"
				style:top="{ir.y}px"
				style:width="{ir.width}px"
				style:height="{ir.height}px"
				style:transform-origin="{straightenPivot.x}px {straightenPivot.y}px"
				style:transform="rotate({straighten}deg) scale({straightenFill})"
			/>

			<!-- shade: four rects around the stencil (darkens everything outside the crop). Outer
			     edges pin to the stage with right:0 / bottom:0 so they always reach the container
			     edge (of the rotator, since shade/stencil live inside it). -->
			<div
				class="shade"
				style:left="0"
				style:right="0"
				style:top="0"
				style:height="{vr.y}px"
			></div>
			<div
				class="shade"
				style:left="0"
				style:right="0"
				style:top="{vr.y + vr.height}px"
				style:bottom="0"
			></div>
			<div
				class="shade"
				style:left="0"
				style:top="{vr.y}px"
				style:width="{vr.x}px"
				style:height="{vr.height}px"
			></div>
			<div
				class="shade"
				style:left="{vr.x + vr.width}px"
				style:right="0"
				style:top="{vr.y}px"
				style:height="{vr.height}px"
			></div>

			<!-- the crop stencil: draggable body + rule-of-thirds grid + 8 handles. It's a custom
			     interactive widget (pointer drag + arrow-key move) with a labelled group role and a
			     real keyboard path, so the non-interactive-role a11y hints don't apply. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="stencil"
				role="group"
				aria-roledescription="crop region"
				aria-label="Crop"
				aria-describedby="crop-stencil-help"
				tabindex="0"
				style:left="{vr.x}px"
				style:top="{vr.y}px"
				style:width="{vr.width}px"
				style:height="{vr.height}px"
				onpointerdown={(e) => onPointerDown(e, 'move')}
				onkeydown={onStencilKey}
				onkeyup={onStencilKeyUp}
			>
				<div class="grid" aria-hidden="true">
					<span style:left="33.33%"></span>
					<span style:left="66.66%"></span>
					<span style:top="33.33%"></span>
					<span style:top="66.66%"></span>
				</div>
				{#each HANDLES as h (h)}
					<span
						class="handle {h}"
						style:cursor={handleCursor(h)}
						onpointerdown={(e) => onPointerDown(e, h)}
						aria-hidden="true"
					></span>
				{/each}
			</div>
		</div>
		<span id="crop-stencil-help" class="sr-only">
			Arrow keys move the crop; Shift with arrow keys resizes it from the {HANDLE_LABEL[
				keyboardResizeHandle
			]} — press H to cycle which handle Shift+Arrow resizes. You can also use the Width and Height
			fields.
		</span>
		<!-- announces each H cycle so a keyboard/screen-reader user knows which handle Shift+Arrow
		     now targets (a mouse user sees this directly — all 8 handles are always visible). -->
		<span class="sr-only" role="status" aria-live="polite">{handleAnnouncement}</span>
	{/if}
</div>

<style>
	.crop-stage {
		position: relative;
		width: 100%;
		height: 100%;
		/* Deliberately NOT overflow:hidden: the fitted image/crop box routinely touches this box's
		 * own edge (canvas-frame, the call site's "measured container", sizes the image to fill
		 * it), so a handle's -7px offset (see .handle.* below) would get clipped right here before
		 * ever reaching the call site's own breathing-room padding (MediaEditor's `.canvas-wrap`,
		 * which reserves 2rem AROUND this component specifically so the handles have room — see its
		 * own comment). That outer overflow:hidden is the real containment boundary; this element
		 * only needs to size the rotator, not clip it (bug report: handles cut off/hard to grab,
		 * 2026-07-17). */
		touch-action: none;
		user-select: none;
	}
	.rotator {
		position: absolute;
		inset: 0;
		transform-origin: center center;
	}
	.rotator.animate {
		transition: transform 350ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.crop-image {
		position: absolute;
		pointer-events: none;
	}
	.shade {
		position: absolute;
		background: var(--crop-scrim);
		pointer-events: none;
	}
	.stencil {
		position: absolute;
		box-shadow: 0 0 0 1px var(--crop-stencil-border);
		cursor: move;
		outline: none;
	}
	.stencil:focus-visible {
		box-shadow:
			0 0 0 1px var(--crop-stencil-border),
			0 0 0 3px var(--ring);
	}
	.grid span {
		position: absolute;
		background: var(--crop-grid-line);
	}
	.grid span[style*='left'] {
		top: 0;
		bottom: 0;
		width: 1px;
	}
	.grid span[style*='top'] {
		left: 0;
		right: 0;
		height: 1px;
	}
	.handle {
		position: absolute;
		width: 14px;
		height: 14px;
		background: var(--crop-handle-fill);
		border-radius: 2px;
		box-shadow: 0 0 0 1px var(--crop-handle-shadow);
	}
	/* enlarge the pointer/touch hit area to ~30px around the 14px visual handle (WCAG 2.5.8) */
	.handle::before {
		content: '';
		position: absolute;
		inset: -8px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	.handle.nw {
		top: -7px;
		left: -7px;
		cursor: nwse-resize;
	}
	.handle.n {
		top: -7px;
		left: calc(50% - 7px);
		cursor: ns-resize;
	}
	.handle.ne {
		top: -7px;
		right: -7px;
		cursor: nesw-resize;
	}
	.handle.e {
		top: calc(50% - 7px);
		right: -7px;
		cursor: ew-resize;
	}
	.handle.se {
		bottom: -7px;
		right: -7px;
		cursor: nwse-resize;
	}
	.handle.s {
		bottom: -7px;
		left: calc(50% - 7px);
		cursor: ns-resize;
	}
	.handle.sw {
		bottom: -7px;
		left: -7px;
		cursor: nesw-resize;
	}
	.handle.w {
		top: calc(50% - 7px);
		left: -7px;
		cursor: ew-resize;
	}
</style>
