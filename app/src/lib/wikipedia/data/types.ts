/**
 * Wikipedia demo domain types. An article is *structured content* — a list of typed
 * blocks with inline runs — not an HTML blob, so the reader renders from a fail-closed
 * model and the editor round-trips the same shape (no read/edit drift). Pure TS, no DOM.
 *
 * This app exists to prove the kit (`@kit/ui` SidebarNav/CommandPalette/SearchOverlay/
 * VirtualGrid, `@kit/core`, `@kit/tokens`) reuses for a reading- + editing-heavy domain,
 * and to embody the reading/editing UX research (see docs/kit/06-modern-wikipedia-prd.md).
 */

/** Authored locales. `en` is the source; the others demo multilingual reading + staleness. */
export type Locale = 'en' | 'de' | 'fr' | 'lb'

export const LOCALES: Locale[] = ['en', 'de', 'fr', 'lb']
export const LOCALE_LABEL: Record<Locale, string> = {
	en: 'English',
	de: 'Deutsch',
	fr: 'Français',
	lb: 'Lëtzebuergesch',
}

/** Inline formatting on a run of text. A run carries at most one link/cite/note. */
export interface Mark {
	bold?: boolean
	italic?: boolean
	code?: boolean
	/** internal link → article `slug`; external → absolute `href`. */
	link?: { kind: 'internal'; slug: string } | { kind: 'external'; href: string }
	/** citation reference → `Citation.id` (renders a superscript marker). */
	cite?: string
	/** sidenote text (renders a margin note on wide screens, inline on mobile). */
	note?: string
}

export interface TextRun {
	text: string
	marks?: Mark
}

/** A paragraph/heading's inline content: an ordered list of marked runs. */
export type Inline = TextRun[]

/** Common to every block: a stable id (cross-locale alignment key). */
export interface BlockBase {
	id: string
}

export interface HeadingBlock extends BlockBase {
	type: 'heading'
	level: 2 | 3 | 4
	text: string
}
export interface ParagraphBlock extends BlockBase {
	type: 'paragraph'
	runs: Inline
}
export interface ListBlock extends BlockBase {
	type: 'list'
	ordered: boolean
	items: Inline[]
}
export interface QuoteBlock extends BlockBase {
	type: 'quote'
	runs: Inline
	attribution?: string
}
/** The mock corpus ships no real images — the renderer draws a themed placeholder from
 *  `tone` for those. A block with `src` set (e.g. real content vendored from a source
 *  repo) renders that image instead; `tone` still applies as the `<img>`'s loading
 *  background so there's no blank flash before it decodes. `srcset`/`sizes` are the raw
 *  attribute strings (already-built responsive candidate lists), not re-derived. */
export interface FigureBlock extends BlockBase {
	type: 'figure'
	alt: string
	caption?: string
	credit?: string
	tone: number // 0..5 → a deterministic placeholder gradient
	ratio?: number // width/height, default 16/9
	src?: string
	srcset?: string
	sizes?: string
}
/** One image in a multi-image `GalleryBlock` — same shape/semantics as `FigureBlock` minus real
 *  fields the editor's `GalleryItem` (content/thesoria/schema.ts) doesn't forward through the
 *  placeholder round-trip (rights/provenance) — see `pageToArticle.ts`'s `galleryToGalleryBlock`
 *  for exactly what's preserved. Unlike a block's own `id` (positional/content-anchored, assigned by the
 *  converter), `id` here IS forwarded verbatim across the Article↔Page boundary
 *  (`fromArticle.ts`'s `galleryBlockToGallery` / `pageToArticle.ts`'s `galleryToGalleryBlock`
 *  both prefer the incoming side's own item id over synthesizing one) — it exists specifically
 *  for stable per-item identity across reorders/edits (e.g. a future renderer's keyed
 *  `{#each}`), corrected in expert review after the two converters disagreed on this. */
export interface GalleryItemRef {
	id: string
	alt: string
	caption?: string
	credit?: string
	tone: number // 0..5 → a deterministic placeholder gradient (mirrors FigureBlock.tone)
	ratio?: number // width/height, default 16/9 (mirrors FigureBlock.ratio)
	src?: string // mirrors FigureBlock.src
	srcset?: string // mirrors FigureBlock.srcset
	sizes?: string // mirrors FigureBlock.sizes
}
/** A multi-image gallery block — the reader-side counterpart of a Page `gallery_block` with more
 *  than one item. `items` is always length ≥2 by construction: a ≤1-item `gallery_block` still
 *  collapses to a single `FigureBlock` instead (see `pageToArticle.ts`'s dispatch) — the Article
 *  model already has a perfectly good single-image type, so a 1-item "gallery" would be
 *  redundant. Does NOT cover the article's LEAD figure (`Article.lead`, still `FigureBlock` only,
 *  i.e. a single hero image) — that's a deliberate, separate scope boundary. */
export interface GalleryBlock extends BlockBase {
	type: 'gallery'
	items: GalleryItemRef[]
}
export interface CalloutBlock extends BlockBase {
	type: 'callout'
	variant: 'note' | 'info' | 'warning'
	title?: string
	runs: Inline
}
export interface TableBlock extends BlockBase {
	type: 'table'
	headers: string[]
	rows: string[][]
}
export interface MathBlock extends BlockBase {
	type: 'math'
	tex: string
	display?: boolean
}

export type Block =
	| HeadingBlock
	| ParagraphBlock
	| ListBlock
	| QuoteBlock
	| FigureBlock
	| GalleryBlock
	| CalloutBlock
	| TableBlock
	| MathBlock

export interface InfoboxField {
	label: string
	value: string
}

export interface Citation {
	id: string
	title: string
	authors?: string
	year?: number
	publisher?: string
	url?: string
}

/** A saved revision — enough to demo history + a semantic (block-level) diff. */
export interface Revision {
	id: string
	author: string
	ts: number
	summary: string
	blocks: Block[]
}

export interface Article {
	/** canonical id, shared across locale variants (cross-locale alignment). */
	id: string
	slug: string
	locale: Locale
	title: string
	/** the lead / "in brief" on-ramp (plain-language summary). */
	summary: string
	categories: string[]
	lead?: FigureBlock
	infobox?: InfoboxField[]
	blocks: Block[]
	citations: Citation[]
	revisions: Revision[]
	updatedAt: number
	contributors: string[]
	/** present on non-source locales: staleness vs the `en` source at translation time. */
	i18n?: { sourceHash: string; status: 'current' | 'stale' | 'machine' }
	/**
	 * One-directional link from a Simple-Wikipedia-style rewrite to its canonical source
	 * article's `id` — set ONLY on the simplified variant, never on the canonical article
	 * (no bidirectional field to keep in sync). "Does article X have a simple variant" is
	 * computed at read time by scanning for `simpleOfId === X.id` (same spirit as backlinks —
	 * see `data/graph.ts`/`wikiStore.backlinksFor`), not stored redundantly on X itself. A
	 * simple variant is a genuinely separate `Article` (own `id`/`slug`), NOT a translation
	 * (`Locale` means translated language; a simplified rewrite has no 1:1 block
	 * correspondence with its source the way `i18n/align.ts` assumes) and NOT an in-article
	 * collapse tier (the removed `audience` field) — it's edited/reviewed/published through
	 * the exact same flow as any other article.
	 */
	simpleOfId?: string
}

/** A linkable topic — powers hover-preview cards and wikilink autocomplete. */
export interface Entity {
	id: string
	slug: string
	title: string
	blurb: string
}

export interface Category {
	id: string
	label: string
	description: string
}

/** A table-of-contents entry derived from an article's heading blocks. */
export interface TocEntry {
	id: string
	text: string
	level: 2 | 3 | 4
}

/** Flatten inline runs to plain text (search, previews, diff summaries). */
export function inlineText(runs: Inline): string {
	return runs.map((r) => r.text).join('')
}

/** Short prose preview of a block (for search results / diffs). */
export function blockText(block: Block): string {
	switch (block.type) {
		case 'heading':
			return block.text
		case 'paragraph':
		case 'quote':
			return inlineText(block.runs)
		case 'callout':
			return `${block.title ? block.title + ': ' : ''}${inlineText(block.runs)}`
		case 'list':
			return block.items.map(inlineText).join(' · ')
		case 'figure':
			return block.caption ?? block.alt
		case 'gallery':
			return block.items[0] ? (block.items[0].caption ?? block.items[0].alt) : ''
		case 'table':
			return block.headers.join(' | ')
		case 'math':
			return block.tex
	}
}

/**
 * The article's ToC: every heading block, in order (one active at a time — invariant). All
 * headings are always visible in the reading spine (there is no in-article collapse tier), so
 * the ToC is a straight map over `article.blocks`.
 */
export function articleToc(article: Article): TocEntry[] {
	return article.blocks
		.filter((b): b is HeadingBlock => b.type === 'heading')
		.map((h) => ({ id: h.id, text: h.text, level: h.level }))
}

/** Count footnote/sidenote markers in a block (for article-level footnote numbering). */
export function blockNoteCount(block: Block): number {
	const inNotes = (runs: Inline) => runs.filter((r) => r.marks?.note).length
	switch (block.type) {
		case 'paragraph':
		case 'quote':
		case 'callout':
			return inNotes(block.runs)
		case 'list':
			return block.items.reduce((n, item) => n + inNotes(item), 0)
		default:
			return 0
	}
}

/**
 * Every `Citation.id` actually referenced by a `cite`-marked run somewhere in the article body
 * — NOT the same as `article.citations`, which can also list "further reading" sources with no
 * inline `cite()` anywhere (a deliberate pattern, e.g. `raschpetzer-geology.ts`'s further-reading
 * entries). The References list's per-entry backlink only makes sense for the former: a link
 * back to "#cite-ref-N" for a citation nobody actually cited inline has no jump target (no
 * `CiteNoteMarker` ever mounts a `cite-ref-N` id for it) and would be a dead "↑".
 */
export function citedCitationIds(article: Article): Set<string> {
	const ids = new Set<string>()
	const scan = (runs: Inline) => {
		for (const r of runs) if (r.marks?.cite) ids.add(r.marks.cite)
	}
	for (const block of article.blocks) {
		switch (block.type) {
			case 'paragraph':
			case 'quote':
			case 'callout':
				scan(block.runs)
				break
			case 'list':
				block.items.forEach(scan)
				break
		}
	}
	return ids
}

const DATEF = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "edited 3 days ago" / absolute date past a week. */
export function editedLabel(ts: number, now: number): string {
	const day = 86_400_000
	const diff = Math.round((ts - now) / day)
	if (diff > -7) return RELATIVE.format(diff, 'day')
	return DATEF.format(new Date(ts))
}
