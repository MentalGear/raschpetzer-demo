/**
 * Flattens every figure/gallery image across the article corpus into a single media list —
 * the Media page's data source (grouped by `category` in `layout/mediaGrouping.ts` — previously
 * grouped by date, changed on request since a fixed-corpus demo's edit dates aren't a
 * meaningful way to browse real content). Pure TS, no DOM. A real vendored image
 * (`isRealImageSrc`) gets a date/figure-label INFERRED from its filename (`figureMeta.ts` — the
 * brochure's own publication date for a scanned figure, or a credited photograph's own year);
 * anything without an inferable filename (the mock corpus, and a handful of custom-generated
 * illustrations with no brochure/date association) falls back to the owning article's
 * `updatedAt`. That inferred/fallback date is still carried on each item (`mediaDate`, shown in
 * the info panel) — it's just no longer what the page groups BY.
 */
import type { Article, FigureBlock, GalleryItemRef } from './types'
import { inferFigureMeta } from './figureMeta'

const DAY = 86_400_000

/** An article can carry more than one category (most do — see mock.ts's `categories`), but a
 *  media item needs exactly ONE group to live in (the page is one flat virtualized list with
 *  contiguous, non-overlapping sections). Priority order picks the most SPECIFIC applicable
 *  category over the generic 'archaeology' catch-all nearly every article carries — otherwise
 *  the vast majority of items would collapse into one undifferentiated "Archaeology" bucket,
 *  defeating the point of grouping by something more meaningful than date. Verified against the
 *  real corpus's category combinations (`grep -h categories: raschpetzer*.ts`): this ordering
 *  produces four genuinely distinct, reasonably-sized groups rather than one dominant one.
 */
const CATEGORY_PRIORITY = ['people', 'technology', 'history', 'archaeology']

export function primaryCategory(categories: readonly string[]): string {
	for (const c of CATEGORY_PRIORITY) if (categories.includes(c)) return c
	return categories[0] ?? 'uncategorized'
}

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
	/** Inferred from the filename when possible (`figureMeta.ts`), else `updatedAt` — shown in
	 *  the info panel, no longer what the Media page groups/sorts by (see `category`). */
	mediaDate: number
	/** True when `mediaDate` is a REAL inferred date (brochure publication / credited photo
	 *  year), not the `updatedAt` fallback — gates whether the info panel shows it as a source
	 *  date; showing the wiki's own edit date as if it were the photo's date would be
	 *  misleading for the majority of items that have no real date to infer. */
	mediaDateInferred: boolean
	/** e.g. "Fig. 3-1" — present only for a filename that matches the brochure's own figure
	 *  numbering convention. */
	figureLabel?: string
	/** The single category id (`primaryCategory` of the owning article's `categories`) the
	 *  Media page groups this item under. */
	category: string
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
		category: primaryCategory(article.categories),
	}
}

/** Every figure/gallery image across `articles` (lead + body), grouped by category (priority
 *  order above) then newest-media-first within each category — `groupMedia` requires same-
 *  category items to be contiguous, so this sort order is load-bearing, not cosmetic. */
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
	const categoryRank = (c: string) => {
		const i = CATEGORY_PRIORITY.indexOf(c)
		return i === -1 ? CATEGORY_PRIORITY.length : i
	}
	return items.sort((a, b) => {
		const rankDiff = categoryRank(a.category) - categoryRank(b.category)
		if (rankDiff !== 0) return rankDiff
		return b.mediaDate - a.mediaDate
	})
}
