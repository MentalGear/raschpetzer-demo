import { describe, it, expect } from 'vitest'
import { buildGridModel, firstVisibleRow, squareGridModel } from './gridModel'
import type { Section } from './section'

// Deterministic, domain-free fixtures (kit tests must not import app/domain code).
const aspects = [0.66, 0.75, 1, 1.33, 1.5, 1.78]
const newestFirst = Array.from({ length: 600 }, (_, i) => ({ aspect: aspects[i % aspects.length] }))
const sections: Section[] = Array.from({ length: 20 }, (_, s) => ({
	key: `s${s}`,
	title: `Section ${s}`,
	startIndex: s * 30,
	endIndex: s * 30 + 30,
	count: 30,
}))
const opts = { containerWidth: 1200, targetRowHeight: 180, gap: 3, headerHeight: 44 }

describe('buildGridModel', () => {
	const model = buildGridModel(newestFirst, sections, opts)

	it('starts each section with a header row', () => {
		const headers = model.rows.filter((r) => r.type === 'header')
		expect(headers.length).toBe(sections.length)
		expect(model.rows[0].type).toBe('header')
	})

	it('stacks rows with monotonically increasing offsets', () => {
		let y = 0
		for (const r of model.rows) {
			expect(r.y).toBeCloseTo(y, 2)
			y += r.height
		}
		expect(model.totalHeight).toBeCloseTo(y, 2)
	})

	it('references every photo exactly once across photo rows', () => {
		const seen: number[] = []
		for (const r of model.rows) {
			if (r.type === 'photos') for (const t of r.tiles!) seen.push(t.itemIndex)
		}
		expect(seen.length).toBe(newestFirst.length)
		expect(new Set(seen).size).toBe(newestFirst.length)
		expect(Math.min(...seen)).toBe(0)
		expect(Math.max(...seen)).toBe(newestFirst.length - 1)
	})

	it('keeps photo tiles within the container width', () => {
		for (const r of model.rows) {
			if (r.type !== 'photos') continue
			const right = Math.max(...r.tiles!.map((t) => t.x + t.width))
			expect(right).toBeLessThanOrEqual(opts.containerWidth + 1)
		}
	})

	it('exposes per-section vertical offsets for the scrubber', () => {
		expect(model.sectionOffsets.length).toBe(sections.length)
		expect(model.sectionOffsets[0].y).toBe(0)
		for (let i = 1; i < model.sectionOffsets.length; i++) {
			expect(model.sectionOffsets[i].y).toBeGreaterThan(model.sectionOffsets[i - 1].y)
		}
	})

	it('handles empty input', () => {
		const m = buildGridModel([], [], opts)
		expect(m.rows).toEqual([])
		expect(m.totalHeight).toBe(0)
	})

	it('inserts sectionGap above each section except the first, keeping offsets contiguous', () => {
		const g = 28
		const gapped = buildGridModel(newestFirst, sections, { ...opts, sectionGap: g })
		// Invariant the virtualization relies on: row.y === Σ previous heights.
		let y = 0
		for (const r of gapped.rows) {
			expect(r.y).toBeCloseTo(y, 2)
			y += r.height
		}
		// First section stays flush to the top; total grows by g per later section.
		expect(gapped.sectionOffsets[0].y).toBe(0)
		expect(gapped.totalHeight).toBeCloseTo(model.totalHeight + g * (sections.length - 1), 2)
		// Each later section header sits g lower than in the no-gap model.
		for (let i = 1; i < sections.length; i++) {
			expect(gapped.sectionOffsets[i].y).toBeCloseTo(model.sectionOffsets[i].y + g * i, 2)
		}
	})
})

describe('squareGridModel', () => {
	const sq = { containerWidth: 1000, targetSize: 120, gap: 4 }

	it('packs all photos into uniform square tiles, no headers', () => {
		const m = squareGridModel(50, sq)
		const tiles = m.rows.flatMap((r) => (r.type === 'photos' ? r.tiles : []))
		expect(m.rows.every((r) => r.type === 'photos')).toBe(true)
		expect(tiles.length).toBe(50)
		// square: width === height, and consistent across tiles
		const w = tiles[0].width
		for (const t of tiles) {
			expect(t.width).toBeCloseTo(w, 5)
			expect(t.height).toBeCloseTo(w, 5)
		}
	})

	it('fills the container width within rounding', () => {
		const m = squareGridModel(40, sq)
		const row0 = (m.rows[0] as { tiles: { x: number; width: number }[] }).tiles
		const used = row0.reduce((s, t) => s + t.width, 0) + sq.gap * (row0.length - 1)
		expect(used).toBeCloseTo(sq.containerWidth, 1)
	})

	it('references every photo once in order and stacks contiguously', () => {
		const m = squareGridModel(37, sq)
		const seen = m.rows.flatMap((r) =>
			r.type === 'photos' ? r.tiles.map((t) => t.itemIndex) : [],
		)
		expect(seen).toEqual(Array.from({ length: 37 }, (_, i) => i))
		let y = 0
		for (const r of m.rows) {
			expect(r.y).toBeCloseTo(y, 3)
			y += r.height
		}
		expect(m.totalHeight).toBeCloseTo(y, 3)
	})

	it('handles empty input', () => {
		expect(squareGridModel(0, sq)).toEqual({ rows: [], totalHeight: 0, sectionOffsets: [] })
	})

	it('minTileWidth: reduces columns instead of compressing tiles below the floor', () => {
		// targetSize 120 on a 375-wide container greedily picks 3 columns (~121px each,
		// mirroring the narrow-viewport square-mode case) — with a 140 floor it should
		// back off to 2 wider columns instead.
		const narrow = { containerWidth: 375, targetSize: 120, gap: 12 }
		const baseline = squareGridModel(9, narrow)
		const row0 = (baseline.rows[0] as { tiles: { width: number }[] }).tiles
		expect(row0.length).toBe(3)
		expect(row0[0].width).toBeLessThan(140)

		const floored = squareGridModel(9, { ...narrow, minTileWidth: 140 })
		const flooredRow0 = (floored.rows[0] as { tiles: { width: number }[] }).tiles
		expect(flooredRow0.length).toBe(2)
		expect(flooredRow0[0].width).toBeGreaterThanOrEqual(140)
	})

	it('minTileWidth: never reduces below a single column', () => {
		const m = squareGridModel(4, {
			containerWidth: 100,
			targetSize: 120,
			gap: 4,
			minTileWidth: 500,
		})
		const row0 = (m.rows[0] as { tiles: { width: number }[] }).tiles
		expect(row0.length).toBe(1)
	})

	it('minTileWidth: is a no-op when the greedy column count already clears the floor', () => {
		const withoutFloor = squareGridModel(50, sq)
		const withFloor = squareGridModel(50, { ...sq, minTileWidth: 50 })
		expect(withFloor).toEqual(withoutFloor)
	})
})

describe('firstVisibleRow', () => {
	const rows = buildGridModel(newestFirst, sections, opts).rows

	it('returns 0 at the very top', () => {
		expect(firstVisibleRow(rows, 0)).toBe(0)
		expect(firstVisibleRow(rows, -100)).toBe(0)
	})

	it('returns the row whose box contains the offset', () => {
		// pick a few interior rows and probe just inside their top edge
		for (const idx of [1, 5, 20, rows.length - 1]) {
			const r = rows[idx]
			const found = firstVisibleRow(rows, r.y + r.height / 2)
			expect(found).toBe(idx)
		}
	})

	it('is the row at-or-before the offset at exact boundaries', () => {
		const r = rows[10]
		expect(firstVisibleRow(rows, r.y)).toBe(10)
		// one px before lands on the previous row
		expect(firstVisibleRow(rows, r.y - 1)).toBe(9)
	})

	it('clamps to the last row past the end', () => {
		expect(firstVisibleRow(rows, 1e9)).toBe(rows.length - 1)
	})
})
