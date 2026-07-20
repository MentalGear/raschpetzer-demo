/**
 * Builds the flat, absolutely-positioned row model the virtualized grid
 * renders: a header row per section followed by justified photo rows. Pure, so
 * it's unit-tested and can run once per layout change (resize / zoom) off the
 * render path. The component then windows `rows` by scrollTop.
 */
import { justifiedLayout } from './justified'
import type { Section } from './section'

/** Minimal shape the layout needs from an item (domain-free). */
type Sized = { aspect: number }

export interface GridTile {
	/** index into the source item array */
	itemIndex: number
	x: number
	width: number
	height: number
}

export interface HeaderRow {
	type: 'header'
	y: number
	height: number
	section: number
	title: string
	subtitle?: string
	count: number
}

export interface PhotoRow {
	type: 'photos'
	y: number
	height: number
	section: number
	tiles: GridTile[]
}

export type GridRow = HeaderRow | PhotoRow

export interface GridModel {
	rows: GridRow[]
	totalHeight: number
	sectionOffsets: { section: number; y: number; title: string }[]
}

export interface GridOptions {
	containerWidth: number
	targetRowHeight: number
	gap: number
	headerHeight: number
	/**
	 * Extra vertical space inserted ABOVE each section header except the first,
	 * separating a section from the previous group so the header reads as attached
	 * to the photos below it. Defaults to 0 (no inter-section gap).
	 */
	sectionGap?: number
	/** Forwarded to `justifiedLayout` — see its own doc for the floor/backoff behavior. */
	minTileWidth?: number
}

export function buildGridModel(
	photos: readonly Sized[],
	sections: readonly Section[],
	opts: GridOptions,
): GridModel {
	const rows: GridRow[] = []
	const sectionOffsets: GridModel['sectionOffsets'] = []
	const sectionGap = opts.sectionGap ?? 0
	let y = 0

	for (let s = 0; s < sections.length; s++) {
		const sec = sections[s]
		// Breathing room above every section except the first. Fold it into the
		// previous section's last row height so the running offset still satisfies
		// `row.y === Σ previous heights` (the binary-search virtualization relies on
		// it); visually this is empty space between the group above and this header.
		if (s > 0 && sectionGap > 0 && rows.length > 0) {
			rows[rows.length - 1].height += sectionGap
			y += sectionGap
		}
		sectionOffsets.push({ section: s, y, title: sec.title })

		rows.push({
			type: 'header',
			y,
			height: opts.headerHeight,
			section: s,
			title: sec.title,
			subtitle: sec.subtitle,
			count: sec.count,
		})
		y += opts.headerHeight

		const slice = photos.slice(sec.startIndex, sec.endIndex)
		const layout = justifiedLayout(
			slice.map((p) => ({ aspect: p.aspect })),
			{
				containerWidth: opts.containerWidth,
				targetRowHeight: opts.targetRowHeight,
				gap: opts.gap,
				minTileWidth: opts.minTileWidth,
			},
		)

		for (const lr of layout.rows) {
			const tiles: GridTile[] = []
			for (let i = lr.startIndex; i < lr.endIndex; i++) {
				const t = layout.tiles[i]
				tiles.push({
					itemIndex: sec.startIndex + t.index,
					x: t.x,
					width: t.width,
					height: t.height,
				})
			}
			// Box height folds in the bottom gap so rows stack contiguously
			// (binary-search virtualization assumes y === Σ previous heights).
			rows.push({ type: 'photos', y, height: lr.height + opts.gap, section: s, tiles })
			y += lr.height + opts.gap
		}
	}

	return { rows, totalHeight: y, sectionOffsets }
}

/**
 * Uniform square grid (Apple "All Photos" wall): fixed square tiles, no
 * headers. Returns the same GridModel shape so the virtualizer is unchanged.
 */
export function squareGridModel(
	count: number,
	opts: { containerWidth: number; targetSize: number; gap: number; minTileWidth?: number },
): GridModel {
	const { containerWidth, targetSize, gap, minTileWidth = 0 } = opts
	if (count === 0 || containerWidth <= 0) return { rows: [], totalHeight: 0, sectionOffsets: [] }

	let cols = Math.max(1, Math.round((containerWidth + gap) / (targetSize + gap)))
	let size = (containerWidth - (cols - 1) * gap) / cols
	// Floor safeguard, mirroring justifiedLayout's: fewer, wider (taller) square
	// tiles instead of compressing below minTileWidth. A single column can't be
	// reduced further (unavoidable floor case at extreme widths).
	while (minTileWidth > 0 && cols > 1 && size < minTileWidth) {
		cols--
		size = (containerWidth - (cols - 1) * gap) / cols
	}
	const rows: GridRow[] = []
	let y = 0
	for (let i = 0; i < count; i += cols) {
		const tiles: GridTile[] = []
		for (let c = 0; c < cols && i + c < count; c++) {
			tiles.push({ itemIndex: i + c, x: c * (size + gap), width: size, height: size })
		}
		rows.push({ type: 'photos', y, height: size + gap, section: 0, tiles })
		y += size + gap
	}
	return { rows, totalHeight: y, sectionOffsets: [] }
}

/** First visible row index for a given scrollTop (binary search on row offsets). */
export function firstVisibleRow(rows: readonly GridRow[], scrollTop: number): number {
	let lo = 0
	let hi = rows.length - 1
	let ans = 0
	while (lo <= hi) {
		const mid = (lo + hi) >> 1
		if (rows[mid].y <= scrollTop) {
			ans = mid
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}
	return ans
}
