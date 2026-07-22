/**
 * Flattens every citation across the article corpus into a single source list — the
 * Sources page's data source. Pure TS, no DOM. Citations have no cross-article sharing in
 * this demo (each article's `citations` array is independently authored, see `./types`), so
 * a source cited by two articles under the same title deliberately produces two SEPARATE
 * rows here, not a deduplicated one — inventing a "same source" identity heuristic across
 * independently-authored citation records would be guessing. Mirrors the pattern used by
 * the upstream SupraAppKit wikipedia demo's own Sources page (`apps/wikipedia/src/lib/
 * wikipedia/data/sources.ts`), which this was reconciled against.
 */
import type { Article } from './types'

export interface SourceItem {
	/** globally unique: citation ids are only unique WITHIN an article. */
	id: string
	title: string
	authors?: string
	year?: number
	publisher?: string
	url?: string
	articleSlug: string
	articleTitle: string
	/** 1-based position in the article's References list — matches the `ref-{n}` anchor id
	 *  ArticleReader.svelte renders for each citation, so a row can link straight to it. */
	refIndex: number
}

/** Every citation across `articles`, grouped by article in citation order. */
export function collectSources(articles: readonly Article[]): SourceItem[] {
	const items: SourceItem[] = []
	for (const article of articles) {
		article.citations.forEach((c, i) => {
			items.push({
				id: `${article.id}:${c.id}`,
				title: c.title,
				authors: c.authors,
				year: c.year,
				publisher: c.publisher,
				url: c.url,
				articleSlug: article.slug,
				articleTitle: article.title,
				refIndex: i + 1,
			})
		})
	}
	return items
}
