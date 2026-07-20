/**
 * Tests adapted from svelte-chop-chop's `src/lib/core/coordinate-system.test.ts`
 * (MIT © 2026 We Are Singular — https://github.com/we-are-singular/svelte-chop-chop),
 * ported to our reimplementation in coordinateSystem.ts + extended with a few edge cases.
 */
import { describe, it, expect } from 'vitest'
import {
	fitImageToContainer,
	normalizeRect,
	denormalizeRect,
	clampRect,
	fitRectToAspectRatio,
	viewportToImage,
	imageToViewport,
} from './coordinateSystem'

describe('fitImageToContainer', () => {
	it('letterboxes a wide image in a tall container (centered)', () => {
		const r = fitImageToContainer({ width: 1920, height: 1080 }, { width: 400, height: 600 })
		expect(r.width).toBe(400)
		expect(r.height).toBeCloseTo(225)
		expect(r.x).toBe(0)
		expect(r.y).toBeCloseTo((600 - 225) / 2)
	})

	it('pillarboxes a tall image in a wide container (centered)', () => {
		const r = fitImageToContainer({ width: 1080, height: 1920 }, { width: 600, height: 400 })
		expect(r.height).toBe(400)
		expect(r.width).toBeCloseTo(225)
		expect(r.x).toBeCloseTo((600 - 225) / 2)
		expect(r.y).toBe(0)
	})

	it('throws on non-positive dimensions', () => {
		expect(() =>
			fitImageToContainer({ width: 0, height: 10 }, { width: 10, height: 10 }),
		).toThrow()
		expect(() =>
			fitImageToContainer({ width: 10, height: 10 }, { width: 10, height: 0 }),
		).toThrow()
	})
})

describe('normalizeRect / denormalizeRect', () => {
	it('normalizes a rect to 0–1', () => {
		const r = normalizeRect(
			{ x: 100, y: 200, width: 400, height: 300 },
			{ width: 800, height: 600 },
		)
		expect(r.x).toBe(0.125)
		expect(r.y).toBeCloseTo(0.333, 2)
		expect(r.width).toBe(0.5)
		expect(r.height).toBe(0.5)
	})

	it('denormalizes back to pixels', () => {
		const r = denormalizeRect(
			{ x: 0.125, y: 0.25, width: 0.5, height: 0.5 },
			{ width: 800, height: 600 },
		)
		expect(r).toEqual({ x: 100, y: 150, width: 400, height: 300 })
	})

	it('round-trips normalize → denormalize', () => {
		const size = { width: 1234, height: 987 }
		const rect = { x: 111, y: 222, width: 333, height: 444 }
		const back = denormalizeRect(normalizeRect(rect, size), size)
		expect(back.x).toBeCloseTo(rect.x)
		expect(back.y).toBeCloseTo(rect.y)
		expect(back.width).toBeCloseTo(rect.width)
		expect(back.height).toBeCloseTo(rect.height)
	})
})

describe('clampRect', () => {
	it('clamps a rect back inside bounds', () => {
		const r = clampRect(
			{ x: -10, y: -10, width: 100, height: 100 },
			{ x: 0, y: 0, width: 500, height: 500 },
		)
		expect(r).toEqual({ x: 0, y: 0, width: 100, height: 100 })
	})

	it('shrinks a rect that exceeds bounds', () => {
		const r = clampRect(
			{ x: 0, y: 0, width: 1000, height: 1000 },
			{ x: 0, y: 0, width: 500, height: 500 },
		)
		expect(r.width).toBe(500)
		expect(r.height).toBe(500)
	})

	it('repositions a rect that would overflow the far edge', () => {
		const r = clampRect(
			{ x: 480, y: 480, width: 100, height: 100 },
			{ x: 0, y: 0, width: 500, height: 500 },
		)
		expect(r.x).toBe(400) // 500 - 100
		expect(r.y).toBe(400)
	})
})

describe('fitRectToAspectRatio', () => {
	it('fits a wide rect to a square (centered)', () => {
		const r = fitRectToAspectRatio({ x: 0, y: 0, width: 200, height: 100 }, 1)
		expect(r).toEqual({ x: 50, y: 0, width: 100, height: 100 })
	})

	it('fits a tall rect to a square (centered)', () => {
		const r = fitRectToAspectRatio({ x: 0, y: 0, width: 100, height: 200 }, 1)
		expect(r).toEqual({ x: 0, y: 50, width: 100, height: 100 })
	})

	it('honors a corner anchor (nw stays put)', () => {
		const r = fitRectToAspectRatio({ x: 10, y: 10, width: 200, height: 100 }, 1, 'nw')
		expect(r).toEqual({ x: 10, y: 10, width: 100, height: 100 })
	})

	it('throws on a non-positive ratio', () => {
		expect(() => fitRectToAspectRatio({ x: 0, y: 0, width: 10, height: 10 }, 0)).toThrow()
	})
})

describe('viewport ↔ image', () => {
	const imageRect = { x: 50, y: 50, width: 200, height: 100 }
	it('viewportToImage maps into 0–1 space', () => {
		expect(viewportToImage({ x: 150, y: 75 }, imageRect)).toEqual({ x: 0.5, y: 0.25 })
	})
	it('imageToViewport is the inverse', () => {
		expect(imageToViewport({ x: 0.5, y: 0.25 }, imageRect)).toEqual({ x: 150, y: 75 })
	})
})

import { resizeRect } from './coordinateSystem'
const NB = { x: 0, y: 0, width: 1, height: 1 }

describe('resizeRect (pins the anchored edge)', () => {
	it('dragging the E handle past the bound caps width, LEFT edge stays put', () => {
		// regression: clampRect would have moved x (the anchor) — here x must stay 0.1
		const r = resizeRect(
			{ x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
			'e',
			{ x: 0.8, y: 0 },
			NB,
			0.05,
		)
		expect(r.x).toBe(0.1) // anchor edge unchanged
		expect(r.x + r.width).toBeCloseTo(1) // right edge capped at the bound
	})
	it('dragging the W handle past 0 pins left at 0, RIGHT edge stays put', () => {
		const r = resizeRect(
			{ x: 0.2, y: 0.1, width: 0.3, height: 0.3 },
			'w',
			{ x: -0.8, y: 0 },
			NB,
			0.05,
		)
		expect(r.x).toBe(0) // left capped at bound
		expect(r.x + r.width).toBeCloseTo(0.5) // right anchor (0.2+0.3) unchanged
	})
	it('enforces the min size on the dragged edge only', () => {
		const r = resizeRect(
			{ x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
			'e',
			{ x: -0.5, y: 0 },
			NB,
			0.05,
		)
		expect(r.width).toBeCloseTo(0.05) // shrunk to min, not below
		expect(r.x).toBe(0.1)
	})
	it('a corner drag clamps each axis independently (one axis breaching does not drop the other)', () => {
		// grow width (e), shrink height below min (s) — width change must survive
		const r = resizeRect(
			{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
			'se',
			{ x: 0.1, y: -0.3 },
			NB,
			0.05,
		)
		expect(r.width).toBeCloseTo(0.3) // e grew
		expect(r.height).toBeCloseTo(0.05) // s clamped to min, not aborted
	})
})

import { rotateDeltaToImageSpace } from './coordinateSystem'

describe('rotateDeltaToImageSpace', () => {
	it('is the identity at 0°', () => {
		expect(rotateDeltaToImageSpace({ x: 5, y: -3 }, 0)).toEqual({ x: 5, y: -3 })
	})

	it('at 90°: a screen-right drag becomes a local-up delta (matches a physically rotated print)', () => {
		// image visually rotated 90deg CW; dragging right on screen should feel like moving the
		// crop toward the image's own original top edge (local -y).
		const r = rotateDeltaToImageSpace({ x: 1, y: 0 }, 90)
		expect(r.x).toBeCloseTo(0)
		expect(r.y).toBeCloseTo(-1)
	})

	it('at 180°: screen deltas are simply negated', () => {
		expect(rotateDeltaToImageSpace({ x: 4, y: -2 }, 180)).toEqual({ x: -4, y: 2 })
	})

	it('at 270°: the inverse of the 90° case', () => {
		const r = rotateDeltaToImageSpace({ x: 1, y: 0 }, 270)
		expect(r.x).toBeCloseTo(0)
		expect(r.y).toBeCloseTo(1)
	})

	it('normalizes negative and >360 angles to the same 90-step result', () => {
		expect(rotateDeltaToImageSpace({ x: 1, y: 0 }, -270)).toEqual(
			rotateDeltaToImageSpace({ x: 1, y: 0 }, 90),
		)
		expect(rotateDeltaToImageSpace({ x: 1, y: 0 }, 450)).toEqual(
			rotateDeltaToImageSpace({ x: 1, y: 0 }, 90),
		)
	})

	it('round-trips: rotating a delta by θ then by −θ (via 360−θ) restores it', () => {
		const original = { x: 3, y: 7 }
		const rotated = rotateDeltaToImageSpace(original, 90)
		const back = rotateDeltaToImageSpace(rotated, 270)
		expect(back.x).toBeCloseTo(original.x)
		expect(back.y).toBeCloseTo(original.y)
	})

	it('an arbitrary angle matches the exact 90° case in the limit (continuity sanity check)', () => {
		const near90 = rotateDeltaToImageSpace({ x: 1, y: 0 }, 89.9999)
		const exact90 = rotateDeltaToImageSpace({ x: 1, y: 0 }, 90)
		expect(near90.x).toBeCloseTo(exact90.x, 3)
		expect(near90.y).toBeCloseTo(exact90.y, 3)
	})
})

import { pivotWithin } from './coordinateSystem'

describe('pivotWithin', () => {
	it("returns rect's center, expressed relative to container's origin", () => {
		const container = { x: 100, y: 50, width: 400, height: 300 }
		const rect = { x: 200, y: 100, width: 100, height: 100 } // absolute center: (250, 150)
		expect(pivotWithin(rect, container)).toEqual({ x: 150, y: 100 })
	})

	it("is the container's own half-extent (its centre) when rect IS the container", () => {
		const container = { x: 10, y: 20, width: 200, height: 100 }
		expect(pivotWithin(container, container)).toEqual({ x: 100, y: 50 })
	})
})

import { fillScaleAt } from './coordinateSystem'
import { fillScale } from './mediaEdit'

describe('fillScaleAt', () => {
	it('reduces to fillScale (the centred-pivot closed form) when the pivot IS the box centre', () => {
		const size = { width: 400, height: 200 } // aspect 2
		const pivot = { x: 200, y: 100 }
		for (const angle of [0, 10, -10, 30, 44]) {
			expect(fillScaleAt(angle, pivot, size)).toBeCloseTo(fillScale(angle, 2), 10)
		}
	})

	it('is 1 (no zoom needed) at angle 0 regardless of pivot', () => {
		expect(fillScaleAt(0, { x: 30, y: 170 }, { width: 400, height: 200 })).toBeCloseTo(1, 10)
	})

	it('requires MORE scale for a pivot farther from centre (off-centre corners are farther away)', () => {
		const size = { width: 400, height: 200 }
		const centred = fillScaleAt(15, { x: 200, y: 100 }, size)
		const offCentre = fillScaleAt(15, { x: 60, y: 40 }, size)
		expect(offCentre).toBeGreaterThan(centred)
	})

	it('actually covers every corner of `size` after rotating about an off-centre pivot (property check)', () => {
		const size = { width: 500, height: 300 }
		const pivot = { x: 120, y: 220 }
		const angle = 22
		const scale = fillScaleAt(angle, pivot, size)
		const rad = (angle * Math.PI) / 180
		const cos = Math.cos(rad)
		const sin = Math.sin(rad)
		const corners = [
			{ x: 0, y: 0 },
			{ x: size.width, y: 0 },
			{ x: 0, y: size.height },
			{ x: size.width, y: size.height },
		]
		for (const corner of corners) {
			// corner, as an offset from pivot, rotated back by -angle and un-scaled — must land
			// within the UNSCALED box's own offset-from-pivot range (i.e. still inside `size`).
			const u = corner.x - pivot.x
			const v = corner.y - pivot.y
			const rx = (u * cos + v * sin) / scale
			const ry = (-u * sin + v * cos) / scale
			expect(rx).toBeGreaterThanOrEqual(-pivot.x - 1e-6)
			expect(rx).toBeLessThanOrEqual(size.width - pivot.x + 1e-6)
			expect(ry).toBeGreaterThanOrEqual(-pivot.y - 1e-6)
			expect(ry).toBeLessThanOrEqual(size.height - pivot.y + 1e-6)
		}
	})

	it('covering `size` from a given pivot also covers any smaller box centred at the SAME pivot (e.g. the crop box)', () => {
		const size = { width: 500, height: 300 }
		const pivot = { x: 140, y: 90 } // off-centre within `size`
		const box = { width: 120, height: 80 } // small box centred at `pivot`
		const angle = 18
		const sizeScale = fillScaleAt(angle, pivot, size)
		const boxScale = fillScale(angle, box.width / box.height) // centred-pivot closed form
		expect(sizeScale).toBeGreaterThanOrEqual(boxScale)
	})
})
