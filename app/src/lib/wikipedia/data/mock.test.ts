import { describe, it, expect } from 'vitest'
import { articles } from './mock'
import { diffBlocks, summarize } from '../diff/blockDiff'

/**
 * Guards the *synthesized* revision history (not diffBlocks in isolation): the demo's
 * marquee "semantic change" path must actually fire. If someone trims an article's first
 * content block to a form draftOf can't refine, `changed` would silently vanish from the
 * demo with the unit suite still green — this catches that.
 */
describe('synthesized revision history', () => {
	const enWithRevs = articles.filter((a) => a.locale === 'en' && a.revisions.length > 0)

	it('has en articles carrying a multi-revision history', () => {
		expect(enWithRevs.length).toBeGreaterThan(0)
		expect(enWithRevs.some((a) => a.revisions.length >= 2)).toBe(true)
	})

	it('the latest revision is identity-equal to the current article blocks', () => {
		for (const a of enWithRevs) {
			expect(a.revisions.at(-1)!.blocks).toBe(a.blocks)
		}
	})

	it('every consecutive transition yields at least one changed block', () => {
		for (const a of enWithRevs) {
			for (let i = 1; i < a.revisions.length; i++) {
				const sum = summarize(diffBlocks(a.revisions[i - 1].blocks, a.revisions[i].blocks))
				expect(sum.changed, `${a.slug} r${i - 1}→r${i}`).toBeGreaterThanOrEqual(1)
			}
		}
	})

	it('the full history of each article exercises added, changed, and removed', () => {
		for (const a of enWithRevs.filter((a) => a.revisions.length >= 2)) {
			const totals = { added: 0, removed: 0, changed: 0 }
			for (let i = 1; i < a.revisions.length; i++) {
				const s = summarize(diffBlocks(a.revisions[i - 1].blocks, a.revisions[i].blocks))
				totals.added += s.added
				totals.removed += s.removed
				totals.changed += s.changed
			}
			expect(totals.added, `${a.slug} added`).toBeGreaterThanOrEqual(1)
			expect(totals.removed, `${a.slug} removed`).toBeGreaterThanOrEqual(1)
			expect(totals.changed, `${a.slug} changed`).toBeGreaterThanOrEqual(1)
		}
	})

	it('localized variants own an empty revisions array (no aliasing of the source)', () => {
		for (const a of articles.filter((a) => a.locale !== 'en')) {
			expect(a.revisions, a.slug).toEqual([])
		}
	})
})
