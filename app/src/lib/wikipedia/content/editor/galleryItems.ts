/**
 * Pure helpers for editing a `gallery` node's `items` (Phase 3, §F). Kept framework-free +
 * separately unit-tested because correctness here is load-bearing: every value written back to the
 * node must satisfy `galleryItemSchema`, or `docToPage` throws and `ArticleEditor.emitChange`
 * SILENTLY drops the edit (console.error only). The tests parse each helper's output through
 * `galleryItemSchema` so a shape regression fails loudly instead of vanishing at runtime.
 */
import type { GalleryItem } from '../schema'

/**
 * Canonicalize a stored item so its shape matches an AUTHORED item (fromArticle.ts): required
 * `id`/`image`/`alt`; optional `caption`/`source` only when non-empty (empty string dropped, not
 * stored); and every provenance/build-derived field we don't edit in v1 preserved VERBATIM (so a
 * metadata edit never silently discards `description`/`author`/`license`/`rightsStatus`/`width`/
 * `height`). Anything outside the schema is dropped.
 */
export function normalizeGalleryItem(it: GalleryItem): GalleryItem {
	const out: GalleryItem = { id: it.id, image: it.image, alt: it.alt }
	if (it.caption && it.caption.trim()) out.caption = it.caption
	if (it.source && it.source.trim()) out.source = it.source
	if (it.description != null) out.description = it.description
	if (it.author != null) out.author = it.author
	if (it.license != null) out.license = it.license
	if (it.rightsStatus != null) out.rightsStatus = it.rightsStatus
	if (it.width != null) out.width = it.width
	if (it.height != null) out.height = it.height
	return out
}

/** A schema-valid placeholder item. Caller supplies the id (id generation is impure — e.g.
 *  `crypto.randomUUID()` in the browser). `image` is a scheme-less repo-relative path (the box is a
 *  token gradient in the demo, so the file need not exist) and `alt` is non-empty (schema requires
 *  it, WCAG 1.1.1). */
export function newPlaceholderItem(id: string): GalleryItem {
	return { id, image: '/placeholders/gallery-item.svg', alt: 'New image' }
}

/** Swap the item with `id` one slot in `dir` (-1 toward the start / +1 toward the end — direction-
 *  agnostic; the UI reads this as up/down in a vertical list or left/right in a horizontal strip,
 *  see GalleryNodeView.svelte). Returns a NEW array (never mutates) and returns the input
 *  unchanged when the move is out of bounds or the id is absent. */
export function moveGalleryItem(items: GalleryItem[], id: string, dir: -1 | 1): GalleryItem[] {
	const idx = items.findIndex((i) => i.id === id)
	const j = idx + dir
	if (idx < 0 || j < 0 || j >= items.length) return items
	const next = items.slice()
	;[next[idx], next[j]] = [next[j], next[idx]]
	return next
}
