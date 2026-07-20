import { describe, it, expect } from 'vitest'
import { articles } from '../data/mock'
import type { Article, GalleryItemRef } from '../data/types'
import { articleToPage } from './fromArticle'
import { parsePage, type PageElement } from './schema'

describe('articleToPage', () => {
	it('every mock article converts to a schema-valid Page', () => {
		for (const a of articles) {
			const page = articleToPage(a)
			// parsePage enforces: unique element/item ids, safe link/image URLs, the shape.
			expect(() => parsePage(page), `article ${a.slug}/${a.locale}`).not.toThrow()
		}
	})

	it('preserves title/slug/locale and emits elements', () => {
		const page = articleToPage(articles[0])
		expect(page.slug).toBe(articles[0].slug)
		expect(page.title).toBe(articles[0].title)
		expect(page.locale).toBe(articles[0].locale)
		expect(page.schemaVersion).toBe(1)
		expect(page.elements.length).toBeGreaterThan(0)
	})

	it('figures become gallery_blocks and prose becomes text_blocks', () => {
		const withFig = articles.find((a) => a.lead || a.blocks.some((b) => b.type === 'figure'))
		expect(withFig, 'expected a mock article with a figure/lead').toBeTruthy()
		const page = articleToPage(withFig!)
		expect(page.elements.some((e) => e.type === 'gallery_block')).toBe(true)
		expect(page.elements.some((e) => e.type === 'text_block')).toBe(true)
	})

	it('carries article.infobox verbatim onto Page.infobox', () => {
		const withInfobox = articles.find((a) => a.infobox && a.infobox.length > 0)
		expect(withInfobox, 'expected a mock article with an infobox').toBeTruthy()
		const page = articleToPage(withInfobox!)
		expect(page.infobox).toEqual(withInfobox!.infobox)
	})

	it('omits Page.infobox for an article with none', () => {
		const noInfobox = articles.find((a) => !a.infobox || a.infobox.length === 0)
		expect(noInfobox, 'expected a mock article without an infobox').toBeTruthy()
		const page = articleToPage(noInfobox!)
		expect(page.infobox).toBeUndefined()
	})
})

describe('articleToPage — multi-image gallery blocks', () => {
	/** A minimal prose-free article whose only block is a multi-image `GalleryBlock`. */
	function galleryArticle(items: GalleryItemRef[]): Article {
		return {
			id: 'a-gallery',
			slug: 'gallery',
			locale: 'en',
			title: 'Gallery',
			summary: 'A gallery fixture.',
			categories: [],
			blocks: [{ id: 'g1', type: 'gallery', items }],
			citations: [],
			revisions: [],
			updatedAt: 0,
			contributors: [],
		}
	}

	it('a 3-item GalleryBlock becomes a gallery_block PageElement with matching item count, item ids forwarded verbatim', () => {
		const items: GalleryItemRef[] = [
			{ id: 'i0', alt: 'first alt', tone: 1, caption: 'Cap 0', credit: 'Credit 0' },
			{ id: 'i1', alt: 'second alt', tone: 2 },
			{ id: 'i2', alt: 'third alt', tone: 3 },
		]
		const page = articleToPage(galleryArticle(items))
		const galleryEl = page.elements.find((e) => e.type === 'gallery_block')
		expect(galleryEl, 'expected a gallery_block element').toBeTruthy()
		const gallery = galleryEl as Extract<PageElement, { type: 'gallery_block' }>
		expect(gallery.items).toHaveLength(3)
		// item ids are forwarded verbatim (not re-synthesized) — this is what lets an id assigned
		// on the Article side survive an Article→Page→Article round trip unchanged.
		expect(gallery.items.map((it) => it.id)).toEqual(['i0', 'i1', 'i2'])
	})

	it('maps caption/credit → caption/source only when present', () => {
		const items: GalleryItemRef[] = [
			{ id: 'i0', alt: 'first alt', tone: 1, caption: 'Cap 0', credit: 'Credit 0' },
			{ id: 'i1', alt: 'second alt', tone: 2 },
		]
		const page = articleToPage(galleryArticle(items))
		const galleryEl = page.elements.find((e) => e.type === 'gallery_block')
		const gallery = galleryEl as Extract<PageElement, { type: 'gallery_block' }>
		expect(gallery.items[0]).toMatchObject({
			alt: 'first alt',
			caption: 'Cap 0',
			source: 'Credit 0',
		})
		expect(gallery.items[1]).toMatchObject({ alt: 'second alt' })
		expect(gallery.items[1].caption).toBeUndefined()
		expect(gallery.items[1].source).toBeUndefined()
	})
})
