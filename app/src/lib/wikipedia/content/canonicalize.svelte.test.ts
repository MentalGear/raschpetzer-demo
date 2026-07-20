/**
 * Proof that `canonicalize` retires the normalization bug CLASS (not instances).
 * Browser test: the load-bearing property is that `canonicalizeDoc(x)` equals what a
 * LIVE editor produces from `x`, which needs a real DOM.
 *
 * Properties asserted:
 *  1. EDITOR-AGREEMENT — `canonicalizeDoc(x)` === a live `blockExtensions()` editor's
 *     `getJSON()` of `x`. This is the whole thesis: canonical == the editor's normal
 *     form, so a load→edit→getJSON round-trip is identity by construction.
 *  2. IDEMPOTENCY — `canon(canon(x)) === canon(x)`. (The right property: some inputs
 *     legitimately change on the FIRST pass; none may change on the second.)
 *  3. Both hold over a fast-check corpus of random schema-conformant docs (the class),
 *     over the real seeded pages, and for deliberately NON-canonical input.
 *  4. `.check()` actually enforces mark-exclusivity (throws) — without it the
 *     `code excludes _` class would silently survive `fromJSON`→`toJSON`.
 */
import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { Editor } from '@tiptap/core'
import { articles } from '../data/mock'
import { articleToPage } from './fromArticle'
import { canonicalizeDoc } from './canonicalize'
import { blockExtensions } from './editor/extensions'
import type { ProseMirrorDoc } from './schema'

/** A live editor's normal form of a doc (what an unedited load→getJSON produces). */
function editorNormalForm(doc: ProseMirrorDoc): ProseMirrorDoc {
	const element = document.createElement('div')
	document.body.appendChild(element)
	const editor = new Editor({ element, extensions: blockExtensions(), content: doc })
	const json = editor.getJSON() as ProseMirrorDoc
	editor.destroy()
	return json
}

afterEach(() => {
	document.body.innerHTML = ''
})

// ── fast-check arbitraries: schema-conformant ProseMirror docs ───────────────────
const word = fc.constantFrom('alpha', 'beta', 'gamma', 'the fox', 'x', 'y')
const href = fc.constantFrom('/a', '/b', 'https://e.com', '#x', 'mailto:a@b.co')

// marks: either the exclusive `code` alone, none, or a RANDOM-ORDER subset of the
// non-exclusive marks (random order is what exercises the rank-sorter).
const marksArb = fc.oneof(
	fc.constant<ProseMirrorDoc['content']>([] as never),
	fc.constant([{ type: 'code' }]),
	fc
		.shuffledSubarray(['bold', 'italic', 'link', 'cite', 'note'], { minLength: 1 })
		.chain((types) =>
			fc
				.tuple(href, word, word)
				.map(([h, id, note]) =>
					types.map((t) =>
						t === 'link'
							? { type: 'link', attrs: { href: h } }
							: t === 'cite'
								? { type: 'cite', attrs: { id } }
								: t === 'note'
									? { type: 'note', attrs: { text: note } }
									: { type: t },
					),
				),
		),
)
const textNode = fc
	.record({ text: word, marks: marksArb })
	.map(({ text, marks }) =>
		marks.length ? { type: 'text', text, marks } : { type: 'text', text },
	)
const inline = fc.array(textNode, { minLength: 1, maxLength: 3 })
const paragraph = inline.map((content) => ({ type: 'paragraph', content }))
const heading = fc
	.record({ level: fc.constantFrom(2, 3, 4), text: word })
	.map(({ level, text }) => ({
		type: 'heading',
		attrs: { level },
		content: [{ type: 'text', text }],
	}))
const listItem = paragraph.map((p) => ({ type: 'listItem', content: [p] }))
const list = (type: 'bulletList' | 'orderedList') =>
	fc.array(listItem, { minLength: 1, maxLength: 2 }).map((content) => ({ type, content }))
const blockquote = fc
	.record({ attribution: fc.option(word, { nil: undefined }), p: paragraph })
	.map(({ attribution, p }) => ({
		type: 'blockquote',
		...(attribution ? { attrs: { attribution } } : {}),
		content: [p],
	}))
const callout = fc
	.record({
		variant: fc.constantFrom('note', 'info', 'warning'),
		title: fc.option(word, { nil: undefined }),
		p: paragraph,
	})
	.map(({ variant, title, p }) => ({
		type: 'callout',
		attrs: { variant, ...(title ? { title } : {}) },
		content: [p],
	}))
const table = fc
	.record({
		headers: fc.array(word, { minLength: 1, maxLength: 3 }),
		rows: fc.array(fc.array(word, { minLength: 1, maxLength: 3 }), { maxLength: 2 }),
	})
	.map(({ headers, rows }) => ({ type: 'table', attrs: { headers, rows } }))
const math = fc
	.record({ tex: word, display: fc.boolean() })
	.map(({ tex, display }) => ({ type: 'math', attrs: { tex, display } }))
const block = fc.oneof(
	paragraph,
	heading,
	list('bulletList'),
	list('orderedList'),
	blockquote,
	callout,
	table,
	math,
)
const docArb = fc
	.array(block, { minLength: 1, maxLength: 5 })
	.map((content) => ({ type: 'doc', content }) as ProseMirrorDoc)

describe('canonicalize', () => {
	it('property: canon(x) equals the live editor normal form, and is idempotent', () => {
		fc.assert(
			fc.property(docArb, (doc) => {
				const c1 = canonicalizeDoc(doc)
				expect(canonicalizeDoc(c1)).toEqual(c1) // idempotent
				expect(editorNormalForm(doc)).toEqual(c1) // canon == editor's normal form
			}),
			{ numRuns: 60 },
		)
	})

	it('every seeded text_block doc is already canonical (canon is a no-op on the seed)', () => {
		const docs = articles
			.map(articleToPage)
			.flatMap((p) => p.elements.filter((e) => e.type === 'text_block').map((e) => e.content))
		expect(docs.length).toBeGreaterThan(0)
		for (const doc of docs) expect(canonicalizeDoc(doc)).toEqual(doc)
	})

	it('fixes deliberately NON-canonical input (mark order + absent optional attrs)', () => {
		const ugly: ProseMirrorDoc = {
			type: 'doc',
			content: [
				// marks in the wrong order; canon must re-sort to rank order (bold before italic)
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'x', marks: [{ type: 'italic' }, { type: 'bold' }] },
					],
				},
				// blockquote with NO attrs; canon must materialize {attribution: null}
				{
					type: 'blockquote',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }],
				},
			],
		}
		const c = canonicalizeDoc(ugly)
		expect(c.content[0].content?.[0].marks?.map((m) => m.type)).toEqual(['bold', 'italic'])
		expect(c.content[1].attrs).toEqual({ attribution: null })
		expect(canonicalizeDoc(c)).toEqual(c) // idempotent
		expect(editorNormalForm(ugly)).toEqual(c) // matches the live editor
	})

	it('.check() enforces mark-exclusivity — canonicalizeDoc throws on code+bold', () => {
		const bad: ProseMirrorDoc = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'x', marks: [{ type: 'code' }, { type: 'bold' }] },
					],
				},
			],
		}
		expect(() => canonicalizeDoc(bad)).toThrow()
	})
})
