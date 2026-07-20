<!--
	MediaRedactLayer — the interactive redact/blur region editor, built on svelte-konva (Konva).
	Shows the SOURCE image (unaffected by the crop/rotate/straighten tools — a redaction is defined
	in full-image space and stays pinned to the content it covers regardless of how the output is
	later cropped/rotated, see mediaEdit.ts's `Redaction` doc comment) fitted into the available
	space, with each redaction rendered as a draggable/resizable Konva Rect + a shared Transformer
	for the selected one.

	Live preview is a labelled placeholder (semi-transparent + dashed border for blur/pixelate, a
	true opaque fill for solid) rather than a pixel-accurate blurred/pixelated render — Konva ships
	Blur/Pixelate filters, but they need an explicit `.cache()` invalidated on every resize to stay
	correct, which risks visible cache/perf glitches mid-drag for little payoff (the placeholder
	already communicates "this region will be obscured"). The EXPORT path (mediaExport.ts's
	`bakeRedactions`) still produces the real, pixel-accurate effect — the placeholder is a live-
	preview simplification, not a correctness gap in the baked result.

	Per docs/kit/components/media-editor-plan.md's a11y open question, this canvas is an ENHANCEMENT:
	MediaEditor's own numeric X/Y/W/H fields + Add/Delete buttons are the primary, fully keyboard-
	operable path for placing/adjusting a redaction; dragging here is a pointer-only convenience.
-->
<script lang="ts">
	import { Stage, Layer, Rect, Image as KonvaImage, Text, Transformer } from 'svelte-konva'
	import { fitImageToContainer, type Size } from './coordinateSystem'
	import { clampRedactionRect, REDACT_MIN_SIZE, type Redaction } from './mediaEdit'

	interface Props {
		/** Same blob URL MediaCropStage displays — loaded fresh here for Konva's own <Image>. */
		src: string
		/** The SOURCE image's natural pixel size (from cropEngine's `imageSize`). */
		imageSize: Size
		redactions: Redaction[]
		selectedIndex: number | null
		onSelect: (index: number | null) => void
		/** Fired once a drag/resize gesture ends — the point to record an `updateRedaction` command
		 *  (mirrors the crop stencil's own commit-on-release convention). */
		onCommit: (index: number, rect: { x: number; y: number; w: number; h: number }) => void
	}
	let { src, imageSize, redactions, selectedIndex, onSelect, onCommit }: Props = $props()

	let wrapEl = $state<HTMLDivElement>()
	let containerSize = $state<Size>({ width: 0, height: 0 })
	$effect(() => {
		const el = wrapEl
		if (!el) return
		const ro = new ResizeObserver(() => {
			const r = el.getBoundingClientRect()
			if (r.width > 0 && r.height > 0) containerSize = { width: r.width, height: r.height }
		})
		ro.observe(el)
		return () => ro.disconnect()
	})

	let imageEl = $state<HTMLImageElement>()
	$effect(() => {
		if (!src) return
		let cancelled = false
		const img = new Image()
		img.onload = () => {
			if (!cancelled) imageEl = img
		}
		// This `src` is the SAME blob URL MediaCropStage already displays (decoded successfully
		// before this component ever mounts), so a decode failure here isn't expected in practice —
		// but silently leaving `imageEl` unset forever (with no signal at all) on any unexpected
		// failure is still worth avoiding; at minimum, surface it for debugging.
		img.onerror = () => {
			if (!cancelled) console.error('MediaRedactLayer: failed to load', src)
		}
		img.src = src
		return () => {
			cancelled = true
		}
	})

	// The image's own displayed rect within the container (letterboxed/pillarboxed) — every
	// redaction's normalized [0,1] rect is denormalized against THIS, not the raw container, the
	// same "image space, not viewport space" convention the crop engine already uses.
	const imageRect = $derived.by(() => {
		if (imageSize.width <= 0 || imageSize.height <= 0) return null
		if (containerSize.width <= 0 || containerSize.height <= 0) return null
		return fitImageToContainer(imageSize, containerSize)
	})

	const REDACT_SOLID_FILL = '#0a0a0b'
	const PLACEHOLDER_FILL = 'rgba(10, 10, 11, 0.55)'
	const STYLE_LABEL: Record<Redaction['style'], string> = {
		blur: 'Blur',
		pixelate: 'Pixelate',
		solid: 'Solid',
	}

	// Konva-node refs (base `Node`, covers both Rect and the Transformer's own .nodes() input) keyed
	// by redaction index, so the Transformer can attach to whichever one is selected.
	let shapeNodes: Array<
		{ node: { x(): number; y(): number; width(): number; height(): number } } | undefined
	> = []
	let transformerRef = $state<{ node: import('konva/lib/shapes/Transformer').Transformer }>()

	$effect(() => {
		const t = transformerRef?.node
		if (!t) return
		const idx = selectedIndex
		const target = idx !== null ? shapeNodes[idx] : undefined
		t.nodes(target ? [target.node as never] : [])
		t.getLayer()?.batchDraw()
	})

	function boundToImage(pos: { x: number; y: number }, width: number, height: number) {
		const ir = imageRect
		if (!ir) return pos
		return {
			x: Math.min(Math.max(pos.x, ir.x), ir.x + ir.width - width),
			y: Math.min(Math.max(pos.y, ir.y), ir.y + ir.height - height),
		}
	}

	// Constrains a Transformer RESIZE gesture live, the same way `dragBoundFunc`/`boundToImage`
	// already constrains a plain move — without this, only `commitFromNode`'s clamp-on-release caught
	// an out-of-bounds resize, so the region could visibly extend past the image edge for the whole
	// gesture and only snap back at the very end (found by expert review).
	function boundTransformBox(
		_oldBox: { x: number; y: number; width: number; height: number; rotation: number },
		newBox: { x: number; y: number; width: number; height: number; rotation: number },
	) {
		const ir = imageRect
		if (!ir) return newBox
		// Floors AND ceilings: without the floor, a live resize could shrink a region to a near-zero
		// sliver with no resistance, then visibly SNAP back up to REDACT_MIN_SIZE the instant
		// `commitFromNode`'s own clamp runs on release (found by expert review, round 2) — the same
		// live-vs-commit desync round 1 already fixed for the max/edge case, just missed for the min.
		const width = Math.min(Math.max(newBox.width, REDACT_MIN_SIZE * ir.width), ir.width)
		const height = Math.min(Math.max(newBox.height, REDACT_MIN_SIZE * ir.height), ir.height)
		return {
			...newBox,
			width,
			height,
			x: Math.min(Math.max(newBox.x, ir.x), ir.x + ir.width - width),
			y: Math.min(Math.max(newBox.y, ir.y), ir.y + ir.height - height),
		}
	}

	// Reads the node's post-gesture geometry, CLAMPS it (the same `clampRedactionRect` the data layer
	// applies), then writes the clamped geometry back onto the node BEFORE reporting it via `onCommit`
	// — not the raw drag/resize result. Two reasons: (1) Transformer resizes via scale, not literal
	// width/height, so scale is normalized back to 1 here (the standard Konva pattern) so a SUBSEQUENT
	// resize starts from a clean baseline; (2) writing the clamped (not raw) values keeps the node and
	// the dispatched command in agreement even if a later Svelte prop-diff effect skips re-applying a
	// value that happens to already match what's on screen — e.g. an out-of-bounds resize that clamps
	// back to exactly the pre-drag size would otherwise leave the node visually holding the transient,
	// unclamped size until some unrelated prop change forced a resync (found by expert review).
	function commitFromNode(index: number, target: unknown) {
		const ir = imageRect
		if (!ir || ir.width <= 0 || ir.height <= 0) return
		const node = target as {
			x(): number
			y(): number
			width(): number
			height(): number
			scaleX(): number
			scaleY(): number
			setAttrs(attrs: Record<string, number>): void
		}
		const rawWidth = node.width() * node.scaleX()
		const rawHeight = node.height() * node.scaleY()
		const clamped = clampRedactionRect({
			x: (node.x() - ir.x) / ir.width,
			y: (node.y() - ir.y) / ir.height,
			w: rawWidth / ir.width,
			h: rawHeight / ir.height,
		})
		node.setAttrs({
			x: ir.x + clamped.x * ir.width,
			y: ir.y + clamped.y * ir.height,
			width: clamped.w * ir.width,
			height: clamped.h * ir.height,
			scaleX: 1,
			scaleY: 1,
		})
		onCommit(index, clamped)
	}
</script>

<div class="redact-layer" bind:this={wrapEl}>
	{#if imageRect && imageEl}
		<Stage width={containerSize.width} height={containerSize.height}>
			<Layer>
				<KonvaImage
					image={imageEl}
					x={imageRect.x}
					y={imageRect.y}
					width={imageRect.width}
					height={imageRect.height}
					listening={false}
				/>
				{#each redactions as r, i (i)}
					{@const rx = imageRect.x + r.x * imageRect.width}
					{@const ry = imageRect.y + r.y * imageRect.height}
					{@const rw = r.w * imageRect.width}
					{@const rh = r.h * imageRect.height}
					<Rect
						bind:this={shapeNodes[i]}
						x={rx}
						y={ry}
						width={rw}
						height={rh}
						fill={r.style === 'solid' ? REDACT_SOLID_FILL : PLACEHOLDER_FILL}
						stroke={i === selectedIndex ? '#4a90ff' : 'rgba(255, 255, 255, 0.85)'}
						strokeWidth={i === selectedIndex ? 2 : 1}
						dash={r.style === 'solid' ? undefined : [6, 4]}
						draggable
						dragBoundFunc={(pos: { x: number; y: number }) => boundToImage(pos, rw, rh)}
						onclick={() => onSelect(i)}
						ontap={() => onSelect(i)}
						onpointerclick={() => onSelect(i)}
						ondragend={(e) => commitFromNode(i, e.target)}
						ontransformend={(e) => commitFromNode(i, e.target)}
					/>
					{#if r.style !== 'solid' && rw > 40 && rh > 20}
						<Text
							x={rx}
							y={ry + rh / 2 - 7}
							width={rw}
							text={STYLE_LABEL[r.style]}
							fontSize={13}
							fill="#f2f2f7"
							align="center"
							listening={false}
						/>
					{/if}
				{/each}
				<Transformer
					bind:this={transformerRef}
					rotateEnabled={false}
					boundBoxFunc={boundTransformBox}
				/>
			</Layer>
		</Stage>
	{/if}
</div>

<style>
	.redact-layer {
		position: absolute;
		inset: 0;
	}
</style>
