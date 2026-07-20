/**
 * Convert the demo's `Article` (a `Block[]` model) → a Thesoria `Page`
 * (`PageElement[]`, ProseMirror-JSON content). This is the read/seed direction:
 * mock articles → canonical `Page`s the simulated backend serves and the block
 * editor edits. See ADR-001 + `docs/kit/wiki-block-editor-seam-contract.md`.
 *
 * Mapping:
 *  - prose blocks (heading/paragraph/list/quote/callout/table/math) → ProseMirror
 *    nodes inside a `text_block`. Consecutive prose blocks accumulate into one
 *    text_block; a figure or gallery flushes it (each such block gets its own element).
 *  - figure → a `gallery_block` (display only; figure EDITING is deferred, ADR-001). A real
 *    multi-image `GalleryBlock` maps to a `gallery_block` with matching item count (see
 *    `galleryBlockToGallery`).
 *  - `lead` figure → a leading `gallery_block`; `summary` → `Page.summary` (PM doc).
 *
 *  - `infobox` (article-level "Quick facts" rows) → `Page.infobox`, carried through
 *    verbatim (see `infoboxFieldSchema` in `schema.ts`).
 *
 * v1 gaps (documented): figure images are placeholder paths (no real media
 * pipeline in the demo).
 */
import type {
	Article,
	Block,
	FigureBlock,
	GalleryBlock,
	GalleryItemRef,
	Inline,
} from '../data/types'
import type { GalleryBlock as PageGalleryBlock, Page, PageElement, ProseMirrorNode } from './schema'
import { canonicalizePage } from './canonicalize'

function inlineToPM(runs: Inline): ProseMirrorNode[] {
	const out: ProseMirrorNode[] = []
	for (const run of runs) {
		if (!run.text) continue
		// Marks are emitted here in the schema's rank order (link, bold, code, italic,
		// cite, note) as a courtesy, but the AUTHORITATIVE normalizer is now
		// `canonicalizePage` (applied to every returned Page): it re-sorts marks by
		// rank and fills attr defaults through the editor schema, so the converter no
		// longer has to match ProseMirror's rules by hand — see canonicalize.ts.
		const marks: ProseMirrorNode['marks'] = []
		const m = run.marks
		if (m?.link) {
			const href = m.link.kind === 'internal' ? `/${m.link.slug}` : m.link.href
			marks.push({ type: 'link', attrs: { href } })
		}
		if (m?.bold) marks.push({ type: 'bold' })
		if (m?.code) marks.push({ type: 'code' })
		if (m?.italic) marks.push({ type: 'italic' })
		if (m?.cite) marks.push({ type: 'cite', attrs: { id: m.cite } })
		if (m?.note) marks.push({ type: 'note', attrs: { text: m.note } })
		out.push(
			marks.length
				? { type: 'text', text: run.text, marks }
				: { type: 'text', text: run.text },
		)
	}
	return out
}

const para = (runs: Inline): ProseMirrorNode => ({ type: 'paragraph', content: inlineToPM(runs) })

/** A single prose block → one ProseMirror block node. */
function blockToPM(block: Exclude<Block, FigureBlock | GalleryBlock>): ProseMirrorNode {
	switch (block.type) {
		case 'heading':
			return {
				type: 'heading',
				attrs: { level: block.level },
				content: [{ type: 'text', text: block.text }],
			}
		case 'paragraph':
			return para(block.runs)
		case 'list':
			return {
				type: block.ordered ? 'orderedList' : 'bulletList',
				content: block.items.map((li) => ({ type: 'listItem', content: [para(li)] })),
			}
		case 'quote':
			// Optional attrs are emitted in canonical NULL-filled form (never `undefined`
			// / absent), so they match exactly what TipTap materializes on round-trip
			// (ProseMirror always fills a declared attr's default) — otherwise an
			// unattributed quote / untitled callout injects a phantom `{attribution:null}`
			// / `{title:null}` diff on save. Identity holds both ways. See extensions.ts.
			return {
				type: 'blockquote',
				attrs: { attribution: block.attribution ?? null },
				content: [para(block.runs)],
			}
		case 'callout':
			return {
				type: 'callout',
				attrs: { variant: block.variant, title: block.title ?? null },
				content: [para(block.runs)],
			}
		case 'table':
			return { type: 'table', attrs: { headers: block.headers, rows: block.rows } }
		case 'math':
			return { type: 'math', attrs: { tex: block.tex, display: block.display ?? false } }
	}
}

function figureToGallery(fig: FigureBlock, id: string): PageGalleryBlock {
	const item: PageGalleryBlock['items'][number] = {
		id: `${id}-0`,
		// placeholder repo-relative path (no URL scheme, per the schema's image guard);
		// the demo has no real media pipeline — figures render as themed placeholders.
		image: `/placeholders/tone-${fig.tone}.svg`,
		alt: fig.alt,
		...(fig.caption ? { caption: fig.caption } : {}),
		...(fig.credit ? { source: fig.credit } : {}),
	}
	return { id, type: 'gallery_block', items: [item] }
}

/** An Article-side multi-image `GalleryBlock` → a Page `gallery_block` with matching item count
 *  (inverse of `pageToArticle.ts`'s `galleryToGalleryBlock`). Forwards each item's `id` VERBATIM
 *  (not re-synthesized) — `galleryToGalleryBlock` prefers the incoming Page item's own id too, so
 *  an id assigned on one side of the Article↔Page boundary survives a round trip; this matters
 *  once a renderer keys a `{#each}` by item id (found missing — id was being unconditionally
 *  re-synthesized here — in expert review). Otherwise mirrors `figureToGallery`'s per-item
 *  mapping (tone → placeholder image path, alt verbatim, caption/credit only when non-empty —
 *  `credit` maps to the Page item's `source` field).
 *
 *  `ratio` → synthesized `width`/`height` (2026-07-20, fixing a real regression found live: the
 *  read AND edit surfaces both render through this conversion now that they share
 *  `GalleryNodeView.svelte`, and every consumer of an item's size — that NodeView, `MediaLightbox`
 *  via `galleryPlaceholderSrc` — reads only the width/height RATIO, never the absolute pixel
 *  values, so any width/height pair with the right ratio is exactly as meaningful as a real
 *  media-manifest pair for this demo's purposes. Previously this dropped `ratio` entirely
 *  ("nothing real to forward"), which silently flattened every item to the 16/9 fallback
 *  regardless of what the mock data specified — defeating the whole point of authoring varied
 *  ratios in the fixtures. `figureToGallery` (the single-figure/lead path) still doesn't forward
 *  it — that's a separate, deferred scope (ADR-001, lead-figure editing) this fix doesn't touch. */
function galleryBlockToGallery(gal: GalleryBlock, id: string): PageGalleryBlock {
	return {
		id,
		type: 'gallery_block',
		items: gal.items.map((item: GalleryItemRef) => {
			const out: PageGalleryBlock['items'][number] = {
				id: item.id,
				image: `/placeholders/tone-${item.tone}.svg`,
				alt: item.alt,
			}
			if (item.caption) out.caption = item.caption
			if (item.credit) out.source = item.credit
			if (item.ratio) {
				out.height = 1200
				out.width = Math.round(item.ratio * 1200)
			}
			return out
		}),
	}
}

export function articleToPage(article: Article): Page {
	const elements: PageElement[] = []
	let i = 0
	let cur: ProseMirrorNode[] | null = null

	const flush = () => {
		if (cur && cur.length) {
			elements.push({
				id: `tb-${i++}`,
				type: 'text_block',
				content: { type: 'doc', content: cur },
			})
		}
		cur = null
	}

	if (article.lead) elements.push(figureToGallery(article.lead, `gal-${i++}`))

	for (const block of article.blocks) {
		if (block.type === 'figure') {
			flush()
			elements.push(figureToGallery(block, `gal-${i++}`))
			continue
		}
		if (block.type === 'gallery') {
			flush()
			elements.push(galleryBlockToGallery(block, `gal-${i++}`))
			continue
		}
		if (!cur) cur = []
		cur.push(blockToPM(block))
	}
	flush()

	// Canonicalize before returning: the seed a backend serves + the block editor
	// edits is ALWAYS the editor schema's normal form, so a no-op edit round-trips
	// as identity by construction (canonicalize.ts).
	return canonicalizePage({
		schemaVersion: 1,
		slug: article.slug,
		locale: article.locale,
		title: article.title,
		description: article.summary,
		summary: { type: 'doc', content: [para([{ text: article.summary }])] },
		elements,
		...(article.infobox && article.infobox.length > 0 ? { infobox: article.infobox } : {}),
	})
}
