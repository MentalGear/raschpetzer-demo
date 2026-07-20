import { describe, it, expect } from 'vitest'
import { articles } from '../data/mock'
import type { Article, Block, Inline, Mark } from '../data/types'
import { articleToPage } from './fromArticle'
import { pageToArticle } from './pageToArticle'
import { parsePage, type Page } from './schema'

// ── structural normalisation ────────────────────────────────────────────────────
// The forward map (`articleToPage` + `canonicalizePage`) is lossy in ways the reader
// doesn't care about: it re-keys block ids, and PM may merge adjacent same-mark text runs.
// We compare the RENDERABLE editable shape, so we normalise both sides identically (id-free,
// runs merged) before asserting deep-equality — accounting for each known-lossy point
// explicitly rather than loosening the whole assertion.

/** Merge consecutive runs carrying deep-equal marks (ProseMirror joins same-mark text). */
function normRuns(runs: Inline): Inline {
	const out: Inline = []
	for (const r of runs) {
		const prev = out[out.length - 1]
		const sameMarks =
			prev && JSON.stringify(prev.marks ?? null) === JSON.stringify(r.marks ?? null)
		if (prev && sameMarks) prev.text += r.text
		else out.push(r.marks ? { text: r.text, marks: r.marks } : { text: r.text })
	}
	return out
}

/** Id-free, runs-merged, optionals-nulled view of a block. */
function structuralBlock(b: Block): unknown {
	switch (b.type) {
		case 'heading':
			return { type: 'heading', level: b.level, text: b.text }
		case 'paragraph':
			return { type: 'paragraph', runs: normRuns(b.runs) }
		case 'list':
			return { type: 'list', ordered: b.ordered, items: b.items.map(normRuns) }
		case 'quote':
			return {
				type: 'quote',
				attribution: b.attribution ?? null,
				runs: normRuns(b.runs),
			}
		case 'callout':
			return {
				type: 'callout',
				variant: b.variant,
				title: b.title ?? null,
				runs: normRuns(b.runs),
			}
		case 'table':
			return { type: 'table', headers: b.headers, rows: b.rows }
		case 'math':
			return { type: 'math', tex: b.tex, display: !!b.display }
		case 'figure':
			return {
				type: 'figure',
				alt: b.alt,
				caption: b.caption ?? null,
				credit: b.credit ?? null,
				// `tone` only selects a rendered placeholder gradient when there's no real
				// image (figureVisual.ts) — once a real image exists it's decorative-only and
				// isn't recoverable from the Page side (there's no placeholder path to parse a
				// tone index back out of; `galleryToFigure` never forwards `src` onto the
				// reconstructed block either, so masking on `b.src` itself would be asymmetric
				// between the two sides of the comparison). Every real-image figure in this
				// corpus also authors a `ratio` (verified), and `ratio` DOES survive the round
				// trip symmetrically, so it's the reliable signal to mask on instead — same
				// spirit as `ratio`'s own exclusion just below.
				tone: b.ratio ? null : b.tone,
				// EXCLUDED from this broad structural comparison — same reason as the `gallery`
				// case below: `figureToGallery` now synthesizes width/height from `ratio` too
				// (2026-07-20), so it survives an Article → Page → Article round trip up to
				// integer width/height rounding, not exactly. The dedicated "recovers ratio,
				// single-figure path" test below asserts this precisely (`toBeCloseTo`).
			}
		case 'gallery':
			// Phase 3 added the first mock gallery block (honeybee/en, data/mock.ts), so this
			// case is now actually exercised by the "round-trips every mock article" test below
			// — added in Phase 2 so that test wouldn't silently normalize a future gallery block
			// to `undefined` (this switch has no `default`, and the function's `unknown` return
			// type means a missing case doesn't fail typecheck the way it would with a
			// `never`-exhaustiveness pattern — found while fixing an unrelated Phase 2 review
			// finding in this file).
			//
			// `ratio` is EXCLUDED from this broad structural comparison for simplicity, not because
			// it's lossy: `galleryBlockToGallery` now synthesizes width/height from `ratio` (2026-07-20),
			// so gallery items DO survive an Article → Page → Article round trip — up to integer
			// width/height rounding (a fixed-base × ratio synthesis, not exact for every possible
			// ratio). Coupling this whole-fixture-suite comparison to that rounding tolerance for
			// every mock article isn't worth it; the dedicated "recovers ratio" and "two-hop round
			// trip" tests below assert the real behavior precisely (`toBeCloseTo`). The single-
			// figure/lead path (`figureToGallery`) now forwards `ratio` too (closed the
			// ADR-001 gap once a real single-figure block — raschpetzer.ts's `fig-catchment`
			// — started authoring one); `figure`'s own `ratio: b.ratio ?? null` above is a
			// genuine, exact comparison, not a masked one.
			return {
				type: 'gallery',
				items: b.items.map((it) => ({
					id: it.id,
					alt: it.alt,
					caption: it.caption ?? null,
					credit: it.credit ?? null,
					// see the `figure` case's comment: masked once a real image exists (keyed
					// off `ratio`, not `src`, for the same reconstructed-side asymmetry reason).
					tone: it.ratio ? null : it.tone,
				})),
			}
	}
}

const structuralLead = (fig: Article['lead']): unknown => (fig ? structuralBlock(fig) : null)

describe('pageToArticle — round-trips every mock article', () => {
	for (const a of articles) {
		it(`reproduces ${a.slug}/${a.locale}`, () => {
			const page = articleToPage(a)
			const back = pageToArticle(page, a)

			// From the Page (authoritative editable fields).
			expect(back.title).toEqual(a.title)
			expect(back.summary).toEqual(a.summary)
			expect(back.blocks.map(structuralBlock)).toEqual(a.blocks.map(structuralBlock))
			expect(structuralLead(back.lead)).toEqual(structuralLead(a.lead))
			expect(back.infobox).toEqual(a.infobox)

			// From `base` (the Page never carries these — kept verbatim).
			expect(back.slug).toEqual(a.slug)
			expect(back.locale).toEqual(a.locale)
			expect(back.categories).toEqual(a.categories)
			expect(back.citations).toEqual(a.citations)
			expect(back.id).toEqual(a.id)
			expect(back.revisions).toEqual(a.revisions)
			expect(back.contributors).toEqual(a.contributors)
			expect(back.i18n).toEqual(a.i18n)
		})
	}

	it('every reconstructed article has unique block ids', () => {
		for (const a of articles) {
			const back = pageToArticle(articleToPage(a), a)
			const ids = back.blocks.map((b) => b.id)
			expect(new Set(ids).size, `${a.slug}/${a.locale}`).toBe(ids.length)
		}
	})
})

// ── focused unit tests ──────────────────────────────────────────────────────────

/** Build one prose-only article around `blocks` (no lead), for targeted round-trips. */
function proseArticle(blocks: Block[]): Article {
	return {
		id: 'a-unit',
		slug: 'unit',
		locale: 'en',
		title: 'Unit',
		summary: 'A unit fixture.',
		categories: [],
		infobox: [],
		blocks,
		citations: [],
		revisions: [],
		updatedAt: 0,
		contributors: [],
	}
}

/** Round-trip a single block through Page and back, returning the reconstructed block. */
function roundTripBlock(block: Block): Block {
	const a = proseArticle([block])
	return pageToArticle(articleToPage(a), a).blocks[0]
}

describe('pageToArticle — marks round-trip', () => {
	const cases: { name: string; marks: Mark }[] = [
		{ name: 'bold', marks: { bold: true } },
		{ name: 'italic', marks: { italic: true } },
		{ name: 'code', marks: { code: true } },
		{ name: 'internal link', marks: { link: { kind: 'internal', slug: 'photosynthesis' } } },
		{
			name: 'external link',
			marks: { link: { kind: 'external', href: 'https://example.com/x' } },
		},
		{ name: 'cite', marks: { cite: 'c1' } },
		{ name: 'note', marks: { note: 'a sidenote' } },
	]

	for (const { name, marks } of cases) {
		it(`${name}`, () => {
			const block: Block = {
				id: 'p',
				type: 'paragraph',
				runs: [{ text: 'before ' }, { text: 'marked', marks }, { text: ' after' }],
			}
			const back = roundTripBlock(block)
			expect(back.type).toBe('paragraph')
			const run = (back as Extract<Block, { type: 'paragraph' }>).runs.find(
				(r) => r.text === 'marked',
			)
			expect(run?.marks).toEqual(marks)
		})
	}
})

describe('pageToArticle — block types', () => {
	it('callout keeps variant + title + body', () => {
		const back = roundTripBlock({
			id: 'c',
			type: 'callout',
			variant: 'warning',
			title: 'Careful',
			runs: [{ text: 'Body text.' }],
		})
		expect(back).toMatchObject({
			type: 'callout',
			variant: 'warning',
			title: 'Careful',
			runs: [{ text: 'Body text.' }],
		})
	})

	it('quote keeps attribution', () => {
		const back = roundTripBlock({
			id: 'q',
			type: 'quote',
			runs: [{ text: 'A quotation.' }],
			attribution: 'Someone',
		})
		expect(back).toMatchObject({ type: 'quote', attribution: 'Someone' })
		expect((back as Extract<Block, { type: 'quote' }>).runs).toEqual([{ text: 'A quotation.' }])
	})

	it('table keeps headers + rows', () => {
		const headers = ['A', 'B']
		const rows = [
			['1', '2'],
			['3', '4'],
		]
		const back = roundTripBlock({ id: 't', type: 'table', headers, rows })
		// block ids are re-keyed to the element id (documented lossy point) — assert the payload.
		expect(back).toMatchObject({ type: 'table', headers, rows })
	})

	it('math keeps tex + display', () => {
		const back = roundTripBlock({ id: 'm', type: 'math', tex: 'e=mc^2', display: true })
		expect(back).toMatchObject({ type: 'math', tex: 'e=mc^2', display: true })
	})

	it('ordered vs bullet list preserves order flag + item runs', () => {
		const ordered = roundTripBlock({
			id: 'l',
			type: 'list',
			ordered: true,
			items: [[{ text: 'one' }], [{ text: 'two' }]],
		})
		expect(ordered).toMatchObject({ type: 'list', ordered: true })
		expect((ordered as Extract<Block, { type: 'list' }>).items).toEqual([
			[{ text: 'one' }],
			[{ text: 'two' }],
		])
		const bullet = roundTripBlock({
			id: 'l',
			type: 'list',
			ordered: false,
			items: [[{ text: 'x' }]],
		})
		expect((bullet as Extract<Block, { type: 'list' }>).ordered).toBe(false)
	})
})

const UNIT_BASE = proseArticle([])

/** A schema-valid Page whose SECOND element is a gallery (so it maps to a figure block,
 *  not the lead). The leading text_block keeps the gallery non-leading. */
function pageWithGallery(
	items: {
		id: string
		image: string
		alt: string
		caption?: string
		source?: string
		width?: number
		height?: number
	}[],
): Page {
	return parsePage({
		schemaVersion: 1,
		slug: 'unit',
		locale: 'en',
		title: 'Unit',
		elements: [
			{
				id: 'tb-0',
				type: 'text_block',
				content: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
				},
			},
			{ id: 'gal-1', type: 'gallery_block', items },
		],
	})
}

describe('pageToArticle — gallery → figure', () => {
	it('parses tone N from /placeholders/tone-<N>.svg', () => {
		const page = pageWithGallery([{ id: 'i', image: '/placeholders/tone-3.svg', alt: 'a' }])
		const fig = pageToArticle(page, UNIT_BASE).blocks[1]
		expect(fig).toMatchObject({ type: 'figure', tone: 3, alt: 'a' })
	})

	it('defaults tone to 0 for a non-tone image (e.g. gallery-item.svg)', () => {
		const page = pageWithGallery([
			{ id: 'i', image: '/placeholders/gallery-item.svg', alt: 'added' },
		])
		const fig = pageToArticle(page, UNIT_BASE).blocks[1]
		expect(fig).toMatchObject({ type: 'figure', tone: 0, alt: 'added' })
	})

	it('maps item.source → credit, item.caption → caption', () => {
		const page = parsePage({
			schemaVersion: 1,
			slug: 'unit',
			locale: 'en',
			title: 'Unit',
			elements: [
				{
					id: 'tb-0',
					type: 'text_block',
					content: { type: 'doc', content: [{ type: 'paragraph' }] },
				},
				{
					id: 'gal-1',
					type: 'gallery_block',
					items: [
						{
							id: 'i',
							image: '/placeholders/tone-2.svg',
							alt: 'alt',
							caption: 'cap',
							source: 'src',
						},
					],
				},
			],
		})
		const fig = pageToArticle(page, UNIT_BASE).blocks[1]
		expect(fig).toMatchObject({
			type: 'figure',
			tone: 2,
			alt: 'alt',
			caption: 'cap',
			credit: 'src',
		})
	})

	it('a non-leading 1-item gallery STILL collapses to a single figure (boundary condition)', () => {
		const page = pageWithGallery([
			{ id: 'i0', image: '/placeholders/tone-1.svg', alt: 'only', source: 'c0' },
		])
		const back = pageToArticle(page, UNIT_BASE)
		const figures = back.blocks.filter((b) => b.type === 'figure')
		const galleries = back.blocks.filter((b) => b.type === 'gallery')
		expect(figures).toHaveLength(1)
		expect(galleries).toHaveLength(0)
		expect(figures[0]).toMatchObject({ type: 'figure', tone: 1, alt: 'only', credit: 'c0' })
	})

	it('a LEADING gallery becomes the article lead, not a block', () => {
		const page = parsePage({
			schemaVersion: 1,
			slug: 'unit',
			locale: 'en',
			title: 'Unit',
			elements: [
				{
					id: 'gal-0',
					type: 'gallery_block',
					items: [{ id: 'i', image: '/placeholders/tone-5.svg', alt: 'lead alt' }],
				},
				{
					id: 'tb-1',
					type: 'text_block',
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'body' }] }],
					},
				},
			],
		})
		const back = pageToArticle(page, UNIT_BASE)
		expect(back.lead).toMatchObject({ type: 'figure', tone: 5, alt: 'lead alt' })
		expect(back.blocks.some((b) => b.type === 'figure')).toBe(false)
	})

	it('a LEADING gallery with >1 items STILL collapses to a single figure for article.lead (unchanged scope boundary)', () => {
		const page = parsePage({
			schemaVersion: 1,
			slug: 'unit',
			locale: 'en',
			title: 'Unit',
			elements: [
				{
					id: 'gal-0',
					type: 'gallery_block',
					items: [
						{
							id: 'i0',
							image: '/placeholders/tone-5.svg',
							alt: 'lead first',
							source: 'lc0',
						},
						{
							id: 'i1',
							image: '/placeholders/tone-2.svg',
							alt: 'lead second',
							source: 'lc1',
						},
						{ id: 'i2', image: '/placeholders/tone-0.svg', alt: 'lead third' },
					],
				},
				{
					id: 'tb-1',
					type: 'text_block',
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'body' }] }],
					},
				},
			],
		})
		const back = pageToArticle(page, UNIT_BASE)
		// Only items[0] survives — the lead is still a single hero image (FigureBlock only).
		expect(back.lead).toMatchObject({
			type: 'figure',
			tone: 5,
			alt: 'lead first',
			credit: 'lc0',
		})
		expect(back.blocks.some((b) => b.type === 'figure')).toBe(false)
		expect(back.blocks.some((b) => b.type === 'gallery')).toBe(false)
	})
})

describe('pageToArticle — gallery → real multi-image GalleryBlock (non-leading, >1 items)', () => {
	it('a non-leading multi-item gallery becomes a GalleryBlock, not a figure', () => {
		const page = pageWithGallery([
			{
				id: 'i0',
				image: '/placeholders/tone-1.svg',
				alt: 'first',
				caption: 'Cap 0',
				source: 'c0',
			},
			{ id: 'i1', image: '/placeholders/tone-4.svg', alt: 'second' },
		])
		const back = pageToArticle(page, UNIT_BASE)
		const figures = back.blocks.filter((b) => b.type === 'figure')
		const galleries = back.blocks.filter((b) => b.type === 'gallery')
		expect(figures).toHaveLength(0)
		expect(galleries).toHaveLength(1)
	})

	it('recovers tone per item (via the tone-<N>.svg placeholder path) and maps caption/source → caption/credit only when present', () => {
		const page = pageWithGallery([
			{
				id: 'i0',
				image: '/placeholders/tone-1.svg',
				alt: 'first',
				caption: 'Cap 0',
				source: 'c0',
			},
			{ id: 'i1', image: '/placeholders/tone-4.svg', alt: 'second' },
			{ id: 'i2', image: '/placeholders/gallery-item.svg', alt: 'third' },
		])
		const back = pageToArticle(page, UNIT_BASE)
		const gallery = back.blocks.find(
			(b): b is Extract<Block, { type: 'gallery' }> => b.type === 'gallery',
		)
		expect(gallery, 'expected a gallery block').toBeTruthy()
		expect(gallery!.items).toHaveLength(3)
		// item ids are preserved verbatim from the Page side, not re-synthesized.
		expect(gallery!.items.map((it) => it.id)).toEqual(['i0', 'i1', 'i2'])
		expect(gallery!.items[0]).toMatchObject({
			alt: 'first',
			tone: 1,
			caption: 'Cap 0',
			credit: 'c0',
		})
		expect(gallery!.items[1]).toMatchObject({ alt: 'second', tone: 4 })
		expect(gallery!.items[1].caption).toBeUndefined()
		expect(gallery!.items[1].credit).toBeUndefined()
		// unrecognised image path (no tone-<N>.svg suffix) → tone defaults to 0.
		expect(gallery!.items[2]).toMatchObject({ alt: 'third', tone: 0 })
	})

	it('recovers ratio from width/height, mirroring galleryToFigure (regression: was silently dropped)', () => {
		const page = pageWithGallery([
			{ id: 'i0', image: '/placeholders/tone-1.svg', alt: 'first', width: 1600, height: 900 },
			{ id: 'i1', image: '/placeholders/tone-2.svg', alt: 'second' }, // no width/height
		])
		const back = pageToArticle(page, UNIT_BASE)
		const gallery = back.blocks.find(
			(b): b is Extract<Block, { type: 'gallery' }> => b.type === 'gallery',
		)
		expect(gallery!.items[0].ratio).toBe(1600 / 900)
		expect(gallery!.items[1].ratio).toBeUndefined()
	})

	it('two-hop round trip (Article → Page → Article): item ids AND ratio survive (2026-07-20: galleryBlockToGallery now synthesizes width/height from ratio)', () => {
		const original = proseArticle([
			// A leading paragraph keeps the gallery NON-leading — a gallery that's the article's
			// very first block is indistinguishable from a real `lead` on the way back
			// (pageToArticle.ts's own documented ambiguity: "articleToPage emits the SAME shape
			// for a real lead figure and for a plain figure block that merely happens to be
			// first"), which would collapse this test's 2-item gallery into `back.lead` instead
			// of `back.blocks` — same reason `pageWithGallery` above keeps a leading text_block.
			{ id: 'p0', type: 'paragraph', runs: [{ text: 'intro' }] },
			{
				id: 'g1',
				type: 'gallery',
				items: [
					{
						id: 'authored-0',
						alt: 'first',
						tone: 1,
						caption: 'Cap 0',
						credit: 'Credit 0',
					},
					{ id: 'authored-1', alt: 'second', tone: 2, ratio: 1600 / 900 },
				],
			},
		])
		const page = articleToPage(original)
		const back = pageToArticle(page, UNIT_BASE)
		const gallery = back.blocks.find(
			(b): b is Extract<Block, { type: 'gallery' }> => b.type === 'gallery',
		)
		expect(gallery, 'expected a gallery block').toBeTruthy()
		// ids assigned when the article was first authored survive the Article→Page→Article hop
		// verbatim — this is what makes a future renderer's keyed `{#each}` stable across edits.
		expect(gallery!.items.map((it) => it.id)).toEqual(['authored-0', 'authored-1'])
		expect(gallery!.items[0]).toMatchObject({
			alt: 'first',
			tone: 1,
			caption: 'Cap 0',
			credit: 'Credit 0',
		})
		expect(gallery!.items[1]).toMatchObject({ alt: 'second', tone: 2 })
		// `ratio` now survives this hop: `galleryBlockToGallery` synthesizes a width/height pair
		// (a fixed 1200px edge × the ratio) on the way out to the Page side, which `pageToArticle`
		// then recovers back into `ratio` on the way in — `toBeCloseTo`, not `toBe`, since integer
		// width/height rounding introduces a tiny (sub-0.1%) precision loss, invisible at any
		// rendered size.
		expect(gallery!.items[1].ratio).toBeCloseTo(1600 / 900, 2)
	})

	it('recovers ratio from width/height on the single-figure/lead path too (figureToGallery, closing the ADR-001 gap)', () => {
		const original = proseArticle([
			{ id: 'p0', type: 'paragraph', runs: [{ text: 'intro' }] },
			{
				id: 'fig1',
				type: 'figure',
				alt: 'a figure',
				tone: 3,
				ratio: 1600 / 900,
			},
		])
		const page = articleToPage(original)
		const back = pageToArticle(page, UNIT_BASE)
		const figure = back.blocks.find(
			(b): b is Extract<Block, { type: 'figure' }> => b.type === 'figure',
		)
		expect(figure, 'expected a figure block').toBeTruthy()
		// same sub-0.1% integer-rounding tolerance as the gallery-item hop above.
		expect(figure!.ratio).toBeCloseTo(1600 / 900, 2)
	})
})

describe('pageToArticle — summary + base fields', () => {
	it('extracts the summary string from the summary PM doc', () => {
		const a = proseArticle([{ id: 'p', type: 'paragraph', runs: [{ text: 'hi' }] }])
		const withSummary: Article = { ...a, summary: 'The plain summary sentence.' }
		const back = pageToArticle(articleToPage(withSummary), withSummary)
		expect(back.summary).toBe('The plain summary sentence.')
	})

	it('takes categories/citations/slug/locale from base, not the Page', () => {
		const base: Article = {
			...proseArticle([{ id: 'p', type: 'paragraph', runs: [{ text: 'hi' }] }]),
			categories: ['science'],
			citations: [{ id: 'c1', title: 'A source' }],
		}
		const back = pageToArticle(articleToPage(base), base)
		expect(back.categories).toEqual(['science'])
		expect(back.citations).toEqual([{ id: 'c1', title: 'A source' }])
	})

	it('takes infobox from the Page, not base — an edited Page overrides the stale base value', () => {
		const base: Article = {
			...proseArticle([{ id: 'p', type: 'paragraph', runs: [{ text: 'hi' }] }]),
			infobox: [{ label: 'Key', value: 'Stale' }],
		}
		const page = { ...articleToPage(base), infobox: [{ label: 'Key', value: 'Edited' }] }
		const back = pageToArticle(page, base)
		expect(back.infobox).toEqual([{ label: 'Key', value: 'Edited' }])
	})

	it('falls back to base.infobox for a Page that carries none', () => {
		const base: Article = {
			...proseArticle([{ id: 'p', type: 'paragraph', runs: [{ text: 'hi' }] }]),
			infobox: [{ label: 'Key', value: 'Val' }],
		}
		const page = { ...articleToPage(base), infobox: undefined }
		const back = pageToArticle(page, base)
		expect(back.infobox).toEqual([{ label: 'Key', value: 'Val' }])
	})
})
