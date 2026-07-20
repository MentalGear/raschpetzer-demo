/**
 * Coordinate-system math for the MediaEditor — pure, framework-agnostic (no Svelte/DOM).
 *
 * Crop rects are stored in **normalized (0–1) image space**, so an edit is resolution- and
 * viewport-independent (fixes the canvas-relative-coordinate problem the Cropper.js slice had —
 * a persisted crop reopens correctly at any size, and export happens at source pixels).
 *
 * Geometry approach learned/adapted from **svelte-chop-chop** (`src/lib/core/coordinate-system.ts`),
 * MIT © 2026 We Are Singular — https://github.com/we-are-singular/svelte-chop-chop. Reimplemented
 * here (no dependency); tests are adapted from theirs (see coordinateSystem.test.ts).
 */

export interface Point {
	x: number
	y: number
}
export interface Size {
	width: number
	height: number
}
export interface Rect {
	x: number
	y: number
	width: number
	height: number
}

/** Viewport point → normalized image space (0–1), relative to the image's on-screen rect. */
export function viewportToImage(point: Point, imageRect: Rect): Point {
	if (imageRect.width <= 0 || imageRect.height <= 0)
		throw new Error('imageRect must have positive width and height')
	return {
		x: (point.x - imageRect.x) / imageRect.width,
		y: (point.y - imageRect.y) / imageRect.height,
	}
}

/** Normalized image-space point (0–1) → viewport coordinates. */
export function imageToViewport(point: Point, imageRect: Rect): Point {
	return {
		x: imageRect.x + point.x * imageRect.width,
		y: imageRect.y + point.y * imageRect.height,
	}
}

/** Rect in image pixels → normalized (0–1) rect. */
export function normalizeRect(rect: Rect, imageSize: Size): Rect {
	if (imageSize.width <= 0 || imageSize.height <= 0)
		throw new Error('imageSize must have positive width and height')
	return {
		x: rect.x / imageSize.width,
		y: rect.y / imageSize.height,
		width: rect.width / imageSize.width,
		height: rect.height / imageSize.height,
	}
}

/** Normalized (0–1) rect → rect in image pixels. */
export function denormalizeRect(rect: Rect, imageSize: Size): Rect {
	return {
		x: rect.x * imageSize.width,
		y: rect.y * imageSize.height,
		width: rect.width * imageSize.width,
		height: rect.height * imageSize.height,
	}
}

/** Clamp a rect to stay within `bounds` (shrinking if larger, then repositioning). */
export function clampRect(rect: Rect, bounds: Rect): Rect {
	const width = Math.min(rect.width, bounds.width)
	const height = Math.min(rect.height, bounds.height)
	const x = Math.max(bounds.x, Math.min(rect.x, bounds.x + bounds.width - width))
	const y = Math.max(bounds.y, Math.min(rect.y, bounds.y + bounds.height - height))
	return { x, y, width, height }
}

export type AspectAnchor = 'center' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

/** Shrink a rect to a target aspect ratio (width/height), anchored (default: centered). */
export function fitRectToAspectRatio(
	rect: Rect,
	ratio: number,
	anchor: AspectAnchor = 'center',
): Rect {
	if (ratio <= 0) throw new Error('ratio must be positive')
	let newWidth = rect.width
	let newHeight = rect.height
	if (rect.width / rect.height > ratio) newWidth = rect.height * ratio
	else newHeight = rect.width / ratio
	const dx = rect.width - newWidth
	const dy = rect.height - newHeight
	const size = { width: newWidth, height: newHeight }
	switch (anchor) {
		case 'n':
			return { x: rect.x + dx / 2, y: rect.y, ...size }
		case 's':
			return { x: rect.x + dx / 2, y: rect.y + dy, ...size }
		case 'e':
			return { x: rect.x + dx, y: rect.y + dy / 2, ...size }
		case 'w':
			return { x: rect.x, y: rect.y + dy / 2, ...size }
		case 'nw':
			return { x: rect.x, y: rect.y, ...size }
		case 'ne':
			return { x: rect.x + dx, y: rect.y, ...size }
		case 'sw':
			return { x: rect.x, y: rect.y + dy, ...size }
		case 'se':
			return { x: rect.x + dx, y: rect.y + dy, ...size }
		case 'center':
		default:
			return { x: rect.x + dx / 2, y: rect.y + dy / 2, ...size }
	}
}

/** Resize a rect by dragging a handle (any of n/s/e/w in `handle`) by `delta`, keeping the
 *  **anchored** (un-dragged) edges fixed and clamping each dragged edge independently to `bounds`
 *  and a minimum size. Unlike `clampRect` (which repositions the whole rect), this never moves the
 *  edge the user isn't dragging — the correct semantics for a resize handle. */
export function resizeRect(
	rect: Rect,
	handle: string,
	delta: Point,
	bounds: Rect,
	min: number,
): Rect {
	let left = rect.x
	let right = rect.x + rect.width
	let top = rect.y
	let bottom = rect.y + rect.height
	const bLeft = bounds.x
	const bRight = bounds.x + bounds.width
	const bTop = bounds.y
	const bBottom = bounds.y + bounds.height
	// each dragged edge moves within [anchor ± min, bound]; the opposite edge stays put
	if (handle.includes('e')) right = Math.min(bRight, Math.max(left + min, right + delta.x))
	if (handle.includes('w')) left = Math.max(bLeft, Math.min(right - min, left + delta.x))
	if (handle.includes('s')) bottom = Math.min(bBottom, Math.max(top + min, bottom + delta.y))
	if (handle.includes('n')) top = Math.max(bTop, Math.min(bottom - min, top + delta.y))
	return { x: left, y: top, width: right - left, height: bottom - top }
}

/** The centre of `rect`, expressed relative to `container`'s own origin (i.e. in the coordinate
 *  frame you'd use for that container's own `transform-origin`). Used to pivot the straighten
 *  tilt+zoom about the CROP BOX's centre rather than the whole image's centre. */
export function pivotWithin(rect: Rect, container: Rect): Point {
	return {
		x: rect.x + rect.width / 2 - container.x,
		y: rect.y + rect.height / 2 - container.y,
	}
}

/** Auto-fill scale for rotating a `size`-sized box by `angleDeg` about an arbitrary (not
 *  necessarily centred) `pivot` within it, so the WHOLE box still covers itself afterwards — no
 *  gaps at any of its 4 corners. Generalizes `mediaEdit.ts`'s `fillScale` (which only handles a
 *  pivot at the box's own centre, giving the closed-form `cos|θ| + max(ar,1/ar)·sin|θ|`) to an
 *  off-centre pivot: the closed form assumes the box is symmetric around the rotation centre, so
 *  it silently under-covers whichever corners are farther from an off-centre pivot than others.
 *
 *  Used to auto-zoom MediaCropStage's straighten preview about the CROP BOX's centre (so content
 *  inside the box doesn't drift) while still covering the full image rect the shade dims down to —
 *  otherwise, whenever the crop box sits off-centre in the image (the common case after a prior
 *  crop/move), the corners farthest from the box show real gaps through to the stage's background
 *  instead of a dimmed continuation of the photo (bug report, 2026-07-18).
 *
 *  Since `size`'s own corners are always at least as far from `pivot` as any smaller box centred at
 *  the same `pivot` (e.g. the crop box), covering `size` from `pivot` also covers that smaller box —
 *  so this single call can replace a separate crop-box-only `fillScale` call, not just add to it.
 *
 *  Derivation: a point at box-local offset `(u,v)` from `pivot`, after `scale(S) rotate(θ)` (CSS
 *  order, transform-origin `pivot`), lands at `pivot + S·R(θ)·(u,v)`. Requiring every corner of
 *  `size` (i.e. `(u,v) ∈ {±dLeft, ±dRight} × {±dTop, ±dBottom}`, the 4 signed distances from `pivot`
 *  to each edge) to be reachable from a point still within the UNSCALED box reduces — since
 *  `R(θ)` is linear and the reachable region is a box — to checking just those 4 corners against
 *  `R(−θ)`'s inverse image, per axis. Reduces exactly to `fillScale`'s closed form when `pivot` is
 *  `size`'s own centre (verified in coordinateSystem.test.ts). */
export function fillScaleAt(angleDeg: number, pivot: Point, size: Size): number {
	const rad = (angleDeg * Math.PI) / 180
	const cos = Math.cos(rad)
	const sin = Math.sin(rad)
	const dLeft = Math.max(pivot.x, 1e-6)
	const dRight = Math.max(size.width - pivot.x, 1e-6)
	const dTop = Math.max(pivot.y, 1e-6)
	const dBottom = Math.max(size.height - pivot.y, 1e-6)
	const corners: Point[] = [
		{ x: -dLeft, y: -dTop },
		{ x: dRight, y: -dTop },
		{ x: -dLeft, y: dBottom },
		{ x: dRight, y: dBottom },
	]
	let scale = 1
	for (const c of corners) {
		const rx = c.x * cos + c.y * sin
		const ry = -c.x * sin + c.y * cos
		const sx = rx >= 0 ? rx / dRight : -rx / dLeft
		const sy = ry >= 0 ? ry / dBottom : -ry / dTop
		scale = Math.max(scale, sx, sy)
	}
	return scale
}

/** Rotate a SCREEN-space pointer/keyboard delta into the image's UNROTATED local coordinate frame,
 *  for interpreting a drag/nudge measured on a crop preview that's visually rotated (CSS
 *  `rotate(angleDeg)`) about its own centre. Exact (no trig drift) for 90° steps — the only angles
 *  the rotate tool produces; falls back to trig for arbitrary angles (e.g. a future straighten tool).
 *
 *  Derivation: a screen point = R(θ)·local point, where R(θ) is the CSS rotation matrix
 *  (clockwise-positive in the y-down screen convention). So local = R(θ)⁻¹·screen = R(−θ)·screen:
 *  `local.x = screen.x·cosθ + screen.y·sinθ`, `local.y = −screen.x·sinθ + screen.y·cosθ`. */
export function rotateDeltaToImageSpace(delta: Point, angleDeg: number): Point {
	const norm = ((Math.round(angleDeg) % 360) + 360) % 360
	switch (norm) {
		case 0:
			return delta
		case 90:
			return { x: delta.y, y: -delta.x }
		case 180:
			return { x: -delta.x, y: -delta.y }
		case 270:
			return { x: -delta.y, y: delta.x }
		default: {
			const rad = (angleDeg * Math.PI) / 180
			const cos = Math.cos(rad)
			const sin = Math.sin(rad)
			return { x: delta.x * cos + delta.y * sin, y: -delta.x * sin + delta.y * cos }
		}
	}
}

/** Rect for an image fitted (contain / letterbox-pillarbox, centered) inside a container. */
export function fitImageToContainer(imageSize: Size, containerSize: Size): Rect {
	if (imageSize.width <= 0 || imageSize.height <= 0)
		throw new Error('imageSize must have positive dimensions')
	if (containerSize.width <= 0 || containerSize.height <= 0)
		throw new Error('containerSize must have positive dimensions')
	const imageAspect = imageSize.width / imageSize.height
	const containerAspect = containerSize.width / containerSize.height
	let width: number
	let height: number
	if (imageAspect > containerAspect) {
		width = containerSize.width
		height = width / imageAspect
	} else {
		height = containerSize.height
		width = height * imageAspect
	}
	return {
		x: (containerSize.width - width) / 2,
		y: (containerSize.height - height) / 2,
		width,
		height,
	}
}
