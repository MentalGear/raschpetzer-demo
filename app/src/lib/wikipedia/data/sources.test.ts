import { describe, it, expect } from 'vitest'
import { collectSources } from './sources'
import { articles } from './mock'

const sourceArticles = articles.filter((a) => a.locale === 'en')

describe('collectSources', () => {
	it('collects every citation across every article', () => {
		const expected = sourceArticles.reduce((n, a) => n + a.citations.length, 0)
		expect(collectSources(sourceArticles)).toHaveLength(expected)
	})

	it('gives every source a globally unique id', () => {
		const items = collectSources(sourceArticles)
		expect(new Set(items.map((s) => s.id)).size).toBe(items.length)
	})

	it('carries the citing article slug/title and preserves citation fields verbatim', () => {
		const items = collectSources(sourceArticles)
		for (const a of sourceArticles) {
			for (const c of a.citations) {
				const s = items.find((s) => s.id === `${a.id}:${c.id}`)!
				expect(s).toBeDefined()
				expect(s.title).toBe(c.title)
				expect(s.authors).toBe(c.authors)
				expect(s.year).toBe(c.year)
				expect(s.publisher).toBe(c.publisher)
				expect(s.url).toBe(c.url)
				expect(s.articleSlug).toBe(a.slug)
				expect(s.articleTitle).toBe(a.title)
			}
		}
	})

	it("numbers refIndex 1-based, matching the References list order (ArticleReader.svelte's ref-{n} anchors)", () => {
		const items = collectSources(sourceArticles)
		for (const a of sourceArticles) {
			a.citations.forEach((c, i) => {
				const s = items.find((s) => s.id === `${a.id}:${c.id}`)!
				expect(s.refIndex).toBe(i + 1)
			})
		}
	})

	it('produces a separate row per article for a duplicate title across articles (no cross-article dedup)', () => {
		// two synthetic articles independently citing a source with the identical title.
		const dupArticles = sourceArticles.slice(0, 1).flatMap((base) => [
			{ ...base, id: 'x1', slug: 'x1', citations: [{ id: 'c1', title: 'Shared Source' }] },
			{ ...base, id: 'x2', slug: 'x2', citations: [{ id: 'c1', title: 'Shared Source' }] },
		])
		const items = collectSources(dupArticles)
		expect(items).toHaveLength(2)
		expect(new Set(items.map((s) => s.id)).size).toBe(2)
		expect(items.map((s) => s.articleSlug).sort()).toEqual(['x1', 'x2'])
	})

	it('returns empty for no articles', () => {
		expect(collectSources([])).toEqual([])
	})
})
