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

	it('returns items newest-first, never dated after their owning article', () => {
		const items = collectMedia(sourceArticles)
		for (let i = 1; i < items.length; i++) {
			expect(items[i - 1].updatedAt).toBeGreaterThanOrEqual(items[i].updatedAt)
		}
		for (const m of items) {
			const article = sourceArticles.find((a) => a.slug === m.articleSlug)!
			expect(m.updatedAt).toBeLessThanOrEqual(article.updatedAt)
		}
	})

	it('dates a lead or standalone figure exactly by its article', () => {
		const items = collectMedia(sourceArticles)
		for (const a of sourceArticles) {
			if (a.lead) {
				expect(items.find((m) => m.id === `${a.id}:${a.lead!.id}`)!.updatedAt).toBe(
					a.updatedAt,
				)
			}
		}
	})

	it("spreads a multi-image gallery's items one day apart so they don't collapse into one day-section", () => {
		const items = collectMedia(sourceArticles)
		for (const a of sourceArticles) {
			for (const block of a.blocks) {
				if (block.type !== 'gallery') continue
				const dates = block.items.map(
					(item) =>
						items.find((m) => m.id === `${a.id}:${block.id}:${item.id}`)!.updatedAt,
				)
				expect(new Set(dates).size).toBe(dates.length)
				expect(Math.max(...dates)).toBe(a.updatedAt)
			}
		}
	})

	it('returns empty for no articles', () => {
		expect(collectMedia([])).toEqual([])
	})
})
