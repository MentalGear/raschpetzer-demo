/**
 * `renderPageToHtml` needs a real `window`/`document` (`generateHTML` throws
 * "window is not defined" under plain Node — see its own doc comment), so this runs
 * in the "client" vitest project (`*.svelte.test.ts`, real chromium — `vite.config.ts`),
 * not "server", even though nothing here is a Svelte component.
 */
import { describe, it, expect } from 'vitest'
import { renderPageToHtml } from './renderPageHtml'
import { getBackend, getRenderedHtml, withRenderedHtml, DEMO_TEAM } from './backend'
import { articleToPage } from './fromArticle'
import { articles } from '../data/mock'
import type { Page } from './schema'
import type { ContentBackend } from './thesoria/contentBackend'

describe('renderPageToHtml', () => {
	it('renders headings, cite/note marks, and a gallery block to real markup', () => {
		const honeybee = articles.find((a) => a.slug === 'honeybee' && a.locale === 'en')
		if (!honeybee) throw new Error('expected the honeybee/en fixture to exist')
		const page: Page = articleToPage(honeybee)

		const html = renderPageToHtml(page)

		// Exact tag+text / exact id, not a loose substring — a malformed or empty
		// heading, or the wrong citation's marker, would still satisfy a bare
		// `toContain('<h2>')`/`toMatch(/data-cite="[^"]+"/)`, so pin the real values.
		expect(html).toContain('<h2>The waggle dance</h2>')
		expect(html).toContain('data-cite="c4"') // the citation honeybee/en's body actually marks
		expect(html).toContain('data-gallery') // the gallery atom rendered (not empty/thrown)
	})
})

describe('getBackend() publish → getRenderedHtml (the withRenderedHtml hook)', () => {
	it('stores rendered HTML for a real publish, keyed by the returned headKey', async () => {
		const backend = getBackend()
		const seedPage = await backend.loadPage('honeybee', 'en')
		if (!seedPage) throw new Error('expected honeybee/en to be seeded in getBackend()')

		// Edit the BODY, not just the title: `pageToDoc`/`renderPageToHtml` only render
		// `page.elements` (title never appears in the output), so a title-only edit can't
		// prove the stored HTML is genuinely THIS publish's content rather than some
		// other page (e.g. the pre-edit seed) that happens to share a heading. A marker
		// string mutated into a real element's text can only appear if the render
		// actually ran against the edited page.
		const MARKER = 'zzz-render-test-marker-zzz'
		const editedPage: Page = JSON.parse(
			JSON.stringify(seedPage).replace('The waggle dance', `The waggle dance ${MARKER}`),
		)
		expect(JSON.stringify(editedPage)).not.toBe(JSON.stringify(seedPage)) // the replace actually matched

		const change = await backend.openChange({ slug: 'honeybee', locale: 'en', actor: 'ada' })
		const staged = await backend.stage({
			changeId: change.id,
			page: editedPage,
			baseHeadKey: change.baseHeadKey,
			actor: 'ada',
		})
		await backend.approve({ changeId: change.id, reviewer: 'bao', headKey: staged.headKey })
		await backend.approve({ changeId: change.id, reviewer: 'cleo', headKey: staged.headKey })

		// Confirms the demo team really does grant quorum here — a false pass below
		// (getRenderedHtml returning undefined) could otherwise just mean the publish
		// was blocked, not that the hook itself failed.
		expect(DEMO_TEAM.policy.quorum).toBe(2)

		const result = await backend.publish(change.id)
		// `'published' in result`, not `result.published`: PublishResult's other two
		// variants (`blocked`/`conflict`) don't carry a `published` key at all.
		expect('published' in result).toBe(true)
		if (!('published' in result)) return

		const stored = getRenderedHtml(result.headKey)
		expect(stored).toBeDefined()
		expect(stored).toContain(MARKER)
	})

	it('a rendering failure never turns an already-successful publish into a rejected promise', async () => {
		// Exercises `withRenderedHtml` directly against a fake `ContentBackend`, not
		// `getBackend()`'s real `createMemoryBackend` — going through the real backend
		// isn't possible for this case: its `stage()` already rejects a schema-illegal
		// `Page` via `parsePage` (zod) before `publish()` is ever reached, so there's no
		// way to get a real `PublishResult` whose `page` breaks `renderPageToHtml`. The
		// fake backend fabricates a `published: true` result directly, standing in for
		// "some future extension bug makes rendering throw on an otherwise-valid page."
		const seedPage = await getBackend().loadPage('honeybee', 'en')
		if (!seedPage) throw new Error('expected honeybee/en to be seeded in getBackend()')
		// A `text_block` missing its required `content` — `pageToDoc` reads
		// `el.content.content` unconditionally for this element type, so this throws a
		// real TypeError (`Cannot read properties of undefined`) rather than silently
		// falling through, unlike e.g. a malformed `elements` value of the wrong type
		// (a string), which `for...of` just iterates character-by-character with no throw.
		const unrenderable: Page = {
			...seedPage,
			elements: [{ id: 'broken', type: 'text_block' }] as unknown as Page['elements'],
		}
		const FAKE_HEAD_KEY = 'fake-head-key-render-failure-test'

		const fakeBackend = {
			publish: async () => ({
				published: true as const,
				page: unrenderable,
				headKey: FAKE_HEAD_KEY,
			}),
		} as unknown as ContentBackend

		// The publish itself must still resolve (not reject) and report success — a
		// rendering bug is explicitly NOT allowed to fail an otherwise-successful
		// publish (see withRenderedHtml's own doc comment in backend.ts).
		const result = await withRenderedHtml(fakeBackend).publish('fake-change-id')
		expect('published' in result).toBe(true)

		// And the failed render genuinely didn't get cached under this head — this
		// isn't just an assertion that happens to pass either way.
		expect(getRenderedHtml(FAKE_HEAD_KEY)).toBeUndefined()
	})
})
