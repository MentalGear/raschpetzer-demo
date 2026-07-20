/**
 * Tests for the crop rect state machine (init/clamp/moveBy/resizeBy). A `.svelte.test.ts` file
 * (not `.test.ts`) so it runs under the "client" vitest project (see vite.config.ts) — the module
 * uses runes ($state.raw/$derived) and needs a real reactive context.
 *
 * Scope note: this covers cropEngine's OWN behavior in isolation. The undo/redo-to-"no crop set"
 * regression (`65d21e2`) lives in MediaEditor's own engine-sync `$effect` (always calling
 * `engine.setNormalized(currentEdit.crop ? toRect(currentEdit.crop) : FULL_CROP)`), not in this
 * file — what belongs here is the invariant that effect relies on: `setNormalized(FULL_CROP)`
 * must reset the engine to the full image regardless of whatever rect was set before it (see the
 * "reset to FULL_CROP" describe block below).
 */
import { describe, it, expect } from 'vitest'
import { createCropEngine, FULL_CROP, type ResizeHandle } from './cropEngine.svelte'
import type { Rect } from './coordinateSystem'

// A 1000×1000 source image fitted into a 500×500 (square) container gives an imageRect of exactly
// {x:0, y:0, width:500, height:500} (fitImageToContainer, equal aspect ratios) — 1 normalized unit
// == 500 viewport px, which keeps the arithmetic in every test below easy to hand-verify.
function makeEngine(saved?: Parameters<ReturnType<typeof createCropEngine>['init']>[0]) {
	const engine = createCropEngine()
	engine.setImageSize({ width: 1000, height: 1000 })
	engine.setContainerSize({ width: 500, height: 500 })
	engine.init(saved)
	return engine
}

// Rect fields are floating-point (normalized-space division/addition), so compare field-by-field
// with a tolerance rather than a brittle exact toEqual.
function expectRectClose(actual: Rect, expected: Rect, precision = 9) {
	expect(actual.x).toBeCloseTo(expected.x, precision)
	expect(actual.y).toBeCloseTo(expected.y, precision)
	expect(actual.width).toBeCloseTo(expected.width, precision)
	expect(actual.height).toBeCloseTo(expected.height, precision)
}

describe('init', () => {
	it('defaults to FULL_CROP with no saved rect', () => {
		const engine = makeEngine()
		expectRectClose(engine.coordinates.normalized, FULL_CROP)
	})

	it('seeds from a saved normalized rect', () => {
		const saved = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
		const engine = makeEngine(saved)
		expectRectClose(engine.coordinates.normalized, saved)
	})

	it('clamps an out-of-bounds saved rect', () => {
		// x/y=2 is way outside [0,1] — clampNorm must reposition it back inside bounds.
		const engine = makeEngine({ x: 2, y: 2, width: 0.5, height: 0.5 })
		expectRectClose(engine.coordinates.normalized, { x: 0.5, y: 0.5, width: 0.5, height: 0.5 })
	})

	it('only applies once — a second init() call is a no-op', () => {
		const engine = createCropEngine()
		engine.setImageSize({ width: 1000, height: 1000 })
		engine.setContainerSize({ width: 500, height: 500 })
		engine.init({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 })
		engine.init({ x: 0.5, y: 0.5, width: 0.1, height: 0.1 }) // must be ignored
		expectRectClose(engine.coordinates.normalized, { x: 0.1, y: 0.1, width: 0.2, height: 0.2 })
	})
})

describe('clampNorm (via setNormalized)', () => {
	it('clamps below the minimum size up to MIN_NORM (0.05)', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0.5, y: 0.5, width: 0.01, height: 0.01 })
		expectRectClose(engine.coordinates.normalized, {
			x: 0.5,
			y: 0.5,
			width: 0.05,
			height: 0.05,
		})
	})

	it('clamps above 1 back down to the full image dimension', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0, y: 0, width: 1.5, height: 1.5 })
		expectRectClose(engine.coordinates.normalized, FULL_CROP)
	})

	it('repositions a valid-size rect that overhangs the bounds', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0.9, y: 0.9, width: 0.3, height: 0.3 })
		// width/height (0.3) stay put; x/y get pulled back so x+width / y+height <= 1.
		expectRectClose(engine.coordinates.normalized, { x: 0.7, y: 0.7, width: 0.3, height: 0.3 })
	})

	it('clamps a negative position back to 0', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: -0.2, y: -0.2, width: 0.4, height: 0.4 })
		expectRectClose(engine.coordinates.normalized, { x: 0, y: 0, width: 0.4, height: 0.4 })
	})
})

describe('moveBy', () => {
	it('applies a viewport-pixel delta as a normalized shift', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 })
		// imageRect is 500×500, so a 50/25px delta is 0.1/0.05 normalized.
		engine.moveBy({ x: 50, y: 25 })
		expectRectClose(engine.coordinates.normalized, { x: 0.3, y: 0.25, width: 0.3, height: 0.3 })
	})

	it('clamps the move at the image bounds without changing size', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0.6, y: 0.6, width: 0.3, height: 0.3 })
		// +0.2 normalized would put x at 0.8 (x+width = 1.1) — clamped back to 0.7.
		engine.moveBy({ x: 100, y: 100 })
		expectRectClose(engine.coordinates.normalized, { x: 0.7, y: 0.7, width: 0.3, height: 0.3 })
	})

	it('is a no-op while the image has no fitted rect yet (ir.width <= 0)', () => {
		// Deliberately skip setImageSize/setContainerSize — imageRect derives to a zero rect,
		// so moveBy must bail out rather than divide by zero / corrupt cropNorm.
		const engine = createCropEngine()
		engine.init()
		engine.moveBy({ x: 999, y: 999 })
		expectRectClose(engine.coordinates.normalized, FULL_CROP)
	})
})

describe('resizeBy', () => {
	const start = { x: 0.2, y: 0.2, width: 0.3, height: 0.3 } // left/top=0.2, right/bottom=0.5

	it('se: grows from the bottom-right, anchoring the top-left corner', () => {
		const engine = makeEngine()
		engine.setNormalized(start)
		engine.resizeBy('se', { x: 50, y: 50 }) // +0.1 normalized each axis
		expectRectClose(engine.coordinates.normalized, { x: 0.2, y: 0.2, width: 0.4, height: 0.4 })
	})

	it('nw: grows from the top-left, anchoring the bottom-right corner', () => {
		const engine = makeEngine()
		engine.setNormalized(start)
		engine.resizeBy('nw', { x: -50, y: -50 }) // -0.1 normalized each axis
		const r = engine.coordinates.normalized
		expectRectClose(r, { x: 0.1, y: 0.1, width: 0.4, height: 0.4 })
		// the un-dragged corner (bottom-right) must not have moved
		expect(r.x + r.width).toBeCloseTo(start.x + start.width)
		expect(r.y + r.height).toBeCloseTo(start.y + start.height)
	})

	it('e: single-axis handles only move their own edge', () => {
		const engine = makeEngine()
		engine.setNormalized(start)
		engine.resizeBy('e', { x: 50, y: 999 }) // y must be ignored by a pure-horizontal handle
		expectRectClose(engine.coordinates.normalized, { x: 0.2, y: 0.2, width: 0.4, height: 0.3 })
	})

	it('floors the size at MIN_NORM (0.05) — cannot shrink past the minimum', () => {
		const engine = makeEngine()
		engine.setNormalized(start)
		// a huge negative delta tries to collapse the box; the right edge stops at left+MIN_NORM.
		engine.resizeBy('e', { x: -1000, y: 0 })
		expectRectClose(engine.coordinates.normalized, { x: 0.2, y: 0.2, width: 0.05, height: 0.3 })
	})

	it('clamps the dragged edge at the image bound (1)', () => {
		const engine = makeEngine()
		engine.setNormalized(start)
		// a huge positive delta tries to push the right edge past the image's right edge.
		engine.resizeBy('e', { x: 1000, y: 0 })
		expectRectClose(engine.coordinates.normalized, { x: 0.2, y: 0.2, width: 0.8, height: 0.3 })
	})

	it('is a no-op while the image has no fitted rect yet (ir.width <= 0)', () => {
		const engine = createCropEngine()
		engine.init()
		engine.resizeBy('se', { x: 999, y: 999 })
		expectRectClose(engine.coordinates.normalized, FULL_CROP)
	})
})

describe('reset to FULL_CROP', () => {
	// The exact invariant MediaEditor's undo-sync effect depends on (bug history: 65d21e2 — undoing
	// past every crop command left the engine stuck at the last dragged rect instead of resetting).
	// cropEngine itself doesn't know about undo/redo; it only needs to guarantee that asking for the
	// full image, via setNormalized(FULL_CROP), always wins — regardless of any prior move/resize.
	it('setNormalized(FULL_CROP) resets cropNorm regardless of prior moveBy/resizeBy state', () => {
		const engine = makeEngine()
		engine.moveBy({ x: 200, y: 200 })
		engine.resizeBy('se', { x: -100, y: -100 })
		const moved = engine.coordinates.normalized
		expect(moved.x !== FULL_CROP.x || moved.width !== FULL_CROP.width).toBe(true) // sanity: it moved

		engine.setNormalized(FULL_CROP)
		expectRectClose(engine.coordinates.normalized, FULL_CROP)
	})

	it('resets even from an already-degenerate (min-size) rect', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0.4, y: 0.4, width: 0.01, height: 0.01 }) // clamps to MIN_NORM
		const degenerate = engine.coordinates.normalized
		expect(degenerate.width).toBeLessThan(FULL_CROP.width)

		engine.setNormalized(FULL_CROP)
		expectRectClose(engine.coordinates.normalized, FULL_CROP)
	})
})

describe('derived geometry', () => {
	it('coordinates.pixels denormalizes against the source image size', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 })
		expectRectClose(engine.coordinates.pixels, { x: 250, y: 250, width: 500, height: 500 })
	})

	it('viewportRect maps normalized crop space onto the fitted imageRect', () => {
		const engine = makeEngine()
		engine.setNormalized({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 })
		expectRectClose(engine.imageRect, { x: 0, y: 0, width: 500, height: 500 })
		expectRectClose(engine.viewportRect, { x: 100, y: 100, width: 150, height: 150 })
	})
})

// Exercise every handle at least once so a future change to resizeRect's per-handle wiring in
// cropEngine can't silently drop one direction (each still anchors its opposite edge/corner).
describe('resizeBy — every handle anchors its opposite edge', () => {
	const mid = { x: 0.3, y: 0.3, width: 0.4, height: 0.4 } // left/top=0.3, right/bottom=0.7
	const cases: { handle: ResizeHandle; delta: { x: number; y: number } }[] = [
		{ handle: 'n', delta: { x: 0, y: -50 } },
		{ handle: 's', delta: { x: 0, y: 50 } },
		{ handle: 'e', delta: { x: 50, y: 0 } },
		{ handle: 'w', delta: { x: -50, y: 0 } },
		{ handle: 'ne', delta: { x: 50, y: -50 } },
		{ handle: 'nw', delta: { x: -50, y: -50 } },
		{ handle: 'se', delta: { x: 50, y: 50 } },
		{ handle: 'sw', delta: { x: -50, y: 50 } },
	]
	for (const { handle, delta } of cases) {
		it(`${handle} keeps the rect within bounds and at/above MIN_NORM`, () => {
			const engine = makeEngine()
			engine.setNormalized(mid)
			engine.resizeBy(handle, delta)
			const r = engine.coordinates.normalized
			const eps = 1e-9
			expect(r.width).toBeGreaterThanOrEqual(0.05 - eps)
			expect(r.height).toBeGreaterThanOrEqual(0.05 - eps)
			expect(r.x).toBeGreaterThanOrEqual(0 - eps)
			expect(r.y).toBeGreaterThanOrEqual(0 - eps)
			expect(r.x + r.width).toBeLessThanOrEqual(1 + eps)
			expect(r.y + r.height).toBeLessThanOrEqual(1 + eps)
		})
	}
})
