/**
 * Flattens every figure/gallery image across the article corpus into a single media list —
 * the Media page's data source (grouped by `mediaDate` in `layout/mediaGrouping.ts`). Pure TS,
 * no DOM. A real vendored image (`isRealImageSrc`) gets its date/figure-label INFERRED from its
 * filename (`figureMeta.ts` — the brochure's own publication date for a scanned figure, or a
 * credited photograph's own year); anything without an inferable filename (the mock corpus, and
 * a handful of custom-generated illustrations with no brochure/date association) falls back to
 * the owning article's `updatedAt`, the same signal the "Recently edited" list reads — spread
 * one day apart across a multi-item gallery in THAT fallback case only (see `collectMedia`'s
 * gallery branch), so a single edit's whole fallback-dated gallery doesn't collapse into one
 * indistinguishable day-section. A real inferred date is never artificially spread — several
 * items honestly sharing the brochure's one publication date is more accurate than pretending
 * they were added on different days.
 */
import type { Article, FigureBlock, GalleryItemRef } from './types'
import { inferFigureMeta } from './figureMeta'

const DAY = 86_400_000

export interface MediaItem {
	/** globally unique: block ids (and gallery item ids) are only unique WITHIN an article. */
	id: string
	alt: string
	caption?: string
	credit?: string
	tone: number
	ratio?: number
	/** Present only for real vendored content (not the mock corpus) — see `isRealImageSrc`. */
	src?: string
	srcset?: string
	articleSlug: string
	articleTitle: string
	/** The owning article's own last-edit date — wiki-edit tracking, NOT this image's own
	 *  date (see `mediaDate`). Still shown in the info panel ("Edited N days ago"). */
	updatedAt: number
	/** The date the Media page groups/sorts by — inferred from the filename when possible
	 *  (`figureMeta.ts`), else `updatedAt` (see this module's own doc comment). */
	mediaDate: number
	/** True when `mediaDate` is a REAL inferred date (brochure publication / credited photo
	 *  year), not the `updatedAt` fallback — gates whether the info panel shows it as a source
	 *  date; showing the wiki's own edit date as if it were the photo's date would be
	 *  misleading for the majority of items that have no real date to infer. */
	mediaDateInferred: boolean
	/** e.g. "Fig. 3-1" — present only for a filename that matches the brochure's own figure
	 *  numbering convention. */
	figureLabel?: string
}

function toItem(
	source: FigureBlock | GalleryItemRef,
	id: string,
	article: Article,
	fallbackDate: number = article.updatedAt,
): MediaItem {
	const { figureLabel, sourceDate } = inferFigureMeta(source.src)
	return {
		id,
		alt: source.alt,
		caption: source.caption,
		credit: source.credit,
		tone: source.tone,
		ratio: source.ratio,
		src: source.src,
		srcset: source.srcset,
		articleSlug: article.slug,
		articleTitle: article.title,
		updatedAt: article.updatedAt,
		mediaDate: sourceDate ?? fallbackDate,
		mediaDateInferred: sourceDate != null,
		figureLabel,
	}
}

/** Every figure/gallery image across `articles` (lead + body), newest-media-first. */
export function collectMedia(articles: readonly Article[]): MediaItem[] {
	const items: MediaItem[] = []
	for (const article of articles) {
		if (article.lead)
			items.push(toItem(article.lead, `${article.id}:${article.lead.id}`, article))
		for (const block of article.blocks) {
			if (block.type === 'figure') {
				items.push(toItem(block, `${article.id}:${block.id}`, article))
			} else if (block.type === 'gallery') {
				block.items.forEach((item, i) => {
					items.push(
						toItem(
							item,
							`${article.id}:${block.id}:${item.id}`,
							article,
							article.updatedAt - i * DAY,
						),
					)
				})
			}
		}
	}
	return items.sort((a, b) => b.mediaDate - a.mediaDate)
}
