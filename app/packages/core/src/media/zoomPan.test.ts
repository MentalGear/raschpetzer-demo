import { describe, it, expect } from 'vitest'
import { clamp, clampPan, anchoredPan, imageContentRect, rectContains } from './zoomPan'

describe('clamp', () => {
	it('bounds a value to [lo, hi]', () => {
		expect(clamp(5, 0, 10)).toBe(5)
		expect(clamp(-1, 0, 10)).toBe(0)
		expect(clamp(11, 0, 10)).toBe(10)
	})
})

describe('clampPan', () => {
	it('allows no pan at scale 1 (image exactly fills the stage)', () => {
		const [x, y] = clampPan(100, -80, 1, 800, 600)
		expect(x + 0).toBe(0) // `+ 0` normalises the harmless -0 from clamping to [-0, 0]
		expect(y + 0).toBe(0)
	})

	it('limits offset to (scale-1)/2 × stage dimension', () => {
		// scale 2 → maxX = 800*(2-1)/2 = 400, maxY = 600*1/2 = 300
		expect(clampPan(500, -500, 2, 800, 600)).toEqual([400, -300])
		expect(clampPan(100, -80, 2, 800, 600)).toEqual([100, -80]) // within bounds → unchanged
	})
})

describe('anchoredPan', () => {
	it('keeps the click point fixed when zooming from identity (click-zoom case)', () => {
		// original click-zoom: tx = relX - relX*targetScale, startTx = 0
		const relX = 120
		const relY = -40
		const targetScale = 2.5
		expect(anchoredPan(relX, relY, 0, 0, targetScale)).toEqual([
			relX - relX * targetScale,
			relY - relY * targetScale,
		])
	})

	it('anchors an already-panned image (pinch / wheel continuation case)', () => {
		// dx=200, startTx=50, ratio=1.5 → 200 - (200-50)*1.5 = 200 - 225 = -25
		expect(anchoredPan(200, 100, 50, 20, 1.5)).toEqual([-25, 100 - (100 - 20) * 1.5])
	})

	it('is identity when the scale ratio is 1', () => {
		expect(anchoredPan(200, 100, 50, 20, 1)).toEqual([50, 20])
	})
})

describe('imageContentRect', () => {
	it('letterboxes a wide image inside a taller box (bars top & bottom)', () => {
		// 400×200 image in a 400×400 box → scale 1, content 400×200 centred vertically
		const box = imageContentRect(400, 200, { left: 0, top: 0, width: 400, height: 400 })
		expect(box).toEqual({ x0: 0, y0: 100, cw: 400, ch: 200 })
	})

	it('pillarboxes a tall image inside a wider box (bars left & right)', () => {
		// 200×400 image in a 400×400 box → scale 1, content 200×400 centred horizontally
		const box = imageContentRect(200, 400, { left: 0, top: 0, width: 400, height: 400 })
		expect(box).toEqual({ x0: 100, y0: 0, cw: 200, ch: 400 })
	})

	it('honours the element screen offset (left/top)', () => {
		const box = imageContentRect(400, 200, { left: 30, top: 10, width: 400, height: 400 })
		expect(box).toEqual({ x0: 30, y0: 110, cw: 400, ch: 200 })
	})
})

describe('rectContains', () => {
	const box = { x0: 10, y0: 20, cw: 100, ch: 50 }
	it('is true inside and on the edges, false in every letterbox bar', () => {
		expect(rectContains(box, 50, 40)).toBe(true) // interior
		expect(rectContains(box, 10, 20)).toBe(true) // top-left corner
		expect(rectContains(box, 110, 70)).toBe(true) // bottom-right corner
		expect(rectContains(box, 5, 40)).toBe(false) // left bar
		expect(rectContains(box, 115, 40)).toBe(false) // right bar
		expect(rectContains(box, 50, 10)).toBe(false) // above
		expect(rectContains(box, 50, 80)).toBe(false) // below
	})
})

describe('clampPan × anchoredPan composition (the real gesture-site output)', () => {
	it('scale 1 is the no-pan floor (every call site pre-clamps scale ≥ 1)', () => {
		// at scale 1 maxX/maxY are 0, so any anchored translate collapses to origin
		const [ax, ay] = anchoredPan(200, 100, 0, 0, 1)
		const [x, y] = clampPan(ax, ay, 1, 800, 600)
		expect(x + 0).toBe(0)
		expect(y + 0).toBe(0)
	})

	it('focal-zoom then clamp keeps the result within the off-screen bound', () => {
		// zoom to 3× anchored at a far corner, then clamp to a 800×600 stage
		const [ax, ay] = anchoredPan(600, 400, 0, 0, 3) // large unclamped anchored translate
		const [x, y] = clampPan(ax, ay, 3, 800, 600)
		const maxX = (800 * (3 - 1)) / 2 // 800
		const maxY = (600 * (3 - 1)) / 2 // 600
		expect(Math.abs(x)).toBeLessThanOrEqual(maxX)
		expect(Math.abs(y)).toBeLessThanOrEqual(maxY)
		// and it actually hit the bound (the anchor pushed past it)
		expect(Math.abs(x)).toBe(maxX)
	})
})
