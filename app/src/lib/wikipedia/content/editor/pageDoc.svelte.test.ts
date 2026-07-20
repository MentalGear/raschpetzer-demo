/**
 * IDENTITY proof for the single-surface (B-lite) `pageToDoc` / `docToPage` derivation —
 * the load-bearing new piece (`pageDoc.ts`). Same discipline as `roundtrip.svelte.test.ts`
 * / `canonicalize.svelte.test.ts`: this is a BROWSER test because part of it mounts a real
 * TipTap editor (needs a DOM). The properties:
 *  1. `Page → doc → Page` is identity over the whole mock corpus (ids recovered from prev,
 *     content re-canonicalized to the PLAIN schema) — so staging an unedited page is a true
 *     no-op and the structural merge sees no phantom diff.
 *  2. `doc → Page → doc` is identity over the corpus (blockId re-stamped, gallery rebuilt).
 *  3. EDITOR AGREEMENT: a live editor on `pageDocExtensions()` seeded from `pageToDoc(page)`
 *     serializes back to exactly `pageToDoc(page)`, before AND after a real transaction
 *     (catches a phantom trailing node / blockId-default drift on first focus).
 *  4. Per-block `blockId` segments the doc back into distinct `text_block`s (preserving
 *     element identity) and NEVER leaks the `blockId` attr into stored content.
 *  5. Gallery atoms round-trip to `gallery_block`s with items intact; ids stay stable across
 *     a body edit (the structural-merge alignment key).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Editor, getSchema } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { articles } from '../../data/mock'
import { articleToPage } from '../fromArticle'
import { canonicalizePage } from '../canonicalize'
import { pageDocExtensions, BLOCK_META_TYPES } from './extensions'
import { pageToDoc, docToPage } from './pageDoc'
import { parsePage, type Page, type PageElement, type ProseMirrorDoc } from '../schema'

/** Narrow a `PageElement` to its `text_block` variant's serialized content (test-only
 *  helper — `PageElement` is a union, and `gallery_block` has no `content`). */
function textContentOf(el: PageElement): string {
	if (el.type !== 'text_block') throw new Error(`expected a text_block, got ${el.type}`)
	return JSON.stringify(el.content)
}

const doc = (text: string): ProseMirrorDoc => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

const pages: Page[] = articles.map(articleToPage)

function mount(content: ProseMirrorDoc): Editor {
	const element = document.createElement('div')
	document.body.appendChild(element)
	return new Editor({ element, extensions: pageDocExtensions(), content })
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('pageToDoc / docToPage round-trip', () => {
	it('has corpus pages to exercise (with galleries)', () => {
		expect(pages.length).toBeGreaterThan(0)
		expect(pages.some((p) => p.elements.some((e) => e.type === 'gallery_block'))).toBe(true)
	})

	it('Page → doc → Page is identity over the corpus', () => {
		for (const page of pages) expect(docToPage(pageToDoc(page), page)).toEqual(page)
	})

	it('doc → Page → doc is identity over the corpus', () => {
		for (const page of pages) {
			const doc = pageToDoc(page)
			expect(pageToDoc(docToPage(doc, page))).toEqual(doc)
		}
	})

	it('the live editor agrees with pageToDoc on load (no attribute injection)', () => {
		for (const page of pages) {
			const doc = pageToDoc(page)
			const editor = mount(doc)
			expect(editor.getJSON()).toEqual(doc)
			editor.destroy()
		}
	})

	it('the live editor still agrees after a real transaction (no phantom trailing node)', () => {
		for (const page of pages) {
			const doc = pageToDoc(page)
			const editor = mount(doc)
			editor.view.dispatch(
				editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc)),
			)
			expect(editor.getJSON()).toEqual(doc)
			editor.destroy()
		}
	})

	it('round-trips a gallery_block through the read-only atom with items intact', () => {
		const prev = canonicalizePage({
			schemaVersion: 1,
			slug: 's',
			locale: 'en',
			title: 'T',
			elements: [
				{
					id: 'gal-0',
					type: 'gallery_block',
					items: [
						{
							id: 'gal-0-0',
							image: '/placeholders/tone-warm.svg',
							alt: 'A river at dusk',
							caption: 'The delta',
						},
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
		const doc = pageToDoc(prev)
		// the gallery is a single top-level `gallery` atom carrying id + items.
		const atom = (doc.content ?? []).find((n) => n.type === 'gallery')
		expect(atom?.attrs?.blockId).toBe('gal-0')
		expect((atom?.attrs?.items as unknown[])?.length).toBe(1)
		expect(docToPage(doc, prev)).toEqual(prev)
	})

	it('never leaks the blockId attr into stored text_block content (nested nodes)', () => {
		for (const page of pages) {
			const derived = docToPage(pageToDoc(page), page)
			for (const el of derived.elements) {
				if (el.type === 'text_block') {
					expect(JSON.stringify(el.content)).not.toContain('blockId')
				}
			}
		}
	})

	it('recovers ids CONTENT-anchored, not positionally, when runs are reordered', () => {
		// A · B · C — three text_block runs. Reorder their content (swap A and C positions in
		// the doc). Positional-by-kind would keep id "a" on whatever content is first; the
		// carried blockId must instead keep each id attached to ITS content, so the structural
		// merge aligns the right pairs.
		const prev = canonicalizePage({
			schemaVersion: 1,
			slug: 's',
			locale: 'en',
			title: 'T',
			elements: [
				{ id: 'a', type: 'text_block', content: doc('AAA') },
				{ id: 'b', type: 'text_block', content: doc('BBB') },
				{ id: 'c', type: 'text_block', content: doc('CCC') },
			],
		})
		const d = pageToDoc(prev)
		const nodes = [...(d.content ?? [])]
		;[nodes[0], nodes[2]] = [nodes[2], nodes[0]] // swap the first and third runs' content
		const result = docToPage({ ...d, content: nodes }, prev)
		expect(result.elements.map((e) => e.id)).toEqual(['c', 'b', 'a'])
		expect(textContentOf(result.elements[0])).toContain('CCC')
		expect(textContentOf(result.elements[2])).toContain('AAA')
	})

	it('keeps TWO adjacent text_blocks distinct (blockId-aware segmentation)', () => {
		// A shape `mergePage` can produce (one branch inserts a block next to another).
		// Positional/kind-only segmentation would coalesce them and drop the second id/i18n on
		// a no-op save; blockId-aware segmentation must keep both elements.
		const prev = canonicalizePage({
			schemaVersion: 1,
			slug: 's',
			locale: 'en',
			title: 'T',
			elements: [
				{ id: 'a', type: 'text_block', content: doc('AAA') },
				{ id: 'b', type: 'text_block', content: doc('BBB') },
			],
		})
		const result = docToPage(pageToDoc(prev), prev)
		expect(result.elements.map((e) => e.id)).toEqual(['a', 'b'])
		expect(result).toEqual(prev)
	})

	it('preserves per-element i18n metadata by recovered id', () => {
		const prev = canonicalizePage({
			schemaVersion: 1,
			slug: 's',
			locale: 'de',
			title: 'T',
			elements: [
				{
					id: 'a',
					type: 'text_block',
					content: doc('body'),
					i18n: { status: 'stale', sourceHash: 'h0' },
				},
			],
		})
		const result = docToPage(pageToDoc(prev), prev)
		expect(result.elements[0].i18n).toEqual({ status: 'stale', sourceHash: 'h0' })
	})

	it('normalizes a degenerate empty text_block (keeps its id + boundary)', () => {
		// content:[] is schema-valid (Zod) but violates the editor's block+ model; it must
		// not silently vanish on round-trip — it round-trips as a one-empty-paragraph block.
		const prev = parsePage({
			schemaVersion: 1,
			slug: 's',
			locale: 'en',
			title: 'T',
			elements: [
				{
					id: 'a',
					type: 'text_block',
					content: { type: 'doc', content: [] },
				},
			],
		})
		const result = docToPage(pageToDoc(prev), prev)
		expect(result.elements).toHaveLength(1)
		expect(result.elements[0].id).toBe('a')
		expect(result.elements[0].type).toBe('text_block')
	})

	it('every block-group node carries the per-block metadata (BLOCK_META_TYPES in sync)', () => {
		const schema = getSchema(pageDocExtensions())
		for (const [name, type] of Object.entries(schema.nodes)) {
			if (!(type.spec.group ?? '').split(' ').includes('block')) continue
			expect(BLOCK_META_TYPES).toContain(name)
			expect(type.spec.attrs).toHaveProperty('blockId')
		}
	})

	it('keeps element ids stable across a body edit (merge alignment key)', () => {
		const page = pages.find((p) => p.elements.length > 1)!
		const doc = pageToDoc(page)
		// simulate a real edit: append text to the first paragraph run in the doc.
		const edited: ProseMirrorDoc = {
			...doc,
			content: (doc.content ?? []).map((node, i) =>
				i === (doc.content ?? []).findIndex((n) => n.type === 'paragraph')
					? {
							...node,
							content: [...(node.content ?? []), { type: 'text', text: ' — edited' }],
						}
					: node,
			),
		}
		const before = page.elements.map((e) => e.id)
		const after = docToPage(edited, page).elements.map((e) => e.id)
		expect(after).toEqual(before)
	})
})
