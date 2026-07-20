import { describe, it, expect } from 'vitest'
import { groupMedia } from './mediaGrouping'
import { collectMedia } from '../data/media'
import { articles, categories } from '../data/mock'

const items = collectMedia(articles.filter((a) => a.locale === 'en'))

describe('groupMedia', () => {
	it('partitions all items into contiguous, non-overlapping sections', () => {
		const sections = groupMedia(items, categories)
		expect(sections[0].startIndex).toBe(0)
		for (let i = 1; i < sections.length; i++) {
			expect(sections[i].startIndex).toBe(sections[i - 1].endIndex)
		}
		expect(sections.at(-1)!.endIndex).toBe(items.length)
	})

	it('groups by category with one section per distinct primary category', () => {
		const sections = groupMedia(items, categories)
		const distinctCategories = new Set(items.map((m) => m.category))
		expect(sections.length).toBe(distinctCategories.size)
	})

	it('gives each section a real category label as its title, and an article-name subtitle', () => {
		const sections = groupMedia(items, categories)
		const labels = new Set(categories.map((c) => c.label))
		for (const s of sections) {
			expect(labels.has(s.title)).toBe(true)
			expect(s.subtitle?.length).toBeGreaterThan(0)
		}
	})

	it('returns empty for empty input', () => {
		expect(groupMedia([], categories)).toEqual([])
	})
})
