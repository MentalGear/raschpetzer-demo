/**
 * Render a canonical `Page` to static HTML via TipTap's `generateHTML` — the same
 * serialization the editor's own extensions define (`renderHTML`/`toDOM`), run
 * headlessly (no live `Editor` instance, no NodeView mounting — `generateHTML` reads
 * each node/mark's schema spec via `DOMSerializer`, never `addNodeView`). Needs a real
 * `window`/`document`; this app is `ssr=false` (see `backend.ts`'s singleton note) so
 * every call site runs in the browser, where those already exist natively — no `jsdom`
 * polyfill needed here (that's only required for a Node context, e.g. this module's own
 * test file, or a future non-browser backend adapter).
 *
 * Hosted behind `ContentBackend.publish()` (see `backend.ts`'s `withRenderedHtml`) so
 * that publishing is the one place this ever runs — not a live per-request render path.
 *
 * SECURITY: this is UNSANITIZED raw HTML — no consumer exists yet (no `{@html}` call
 * site anywhere in the app), but the eventual authoritative XSS control for anything
 * that renders it must be render-time DOMPurify at the `{@html}` boundary, matching
 * `thesoria/schema.ts`'s own SECURITY note (grep it for "DOMPurify"). Do not assume
 * this output is already safe to inject.
 *
 * SCOPE: only the schema's own `renderHTML`/`toDOM` specs run — ProseMirror VIEW
 * decorations (`headingIdDecoration`, `linkExistenceDecoration` in `editor/
 * extensions.ts`) never apply here, since those exist only inside a live `EditorView`,
 * not `DOMSerializer`. Heading `id` anchors and redlink styling are absent from this
 * output; a future consumer needing them must reconcile that separately.
 */
import { generateHTML } from '@tiptap/core'
import { pageToDoc } from './editor/pageDoc'
import { pageDocExtensions } from './editor/extensions'
import type { Page } from './schema'

export function renderPageToHtml(page: Page): string {
	return generateHTML(pageToDoc(page), pageDocExtensions())
}
