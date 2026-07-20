import { describe, it, expect } from 'vitest'
import { slugFromInternalHref } from './linkHref'

describe('slugFromInternalHref', () => {
	it('recovers the slug from a stored unprefixed internal href', () => {
		expect(slugFromInternalHref('/photosynthesis')).toBe('photosynthesis')
		expect(slugFromInternalHref('/water-cycle')).toBe('water-cycle')
	})

	it('returns null for an external URL (not starting with a bare slash)', () => {
		expect(slugFromInternalHref('https://example.org')).toBe(null)
		expect(slugFromInternalHref('http://example.org/path')).toBe(null)
		expect(slugFromInternalHref('mailto:a@b.com')).toBe(null)
	})

	it('returns null for an empty string (no href at all — not a valid internal link)', () => {
		expect(slugFromInternalHref('')).toBe(null)
	})

	it('treats a bare "/" as the (degenerate) empty-string slug, not external', () => {
		// Consistent with the stored convention (`/${slug}`): a leading slash always means
		// "internal", even if what follows is empty. No real link has an empty slug, so this
		// is a documented edge case rather than a case the app is expected to produce.
		expect(slugFromInternalHref('/')).toBe('')
	})

	it('does not strip a base-path prefix — that is a render-time concern, not this parse', () => {
		// A base-prefixed href like "/SupraAppKit/photosynthesis" is NOT the stored convention
		// (see linkHref.ts's header) — this only recovers what's actually stored.
		expect(slugFromInternalHref('/SupraAppKit/photosynthesis')).toBe(
			'SupraAppKit/photosynthesis',
		)
	})

	it('rejects protocol-relative URLs despite starting with "/" (BLOCKER regression guard)', () => {
		// Mirrors safeUrl.test.ts's identical guard: a naive `startsWith('/')` check treats
		// "//evil.com" as an internal path, but it resolves OFF-origin in a real browser.
		expect(slugFromInternalHref('//evil.com')).toBe(null)
		expect(slugFromInternalHref('//evil.com/path')).toBe(null)
	})

	it('rejects the backslash-equivalent bypass a naive prefix check would miss (BLOCKER regression guard)', () => {
		// Regression guard: the WHATWG URL spec treats a backslash as a forward slash for
		// http(s) URLs, so these all resolve OFF-ORIGIN despite starting with a single leading
		// slash — the same bypass class safeUrl.ts's own guard covers, reproduced here in this
		// second call site and closed the same way (both now share `resolvesSameOrigin`).
		expect(slugFromInternalHref('/\\evil.com')).toBe(null)
		expect(slugFromInternalHref('/\\/evil.com')).toBe(null)
	})
})
