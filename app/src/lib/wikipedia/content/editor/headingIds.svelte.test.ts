/**
 * A.4 — the heading-id VIEW decoration keeps `#id` anchor scrolling (ToC + citation refs)
 * working while editing. Browser test (a real TipTap editor + DOM). The load-bearing case is
 * a heading nested inside a callout: `articleToc` only ever sees TOP-LEVEL headings (a flat
 * `article.blocks` list), so the decoration must walk top-level nodes only too — an
 * unfiltered `descendants` walk would count the nested heading first (document order) and
 * misassign every id from that point on.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { pageDocExtensions, headingIdDecoration } from './extensions'
import type { ProseMirrorDoc } from '../schema'

function mount(content: ProseMirrorDoc, toc: { id: string }[]): Editor {
	const element = document.createElement('div')
	document.body.appendChild(element)
	return new Editor({
		element,
		extensions: [...pageDocExtensions(), headingIdDecoration(() => toc)],
		content,
	})
}

const heading = (text: string, blockId: string) => ({
	type: 'heading',
	attrs: { level: 2, blockId },
	content: [{ type: 'text', text }],
})

afterEach(() => {
	document.body.innerHTML = ''
})

describe('heading-id decoration (A.4)', () => {
	it('lands each ToC id on the matching heading, in document order', () => {
		const content: ProseMirrorDoc = {
			type: 'doc',
			content: [heading('Alpha', 'tb-1'), heading('Beta', 'tb-2')],
		}
		const editor = mount(content, [{ id: 'alpha' }, { id: 'beta' }])
		const headings = [...editor.view.dom.querySelectorAll('h2')]
		const byText = (t: string) => headings.find((h) => h.textContent === t)

		expect(byText('Alpha')?.id).toBe('alpha')
		expect(byText('Beta')?.id).toBe('beta')
		editor.destroy()
	})

	it('re-aligns ids after a doc edit inserts new content (regression guard for the docChanged rebuild)', () => {
		const content: ProseMirrorDoc = {
			type: 'doc',
			content: [heading('Alpha', 'tb-1'), heading('Beta', 'tb-2')],
		}
		const editor = mount(content, [{ id: 'alpha' }, { id: 'beta' }])
		editor.commands.focus('end')
		editor.commands.insertContent(' more') // a doc edit → rebuilds the decoration
		const headings = [...editor.view.dom.querySelectorAll('h2')]
		const byText = (t: string) => headings.find((h) => h.textContent?.startsWith(t))
		expect(byText('Alpha')?.id).toBe('alpha')
		expect(byText('Beta')?.id).toBe('beta')
		editor.destroy()
	})

	it('never leaks the decoration id into getJSON (round-trip stays clean)', () => {
		const content: ProseMirrorDoc = {
			type: 'doc',
			content: [heading('Alpha', 'tb-1')],
		}
		const editor = mount(content, [{ id: 'alpha' }])
		expect(JSON.stringify(editor.getJSON())).not.toContain('alpha')
		editor.destroy()
	})

	it('does not assign a ToC id to a heading nested inside a callout (walks top-level only)', () => {
		// A heading can legally nest inside a callout (Callout's content is `block+`) and is
		// reachable in practice via the toolbar's H2/H3 buttons (no depth guard, unlike the
		// slash menu's top-level-only trigger). `articleToc` only ever sees TOP-LEVEL headings
		// (`article.blocks` is a flat list), so the decoration must walk top-level only too — a
		// `descendants` walk would count the nested heading first and misassign every id after it.
		const content: ProseMirrorDoc = {
			type: 'doc',
			content: [
				{
					type: 'callout',
					attrs: { variant: 'note' },
					content: [heading('Nested', 'tb-nested')],
				},
				heading('Alpha', 'tb-1'),
			],
		}
		const editor = mount(content, [{ id: 'alpha' }])
		const headings = [...editor.view.dom.querySelectorAll('h2')]
		const byText = (t: string) => headings.find((h) => h.textContent === t)
		expect(byText('Alpha')?.id).toBe('alpha')
		// an unfiltered walk would hit 'Nested' first (document order) and assign 'alpha' to it.
		expect(byText('Nested')?.id ?? '').toBe('')
		editor.destroy()
	})
})
