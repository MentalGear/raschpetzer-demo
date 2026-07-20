import { describe, it, expect } from 'vitest'
import { isSafeHref, isSafeImageSrc, assertSafeUrlsInDoc, UnsafeUrlError } from './safeUrl'

describe('isSafeHref', () => {
	it('allows an explicit https:// URL to any origin (that IS an external link)', () => {
		expect(isSafeHref('https://example.com')).toBe(true)
		expect(isSafeHref('https://example.com/path?q=1#frag')).toBe(true)
	})

	it('allows an explicit http:// URL', () => {
		expect(isSafeHref('http://example.com')).toBe(true)
	})

	it('allows an in-page fragment', () => {
		expect(isSafeHref('#section-2')).toBe(true)
	})

	it('allows mailto: and tel:', () => {
		expect(isSafeHref('mailto:a@b.com')).toBe(true)
		expect(isSafeHref('tel:+15551234567')).toBe(true)
		expect(isSafeHref('MAILTO:a@b.com')).toBe(true) // scheme is case-insensitive
	})

	it('allows a genuinely same-origin relative path', () => {
		expect(isSafeHref('/some/path')).toBe(true)
		expect(isSafeHref('/')).toBe(true)
	})

	it('rejects javascript: and data: schemes', () => {
		expect(isSafeHref('javascript:alert(1)')).toBe(false)
		expect(isSafeHref('JavaScript:alert(1)')).toBe(false) // case
		expect(isSafeHref('  javascript:alert(1)')).toBe(false) // leading whitespace
		expect(isSafeHref('data:text/html,<script>alert(1)</script>')).toBe(false)
	})

	it('rejects an empty string', () => {
		expect(isSafeHref('')).toBe(false)
		expect(isSafeHref('   ')).toBe(false)
	})

	it('rejects plain protocol-relative URLs (the original regex already caught this)', () => {
		expect(isSafeHref('//evil.com')).toBe(false)
		expect(isSafeHref('//evil.com/path')).toBe(false)
	})

	it('rejects the backslash-equivalent bypass a prefix regex missed (BLOCKER regression guard)', () => {
		// Regression guard (expert review, 2026-07-17): the WHATWG URL spec treats a backslash as
		// a forward slash for http(s) URLs, so these all resolve OFF-ORIGIN despite looking like a
		// single leading slash to a naive prefix check. Verified directly against `new URL`:
		// `new URL('/\\evil.com', 'https://good.example.org/').href === 'https://evil.com/'`.
		expect(isSafeHref('/\\evil.com')).toBe(false)
		expect(isSafeHref('\\\\evil.com')).toBe(false)
		expect(isSafeHref('\\/evil.com')).toBe(false)
		expect(isSafeHref('/\\/evil.com')).toBe(false)
	})
})

describe('isSafeImageSrc', () => {
	it('allows an explicit https:// URL', () => {
		expect(isSafeImageSrc('https://example.com/photo.jpg')).toBe(true)
	})

	it('allows a data:image/* URL (cannot execute script, unlike data:text/html)', () => {
		expect(isSafeImageSrc('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
		expect(isSafeImageSrc('DATA:IMAGE/PNG;base64,iVBORw0KGgo=')).toBe(true)
	})

	it('rejects data:text/html and other non-image data: URLs', () => {
		expect(isSafeImageSrc('data:text/html,<script>alert(1)</script>')).toBe(false)
	})

	it('allows a genuinely same-origin relative path', () => {
		expect(isSafeImageSrc('/images/photo.jpg')).toBe(true)
	})

	it('rejects the same backslash-equivalent bypass as isSafeHref (BLOCKER regression guard)', () => {
		expect(isSafeImageSrc('/\\evil.com/tracker.png')).toBe(false)
		expect(isSafeImageSrc('//evil.com/tracker.png')).toBe(false)
	})

	it('rejects javascript: and an empty string', () => {
		expect(isSafeImageSrc('javascript:alert(1)')).toBe(false)
		expect(isSafeImageSrc('')).toBe(false)
	})
})

describe('assertSafeUrlsInDoc', () => {
	it('does not throw for a doc with only safe links/images', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'hi',
							marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
						},
					],
				},
				{ type: 'image', attrs: { src: 'https://example.com/photo.jpg' } },
			],
		}
		expect(() => assertSafeUrlsInDoc(doc)).not.toThrow()
	})

	it('throws UnsafeUrlError for an unsafe link href, nested arbitrarily deep', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'paragraph', // nested, to prove the walk recurses
							content: [
								{
									type: 'text',
									text: 'hi',
									marks: [{ type: 'link', attrs: { href: '/\\evil.com' } }],
								},
							],
						},
					],
				},
			],
		}
		expect(() => assertSafeUrlsInDoc(doc)).toThrow(UnsafeUrlError)
	})

	it('throws UnsafeUrlError for an unsafe image src', () => {
		const doc = {
			type: 'doc',
			content: [{ type: 'image', attrs: { src: 'javascript:alert(1)' } }],
		}
		expect(() => assertSafeUrlsInDoc(doc)).toThrow(UnsafeUrlError)
	})

	it('is a no-op for a node with no marks/content/attrs', () => {
		expect(() => assertSafeUrlsInDoc({ type: 'paragraph' })).not.toThrow()
	})
})
