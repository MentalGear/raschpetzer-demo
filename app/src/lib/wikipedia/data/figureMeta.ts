/**
 * Infers a brochure figure label and a source date from a vendored image's filename — the
 * closest thing this demo has to real EXIF/manifest metadata (no actual capture-date pipeline;
 * see `media.ts`'s own doc comment for why media previously had no per-image date at all).
 * Two filename conventions are used across `static/img/raschpetzer/` (verified against every
 * real `src` in the corpus):
 *   - Brochure scans: `Fig<chapter>-<number>-*` (e.g. `Fig3-01-fallback.jpg`) → a figure label
 *     matching how the brochure itself is cited elsewhere in this corpus ("fig. 3-1", no
 *     leading zero) and the brochure's own 2018 publication date, since a scanned figure has
 *     no capture date of its own distinct from the document it's from.
 *   - Separately-credited real photographs: an explicit `-<year>-fallback` suffix (e.g.
 *     `a-shovel-P9-FOTO-Tom-Lucas-Ben-Muller-MNHA-2022-fallback.jpg`) → that year, no figure
 *     label (they're not brochure scans).
 * Anything else (a few custom-generated illustrations with no brochure/date association, e.g.
 * `topomap-walferdange.jpg`) infers neither — the caller falls back to the owning article's
 * `updatedAt`.
 */
const FIGURE_RE = /Fig(\d+)-(\d+)-/
const YEAR_RE = /-(\d{4})-fallback\.\w+$/

/** The brochure's own publication date (year only is cited throughout the corpus). */
export const BROCHURE_DATE = Date.UTC(2018, 0, 1)

export interface FigureMeta {
	/** e.g. "Fig. 3-1" — matches the citation-title convention used elsewhere in this corpus. */
	figureLabel?: string
	/** UTC epoch ms, when inferable — brochure publication date for a scanned figure, or the
	 *  photograph's own credited year. */
	sourceDate?: number
}

export function inferFigureMeta(src: string | undefined): FigureMeta {
	if (!src) return {}
	const filename = src.split('/').pop() ?? ''
	const figMatch = filename.match(FIGURE_RE)
	if (figMatch) {
		return {
			figureLabel: `Fig. ${Number(figMatch[1])}-${Number(figMatch[2])}`,
			sourceDate: BROCHURE_DATE,
		}
	}
	const yearMatch = filename.match(YEAR_RE)
	if (yearMatch) {
		return { sourceDate: Date.UTC(Number(yearMatch[1]), 0, 1) }
	}
	return {}
}
