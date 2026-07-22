/**
 * Flattens every citation across the article corpus into a single deduped source list —
 * the Sources page's data source (`routes/sources/+page.svelte`), rendered through the
 * `@kit/ui` `DataTable` composite (see e.g. SupraAppKit's Notes `/table` route for the
 * reference DataTable-consumer pattern this follows). Mirrors `media.ts`'s
 * flatten-across-articles shape.
 *
 * A `Citation` is authored per-article (each `raschpetzer-*.ts` file defines its own local
 * `c` object), but the same underlying source — most often the 2018 brochure itself — is
 * cited by many articles under different `id`s (one per page/claim, e.g.
 * `c-shaft-p6-context` vs `c-gallery-channel`). Deduping by `Citation.id` alone would treat
 * every one of those as a distinct source; instead this groups by `(title, url)` — the
 * closest a `Citation` gets to "the same underlying work" — so e.g. the brochure collapses
 * to one row listing every article and page anchor that cites it, while two genuinely
 * different external sources that happen to share a title (none currently do) would still
 * only collide if their `url`s also matched.
 */
import type { Article, Citation } from './types'

export type SourceKind = 'Brochure' | 'Wikipedia' | 'External source' | 'Dataset'

export interface SourceEntry {
	/** One representative citation id (the first one seen) — not globally unique across
	 *  underlying sources cited from many pages, so callers needing a list key should use
	 *  the entry's index instead. */
	id: string
	title: string
	authors?: string
	year?: number
	publisher?: string
	url?: string
	kind: SourceKind
	/** Distinct citing articles, in first-seen order. */
	articles: { slug: string; title: string }[]
	/** How many distinct citation entries (page/claim-level) across the corpus resolve to
	 *  this one underlying source. */
	citationCount: number
}

/** Heuristic source-kind classifier from a citation's own url/publisher — good enough to
 *  facet by by in the Sources table, not a claim about the source's formal provenance. */
function classify(c: Citation): SourceKind {
	if (c.url?.includes('/sources/raschpetzer-brochure')) return 'Brochure'
	if (c.url?.includes('wikipedia.org')) return 'Wikipedia'
	if (c.url) return 'External source'
	return 'Dataset'
}

/** Groups same-source citations; a brochure citation's `url` carries a `#page=N` fragment
 *  that's unique per claim, so the page fragment is stripped before grouping (otherwise
 *  every page anchor would count as a distinct source). */
function groupKey(c: Citation): string {
	return `${c.title}|${(c.url ?? '').split('#')[0]}`
}

export function collectSources(articles: readonly Article[]): SourceEntry[] {
	const byKey = new Map<string, SourceEntry>()
	for (const article of articles) {
		for (const c of article.citations) {
			const key = groupKey(c)
			const existing = byKey.get(key)
			if (existing) {
				existing.citationCount += 1
				if (!existing.articles.some((a) => a.slug === article.slug)) {
					existing.articles.push({ slug: article.slug, title: article.title })
				}
				continue
			}
			byKey.set(key, {
				id: c.id,
				title: c.title,
				authors: c.authors,
				year: c.year,
				publisher: c.publisher,
				url: c.url,
				kind: classify(c),
				articles: [{ slug: article.slug, title: article.title }],
				citationCount: 1,
			})
		}
	}
	return [...byKey.values()].sort((a, b) => a.title.localeCompare(b.title))
}
