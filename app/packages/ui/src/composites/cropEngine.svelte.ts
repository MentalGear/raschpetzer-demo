/**
 * Crop state machine for the MediaEditor — runes-native, no imperative web-component library.
 *
 * The crop rect is stored **normalized (0–1) in image space** as the source of truth (so it's
 * resolution/viewport-independent and exports at source pixels via mediaExport). The overlay reads
 * `viewportRect` for display and calls `moveBy`/`resizeBy` with viewport-pixel deltas.
 *
 * State-machine shape (setImageSize/setContainerSize, moveBy/resizeBy handle deltas, derived
 * coordinates) learned/adapted from **svelte-chop-chop** (`src/lib/core/crop-engine.svelte.ts`),
 * MIT © 2026 We Are Singular — https://github.com/we-are-singular/svelte-chop-chop. Reimplemented on
 * our coordinateSystem math; free-crop only (no aspect-ratio lock), which the light editor wants.
 */
import {
	fitImageToContainer,
	clampRect,
	resizeRect,
	denormalizeRect,
	type Rect,
	type Size,
	type Point,
} from './coordinateSystem'

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

export interface CropCoordinates {
	/** Crop rect in 0–1 image space (the serializable record). */
	normalized: Rect
	/** Crop rect in source image pixels (for mediaExport). */
	pixels: Rect
}

/** The default crop: the whole image, normalized. Exported so callers can reset to it explicitly
 *  (e.g. MediaEditor's undo-sync effect, when a command stack unwinds past every crop command back
 *  to "no crop set" — the engine itself only applies this default once, in `init`). */
export const FULL_CROP: Rect = { x: 0, y: 0, width: 1, height: 1 }
const FULL = FULL_CROP
const NORM_BOUNDS: Rect = { x: 0, y: 0, width: 1, height: 1 }
/** Minimum crop size as a fraction of the image (avoids a zero/degenerate selection). */
const MIN_NORM = 0.05

export function createCropEngine() {
	// $state.raw: every write is a wholesale reassignment (never mutated in place), and these are
	// tiny plain objects — the project convention for reassign-only values (svelte-core-bestpractices).
	let imageSize = $state.raw<Size>({ width: 1, height: 1 }) // source natural size
	let containerSize = $state.raw<Size>({ width: 1, height: 1 })
	let cropNorm = $state.raw<Rect>({ ...FULL })
	let initialized = false

	/** The image's fitted (contain) rect within the container, in viewport pixels. */
	const imageRect = $derived(
		imageSize.width > 1 && containerSize.width > 1
			? fitImageToContainer(imageSize, containerSize)
			: { x: 0, y: 0, width: 0, height: 0 },
	)

	/** The crop rect in viewport pixels (for the overlay/stencil). */
	const viewportRect = $derived<Rect>({
		x: imageRect.x + cropNorm.x * imageRect.width,
		y: imageRect.y + cropNorm.y * imageRect.height,
		width: cropNorm.width * imageRect.width,
		height: cropNorm.height * imageRect.height,
	})

	const coordinates = $derived<CropCoordinates>({
		normalized: cropNorm,
		pixels: denormalizeRect(cropNorm, imageSize),
	})

	function clampNorm(r: Rect): Rect {
		const width = Math.max(MIN_NORM, Math.min(r.width, 1))
		const height = Math.max(MIN_NORM, Math.min(r.height, 1))
		return clampRect({ x: r.x, y: r.y, width, height }, NORM_BOUNDS)
	}

	return {
		get imageRect() {
			return imageRect
		},
		get viewportRect() {
			return viewportRect
		},
		get coordinates() {
			return coordinates
		},
		get imageSize() {
			return imageSize
		},
		get containerSize() {
			return containerSize
		},
		setImageSize(s: Size) {
			imageSize = s
		},
		setContainerSize(s: Size) {
			containerSize = s
		},
		/** Seed the crop from a saved normalized rect (reopen), or default to the full image. */
		init(saved?: Rect) {
			if (initialized) return
			cropNorm = saved ? clampNorm(saved) : { ...FULL }
			initialized = true
		},
		/** Set the crop directly in normalized space (numeric fields / undo-redo). */
		setNormalized(n: Rect) {
			cropNorm = clampNorm(n)
		},
		/** Move the crop by a viewport-pixel delta. */
		moveBy(delta: Point) {
			const ir = imageRect
			if (ir.width <= 0) return
			cropNorm = clampNorm({
				...cropNorm,
				x: cropNorm.x + delta.x / ir.width,
				y: cropNorm.y + delta.y / ir.height,
			})
		},
		/** Resize the crop by dragging `handle` with a viewport-pixel delta. Pins the anchored edge
		 *  (resizeRect), so the un-dragged edge never jumps at the image bounds. */
		resizeBy(handle: ResizeHandle, delta: Point) {
			const ir = imageRect
			if (ir.width <= 0) return
			cropNorm = resizeRect(
				cropNorm,
				handle,
				{ x: delta.x / ir.width, y: delta.y / ir.height },
				NORM_BOUNDS,
				MIN_NORM,
			)
		},
	}
}

export type CropEngine = ReturnType<typeof createCropEngine>
