/**
 * B.4 — the empty-title guard. `Page.title` is `z.string().min(1)`, and `docToPage` ends
 * with `parsePage({ ...prev, elements })`, so a `prev.title` of `''` makes it THROW. That
 * `prev` is the session's page on every later body edit, and `emitChange`'s catch swallows
 * the throw — so an unguarded empty title silently drops every subsequent body edit (the
 * sequence B.3 point 5 traces). The reader's title handler therefore normalizes a blank box
 * to 'Untitled' (never ''), leaving the DOM genuinely empty so the CSS placeholder still shows.
 *
 * Browser test (the integration half mounts a real TipTap editor → needs a DOM).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { pageDocExtensions } from './extensions'
import { pageToDoc, docToPage } from './pageDoc'
import { canonicalizePage } from '../canonicalize'
import { titleForSave, UNTITLED } from '../../components/ArticleReader.svelte'
import type { Page, ProseMirrorDoc } from '../schema'

function mount(content: ProseMirrorDoc): Editor {
	const element = document.createElement('div')
	document.body.appendChild(element)
	return new Editor({ element, extensions: pageDocExtensions(), content })
}

const prevPage = (): Page =>
	canonicalizePage({
		schemaVersion: 1,
		slug: 's',
		locale: 'en',
		title: 'Original',
		elements: [
			{
				id: 'a',
				type: 'text_block',
				content: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'body' }] }],
				},
			},
		],
	})

afterEach(() => {
	document.body.innerHTML = ''
})

describe('empty-title guard (B.4)', () => {
	it('normalizes a blank/whitespace title to "Untitled", never ""', () => {
		expect(titleForSave('')).toBe(UNTITLED)
		expect(titleForSave('   ')).toBe(UNTITLED)
		expect(titleForSave('\n')).toBe(UNTITLED)
		expect(titleForSave('')).not.toBe('')
		// a real title passes through untouched.
		expect(titleForSave('Edited inline')).toBe('Edited inline')
	})

	it('an empty title makes docToPage throw (the swallowed drop); "Untitled" keeps the edit', () => {
		const prev = prevPage()
		const editor = mount(pageToDoc(prev))
		editor.commands.focus('end')
		editor.commands.insertContent(' ZZMARKER') // a real body edit
		const json = editor.getJSON() as ProseMirrorDoc

		// The exact failure B.3 point 5 traces: an emptied title as `prev.title` → parsePage
		// throws inside docToPage, which emitChange's catch would swallow (dropping the edit).
		expect(() => docToPage(json, { ...prev, title: '' })).toThrow()

		// With the guard's normalized title, docToPage succeeds AND the body edit survives.
		const page = docToPage(json, { ...prev, title: titleForSave('') })
		expect(page.title).toBe(UNTITLED)
		expect(JSON.stringify(page.elements)).toContain('ZZMARKER')
		editor.destroy()
	})
})
