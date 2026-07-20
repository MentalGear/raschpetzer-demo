/**
 * Raw ProseMirror NodeView for the `gallery` node — makes the gallery INTERACTIVE in the editor
 * (Phase 3 of the floating-edit redesign, §F). Wired from `GalleryBlock.addNodeView()` in
 * `extensions.ts`.
 *
 * Why raw PM + Svelte `mount()` rather than an adapter: there is no `@tiptap/svelte` package for
 * TipTap v3 in this stack (only `@tiptap/core`/`pm`/`starter-kit`), and the gallery is an ATOM
 * editing a single JSON attr — it has no ProseMirror-managed inner content, so the one thing an
 * adapter buys you (`NodeViewContent`) is inert here. We own ~40 lines of bridge instead of a
 * dependency. See docs/research/2026-07-18-gallery-nodeview-approach.md.
 *
 * The reactive bridge: a `$state.raw` controller (raw because `items` is a large opaque JSON array
 * we only ever REASSIGN — deep-proxying it is this repo's ~1000× perf cliff). `mount()` renders
 * `GalleryNodeView.svelte` against it once; PM's `update()` reassigns `controller.items` (reactive
 * → the component re-renders) on any external attr change (undo/redo, re-seed). Edits flow OUT via
 * `onItems`, which dispatches `setNodeAttribute` — so serialization (`renderHTML`/`getJSON`) and the
 * `docToPage` round-trip are untouched (getJSON reads attrs, never this DOM).
 *
 * `editable` (2026-07-19): this NodeView now mounts in BOTH read-only (`ArticleTipTapReader`)
 * and editable (`ArticleEditor`) instances — the unified render is `GalleryNodeView.svelte`'s
 * own doc comment. Read ONCE from `editor.isEditable` at construction, not tracked live: this
 * app mounts a SEPARATE `Editor` instance per mode (not one instance toggling `editable`), so
 * editability is fixed for a given instance's whole lifetime — nothing to react to.
 */
import { mount, unmount } from 'svelte'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import GalleryNodeView from './GalleryNodeView.svelte'
import type { GalleryItem } from '../schema'

interface NodeViewArgs {
	node: PMNode
	editor: Editor
	getPos: () => number | undefined
}

function readItems(node: PMNode): GalleryItem[] {
	return Array.isArray(node.attrs.items) ? (node.attrs.items as GalleryItem[]) : []
}

export function createGalleryNodeView({ node, editor, getPos }: NodeViewArgs) {
	const dom = document.createElement('div')
	// Mirror the serialized wrapper's hook so parseHTML (`div[data-gallery]`) + any styling that
	// keys off it still apply; the interactive UI lives inside the mounted component.
	dom.setAttribute('data-gallery', '')

	// Reactive state the mounted component reads through getters. `$state.raw` — see file header.
	let items = $state.raw<GalleryItem[]>(readItems(node))

	// Read once — see the file header's `editable` note. `editor.isEditable` is stable for this
	// instance's whole lifetime (a separate Editor per mode), so no mid-session re-read is needed.
	const editable = editor.isEditable

	// Whether this node is the article's LEAD gallery — a doc-structural fact (position 0 is always
	// the lead; see pageToArticle.ts's leading-gallery-collapses-to-Figure boundary), not something
	// this NodeView decides. The reader already shows the lead via a separate inert `Figure` above
	// the summary (ArticleReader.svelte); mounting a SECOND, fully-interactive gallery box for the
	// same image right after the summary was a visible duplicate with nothing useful to edit (lead
	// figure editing is deferred, ADR-001). Recomputed on every `update()` (below) since a doc edit
	// elsewhere can shift this node's position.
	let isLead = $state(getPos() === 0)

	function onItems(next: GalleryItem[]) {
		const pos = getPos()
		if (typeof pos !== 'number') return
		// Single wholesale attr write — triggers onUpdate → emitChange → docToPage. PM then calls
		// this NodeView's `update()` with the new node, which re-syncs `items` below (no manual
		// optimistic set, so there's no divergence between the doc and what the UI shows).
		editor.view.dispatch(editor.view.state.tr.setNodeAttribute(pos, 'items', next))
	}

	// Per-NodeView token: namespaces the component's DOM ids so two galleries in one doc (or a
	// copy-pasted block that duplicates item ids) can't collide on `id`/`for`/`aria-describedby`.
	const uid = `gal-${crypto.randomUUID()}`

	const controller = {
		uid,
		get items() {
			return items
		},
		get isLead() {
			return isLead
		},
		editable,
		onItems,
	}

	const component = mount(GalleryNodeView, { target: dom, props: { controller } })

	return {
		dom,
		update(updated: PMNode) {
			// Reject a different node type so PM rebuilds; same type → re-sync reactive state and
			// keep this DOM (preserves the mounted component + input focus across attr writes).
			if (updated.type.name !== node.type.name) return false
			items = readItems(updated)
			isLead = getPos() === 0
			return true
		},
		// Atom with no contentDOM: PM must not try to read inner DOM as content, and form controls
		// must receive their own events (typing/clicks) rather than PM treating them as editor input.
		ignoreMutation() {
			return true
		},
		stopEvent() {
			return true
		},
		destroy() {
			unmount(component)
		},
	}
}
