/**
 * Justified-rows ("Flickr / Google Photos / Apple Photos Days") layout.
 *
 * Packs variable-aspect tiles into rows of (near-)equal height that fill the
 * container width edge-to-edge. Pure and DOM-free: it takes aspect ratios and
 * geometry options and returns positioned rectangles. The grid virtualizes by
 * row using the `rows` output, mounting only the tiles for visible rows.
 */

export interface LayoutInput {
	aspect: number
}

export interface PositionedTile {
	index: number
	row: number
	x: number
	y: number
	width: number
	height: number
}

export interface LayoutRow {
	y: number
	height: number
	/** inclusive start tile index */
	startIndex: number
	/** exclusive end tile index */
	endIndex: number
}

export interface JustifiedLayout {
	tiles: PositionedTile[]
	rows: LayoutRow[]
	totalHeight: number
}

export interface JustifiedOptions {
	containerWidth: number
	targetRowHeight: number
	gap: number
	/**
	 * Floor under which a row's narrowest tile is never compressed, even at
	 * container widths too narrow to fit the greedily-packed tile count at a
	 * legible size. When honoring it would otherwise compress below this, the
	 * row backs off to fewer (wider) tiles and stretches its height ABOVE
	 * targetRowHeight instead. The backoff loop peeks ahead before committing to
	 * each step, so a row it shapes ALWAYS still fills containerWidth edge to
	 * edge (verified in tests) - it stops backing off, leaving the floor unmet
	 * for a tile, rather than accept a height so tall MAX_STRETCH would need to
	 * rein it back in (done after the fact, that would shrink width below
	 * containerWidth again - a gap, not a fill).
	 *
	 * Three unavoidable exceptions where the FLOOR itself may go unmet, none a
	 * bug: (1) a row constrained to one tile purely by containerWidth being
	 * narrower than the floor itself, with nothing left to back off to;
	 * (2) a row containing a degenerate aspect (0/negative/NaN/Infinity - see
	 * buildFloorLookup) is exempt outright, since MIN_ASPECT is a safety floor for
	 * broken/placeholder input, not real content worth stretching for;
	 * (3) a row that stopped backing off early because going further would
	 * exceed MAX_STRETCH - a routine trailing tile from backoff is NOT
	 * automatically exempt; only a tile whose real, valid aspect is so narrow
	 * that clearing the floor would need more than MAX_STRETCH stops here.
	 *
	 * A SEPARATE, pre-existing case predates this feature and is NOT about
	 * backoff: a genuinely sparse true last row (too few items left to reach
	 * containerWidth at all) is capped at targetRowHeight rather than stretched
	 * to fill - already leaves a gap with no floor involved (see "does not
	 * stretch a single short last row past target" in justified.test.ts).
	 * minTileWidth can still raise that row's cap to help clear the floor,
	 * bounded by MAX_STRETCH like everything else - but FILL is not guaranteed
	 * there either way, floor or no floor.
	 *
	 * Default 0/undefined preserves today's exact behavior (no floor).
	 */
	minTileWidth?: number
}

/** Smallest aspect the layout will honor — floors 0 / negative / NaN / Infinity so a
 *  degenerate aspect can't produce a negative or non-finite `rowHeight` and break the
 *  monotonic row-offset invariant the virtualizer binary-searches. 0.05 = a 1:20 sliver. */
const MIN_ASPECT = 0.05
const isDegenerate = (a: number) => !Number.isFinite(a) || a <= 0
const safeAspect = (a: number) => (isDegenerate(a) ? MIN_ASPECT : a)

/**
 * Hard ceiling on how far the minTileWidth floor may stretch a row above
 * targetRowHeight, as a multiple of it. A row containing a real but VALID very
 * narrow aspect (e.g. 0.01 - not degenerate, so `buildFloorLookup`'s exemption
 * doesn't apply) can otherwise need an unbounded height to clear any positive
 * floor (width = height x aspect shrinks toward 0 as aspect does) - the same
 * failure class the degenerate-aspect exemption fixes, just via a legitimate
 * small value that exemption can't (and shouldn't) catch, since the item is
 * real content, not broken input.
 *
 * The backoff loop's own peek-ahead (below) is the FIRST line of defense - it
 * refuses to commit to a tile count whose natural fill-preserving height would
 * exceed this ceiling in the first place, so a backoff-shaped row essentially
 * never needs clamping here (an independent-expert-review round found that
 * clamping AFTER the fact, instead of avoiding the situation, breaks the
 * edge-to-edge fill guarantee - shrinking height post hoc shrinks width with
 * it, leaving a gap). This constant remains as a hard backstop for the
 * SEPARATE last-row cap-raise below, which can still need to bound an
 * otherwise-unbounded stretch for a genuinely sparse trailing row - a case
 * that, per the last-row cap's own long-standing pre-existing behavior, was
 * never guaranteed to fill edge-to-edge anyway (see justified.test.ts's "does
 * not stretch a single short last row past target").
 */
const MAX_STRETCH = 3

/**
 * Builds, once per row in O(tileCount), a lookup answering "does items[start,
 * start+c) contain a degenerate aspect, and if not what's its narrowest real
 * aspect" for every c from 1 to tileCount in O(1) each — the floor safeguard
 * needs this at every backoff step, and rescanning the shrinking window from
 * scratch on each step (the original implementation) is O(tileCount) per step,
 * O(tileCount²) for the whole row. Confirmed by an independent-expert-review
 * round to freeze the render thread for tens of seconds on a single row with
 * tens of thousands of tiles (reachable via VirtualGrid's own default
 * `minTileWidth`, given narrow-but-valid-aspect data at scale). Safe to
 * precompute once because the backoff loop only ever SHRINKS the window from
 * the right (drops items[start+count-1], never anything earlier) — so every
 * candidate count the loop will ever ask about is a prefix of the original
 * greedy window, not an arbitrary range.
 *
 * A window containing a degenerate item is exempt from the floor entirely
 * (both the backoff loop and the last-row cap use this) — MIN_ASPECT is an
 * artificial safety floor for broken/placeholder input, not real narrow
 * content, and treating it as "narrow content that needs widening" divides by
 * ~0.05 and produces an absurd row height for no legibility benefit (e.g. a
 * 375px container explodes to 7500px tall). Conservative by design: a row
 * mixing one degenerate item with genuinely narrow real tiles still skips the
 * floor entirely, rather than risk another untested combination.
 */
function buildFloorLookup(
	items: readonly LayoutInput[],
	start: number,
	count: number,
): (c: number) => { hasDegenerate: boolean; minAspect: number } {
	const minAspectAt: number[] = new Array(count + 1)
	let firstDegenerateAt = -1
	let running = Infinity
	minAspectAt[0] = Infinity
	for (let c = 1; c <= count; c++) {
		const a = items[start + c - 1].aspect
		if (firstDegenerateAt === -1 && isDegenerate(a)) firstDegenerateAt = start + c - 1
		const sa = safeAspect(a)
		if (sa < running) running = sa
		minAspectAt[c] = running
	}
	return (c: number) => ({
		hasDegenerate: firstDegenerateAt !== -1 && firstDegenerateAt < start + c,
		minAspect: minAspectAt[c],
	})
}

export function justifiedLayout(
	items: readonly LayoutInput[],
	opts: JustifiedOptions,
): JustifiedLayout {
	const { containerWidth, targetRowHeight, gap, minTileWidth = 0 } = opts

	const tiles: PositionedTile[] = []
	const rows: LayoutRow[] = []
	if (items.length === 0 || containerWidth <= 0) {
		return { tiles, rows, totalHeight: 0 }
	}

	let y = 0
	let i = 0

	// Accumulate items into the current row until adding the next would overflow,
	// then justify the row's height so its tiles exactly fill the width.
	while (i < items.length) {
		let rowAspectSum = 0
		let j = i
		// grow the row until the scaled width (at target height) exceeds the
		// available content width (container minus inter-tile gaps).
		while (j < items.length) {
			rowAspectSum += safeAspect(items[j].aspect)
			j++
			const gaps = (j - i - 1) * gap
			const widthAtTarget = targetRowHeight * rowAspectSum + gaps
			if (widthAtTarget >= containerWidth) break
		}

		let tileCount = j - i

		// Floor safeguard: a greedily-packed row compressed to fill containerWidth
		// may squeeze its narrowest tile below minTileWidth. Drop tiles off the end
		// (the only order-preserving option — dropped tiles start the NEXT row) until
		// the row clears the floor or only one tile remains, EXCEPT a row containing
		// a degenerate aspect is exempt outright (see buildFloorLookup) — backing off
		// can't help there since the degenerate item stays the bottleneck at any
		// tile count, so it would otherwise cascade all the way to one tile and
		// still fail to clear the floor. Backing off for a real reason always
		// leaves the dropped tiles for a following row, which is usually — but not
		// always — enough to keep it clear of the true-last-row cap below; the cap
		// itself is floor-aware for the remaining case (see below) and reuses this
		// SAME lookup rather than rescanning again.
		const floorInfoAt = minTileWidth > 0 ? buildFloorLookup(items, i, tileCount) : null
		if (floorInfoAt) {
			while (tileCount > 1) {
				const { hasDegenerate, minAspect } = floorInfoAt(tileCount)
				if (hasDegenerate) break
				const gaps = (tileCount - 1) * gap
				const rowHeight = (containerWidth - gaps) / rowAspectSum
				if (rowHeight * minAspect >= minTileWidth) break
				// Peek at the height ONE more backoff step would require. A real but
				// very narrow (non-degenerate) aspect can need an unreasonable height
				// to clear the floor once isolated — dropping further would eventually
				// get bounded by MAX_STRETCH below, but that clamp alone would leave
				// this row short of containerWidth (a gap), since a bounded height no
				// longer divides evenly into the row's own aspect sum. Stopping HERE
				// instead keeps the row filling edge to edge (at its current, still
				// reasonable height) and simply accepts the floor goes unmet for that
				// tile — an independent-expert-review round found this gap.
				const nextCount = tileCount - 1
				const nextSum = rowAspectSum - safeAspect(items[i + tileCount - 1].aspect)
				const nextGaps = (nextCount - 1) * gap
				const nextHeight = (containerWidth - nextGaps) / nextSum
				if (nextHeight > targetRowHeight * MAX_STRETCH) break
				rowAspectSum = nextSum
				tileCount = nextCount
			}
			j = i + tileCount
		}

		const isLastRow = j >= items.length
		const totalGap = (tileCount - 1) * gap
		const availForTiles = containerWidth - totalGap

		// Height that makes this row's tiles fill availForTiles exactly.
		// Full rows are ≤ target by construction (the row grew until the
		// target-height widths filled the container) — UNLESS the floor
		// safeguard above backed off to fewer tiles, in which case this row is
		// deliberately > target (fewer, wider tiles instead of a cramped row).
		let rowHeight = availForTiles / rowAspectSum
		if (isLastRow && rowHeight > targetRowHeight) {
			// The last row may be partial, so normally don't stretch it past the
			// target. BUT a sparse trailing row (e.g. one tile left over after an
			// earlier row backed off) can still land under minTileWidth once
			// re-capped at target height — raise the cap just enough to clear the
			// floor instead (still less than the fully-uncapped natural stretch,
			// since we're in the `rowHeight > targetRowHeight` branch already).
			// Skipped for a degenerate-aspect row for the same reason backoff skips
			// it above — there's no real width to protect, only an absurd one to avoid.
			let cap = targetRowHeight
			if (floorInfoAt) {
				const { hasDegenerate, minAspect } = floorInfoAt(tileCount)
				if (!hasDegenerate) cap = Math.max(cap, minTileWidth / minAspect)
			}
			rowHeight = Math.min(rowHeight, cap)
		}
		// Backstop, not the primary mechanism: the backoff loop's own peek-ahead
		// above already keeps a backoff-shaped row's height within this ceiling
		// (so it essentially never fires there), but the last-row cap-raise just
		// above CAN still need bounding — the natural stretch a genuinely sparse
		// trailing row with a very narrow aspect would need to clear the floor is
		// just as unbounded as the backoff case was before the peek-ahead fix
		// (see MAX_STRETCH's own comment). No-op when minTileWidth is unset.
		if (minTileWidth > 0 && rowHeight > targetRowHeight * MAX_STRETCH) {
			rowHeight = targetRowHeight * MAX_STRETCH
		}

		let x = 0
		for (let k = i; k < j; k++) {
			const w = rowHeight * safeAspect(items[k].aspect)
			tiles.push({
				index: k,
				row: rows.length,
				x,
				y,
				width: w,
				height: rowHeight,
			})
			x += w + gap
		}

		rows.push({ y, height: rowHeight, startIndex: i, endIndex: j })
		y += rowHeight + gap
		i = j
	}

	const last = rows[rows.length - 1]
	return { tiles, rows, totalHeight: last.y + last.height }
}
