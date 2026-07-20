import { describe, it, expect } from 'vitest'
import { outputSize } from './mediaExport'

describe('outputSize', () => {
	it('returns the crop size (rounded) at full resolution by default', () => {
		expect(outputSize({ width: 1600.4, height: 900.6 })).toEqual({ width: 1600, height: 901 })
	})

	it('downscales to maxWidth, preserving aspect', () => {
		expect(outputSize({ width: 2000, height: 1000 }, { maxWidth: 1000 })).toEqual({
			width: 1000,
			height: 500,
		})
	})

	it('downscales to maxHeight, preserving aspect', () => {
		expect(outputSize({ width: 1000, height: 2000 }, { maxHeight: 500 })).toEqual({
			width: 250,
			height: 500,
		})
	})

	it('does not upscale when the crop is already within the caps', () => {
		expect(
			outputSize({ width: 400, height: 300 }, { maxWidth: 4000, maxHeight: 4000 }),
		).toEqual({
			width: 400,
			height: 300,
		})
	})

	it('never returns a zero dimension', () => {
		expect(outputSize({ width: 0.2, height: 0.2 })).toEqual({ width: 1, height: 1 })
	})
})

import { bakeCanvasSize, sourceRect } from './mediaExport'

describe('bakeCanvasSize', () => {
	it('keeps dims at 0° / 180°', () => {
		expect(bakeCanvasSize({ width: 800, height: 600 }, 0)).toEqual({ width: 800, height: 600 })
		expect(bakeCanvasSize({ width: 800, height: 600 }, 180)).toEqual({
			width: 800,
			height: 600,
		})
	})
	it('SWAPS dims at 90° / 270° (else the rotated draw clips)', () => {
		expect(bakeCanvasSize({ width: 800, height: 600 }, 90)).toEqual({ width: 600, height: 800 })
		expect(bakeCanvasSize({ width: 800, height: 600 }, 270)).toEqual({
			width: 600,
			height: 800,
		})
	})
	it('normalizes negative / accumulated angles', () => {
		expect(bakeCanvasSize({ width: 800, height: 600 }, -90)).toEqual({
			width: 600,
			height: 800,
		})
		expect(bakeCanvasSize({ width: 800, height: 600 }, 450)).toEqual({
			width: 600,
			height: 800,
		})
	})
})

describe('sourceRect', () => {
	it('rounds edges so sx+sw never exceeds the source raster', () => {
		// x=500.5, width=499.5 → rounding x and width independently would give 501+500=1001 (>1000)
		const r = sourceRect({ x: 500.5, y: 0, width: 499.5, height: 10 })
		expect(r.sx + r.sw).toBe(1000)
		expect(r.sx).toBe(501)
		expect(r.sw).toBe(499)
	})
})

import { straightenDrawTransform } from './mediaExport'
import { fillScale } from './mediaEdit'

describe('straightenDrawTransform', () => {
	it('rotateRad matches the straighten angle, in radians', () => {
		const t = straightenDrawTransform({ x: 0, y: 0, width: 100, height: 100 }, 90, {
			width: 100,
			height: 100,
		})
		expect(t.rotateRad).toBeCloseTo(Math.PI / 2)
	})

	it('is a no-op rotation at straighten=0', () => {
		const t = straightenDrawTransform({ x: 0, y: 0, width: 10, height: 10 }, 0, {
			width: 10,
			height: 10,
		})
		expect(t.rotateRad).toBe(0)
	})

	it('scale = fillScale(straighten, crop aspect) * k, with k=1 when out matches crop exactly', () => {
		const crop = { x: 0, y: 0, width: 200, height: 100 }
		const t = straightenDrawTransform(crop, 10, { width: 200, height: 100 })
		expect(t.scale).toBeCloseTo(fillScale(10, 2))
	})

	it("scale incorporates outputSize's downscale factor k", () => {
		const crop = { x: 0, y: 0, width: 400, height: 200 }
		const out = { width: 200, height: 100 } // k = 0.5
		const t = straightenDrawTransform(crop, 0, out) // fillScale(0,*) = 1
		expect(t.scale).toBeCloseTo(0.5)
	})

	it("translates so the crop's OWN centre lands at the (pre-centred) origin", () => {
		const crop = { x: 50, y: 20, width: 100, height: 60 } // centre = (100, 50)
		const t = straightenDrawTransform(crop, 0, { width: 100, height: 60 })
		expect(t.translateX).toBe(-100)
		expect(t.translateY).toBe(-50)
	})

	it('guards a degenerate (zero-height) crop rather than dividing by zero', () => {
		const t = straightenDrawTransform({ x: 0, y: 0, width: 50, height: 0 }, 10, {
			width: 50,
			height: 0,
		})
		expect(Number.isFinite(t.scale)).toBe(true)
	})

	it('guards a degenerate (zero-width) crop rather than dividing by zero', () => {
		// k = out.width / crop.width — a zero crop.width would give Infinity without the guard
		const t = straightenDrawTransform({ x: 0, y: 0, width: 0, height: 50 }, 10, {
			width: 1,
			height: 50,
		})
		expect(Number.isFinite(t.scale)).toBe(true)
	})

	it('rotateRad has the correct sign for a negative straighten angle', () => {
		const t = straightenDrawTransform({ x: 0, y: 0, width: 100, height: 100 }, -30, {
			width: 100,
			height: 100,
		})
		expect(t.rotateRad).toBeCloseTo(-Math.PI / 6)
	})

	it('composes an off-origin crop with a downscale k with no cross-term (translate has no k)', () => {
		const crop = { x: 50, y: 20, width: 400, height: 200 }
		const out = { width: 200, height: 100 } // k = 0.5
		const t = straightenDrawTransform(crop, 15, out)
		expect(t.scale).toBeCloseTo(fillScale(15, 2) * 0.5)
		// translate is in SOURCE-pixel units (pre-scale) — must NOT be multiplied by k
		expect(t.translateX).toBe(-(50 + 200)) // -(crop.x + crop.width/2)
		expect(t.translateY).toBe(-(20 + 100)) // -(crop.y + crop.height/2)
	})
})

import { redactionPixelRect } from './mediaExport'

describe('redactionPixelRect', () => {
	it('denormalizes a redaction rect against the SOURCE image natural size (not the crop/output)', () => {
		const r = redactionPixelRect(
			{ x: 0.25, y: 0.5, w: 0.1, h: 0.2 },
			{ width: 2000, height: 1000 },
		)
		expect(r).toEqual({ x: 500, y: 500, width: 200, height: 200 })
	})

	it('rounds edges so x+width never exceeds the source raster (mirrors sourceRect)', () => {
		// x+w = 1 exactly (the full raster), but x and w individually land on a .5px boundary — if x
		// and width were rounded INDEPENDENTLY they could disagree (e.g. 500 + 500 = 1000 is fine, but
		// a naive width = round(w * natural.width) could give 500 while x rounds to 501, overshooting
		// by a pixel). Rounding the EDGES (x, x+width) instead guarantees they always agree exactly.
		const r = redactionPixelRect(
			{ x: 0.5005, y: 0, w: 0.4995, h: 0.01 },
			{ width: 1000, height: 10 },
		)
		expect(r.x + r.width).toBe(1000)
		expect(r.x).toBe(500)
		expect(r.width).toBe(500)
	})

	it('a full-frame redaction (0,0,1,1) covers exactly the natural size', () => {
		const r = redactionPixelRect({ x: 0, y: 0, w: 1, h: 1 }, { width: 800, height: 600 })
		expect(r).toEqual({ x: 0, y: 0, width: 800, height: 600 })
	})
})

import { pixelateCellSize } from './mediaExport'

describe('pixelateCellSize', () => {
	it('is a decent absolute size for a typical full-image redaction', () => {
		// a redaction near-full-frame on a ~1600px-long-edge source shouldn't pixelate into a barely
		// perceptible mosaic
		const cell = pixelateCellSize({ width: 1600, height: 1067 })
		expect(cell).toBeGreaterThanOrEqual(8)
	})

	it("is anchored to the FULL IMAGE's shorter dimension, not the redaction region's own size", () => {
		// regression guard: a thin, wide redaction region (e.g. a license-plate-width strip) must NOT
		// get a tiny cell size just because the REGION itself is short — the privacy-critical case
		// this closes is a region whose own min(width,height) is small even though the source image
		// is large, which previously produced a near-invisible ~2px mosaic block (an under-pixelated,
		// still-identifiable result — a real privacy bug, not just cosmetic).
		const natural = { width: 2000, height: 1000 }
		expect(pixelateCellSize(natural)).toBe(pixelateCellSize(natural)) // same natural → same cell,
		// regardless of which redaction (thin or square) is being pixelated within it
		const cell = pixelateCellSize(natural)
		expect(cell).toBeGreaterThanOrEqual(8)
	})

	it('never returns a degenerate (zero or negative) cell size for a tiny source image', () => {
		expect(pixelateCellSize({ width: 4, height: 4 })).toBeGreaterThanOrEqual(1)
	})
})

import { shouldPreserveMetadata } from './mediaExport'

describe('shouldPreserveMetadata', () => {
	it('defaults to stripping (false) when the Metadata tool was never opened at all', () => {
		// the exact regression this guards: an UNTOUCHED edit record must strip, not silently write
		// the original image's EXIF forward into the export
		expect(shouldPreserveMetadata(undefined)).toBe(false)
	})

	it('strips when metadata exists but strip was never explicitly set', () => {
		expect(shouldPreserveMetadata({ fields: { artist: 'A' } })).toBe(false)
	})

	it('strips when strip is explicitly true', () => {
		expect(shouldPreserveMetadata({ strip: true })).toBe(false)
	})

	it('preserves ONLY when strip is explicitly false', () => {
		expect(shouldPreserveMetadata({ strip: false })).toBe(true)
	})
})
