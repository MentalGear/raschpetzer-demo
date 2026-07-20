import { describe, it, expect, afterEach } from 'vitest'
import { related } from '@kit/core'
import { buildArticleGraph, relatedArticles } from './graph'
import { wikiStore } from '../state/wikiStore.svelte'
import type { Article } from './types'

// Minimal Article fixtures — only the fields `outboundSlugs`/`buildArticleGraph` care
// about (slug, locale, blocks) need real values; the rest just satisfy the type, same
// "smoke test with a minimal fixture" style as `../diff/blockDiff.test.ts`.
function fakeArticle(slug: string, targets: string[]): Article {
	return {
		id: slug,
		slug,
		locale: 'en',
		title: slug,
		summary: '',
		categories: [],
		blocks: [
			{
				id: 'p1',
				type: 'paragraph',
				runs: targets.map((t) => ({
					text: t,
					marks: { link: { kind: 'internal', slug: t } },
				})),
			},
		],
		citations: [],
		revisions: [],
		updatedAt: 0,
		contributors: [],
	}
}

describe('buildArticleGraph', () => {
	it('builds edges from each article’s internal wikilinks', () => {
		const g = buildArticleGraph([
			fakeArticle('a', ['b', 'c']),
			fakeArticle('b', []),
			fakeArticle('c', []),
		])
		expect([...g.nodes]).toEqual(['a', 'b', 'c'])
		expect(g.out.get('a')).toEqual(new Set(['b', 'c']))
	})

	it('drops a self-referencing wikilink (buildGraph drops self-loops)', () => {
		const g = buildArticleGraph([fakeArticle('a', ['a'])])
		expect(g.out.get('a')?.size).toBe(0)
	})

	it('ignores a wikilink to a slug outside the given article set', () => {
		const g = buildArticleGraph([fakeArticle('a', ['ghost'])])
		expect(g.out.get('a')?.size).toBe(0)
	})

	it('lets two articles that link to the same targets become "related" via shared overlap', () => {
		const articles = [
			fakeArticle('a', ['x', 'y']),
			fakeArticle('b', ['x', 'y']),
			fakeArticle('x', []),
			fakeArticle('y', []),
		]
		const g = buildArticleGraph(articles)
		expect(related(g, 'a')).toEqual([{ id: 'b', score: 1 }])
	})
})

describe('relatedArticles (controlled fixture)', () => {
	// `wikiStore.all` is the one `$state.raw` source `sourceArticles`/`bySlug` derive
	// from — swapping it for a small known corpus (same "minimal fixture" style as
	// `buildArticleGraph` above) lets us assert the exact resolved `Article[]`, not
	// just shape, the way the real-corpus smoke tests below have to. Restore it so the
	// smoke tests below still see the real corpus.
	const originalAll = wikiStore.all
	afterEach(() => {
		wikiStore.all = originalAll
	})

	it('returns the exact ranked Article[] in order, and `limit` truncates it', () => {
		// same fixture/ranking as related.test.ts: p1 -> {x,y,z}; p2 -> {x,y} (shares
		// 2/3 with p1); p3 -> {x} and p5 -> {y} (each share 1/3, tiebroken p3 < p5)
		wikiStore.all = [
			fakeArticle('p1', ['x', 'y', 'z']),
			fakeArticle('p2', ['x', 'y']),
			fakeArticle('p3', ['x']),
			fakeArticle('p5', ['y']),
			fakeArticle('x', []),
			fakeArticle('y', []),
			fakeArticle('z', []),
		]
		expect(relatedArticles('p1')).toEqual(
			['p2', 'p3', 'p5'].map((slug) => wikiStore.bySlug(slug, 'en')),
		)
		// limit truncates the (longer) ranking to its top 2
		expect(relatedArticles('p1', 2)).toEqual(
			['p2', 'p3'].map((slug) => wikiStore.bySlug(slug, 'en')),
		)
	})

	// note: the `.filter((a): a is Article => a !== undefined)` miss branch (graph.ts
	// ~L45) isn't reachable through `relatedArticles` as written, so it's left
	// unexercised rather than forced: every id `related()` can return comes from
	// `graph.nodes`, which `buildArticleGraph` builds from the very same
	// `wikiStore.sourceArticles` array that `bySlug` looks up — a returned id can never
	// fail to resolve within a single synchronous call.
})

describe('relatedArticles (adapter smoke test over the real wikiStore corpus)', () => {
	it('returns [] for an unknown slug', () => {
		expect(relatedArticles('does-not-exist-slug')).toEqual([])
	})

	it('resolves results to real Article objects from the store, never the queried slug itself', () => {
		for (const a of wikiStore.sourceArticles) {
			const out = relatedArticles(a.slug)
			expect(out.every((r) => r.locale === 'en')).toBe(true)
			expect(out.map((r) => r.slug)).not.toContain(a.slug)
		}
	})

	it('respects the limit', () => {
		for (const a of wikiStore.sourceArticles) {
			expect(relatedArticles(a.slug, 2).length).toBeLessThanOrEqual(2)
		}
	})
})
