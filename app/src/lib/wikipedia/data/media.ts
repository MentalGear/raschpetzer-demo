/**
 * Flattens every figure/gallery image across the article corpus into a single media list —
 * the Media page's data source (grouped by date in `layout/mediaGrouping.ts`). Pure TS, no
 * DOM. Media has no per-image date of its own in this demo (front-end only, no EXIF, see
 * `FigureBlock`/`GalleryItemRef` in `./types`); each item is dated by its owning article's
 * `updatedAt`, the same signal the "Recently edited" list already reads — EXCEPT a multi-item
 * gallery, whose items are spread one day apart counting back from that date (see
 * `collectMedia`'s gallery branch), so a single edit's whole gallery doesn't collapse into one
 * indistinguishable day-section on the (date-grouped) Media page.
 */
import type { Article, FigureBlock, GalleryItemRef } from './types'

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
	updatedAt: number
}

function toItem(
	source: FigureBlock | GalleryItemRef,
	id: string,
	article: Article,
	updatedAt: number = article.updatedAt,
): MediaItem {
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
		updatedAt,
	}
}

/** Every figure/gallery image across `articles` (lead + body), newest-article-first. */
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
	return items.sort((a, b) => b.updatedAt - a.updatedAt)
}
