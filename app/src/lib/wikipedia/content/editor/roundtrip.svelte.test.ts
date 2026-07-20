/**
 * Losslessness / IDENTITY proof for the block editor's TipTap schema (browser test
 * — TipTap needs a real DOM). The load-bearing property is *identity*: loading a
 * converter-produced doc and reading it straight back must EQUAL the source, so
 * staging an unedited page is a true no-op and the structural merge sees no phantom
 * diff. We assert this three ways:
 *  1. IDENTITY on load — `getJSON(setContent(doc)) deepEquals doc` for every real
 *     seeded doc (catches attribute injection, e.g. link target/rel, list start/type).
 *  2. IDENTITY after a transaction — dispatch a real selection transaction first, so
 *     `appendTransaction` plugins (e.g. StarterKit's TrailingNode) get a chance to
 *     mutate the doc; the doc must still equal the source (catches phantom trailing
 *     paragraphs injected on first edit/focus).
 *  3. COVERAGE — a synthetic doc that exercises EVERY node type, mark type, and the
 *     easy-to-lose variants (code mark, external link, level-4 heading, inline math,
 *     note payload, ordered/bullet lists, blockquote attribution) round-trips exactly.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { articles } from '../../data/mock'
import { articleToPage } from '../fromArticle'
import { blockExtensions } from './extensions'
import type { ProseMirrorDoc } from '../schema'

function makeEditor(content: ProseMirrorDoc): Editor {
	const element = document.createElement('div')
	document.body.appendChild(element)
	return new Editor({ element, extensions: blockExtensions(), content })
}

/** Load a doc and read it straight back. */
function roundtrip(content: ProseMirrorDoc): ProseMirrorDoc {
	const editor = makeEditor(content)
	const json = editor.getJSON() as ProseMirrorDoc
	editor.destroy()
	return json
}

/** Load a doc, dispatch a real (selection) transaction — as focusing/typing would —
 * then read it back. Exposes appendTransaction-driven mutations (TrailingNode etc.). */
function roundtripAfterTx(content: ProseMirrorDoc): ProseMirrorDoc {
	const editor = makeEditor(content)
	editor.view.dispatch(editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc)))
	const json = editor.getJSON() as ProseMirrorDoc
	editor.destroy()
	return json
}

// Every text_block content doc across all mock articles.
const docs: ProseMirrorDoc[] = articles
	.map(articleToPage)
	.flatMap((page) =>
		page.elements
			.filter(
				(el): el is Extract<typeof el, { type: 'text_block' }> => el.type === 'text_block',
			)
			.map((el) => el.content),
	)

afterEach(() => {
	document.body.innerHTML = ''
})

describe('block editor round-trip', () => {
	it('has text_block content to exercise', () => {
		expect(docs.length).toBeGreaterThan(0)
	})

	it('is identity on load (no attribute injection, no loss)', () => {
		for (const doc of docs) expect(roundtrip(doc)).toEqual(doc)
	})

	it('is identity after a real transaction (no phantom trailing node on first edit)', () => {
		for (const doc of docs) expect(roundtripAfterTx(doc)).toEqual(doc)
	})

	it('round-trips a doc exercising every node type, mark type, and variant', () => {
		// One doc covering: headings L2/L3/L4, paragraph, bullet + ordered lists,
		// blockquote (with attribution), callout (each variant, with/without title),
		// table, block + inline math, and every mark (bold/italic/code/link internal+
		// external/cite/note) — including a code mark and a note payload.
		const source: ProseMirrorDoc = {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
				{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
				{ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'H4' }] },
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'a', marks: [{ type: 'bold' }] },
						{ type: 'text', text: 'b', marks: [{ type: 'italic' }] },
						{ type: 'text', text: 'c', marks: [{ type: 'code' }] },
						{
							type: 'text',
							text: 'd',
							marks: [{ type: 'link', attrs: { href: '/slug' } }],
						},
						{
							type: 'text',
							text: 'e',
							marks: [{ type: 'link', attrs: { href: 'https://x.org' } }],
						},
						{ type: 'text', text: 'f', marks: [{ type: 'cite', attrs: { id: 'c1' } }] },
						{
							type: 'text',
							text: 'g',
							marks: [{ type: 'note', attrs: { text: 'a sidenote' } }],
						},
						// MULTIPLE simultaneous marks on one run — must be in canonical rank
						// order (link, bold, italic, cite, note) or ProseMirror re-sorts them
						// and identity breaks. (code omitted: it's mark-exclusive by default.)
						{
							type: 'text',
							text: 'h',
							marks: [
								{ type: 'link', attrs: { href: '/s' } },
								{ type: 'bold' },
								{ type: 'italic' },
								{ type: 'cite', attrs: { id: 'c2' } },
								{ type: 'note', attrs: { text: 'n2' } },
							],
						},
					],
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'u1' }] },
							],
						},
					],
				},
				{
					type: 'orderedList',
					content: [
						{
							type: 'listItem',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'o1' }] },
							],
						},
					],
				},
				{
					type: 'blockquote',
					attrs: { attribution: 'Ada L.' },
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }],
				},
				// unattributed quote — the ABSENT-optional-attr case. The converter emits
				// the canonical `{attribution: null}`, so identity must hold here too (a
				// declared-default attr is materialized on round-trip; if the source used
				// `undefined`/no attrs, it would mismatch).
				{
					type: 'blockquote',
					attrs: { attribution: null },
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q2' }] }],
				},
				{
					type: 'callout',
					attrs: { variant: 'warning', title: 'Heads up' },
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'w' }] }],
				},
				// untitled callout — same absent-optional-attr concern for `title`.
				{
					type: 'callout',
					attrs: { variant: 'info', title: null },
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'i' }] }],
				},
				{ type: 'math', attrs: { tex: 'e^{i\\pi}+1=0', display: true } },
				{ type: 'math', attrs: { tex: 'x^2', display: false } },
				{
					type: 'table',
					attrs: {
						headers: ['A', 'B'],
						rows: [
							['1', '2'],
							['3', '4'],
						],
					},
				},
				// end on a paragraph so this fixture is also valid pre-trailingNode-fix intuition
				{ type: 'paragraph', content: [{ type: 'text', text: 'tail' }] },
			],
		}
		expect(roundtrip(source)).toEqual(source)
		expect(roundtripAfterTx(source)).toEqual(source)
	})
})
