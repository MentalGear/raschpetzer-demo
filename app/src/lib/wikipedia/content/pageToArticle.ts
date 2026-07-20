/**
 * `pageToArticle` — the INVERSE of `articleToPage` (see `fromArticle.ts`). Reflect a
 * published Thesoria `Page` (`PageElement[]`, ProseMirror-JSON) back into the reader's
 * `Article` (`Block[]`) model, so a published edit shows up in the reader (the editor
 * publishes a `Page` into the memory backend; the reader renders an `Article`).
 *
 * Two sources of truth:
 *  - FROM THE PAGE (authoritative — this is what editing changes): `title`, `summary`
 *    (the `Page.summary` PM doc → the article `summary` string), `blocks` (the ordered
 *    `text_block`/`gallery_block` elements), `lead` (a LEADING `gallery_block`, mirroring
 *    how `articleToPage` pushes `article.lead` first), and `infobox` (falls back to
 *    `base.infobox` only for a Page predating the field — not reachable via `articleToPage`
 *    today, since it always seeds `infobox` when the base article has one).
 *  - FROM `base` (the Page does not carry these — kept verbatim): `slug`, `locale`,
 *    `categories`, `citations`, `id`, `revisions`, `contributors`, `updatedAt`,
 *    `i18n`, and every other `Article` field not derived above.
 *
 * Known-lossy points (documented, all inherent to the forward map):
 *  - Original per-block `id`s are NOT preserved by `articleToPage` (it re-keys prose into
 *    `tb-<n>` / `gal-<n>` element ids), so reconstructed block ids are POSITIONAL
 *    (element-anchored: `el.id`, index-suffixed for the 2nd+ prose node of a merged text_block),
 *    NOT the original semantic ids. Don't use them for cross-locale/diff alignment: a diff of a
 *    reflected article against its pre-publish self would read every block as changed. Fine here
 *    because the reflected (overlaid) article is never diffed against the original — it just
 *    replaces it in the reader.
 *  - Leading `gallery_block` → `Article.lead`. `articleToPage` emits the SAME shape for a real
 *    lead figure and for a plain `figure` block that merely happens to be first (both become
 *    `elements[0] === gallery_block`), so this inverse can't distinguish them and always treats a
 *    leading gallery as the lead. An Article with `lead: undefined` whose first block is a figure
 *    would therefore round-trip that figure INTO `lead`. No demo article has that shape (the two
 *    `lead: undefined` articles start with a paragraph), so it's latent — but it is a genuine
 *    forward-map ambiguity, not a faithful round-trip, if that shape ever occurs.
 *  - A LEADING `gallery_block` with >1 items still collapses to a single figure from `items[0]`
 *    — `Article.lead` models the hero image only (deliberate scope boundary, see the comment
 *    above the leading-gallery dispatch). A NON-leading `gallery_block` with >1 items now maps to
 *    a real multi-image Article `GalleryBlock` (`galleryToGalleryBlock`) — only a ≤1-item
 *    non-leading `gallery_block` still collapses to a figure.
 *
 * Pure TS: no Svelte, no DOM, no `Date.now()`/`Math.random()`.
 */
import type {
	Article,
	Block,
	FigureBlock,
	GalleryBlock,
	GalleryItemRef,
	Inline,
	Mark,
} from '../data/types'
import type {
	GalleryBlock as PageGalleryBlock,
	Page,
	ProseMirrorDoc,
	ProseMirrorNode,
} from './schema'
import { slugFromInternalHref } from './linkHref'

/** `article.lead`/figure tone is encoded by `articleToPage` as the placeholder path
 *  `/placeholders/tone-<N>.svg`. Parse N back; anything else (e.g. an added
 *  `/placeholders/gallery-item.svg`) has no tone → default 0. */
const TONE_RE = /\/placeholders\/tone-(\d+)\.svg$/

function toneFromImage(image: string): number {
	const m = TONE_RE.exec(image)
	if (!m) return 0
	const n = Number.parseInt(m[1], 10)
	return Number.isFinite(n) ? n : 0
}

/** Concatenated text of a PM node's whole subtree (headings, summary paragraphs). */
function nodeText(node: ProseMirrorNode): string {
	if (typeof node.text === 'string') return node.text
	return (node.content ?? []).map(nodeText).join('')
}

/** Rebuild a `Mark` from a text node's PM marks (inverse of `inlineToPM`'s emit).
 *  Order-independent — the marks were canonical-sorted by `canonicalizePage`, and the
 *  `Mark` shape is a flat record, so we read each type we recognise. */
function marksOf(node: ProseMirrorNode): Mark | undefined {
	const marks = node.marks
	if (!marks || marks.length === 0) return undefined
	const out: Mark = {}
	for (const mark of marks) {
		switch (mark.type) {
			case 'bold':
				out.bold = true
				break
			case 'italic':
				out.italic = true
				break
			case 'code':
				out.code = true
				break
			case 'link': {
				const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
				const slug = slugFromInternalHref(href)
				out.link = slug !== null ? { kind: 'internal', slug } : { kind: 'external', href }
				break
			}
			case 'cite':
				out.cite = typeof mark.attrs?.id === 'string' ? mark.attrs.id : ''
				break
			case 'note':
				out.note = typeof mark.attrs?.text === 'string' ? mark.attrs.text : ''
				break
		}
	}
	return Object.keys(out).length > 0 ? out : undefined
}

/** A PM inline sequence (text nodes) → the article's `Inline` runs (inverse of `inlineToPM`). */
function pmToInline(nodes: ProseMirrorNode[]): Inline {
	const runs: Inline = []
	for (const node of nodes) {
		if (typeof node.text !== 'string') continue
		const marks = marksOf(node)
		runs.push(marks ? { text: node.text, marks } : { text: node.text })
	}
	return runs
}

/** Inline of a wrapper node's single inner paragraph (blockquote/callout wrap `[para]`). */
function innerParagraphInline(node: ProseMirrorNode): Inline {
	return pmToInline(node.content?.[0]?.content ?? [])
}

/** One PM block node → one prose `Block` (inverse of `blockToPM`). Unknown types → null. */
function pmNodeToBlock(node: ProseMirrorNode, id: string): Block | null {
	const base = { id }
	switch (node.type) {
		case 'heading': {
			const level = (typeof node.attrs?.level === 'number' ? node.attrs.level : 2) as
				2 | 3 | 4
			return { ...base, type: 'heading', level, text: nodeText(node) }
		}
		case 'paragraph':
			return { ...base, type: 'paragraph', runs: pmToInline(node.content ?? []) }
		case 'bulletList':
		case 'orderedList':
			return {
				...base,
				type: 'list',
				ordered: node.type === 'orderedList',
				// each listItem wraps one paragraph (see `blockToPM`).
				items: (node.content ?? []).map((li) => pmToInline(li.content?.[0]?.content ?? [])),
			}
		case 'blockquote': {
			const attribution =
				typeof node.attrs?.attribution === 'string' ? node.attrs.attribution : undefined
			return {
				...base,
				type: 'quote',
				runs: innerParagraphInline(node),
				...(attribution ? { attribution } : {}),
			}
		}
		case 'callout': {
			const variant = (
				typeof node.attrs?.variant === 'string' ? node.attrs.variant : 'note'
			) as 'note' | 'info' | 'warning'
			const title = typeof node.attrs?.title === 'string' ? node.attrs.title : undefined
			return {
				...base,
				type: 'callout',
				variant,
				runs: innerParagraphInline(node),
				...(title ? { title } : {}),
			}
		}
		case 'table':
			return {
				...base,
				type: 'table',
				headers: Array.isArray(node.attrs?.headers) ? (node.attrs.headers as string[]) : [],
				rows: Array.isArray(node.attrs?.rows) ? (node.attrs.rows as string[][]) : [],
			}
		case 'math':
			return {
				...base,
				type: 'math',
				tex: typeof node.attrs?.tex === 'string' ? node.attrs.tex : '',
				display: Boolean(node.attrs?.display),
			}
		default:
			return null
	}
}

/** A `gallery_block` → a single `FigureBlock` from `items[0]` (inverse of `figureToGallery`;
 *  lossy for multi-item galleries — see header). */
function galleryToFigure(el: PageGalleryBlock, id: string): FigureBlock {
	const item = el.items[0]
	const fig: FigureBlock = {
		id,
		type: 'figure',
		alt: item?.alt ?? '',
		tone: toneFromImage(item?.image ?? ''),
	}
	if (item?.caption) fig.caption = item.caption
	// `figureToGallery` maps `credit` → `source`.
	if (item?.source) fig.credit = item.source
	// `ratio` = width/height only when the media manifest supplied both (never authored here).
	if (item?.width && item?.height) fig.ratio = item.width / item.height
	return fig
}

/** A `gallery_block` with >1 items → a real multi-image Article `GalleryBlock` (inverse of
 *  `fromArticle.ts`'s `galleryBlockToGallery`). A ≤1-item `gallery_block` still collapses to a
 *  single `FigureBlock` via `galleryToFigure` instead — see the dispatch in `pageToArticle`
 *  below. Per-item mapping mirrors `galleryToFigure`'s exactly — including `ratio` recovery
 *  (width/height only when the media manifest supplied both; never authored here) — found
 *  missing in expert review, where a stale copy of this doc comment claimed the opposite. */
function galleryToGalleryBlock(el: PageGalleryBlock, id: string): GalleryBlock {
	return {
		id,
		type: 'gallery',
		items: el.items.map((item, idx) => {
			const ref: GalleryItemRef = {
				id: item.id || `${id}-${idx}`,
				alt: item.alt,
				tone: toneFromImage(item.image),
			}
			if (item.caption) ref.caption = item.caption
			if (item.source) ref.credit = item.source
			if (item.width && item.height) ref.ratio = item.width / item.height
			return ref
		}),
	}
}

/** `Page.summary` (PM doc) → the plain-string article `summary`: the concatenated text of
 *  its paragraph(s). Falls back to the base article's summary when the Page carries none. */
export function summaryText(doc: ProseMirrorDoc | undefined, fallback: string): string {
	if (!doc) return fallback
	return (doc.content ?? []).map(nodeText).join('\n\n')
}

/**
 * Reflect a published `Page` back into an `Article`, taking editable fields from the Page
 * and everything the Page does not carry from `base`. See the module header for the exact
 * source-of-truth split and the documented lossy points.
 */
export function pageToArticle(page: Page, base: Article): Article {
	const els = page.elements
	const blocks: Block[] = []
	let lead: FigureBlock | undefined
	let start = 0

	// A LEADING gallery is the article lead (mirrors `articleToPage` pushing `lead` first).
	// Deliberately ALWAYS collapses to a single figure via items[0] regardless of item count —
	// `Article.lead` is the hero image (FigureBlock only); giving the lead a real multi-image
	// slider is out of scope here and would also need to rework the "kept mounted while editing"
	// zero-layout-shift lead-figure logic in ArticleReader.svelte. Only a NON-leading gallery
	// (the loop below) can become a real multi-image GalleryBlock.
	const first = els[0]
	if (first && first.type === 'gallery_block') {
		lead = galleryToFigure(first, first.id)
		start = 1
	}

	for (let i = start; i < els.length; i++) {
		const el = els[i]
		if (el.type === 'gallery_block') {
			// >1 items → a real multi-image gallery; ≤1 collapses to a single figure (unchanged
			// — the Article model already has a perfectly good single-image type, no need for
			// every one-image gallery_block to become a 1-item "gallery").
			blocks.push(
				el.items.length > 1 ? galleryToGalleryBlock(el, el.id) : galleryToFigure(el, el.id),
			)
			continue
		}
		const nodes = el.content.content ?? []
		nodes.forEach((node, ni) => {
			// Stored `text_block` content is metadata-stripped, so the per-block id comes from
			// the element id (index-suffixed for the 2nd+ node of a merged run to stay unique);
			// a carried `blockId` (from a non-stripped doc) wins if present.
			const bid =
				typeof node.attrs?.blockId === 'string'
					? node.attrs.blockId
					: ni === 0
						? el.id
						: `${el.id}-${ni}`
			const block = pmNodeToBlock(node, bid)
			if (block) blocks.push(block)
		})
	}

	return {
		...base,
		title: page.title,
		summary: summaryText(page.summary, base.summary),
		blocks,
		lead,
		infobox: page.infobox ?? base.infobox,
	}
}
