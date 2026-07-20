import { describe, it, expect } from 'vitest'
import { justifiedLayout } from './justified'

const opts = { containerWidth: 1000, targetRowHeight: 200, gap: 4 }

describe('justifiedLayout', () => {
	it('returns nothing for an empty input', () => {
		const r = justifiedLayout([], opts)
		expect(r.tiles).toEqual([])
		expect(r.rows).toEqual([])
		expect(r.totalHeight).toBe(0)
	})

	it('keeps a single short row at the target height (no stretching)', () => {
		const r = justifiedLayout([{ aspect: 1.5 }], opts)
		expect(r.rows.length).toBe(1)
		expect(r.tiles[0].height).toBeCloseTo(200, 5)
		expect(r.tiles[0].width).toBeCloseTo(300, 5)
		expect(r.tiles[0].x).toBe(0)
		expect(r.tiles[0].y).toBe(0)
	})

	it('justifies full rows to exactly fill the container width', () => {
		// many 1:1 tiles → multiple full rows
		const items = Array.from({ length: 40 }, () => ({ aspect: 1 }))
		const r = justifiedLayout(items, opts)
		// every row except possibly the last must fill the width
		for (let i = 0; i < r.rows.length - 1; i++) {
			const rowTiles = r.tiles.filter((t) => t.row === i)
			const used =
				rowTiles.reduce((s, t) => s + t.width, 0) + opts.gap * (rowTiles.length - 1)
			expect(used).toBeCloseTo(opts.containerWidth, 1)
		}
	})

	it('gives all tiles in a row the same height and y', () => {
		const items = Array.from({ length: 20 }, (_, i) => ({ aspect: 1 + (i % 3) * 0.3 }))
		const r = justifiedLayout(items, opts)
		for (let i = 0; i < r.rows.length; i++) {
			const rowTiles = r.tiles.filter((t) => t.row === i)
			const h = rowTiles[0].height
			const y = rowTiles[0].y
			for (const t of rowTiles) {
				expect(t.height).toBeCloseTo(h, 5)
				expect(t.y).toBe(y)
			}
		}
	})

	it('lays tiles left-to-right with gaps, starting at x=0', () => {
		const items = Array.from({ length: 10 }, () => ({ aspect: 1 }))
		const r = justifiedLayout(items, opts)
		const row0 = r.tiles.filter((t) => t.row === 0).sort((a, b) => a.x - b.x)
		expect(row0[0].x).toBe(0)
		for (let i = 1; i < row0.length; i++) {
			expect(row0[i].x).toBeCloseTo(row0[i - 1].x + row0[i - 1].width + opts.gap, 3)
		}
	})

	it('stacks rows vertically and reports a consistent total height', () => {
		const items = Array.from({ length: 50 }, () => ({ aspect: 1.4 }))
		const r = justifiedLayout(items, opts)
		let expectedY = 0
		for (const row of r.rows) {
			expect(row.y).toBeCloseTo(expectedY, 3)
			expectedY += row.height + opts.gap
		}
		// total height = last row bottom (no trailing gap)
		const last = r.rows[r.rows.length - 1]
		expect(r.totalHeight).toBeCloseTo(last.y + last.height, 3)
	})

	it('keeps full justified rows at or below the target height', () => {
		// Full rows pack until target-height widths fill the container, so the
		// justified height is always ≤ target (never taller).
		const items = Array.from({ length: 40 }, () => ({ aspect: 0.5 }))
		const r = justifiedLayout(items, opts)
		for (let i = 0; i < r.rows.length - 1; i++) {
			expect(r.rows[i].height).toBeLessThanOrEqual(opts.targetRowHeight + 0.001)
		}
	})

	it('does not stretch a single short last row past target', () => {
		const r = justifiedLayout([{ aspect: 0.2 }], opts)
		expect(r.tiles[0].height).toBeCloseTo(200, 5)
	})

	it('produces every tile exactly once, in order', () => {
		const items = Array.from({ length: 37 }, (_, i) => ({ aspect: 1 + (i % 5) * 0.2 }))
		const r = justifiedLayout(items, opts)
		expect(r.tiles.length).toBe(37)
		expect(r.tiles.map((t) => t.index)).toEqual(items.map((_, i) => i))
	})

	// Degenerate aspects (0 / negative / NaN / Infinity) must NOT produce negative or
	// non-finite heights — that would break the monotonic row-offset invariant.
	it.each([[0], [-1], [NaN], [Infinity]])(
		'floors a degenerate aspect (%p) to a finite positive height',
		(aspect) => {
			const r = justifiedLayout([{ aspect }], opts)
			expect(r.tiles.length).toBe(1)
			expect(Number.isFinite(r.tiles[0].height)).toBe(true)
			expect(r.tiles[0].height).toBeGreaterThan(0)
			expect(Number.isFinite(r.totalHeight)).toBe(true)
			expect(r.totalHeight).toBeGreaterThan(0)
		},
	)

	it('keeps row offsets monotonic even with a mix of degenerate + normal aspects', () => {
		const items = [
			{ aspect: 1 },
			{ aspect: -5 },
			{ aspect: 0 },
			{ aspect: 1.5 },
			{ aspect: NaN },
		]
		const r = justifiedLayout(items, { ...opts, containerWidth: 300 })
		for (let k = 1; k < r.rows.length; k++) {
			expect(r.rows[k].y).toBeGreaterThanOrEqual(r.rows[k - 1].y)
		}
		expect(r.tiles.every((t) => Number.isFinite(t.height) && t.height > 0)).toBe(true)
	})

	describe('minTileWidth floor', () => {
		// Mirrors NoteGrid's real config: fixed aspect < 1, narrow phone-width
		// container. Without a floor this greedily packs 3 tiles/row at ~117px —
		// the reported mobile cramping (docs/backlog.md "Notes grid doesn't reflow").
		const narrow = { containerWidth: 375, targetRowHeight: 210, gap: 12 }

		it('with no floor, compresses to the greedy tile count (baseline, unchanged)', () => {
			const items = Array.from({ length: 9 }, () => ({ aspect: 0.82 }))
			const r = justifiedLayout(items, narrow)
			const row0 = r.tiles.filter((t) => t.row === 0)
			expect(row0.length).toBe(3)
			expect(row0[0].width).toBeLessThan(120)
		})

		it('backs off to fewer, wider tiles once the floor would otherwise be crossed', () => {
			const items = Array.from({ length: 9 }, () => ({ aspect: 0.82 }))
			const r = justifiedLayout(items, { ...narrow, minTileWidth: 140 })
			const row0 = r.tiles.filter((t) => t.row === 0)
			expect(row0.length).toBe(2)
			expect(row0[0].width).toBeGreaterThanOrEqual(140)
		})

		it('still fills the row edge to edge after backing off (stretches past target)', () => {
			const items = Array.from({ length: 9 }, () => ({ aspect: 0.82 }))
			const r = justifiedLayout(items, { ...narrow, minTileWidth: 140 })
			const row0 = r.tiles.filter((t) => t.row === 0)
			const used = row0.reduce((s, t) => s + t.width, 0) + narrow.gap * (row0.length - 1)
			expect(used).toBeCloseTo(narrow.containerWidth, 1)
			expect(row0[0].height).toBeGreaterThan(narrow.targetRowHeight)
		})

		it('never reduces a single-tile row further (unavoidable floor case)', () => {
			// containerWidth alone is already under the floor — a lone tile spans
			// the full width regardless; there is nothing narrower to back off to.
			const r = justifiedLayout([{ aspect: 0.82 }], {
				containerWidth: 100,
				targetRowHeight: 210,
				gap: 12,
				minTileWidth: 140,
			})
			expect(r.tiles.length).toBe(1)
			expect(r.tiles[0].width).toBeCloseTo(100, 5)
		})

		it('produces every tile exactly once, in order, when backing off', () => {
			const items = Array.from({ length: 37 }, (_, i) => ({ aspect: 0.5 + (i % 5) * 0.1 }))
			const r = justifiedLayout(items, { ...opts, containerWidth: 300, minTileWidth: 150 })
			expect(r.tiles.length).toBe(37)
			expect(r.tiles.map((t) => t.index)).toEqual(items.map((_, i) => i))
		})

		it('keeps row offsets monotonic when backing off', () => {
			const items = Array.from({ length: 37 }, (_, i) => ({ aspect: 0.5 + (i % 5) * 0.1 }))
			const r = justifiedLayout(items, { ...opts, containerWidth: 300, minTileWidth: 150 })
			let expectedY = 0
			for (const row of r.rows) {
				expect(row.y).toBeCloseTo(expectedY, 3)
				expectedY += row.height + opts.gap
			}
		})

		it('is a no-op when the greedy row already clears the floor', () => {
			const items = Array.from({ length: 40 }, () => ({ aspect: 1 }))
			const withoutFloor = justifiedLayout(items, opts)
			const withFloor = justifiedLayout(items, { ...opts, minTileWidth: 50 })
			expect(withFloor).toEqual(withoutFloor)
		})

		it("exercises VirtualGrid's own literal default (120) directly, not just other values", () => {
			// No current consumer ships the bare 120 default as-is (Notes raises it to
			// 130, Photos drops it to 0 — see docs/backlog.md), flagged by an
			// independent-expert-review round as an untested-at-its-own-value gap.
			// This locks in that the mechanism itself is exercised at exactly 120.
			const items = Array.from({ length: 9 }, () => ({ aspect: 0.82 }))
			const r = justifiedLayout(items, { ...narrow, minTileWidth: 120 })
			const row0 = r.tiles.filter((t) => t.row === 0)
			for (const t of row0) expect(t.width).toBeGreaterThanOrEqual(120)
		})

		// Regression cases from an independent-expert-review round (docs/backlog.md
		// "Notes grid doesn't reflow columns" — round 1) that found real bugs in the
		// first cut of this feature; both are fixed, these lock the fix in.
		it('regression: a trailing single-tile row created by backoff still clears the floor', () => {
			// 3 items just barely reach threshold together; backing off the first row
			// to 2 tiles leaves 1 leftover item as its own trailing (genuinely last)
			// row, which used to get re-capped at targetRowHeight — landing at 105px
			// against a 140px floor, undoing the very guarantee this feature makes.
			const items = Array.from({ length: 3 }, () => ({ aspect: 0.5 }))
			const r = justifiedLayout(items, {
				containerWidth: 375,
				targetRowHeight: 210,
				gap: 12,
				minTileWidth: 140,
			})
			for (const t of r.tiles) expect(t.width).toBeGreaterThanOrEqual(140)
		})

		it('regression: a degenerate aspect combined with a floor does not explode row height', () => {
			// A degenerate item (0/negative/NaN/Infinity — floored to a tiny 1:20
			// MIN_ASPECT sliver) sitting at the START of a row used to make every
			// backoff candidate's narrowest tile look artificially sub-floor,
			// cascading to a 1-tile row and dividing by ~0.05 — a 375px container
			// exploded to 7500px tall. Such a row must now be exempt from the floor
			// entirely, matching the no-floor baseline exactly.
			const items = [{ aspect: 0 }, ...Array.from({ length: 8 }, () => ({ aspect: 1 }))]
			const withFloor = justifiedLayout(items, {
				containerWidth: 375,
				targetRowHeight: 200,
				gap: 12,
				minTileWidth: 140,
			})
			const withoutFloor = justifiedLayout(items, {
				containerWidth: 375,
				targetRowHeight: 200,
				gap: 12,
			})
			expect(withFloor.rows[0].height).toBeCloseTo(withoutFloor.rows[0].height, 5)
			expect(withFloor.rows[0].height).toBeLessThan(200 * 3) // sane bound, nowhere near a blowup
		})

		it('regression: a valid but very narrow (non-degenerate) aspect does not explode row height either', () => {
			// A second independent-expert-review round found the degenerate-aspect fix
			// above doesn't cover this: a REAL, valid aspect that's just very small
			// (0.01, not 0/negative/NaN/Infinity) isn't exempted by rowFloorInfo, so
			// backoff can still isolate it into its own row — and critically, this can
			// happen on a NON-last row, which had no height cap of any kind before this
			// fix (only isLastRow rows were ever capped). Repro: 375px container,
			// minTileWidth 120 (VirtualGrid's own default) → row 0 backed off to just
			// the 0.01-aspect tile, height would be 375/0.01 = 37500px uncapped.
			//
			// A THIRD round then found the naive MAX_STRETCH-only fix broke edge-to-edge
			// fill instead (clamping height alone shrinks width below containerWidth,
			// leaving a gap) — fixed with a peek-ahead in the backoff loop that stops
			// BEFORE committing to a tile count whose natural height would exceed the
			// cap, so this asserts fill is preserved too, not just bounded height.
			const items = [{ aspect: 0.01 }, ...Array.from({ length: 5 }, () => ({ aspect: 1 }))]
			const r = justifiedLayout(items, {
				containerWidth: 375,
				targetRowHeight: 210,
				gap: 12,
				minTileWidth: 120,
			})
			expect(r.rows[0].height).toBeLessThanOrEqual(210 * 3) // MAX_STRETCH, nowhere near 37500
			expect(r.tiles.every((t) => Number.isFinite(t.height) && t.height > 0)).toBe(true)
			const row0 = r.tiles.filter((t) => t.row === 0)
			const used = row0.reduce((s, t) => s + t.width, 0) + 12 * (row0.length - 1)
			expect(used).toBeCloseTo(375, 1) // still fills edge to edge, not just bounded
		})

		it('every row fills edge to edge and stays height-bounded across many rows, regardless of floor outcome', () => {
			// Mixed real aspects, no degenerate values, across many rows. The floor
			// itself is best-effort (a row may legitimately stop backing off early —
			// before every tile clears it — rather than stretch height past
			// MAX_STRETCH; see the peek-ahead in the backoff loop), but these two
			// properties must ALWAYS hold, on every row, with no exceptions:
			const items = Array.from({ length: 200 }, (_, i) => ({
				aspect: 0.5 + ((i * 37) % 130) / 100,
			}))
			const minTileWidth = 130
			const containerWidth = 340
			const r = justifiedLayout(items, { ...opts, containerWidth, minTileWidth })
			for (let i = 0; i < r.rows.length; i++) {
				const row = r.rows[i]
				const rowTiles = r.tiles.filter((t) => t.row === i)
				const used =
					rowTiles.reduce((s, t) => s + t.width, 0) + opts.gap * (rowTiles.length - 1)
				const isLastRow = i === r.rows.length - 1
				// Edge-to-edge fill holds for every row EXCEPT a genuinely sparse true
				// last row (pre-existing behavior, predating this feature entirely —
				// see "does not stretch a single short last row past target" above).
				if (!isLastRow) expect(used).toBeCloseTo(containerWidth, 1)
				expect(row.height).toBeLessThanOrEqual(opts.targetRowHeight * 3 + 1e-6) // MAX_STRETCH
			}
		})

		it('a row may stop backing off before every tile clears the floor, rather than exceed MAX_STRETCH', () => {
			// Companion to the property test above: explicitly demonstrates (not just
			// permits) the peek-ahead early-stop, so this documented trade-off has a
			// concrete example pinned, not just an absence-of-crash check.
			const items = [{ aspect: 0.01 }, ...Array.from({ length: 5 }, () => ({ aspect: 1 }))]
			const r = justifiedLayout(items, {
				containerWidth: 375,
				targetRowHeight: 210,
				gap: 12,
				minTileWidth: 120,
			})
			const row0 = r.tiles.filter((t) => t.row === 0)
			expect(row0.length).toBe(2) // stopped at 2, not fully backed off to 1
			expect(row0.some((t) => t.width < 120)).toBe(true) // the 0.01-aspect tile doesn't clear the floor
			const used = row0.reduce((s, t) => s + t.width, 0) + 12 * (row0.length - 1)
			expect(used).toBeCloseTo(375, 1) // but the row still fills edge to edge
		})

		it('stays fast even when many tiles in one row share the same narrow (non-degenerate) aspect', () => {
			// A round-4 independent-expert-review found the backoff loop originally
			// rescanned the whole shrinking window from scratch on every step —
			// O(tileCount) per step, O(tileCount²) per row — and confirmed a single
			// row with tens of thousands of same-narrow-aspect tiles could freeze the
			// render thread for tens of seconds (49.8s for 200k items in their repro).
			// Fixed with a one-time prefix-lookup precompute (buildFloorLookup); this
			// pins the fix with a generous but real time budget, not just correctness.
			const items = Array.from({ length: 50000 }, () => ({ aspect: 0.001 }))
			const start = performance.now()
			const r = justifiedLayout(items, {
				containerWidth: 5000,
				targetRowHeight: 200,
				gap: 0,
				minTileWidth: 120,
			})
			expect(performance.now() - start).toBeLessThan(2000) // was ~49800ms scaled, now ~ms
			expect(r.tiles.length).toBe(50000)
		})

		it('honors the floor at the exact boundary (rowHeight * minAspect === minTileWidth)', () => {
			// containerWidth chosen so 2 tiles land exactly at the floor once backed
			// off from 3 — the `>=` (not `>`) comparison in the backoff loop must
			// accept this as "cleared", not keep backing off past it.
			const aspect = 0.5
			const minTileWidth = 130
			const gap = 12
			// rowHeight * aspect === minTileWidth => rowHeight = minTileWidth / aspect = 260
			// 2 tiles at that height, filling edge to edge: containerWidth = 2*260*0.5 + gap
			const containerWidth = 2 * 260 * aspect + gap
			const items = Array.from({ length: 3 }, () => ({ aspect }))
			const r = justifiedLayout(items, {
				containerWidth,
				targetRowHeight: 210,
				gap,
				minTileWidth,
			})
			const row0 = r.tiles.filter((t) => t.row === 0)
			expect(row0.length).toBe(2)
			expect(row0[0].width).toBeCloseTo(minTileWidth, 5)
		})
	})
})
