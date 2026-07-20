/**
 * `articleExists` unit tests — runs in the browser project because `wikiStore` is a
 * runes store (`$state`). Regression coverage for the locale bug: `InlineRuns.svelte`
 * used to hardcode `wikiStore.bySlug(slug, 'en')`, so a link inside a non-English
 * article that only resolves in THAT locale (no `en` counterpart for the slug) was
 * wrongly marked as a redlink. `articleExists` must resolve via the current reading
 * locale (`wikiStore.locale`), falling back to `en` only when the target has no
 * translation — exactly `bySlug`'s own default-param behaviour.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { wikiStore, articleExists } from './wikiStore.svelte'
import type { Article } from '../data/types'

describe('articleExists', () => {
	const originalAll = wikiStore.all
	const originalLocale = wikiStore.locale

	afterEach(() => {
		wikiStore.all = originalAll
		wikiStore.locale = originalLocale
	})

	it('resolves a de-only article (no en counterpart) when the reading locale is de', () => {
		// Base it on the existing de fixture (`tea`'s de variant) but give it a slug with no
		// `en` article at all — a hardcoded `bySlug(slug, 'en')` lookup would find nothing here
		// and wrongly report a redlink, while resolving via the CURRENT locale finds it.
		const deOnly: Article = {
			...wikiStore.all.find((a) => a.slug === 'tea' && a.locale === 'de')!,
			slug: 'de-only-test-article',
		}
		wikiStore.all = [...wikiStore.all, deOnly]
		wikiStore.locale = 'de'

		expect(articleExists('de-only-test-article')).toBe(true)
	})

	it('still falls back to en when the current locale has no translation for the slug', () => {
		wikiStore.locale = 'de'
		// `hypertext` has no `de` variant in the mock corpus — `bySlug`'s en fallback covers it.
		expect(articleExists('hypertext')).toBe(true)
	})

	it('returns false for a slug with no article in any locale (a genuine redlink)', () => {
		expect(articleExists('does-not-exist-anywhere')).toBe(false)
	})

	it('still resolves an en-only link while the READING locale differs from the EDITED article', () => {
		// The editor calls `articleExists` against `wikiStore.locale` (the global reading
		// locale), not the locale of the article actually open for editing — those two can
		// diverge (see ArticleReader.svelte's `publish()` comment). This is safe as long as
		// `bySlug`'s own en-fallback keeps absorbing it: e.g. reading locale is 'de' while an
		// 'en' article is open for editing and links to another en-only slug — `bySlug` looks
		// for 'de' first (not found), then falls back to 'en' (found), so it still resolves.
		wikiStore.locale = 'de'
		expect(articleExists('hypertext')).toBe(true) // en-only slug, no de variant
	})
})
