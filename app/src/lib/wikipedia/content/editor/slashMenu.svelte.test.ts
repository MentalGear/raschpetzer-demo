/**
 * Coverage for the hand-built slash menu (`slashMenu.ts`) + the element-identity
 * preservation (`blockId`) the expert panel flagged as missing. Browser test (a real TipTap
 * editor). Exercises: trigger detection (top-level only), commit leaves no stray "/", the
 * zero-match "open but empty" state, Escape dismissal, and — the BLOCKER fix — that a
 * wrap-style conversion (list/quote) preserves the block's element id.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { pageDocExtensions } from './extensions'
import { slashMenu, type SlashState } from './slashMenu'
import { pageToDoc, docToPage } from './pageDoc'
import { canonicalizePage } from '../canonicalize'
import type { Page, ProseMirrorDoc } from '../schema'

function setup(content?: ProseMirrorDoc) {
	const element = document.createElement('div')
	document.body.appendChild(element)
	let state: SlashState = { open: false, query: '', items: [], index: 0, rect: null }
	const editor = new Editor({
		element,
		extensions: [...pageDocExtensions(), slashMenu((s) => (state = s))],
		content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
	})
	return { editor, get: () => state }
}

const taggedPage = (content: ProseMirrorDoc): Page =>
	canonicalizePage({
		schemaVersion: 1,
		slug: 's',
		locale: 'en',
		title: 'T',
		elements: [{ id: 'x', type: 'text_block', content }],
	})

afterEach(() => {
	document.body.innerHTML = ''
})

describe('slash menu', () => {
	it('opens on "/" at the end of a top-level paragraph, listing block commands', () => {
		const { editor, get } = setup()
		editor.commands.focus()
		editor.commands.insertContent('/')
		expect(get().open).toBe(true)
		expect(get().items.map((i) => i.id)).toContain('bullet')
		editor.destroy()
	})

	it('does NOT trigger inside a nested (non-top-level) paragraph', () => {
		const { editor, get } = setup({
			type: 'doc',
			content: [
				{
					type: 'bulletList',
					content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
				},
			],
		})
		editor.commands.focus()
		editor.commands.setTextSelection(3) // inside the list item's paragraph
		editor.commands.insertContent('/')
		expect(get().open).toBe(false)
		editor.destroy()
	})

	it('stays OPEN with zero matches (a "No blocks" state), not silently closed', () => {
		const { editor, get } = setup()
		editor.commands.focus()
		editor.commands.insertContent('/zzzz')
		expect(get().open).toBe(true)
		expect(get().items).toHaveLength(0)
		editor.destroy()
	})

	it('closes on Escape', () => {
		const { editor, get } = setup()
		editor.commands.focus()
		editor.commands.insertContent('/')
		expect(get().open).toBe(true)
		editor.view.dom.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
		)
		expect(get().open).toBe(false)
		editor.destroy()
	})

	it('commit converts the block and leaves no stray "/"', () => {
		const { editor, get } = setup()
		editor.commands.focus()
		editor.commands.insertContent('/')
		get()
			.items.find((i) => i.id === 'h2')!
			.run(editor)
		const json = editor.getJSON() as ProseMirrorDoc
		expect(json.content?.[0].type).toBe('heading')
		expect(JSON.stringify(json)).not.toContain('/')
		editor.destroy()
	})

	it('slash-commit PRESERVES a block’s identity across a list conversion', () => {
		const prev = taggedPage({ type: 'doc', content: [{ type: 'paragraph' }] })
		const { editor, get } = setup(pageToDoc(prev))
		editor.commands.focus()
		editor.commands.insertContent('/')
		get()
			.items.find((i) => i.id === 'bullet')!
			.run(editor)
		const page = docToPage(editor.getJSON() as ProseMirrorDoc, prev)
		expect(page.elements[0].type).toBe('text_block')
		expect(page.elements[0].id).toBe('x') // identity kept via carried blockId
		editor.destroy()
	})

	it('the normalizer preserves identity on a PLAIN wrap (covers native keyboard shortcuts)', () => {
		// No call-site stamping — a bare toggle, exactly like StarterKit's Mod-Shift-8
		// shortcut. The BlockMetaNormalizer must re-stamp the new list from its wrapped child.
		const prev = taggedPage({
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'secret' }] }],
		})
		const { editor } = setup(pageToDoc(prev))
		editor.commands.focus()
		editor.commands.setTextSelection(2)
		editor.chain().focus().toggleBulletList().run()
		const page = docToPage(editor.getJSON() as ProseMirrorDoc, prev)
		expect(page.elements[0].id).toBe('x')
		editor.destroy()
	})

	it('a new paragraph next to a gallery does NOT inherit the gallery’s blockId', () => {
		// The normalizer's sibling-inheritance must exclude a `gallery` donor — a gallery's
		// identity is about its images, not the prose beside it (round-3 content-merge finding).
		const { editor } = setup({
			type: 'doc',
			content: [
				{ type: 'gallery', attrs: { blockId: 'g', items: [] } },
				{ type: 'paragraph', content: [{ type: 'text', text: 'new' }] },
			],
		})
		editor.commands.focus('end')
		editor.commands.insertContent('!') // a doc edit → triggers the normalizer
		const json = editor.getJSON() as ProseMirrorDoc
		const para = json.content?.find((n) => n.type === 'paragraph')
		expect(para?.attrs?.blockId ?? null).toBe(null) // NOT promoted to the gallery's 'g'
		editor.destroy()
	})

	it('toggling a list OFF preserves each paragraph’s identity (recursive stamp + normalizer)', () => {
		const prev = taggedPage({
			type: 'doc',
			content: [
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
							],
						},
						{
							type: 'listItem',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
							],
						},
					],
				},
			],
		})
		const { editor } = setup(pageToDoc(prev))
		editor.commands.focus()
		editor.commands.setTextSelection(4) // inside the list
		editor.chain().focus().toggleBulletList().run() // lift back to paragraphs
		const page = docToPage(editor.getJSON() as ProseMirrorDoc, prev)
		// every lifted paragraph stays in the one original element (not split into two).
		expect(page.elements.map((e) => e.id)).toEqual(['x'])
		editor.destroy()
	})
})
