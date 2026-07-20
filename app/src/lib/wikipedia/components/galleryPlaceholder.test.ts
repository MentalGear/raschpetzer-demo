import { describe, it, expect } from 'vitest'
import { galleryPlaceholderSrc } from './galleryPlaceholder'

function decode(src: string): string {
	return decodeURIComponent(src.slice(src.indexOf(',') + 1))
}

describe('galleryPlaceholderSrc', () => {
	it('returns a valid data:image/svg+xml URI containing a solid-fill rect', () => {
		const src = galleryPlaceholderSrc(0)
		expect(src.startsWith('data:image/svg+xml')).toBe(true)
		const svg = decode(src)
		expect(svg).toContain('<svg')
		expect(svg).toContain('<rect')
		expect(svg).toMatch(/fill="#[0-9a-fA-F]{6}"/)
	})

	it('produces different output for each of the 6 tones', () => {
		const srcs = [0, 1, 2, 3, 4, 5].map((tone) => galleryPlaceholderSrc(tone))
		expect(new Set(srcs).size).toBe(6)
	})

	it('wraps tone via modulo, matching TONES[block.tone % TONES.length] (including negative input)', () => {
		expect(galleryPlaceholderSrc(6)).toBe(galleryPlaceholderSrc(0))
		expect(galleryPlaceholderSrc(7)).toBe(galleryPlaceholderSrc(1))
		expect(galleryPlaceholderSrc(-1)).toBe(galleryPlaceholderSrc(5))
	})

	it('sizes the SVG aspect-correctly for a non-16:9 ratio', () => {
		const square = decode(galleryPlaceholderSrc(0, 800, 1))
		expect(square).toContain('width="800"')
		expect(square).toContain('height="800"')

		const portrait = decode(galleryPlaceholderSrc(0, 800, 0.5))
		expect(portrait).toContain('width="400"')
		expect(portrait).toContain('height="800"')
	})

	it('defaults to a 16:9 aspect when none is given', () => {
		const svg = decode(galleryPlaceholderSrc(0, 800))
		expect(svg).toContain('width="800"')
		expect(svg).toContain('height="450"')
	})
})
