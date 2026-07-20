import { describe, it, expect } from 'vitest'
import { collectMedia } from './media'
import { articles } from './mock'

const sourceArticles = articles.filter((a) => a.locale === 'en')

describe('collectMedia', () => {
	it('collects every lead, body figure, and gallery item', () => {
		let expected = 0
		for (const a of sourceArticles) {
			if (a.lead) expected++
			for (const block of a.blocks) {
				if (block.type === 'figure') expected++
				else if (block.type === 'gallery') expected += block.items.length
			}
		}
		expect(collectMedia(sourceArticles)).toHaveLength(expected)
	})

	it('gives every item a globally unique id', () => {
		const items = collectMedia(sourceArticles)
		expect(new Set(items.map((m) => m.id)).size).toBe(items.length)
	})

	it('returns items newest-media-first', () => {
		const items = collectMedia(sourceArticles)
		for (let i = 1; i < items.length; i++) {
			expect(items[i - 1].mediaDate).toBeGreaterThanOrEqual(items[i].mediaDate)
		}
	})

	it("every item's updatedAt is exactly its owning article's (wiki-edit tracking, not the media date)", () => {
		const items = collectMedia(sourceArticles)
		for (const m of items) {
			const article = sourceArticles.find((a) => a.slug === m.articleSlug)!
			expect(m.updatedAt).toBe(article.updatedAt)
		}
	})

	it('dates a lead or standalone figure exactly by its article when no real date is inferable', () => {
		const items = collectMedia(sourceArticles)
		for (const a of sourceArticles) {
			if (a.lead) {
				const item = items.find((m) => m.id === `${a.id}:${a.lead!.id}`)!
				if (!item.mediaDateInferred) expect(item.mediaDate).toBe(a.updatedAt)
			}
		}
	})

	it("spreads a multi-image gallery's non-inferred items one day apart so they don't collapse into one day-section", () => {
		const items = collectMedia(sourceArticles)
		for (const a of sourceArticles) {
			for (const block of a.blocks) {
				if (block.type !== 'gallery') continue
				const galleryItems = block.items.map((item) =>
					items.find((m) => m.id === `${a.id}:${block.id}:${item.id}`)!,
				)
				// A real inferred date (e.g. several images sharing one brochure publication
				// date) is allowed — indeed expected — to collapse; only the fallback
				// (no-real-date) case needs artificial spreading to stay distinguishable.
				const fallbackDates = galleryItems
					.filter((m) => !m.mediaDateInferred)
					.map((m) => m.mediaDate)
				expect(new Set(fallbackDates).size).toBe(fallbackDates.length)
				for (const d of fallbackDates) expect(d).toBeLessThanOrEqual(a.updatedAt)
			}
		}
	})

	it('marks every real-image item mediaDateInferred, with a figure label for a brochure scan', () => {
		const items = collectMedia(sourceArticles)
		for (const m of items) {
			if (!m.src) continue
			if (/Fig\d+-\d+-/.test(m.src)) {
				expect(m.mediaDateInferred).toBe(true)
				expect(m.figureLabel).toMatch(/^Fig\. \d+-\d+$/)
			}
		}
	})

	it('returns empty for no articles', () => {
		expect(collectMedia([])).toEqual([])
	})
})
