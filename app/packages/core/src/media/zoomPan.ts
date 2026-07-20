/**
 * Pure zoom/pan math for the Lightbox stage — the framework- and DOM-free
 * computations behind pinch/wheel/click zoom, drag-pan clamping, and letterbox
 * hit-testing. Extracted from `Lightbox.svelte` (same spirit as `wheelNav.ts`):
 * the component still owns all `$state`, the pointer/wheel handlers, and every
 * `getBoundingClientRect` read — it just feeds those numbers through here so the
 * geometry is unit-testable in isolation (the e2e/browser tests can't exercise a
 * pinch midpoint or a sub-pixel clamp).
 */

/** Clamp `v` into the inclusive range [lo, hi]. */
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/**
 * Clamp a pan offset so a scaled image can't be dragged off-screen. The image
 * fills the stage at scale 1 (`object-fit: contain`), so at scale `s` an edge
 * leaves the viewport past an offset of `(s - 1) / 2 × stage dimension`.
 */
export function clampPan(
	tx: number,
	ty: number,
	scale: number,
	stageWidth: number,
	stageHeight: number,
): [number, number] {
	const maxX = (stageWidth * (scale - 1)) / 2
	const maxY = (stageHeight * (scale - 1)) / 2
	return [clamp(tx, -maxX, maxX), clamp(ty, -maxY, maxY)]
}

/**
 * Keep a content anchor point fixed under the pointer as the scale changes
 * (focal-point zoom). `ax`/`ay` are the anchor's offset from the stage centre
 * (transform-origin), `startTx`/`startTy` the translation at the start of the
 * gesture, and `ratio` the new-over-start scale ratio. Returns the *unclamped*
 * translation — callers clamp (or not) exactly as the original call site did.
 *
 * Derivation: a content pixel at (u) relative to origin satisfies
 *   origin + u·startScale + startTx = anchor, and we want
 *   origin + u·newScale  + newTx    = anchor, which gives
 *   newTx = ax − (ax − startTx)·(newScale / startScale).
 */
export function anchoredPan(
	ax: number,
	ay: number,
	startTx: number,
	startTy: number,
	ratio: number,
): [number, number] {
	return [ax - (ax - startTx) * ratio, ay - (ay - startTy) * ratio]
}

/** The on-screen rect of a `contain`-fitted image inside its element box. */
export interface ContentRect {
	x0: number
	y0: number
	cw: number
	ch: number
}

/**
 * Given an image's natural dimensions and its element's bounding rect, compute
 * the rendered content rect under `object-fit: contain` (the letterboxed image
 * itself, excluding the empty bars). Used to tell an image click from a
 * letterbox/backdrop click.
 */
export function imageContentRect(
	naturalWidth: number,
	naturalHeight: number,
	rect: { left: number; top: number; width: number; height: number },
): ContentRect {
	const s = Math.min(rect.width / naturalWidth, rect.height / naturalHeight)
	const cw = naturalWidth * s
	const ch = naturalHeight * s
	return {
		x0: rect.left + (rect.width - cw) / 2,
		y0: rect.top + (rect.height - ch) / 2,
		cw,
		ch,
	}
}

/** Whether the point (x, y) lies within the content rect (inclusive edges). */
export function rectContains(box: ContentRect, x: number, y: number): boolean {
	return x >= box.x0 && x <= box.x0 + box.cw && y >= box.y0 && y <= box.y0 + box.ch
}
