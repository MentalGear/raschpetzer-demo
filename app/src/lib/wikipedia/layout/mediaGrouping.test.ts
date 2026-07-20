import { describe, it, expect } from 'vitest'
import { groupMedia } from './mediaGrouping'
import { collectMedia } from '../data/media'
import { articles } from '../data/mock'

const items = collectMedia(articles.filter((a) => a.locale === 'en'))

describe('groupMedia', () => {
	it('partitions all items into contiguous, non-overlapping sections', () => {
		const sections = groupMedia(items)
		expect(sections[0].startIndex).toBe(0)
		for (let i = 1; i < sections.length; i++) {
			expect(sections[i].startIndex).toBe(sections[i - 1].endIndex)
		}
		expect(sections.at(-1)!.endIndex).toBe(items.length)
	})

	it('groups by day with one section per distinct calendar day', () => {
		const sections = groupMedia(items)
		const distinctDays = new Set(items.map((m) => new Date(m.mediaDate).toDateString()))
		expect(sections.length).toBe(distinctDays.size)
	})

	it('gives each section a human title and article-name subtitle', () => {
		const sections = groupMedia(items)
		for (const s of sections) {
			expect(s.title.length).toBeGreaterThan(0)
			expect(s.subtitle?.length).toBeGreaterThan(0)
		}
	})

	it('returns empty for empty input', () => {
		expect(groupMedia([])).toEqual([])
	})
})
