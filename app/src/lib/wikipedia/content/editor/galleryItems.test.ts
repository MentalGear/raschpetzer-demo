import { describe, it, expect } from 'vitest'
import { galleryItemSchema, type GalleryItem } from '../schema'
import { normalizeGalleryItem, newPlaceholderItem, moveGalleryItem } from './galleryItems'

/**
 * These guard the Phase 3 gallery NodeView's write-back against the SILENT-swallow failure mode:
 * an item that doesn't satisfy `galleryItemSchema` makes docToPage throw and the edit disappears
 * with only a console.error. So every helper output is parsed through the real schema.
 */
describe('normalizeGalleryItem', () => {
	it('keeps a schema-valid, fully-authored item intact', () => {
		const it: GalleryItem = {
			id: 'a',
			image: '/placeholders/tone-slate.svg',
			alt: 'a leaf',
			caption: 'in the sun',
			source: 'Photographer',
		}
		const out = normalizeGalleryItem(it)
		expect(() => galleryItemSchema.parse(out)).not.toThrow()
		expect(out).toEqual(it)
	})

	it('drops empty/whitespace optional caption + source rather than storing ""', () => {
		const out = normalizeGalleryItem({
			id: 'a',
			image: '/x.svg',
			alt: 'alt',
			caption: '   ',
			source: '',
		})
		expect(out).toEqual({ id: 'a', image: '/x.svg', alt: 'alt' })
		expect('caption' in out).toBe(false)
		expect('source' in out).toBe(false)
	})

	it('preserves provenance + build-derived fields we do not edit in v1', () => {
		const it: GalleryItem = {
			id: 'a',
			image: '/x.svg',
			alt: 'alt',
			description: 'desc',
			author: 'Ada',
			license: 'CC-BY',
			rightsStatus: 'cleared',
			width: 800,
			height: 600,
		}
		const out = normalizeGalleryItem(it)
		expect(() => galleryItemSchema.parse(out)).not.toThrow()
		expect(out).toEqual(it)
	})
})

describe('newPlaceholderItem', () => {
	it('produces a schema-valid item (non-empty alt, scheme-less image)', () => {
		const out = newPlaceholderItem('gallery-item-123')
		expect(() => galleryItemSchema.parse(out)).not.toThrow()
		expect(out.alt.length).toBeGreaterThan(0)
		// scheme-less: no `javascript:`/`data:`/`http:` prefix
		expect(/^[a-z][a-z\d+.-]*:/i.test(out.image)).toBe(false)
	})
})

describe('moveGalleryItem', () => {
	const items: GalleryItem[] = [
		{ id: 'a', image: '/a.svg', alt: 'A' },
		{ id: 'b', image: '/b.svg', alt: 'B' },
		{ id: 'c', image: '/c.svg', alt: 'C' },
	]

	it('moves an item down and up without mutating the input', () => {
		const down = moveGalleryItem(items, 'a', 1)
		expect(down.map((i) => i.id)).toEqual(['b', 'a', 'c'])
		expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']) // input untouched
		const up = moveGalleryItem(items, 'c', -1)
		expect(up.map((i) => i.id)).toEqual(['a', 'c', 'b'])
	})

	it('returns the input unchanged at the bounds or for an unknown id', () => {
		expect(moveGalleryItem(items, 'a', -1)).toBe(items) // already first
		expect(moveGalleryItem(items, 'c', 1)).toBe(items) // already last
		expect(moveGalleryItem(items, 'zzz', 1)).toBe(items) // absent
	})
})
