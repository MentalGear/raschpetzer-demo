/**
 * The load-bearing new piece of the single-surface (B-lite) editor: the PURE,
 * save-time derivation between a Thesoria `Page` (`PageElement[]`) and ONE ProseMirror
 * document. Modeled on `canonicalize.ts` (headless `getSchema`, no `EditorView`) — no
 * `appendTransaction` id-assignment plugin, so the TrailingNode/UniqueID footgun three
 * review rounds eliminated cannot return. See
 * `docs/research/2026-07-16-wiki-editor-granularity-decision.md` (decision: B-lite).
 *
 * Directions (guarded by the round-trip discipline in `pageDoc.svelte.test.ts`):
 *  - `pageToDoc(page)` → the editor's single doc. Every metadata-bearing node of a
 *    `text_block` (top-level AND nested) is stamped with the element's `blockId`; each
 *    `gallery_block` becomes a read-only `gallery` atom carrying its id + items.
 *    Normalized to the single-surface schema's canonical form.
 *  - `docToPage(doc, prev)` → the saved `Page`. Top-level nodes are segmented into runs (a
 *    `gallery` atom is its own element; a run of consecutive non-gallery nodes that belong
 *    to the same element — see `segment`) is one `text_block`); the metadata is STRIPPED
 *    from stored content and each block re-canonicalized through the PLAIN schema, so a
 *    stored `text_block` is byte-identical to what `canonicalize`/the structural merge
 *    expect. Element ids are recovered CONTENT-anchored from the carried `blockId` (see
 *    `makeIdPool`), positional only as a last resort.
 *
 * IDENTITY (both ways) holds by construction: `pageToDoc` is a schema-normalized fold,
 * `docToPage` its inverse. `Page → doc → Page` recovers the page (ids from `prev`);
 * `doc → Page → doc` recovers the doc (blockId re-stamped, gallery rebuilt).
 */
import { getSchema } from '@tiptap/core'
import { Node as PMNode } from '@tiptap/pm/model'
import { pageDocExtensions, BLOCK_META_TYPES } from './extensions'
import { canonicalizeDoc } from '../canonicalize'
import { assertSafeUrlsInDoc } from '../safeUrl'
import {
	parsePage,
	type GalleryItem,
	type Page,
	type PageElement,
	type ProseMirrorDoc,
	type ProseMirrorNode,
} from '../schema'

// The SINGLE-SURFACE schema (plain `blockExtensions` + gallery atom + blockId attr).
// Deliberately distinct from `canonicalize.ts`'s PLAIN schema: stored `text_block`
// content stays plain; only the live doc / this intermediate carries blockId+gallery.
const pageDocSchema = getSchema(pageDocExtensions())

/**
 * Normalize a single-surface doc to `pageDocSchema`'s canonical form — the pageDoc
 * analogue of `canonicalizeDoc`. Fills `blockId` defaults (incl. nested nodes) + the
 * gallery atom's attrs and sorts marks, so a live editor's `getJSON()` equals
 * `pageToDoc(page)` for an unedited page (a true no-op save). Throws on invalid content.
 */
export function canonicalizePageDoc(doc: ProseMirrorDoc): ProseMirrorDoc {
	const node = PMNode.fromJSON(pageDocSchema, doc)
	node.check()
	return node.toJSON() as ProseMirrorDoc
}

const META_TYPES = new Set<string>(BLOCK_META_TYPES)

/** Stamp `blockId` onto every metadata-bearing node in a subtree (not only the top-level
 *  node). Stamping the NESTED nodes too means a list-lift / block-unwrap surfaces content
 *  that already carries its identity, so toggling a list back to paragraphs can't lose it.
 *  Stripped from stored content by `stripBlockMeta`. */
function stampMeta(node: ProseMirrorNode, blockId: string): ProseMirrorNode {
	const next: ProseMirrorNode = { ...node }
	if (META_TYPES.has(node.type)) next.attrs = { ...(node.attrs ?? {}), blockId }
	if (Array.isArray(next.content)) next.content = next.content.map((c) => stampMeta(c, blockId))
	return next
}

/** Deep-remove the per-block metadata (`blockId`) so stored `text_block` content never
 *  carries the live-editing-only attr. (The plain schema would drop the undeclared attr
 *  anyway, but stripping is explicit + keeps these functions correct independent of
 *  ProseMirror's unknown-attr behavior.) */
function stripBlockMeta(node: ProseMirrorNode): ProseMirrorNode {
	const next: ProseMirrorNode = { ...node }
	if (next.attrs && 'blockId' in next.attrs) {
		const { blockId: _b, ...rest } = next.attrs as Record<string, unknown>
		next.attrs = rest
	}
	if (Array.isArray(next.content)) next.content = next.content.map(stripBlockMeta)
	return next
}

/** Distinct `blockId`s carried on a text run's top-level nodes, in order — the
 *  content-anchored candidates for recovering the run's element id (see `makeIdPool`). */
function carriedIds(nodes: ProseMirrorNode[]): string[] {
	const out: string[] = []
	for (const n of nodes) {
		const id = n.attrs?.blockId
		if (typeof id === 'string' && !out.includes(id)) out.push(id)
	}
	return out
}

/**
 * `Page` → one canonical single-surface doc. Empty pages (no content anywhere) yield a
 * single empty paragraph so the doc satisfies the `block+` content model.
 */
export function pageToDoc(page: Page): ProseMirrorDoc {
	const content: ProseMirrorNode[] = []
	for (const el of page.elements) {
		if (el.type === 'text_block') {
			const nodes = el.content.content ?? []
			// A degenerate zero-node text_block still occupies a boundary + id — emit one
			// empty paragraph carrying its metadata so it survives the round trip (normalized:
			// a zero-node doc violates the `block+` model the editor/canonicalize enforce).
			const src = nodes.length ? nodes : [{ type: 'paragraph' }]
			for (const node of src) content.push(stampMeta(node, el.id))
		} else {
			content.push({
				type: 'gallery',
				attrs: { blockId: el.id, items: el.items },
			})
		}
	}
	if (content.length === 0) content.push({ type: 'paragraph' })
	return canonicalizePageDoc({ type: 'doc', content })
}

/** Segments of the doc's top-level nodes: a `gallery` atom is its own element; a run of
 *  consecutive non-gallery nodes that belong to the same element is one `text_block`. */
type Segment =
	| { kind: 'gallery'; node: ProseMirrorNode }
	| { kind: 'text'; bid: string | null; nodes: ProseMirrorNode[] }

const bidOf = (node: ProseMirrorNode): string | null =>
	typeof node.attrs?.blockId === 'string' ? node.attrs.blockId : null

function segment(doc: ProseMirrorDoc): Segment[] {
	const segs: Segment[] = []
	for (const node of doc.content ?? []) {
		if (node.type === 'gallery') {
			segs.push({ kind: 'gallery', node })
			continue
		}
		const bid = bidOf(node)
		const last = segs.at(-1)
		// Continue the current text run iff same element. A `null` blockId is new content
		// that joins the run; a DIFFERENT non-null blockId is a distinct element → a hard
		// boundary (else two adjacent elements — a shape `mergePage` can produce — coalesce
		// and the second's id/i18n are silently lost).
		if (
			last &&
			last.kind === 'text' &&
			(bid === null || last.bid === null || last.bid === bid)
		) {
			last.nodes.push(node)
			if (last.bid === null && bid !== null) last.bid = bid
		} else {
			segs.push({ kind: 'text', bid, nodes: [node] })
		}
	}
	return segs
}

/**
 * Recover element ids from `prev` so the structural merge (aligns elements by id) sees a
 * stable identity across an edit. Recovery is CONTENT-anchored: each segment carries the
 * `blockId`(s) of the source element its nodes came from (stamped by `pageToDoc`, kept
 * across splits + re-stamped on wraps), so a `preferred` id wins whenever it's still an
 * unused prev id of the same kind (element `type`) — this is robust to reorder/boundary
 * shifts (the same way the `gallery` atom carries its `blockId`), NOT the positional-only
 * matching the project's own `mergePage` forbids. Only when no carried id survives does it
 * fall back to positional-by-kind, then to a fresh uuid. Uniqueness is tracked globally
 * (a fresh uuid can never collide; `parsePage` is the final guard).
 */
function makeIdPool(prev: Page) {
	const byKind = new Map<string, string[]>()
	for (const el of prev.elements) {
		const list = byKind.get(el.type) ?? []
		list.push(el.id)
		byKind.set(el.type, list)
	}
	const used = new Set<string>()
	const newId = () => `el-${globalThis.crypto.randomUUID()}`
	return {
		/** Take an id for a segment of kind `type`. Each `preferred` (carried `blockId`)
		 *  wins in order if it's still an unused prev id of that kind. */
		take(type: PageElement['type'], preferred: string[]): string {
			const list = byKind.get(type) ?? []
			for (const p of preferred) {
				const i = p && !used.has(p) ? list.indexOf(p) : -1
				if (i !== -1) {
					list.splice(i, 1)
					used.add(p)
					return p
				}
			}
			while (list.length) {
				const id = list.shift() as string
				if (!used.has(id)) {
					used.add(id)
					return id
				}
			}
			let id = newId()
			while (used.has(id)) id = newId()
			used.add(id)
			return id
		},
	}
}

/**
 * One canonical single-surface doc + the `prev` page it was derived/edited from → the
 * saved `Page`. Non-body fields (slug/locale/title/description/summary/schemaVersion) are
 * carried from `prev` (the single surface edits body + — via the component — title only),
 * and each recovered element inherits `prev`'s per-element `i18n` by id. This preserves the
 * `sourceHash` translation baseline (the AUTHORITATIVE staleness signal); `i18n.status` is,
 * per `schema.ts`, derived/advisory and RECOMPUTED downstream from hash drift — this function
 * deliberately does not recompute it (carrying the prior advisory value forward is harmless,
 * since the source of truth is the hash, not the status).
 */
export function docToPage(doc: ProseMirrorDoc, prev: Page): Page {
	// Defense-in-depth, independent of `parsePage`'s own (vendored, weaker) URL check below —
	// see `safeUrl.ts`'s own doc comment for why the vendored `assertSafeUrls`'s prefix regex is
	// bypassable and can't be hand-patched in place (found by expert review, 2026-07-17).
	assertSafeUrlsInDoc(doc)
	const idPool = makeIdPool(prev)
	const prevById = new Map(prev.elements.map((el) => [el.id, el] as const))
	// Carry `i18n` (translation-staleness metadata) forward by recovered id.
	const withI18n = (el: PageElement, id: string): PageElement => {
		const i18n = prevById.get(id)?.i18n
		return i18n ? ({ ...el, i18n } as PageElement) : el
	}
	const elements: PageElement[] = segment(doc).map((seg): PageElement => {
		if (seg.kind === 'gallery') {
			const items = (
				Array.isArray(seg.node.attrs?.items) ? seg.node.attrs.items : []
			) as GalleryItem[]
			const preferred =
				typeof seg.node.attrs?.blockId === 'string' ? [seg.node.attrs.blockId] : []
			const id = idPool.take('gallery_block', preferred)
			return withI18n({ id, type: 'gallery_block', items }, id)
		}
		const content = canonicalizeDoc({ type: 'doc', content: seg.nodes.map(stripBlockMeta) })
		const id = idPool.take('text_block', carriedIds(seg.nodes))
		return withI18n({ id, type: 'text_block', content }, id)
	})
	return parsePage({ ...prev, elements })
}
