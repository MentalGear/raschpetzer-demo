/**
 * The lead summary ("in brief" line, `Page.summary`) bypasses ProseMirror entirely —
 * same pattern as the title and the infobox: `summaryDocForSave` builds the doc directly,
 * staged via `EditSession.edit()`. Unlike the title, an empty summary needs no placeholder
 * substitution (schema-legal, and `summaryText` just reads it back as `''` — nothing
 * downstream throws on it), so this only needs a serialization round-trip check.
 */
import { describe, it, expect } from 'vitest'
import { summaryDocForSave } from '../../components/ArticleReader.svelte'
import { summaryText } from '../pageToArticle'
import { parsePage } from '../thesoria/schema'
import { canonicalizeDoc, canonicalizePage } from '../canonicalize'

describe('summaryDocForSave', () => {
	it('round-trips real text through summaryText', () => {
		const doc = summaryDocForSave('An astrolabe is EDITED an ancient instrument.')
		expect(summaryText(doc, 'fallback')).toBe('An astrolabe is EDITED an ancient instrument.')
	})

	it('is schema-valid inside a full Page (parsePage does not throw)', () => {
		const page = parsePage({
			schemaVersion: 1,
			slug: 'unit',
			locale: 'en',
			title: 'Unit',
			summary: summaryDocForSave('A sentence.'),
			elements: [],
		})
		expect(page.summary).toBeDefined()
	})

	it('an empty summary is schema-legal and reads back as an empty string', () => {
		const doc = summaryDocForSave('')
		const page = parsePage({
			schemaVersion: 1,
			slug: 'unit',
			locale: 'en',
			title: 'Unit',
			summary: doc,
			elements: [],
		})
		expect(summaryText(page.summary, 'fallback')).toBe('')
	})

	it('canonicalizeDoc leaves the single-paragraph shape unchanged (no normalizer surprises)', () => {
		const doc = summaryDocForSave('Some text.')
		const canon = canonicalizeDoc(doc)
		expect(summaryText(canon, 'fallback')).toBe('Some text.')
	})

	it('canonicalizePage accepts a Page carrying it end-to-end', () => {
		const page = canonicalizePage(
			parsePage({
				schemaVersion: 1,
				slug: 'unit',
				locale: 'en',
				title: 'Unit',
				summary: summaryDocForSave('Canonical roundtrip.'),
				elements: [],
			}),
		)
		expect(summaryText(page.summary, 'fallback')).toBe('Canonical roundtrip.')
	})
})
