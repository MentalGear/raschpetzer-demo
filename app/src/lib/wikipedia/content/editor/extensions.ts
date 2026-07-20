/**
 * The TipTap schema for editing a `text_block`'s ProseMirror content.
 *
 * The node/mark NAMES here must match exactly what `fromArticle.ts` emits, or
 * TipTap silently drops unknown nodes/marks on `setContent` and the edit is
 * LOSSY. StarterKit already covers doc/paragraph/text/heading/bulletList/
 * listItem/blockquote/bold/italic/code; this file adds the demo's domain nodes
 * (`callout`, `table`, `math`) and marks (`cite`, `note`), plus the `attribution`
 * attr the converter puts on `blockquote`.
 *
 * IDENTITY round-trip (not just losslessness): loading a converter-produced page
 * and reading it straight back MUST equal the source, so staging an UNEDITED page
 * is a true no-op (the structural merge must not see a phantom diff). That means
 * the schema must not *inject* attrs the converter never emits — so StarterKit's
 * bundled `link` (which adds target/rel/class/title) and `orderedList` (start/type)
 * are replaced with href-only / attr-free variants below. Proven by
 * `roundtrip.svelte.test.ts` (strict `toEqual(source)` over every seeded page).
 *
 * Custom nodes are edited at the ATTRIBUTE level, not deeply (no in-cell table
 * editing, no LaTeX rendering — that's future work).
 */
import { mount, unmount } from 'svelte'
import { Node, Mark, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import OrderedList from '@tiptap/extension-ordered-list'
import { toneClass } from '../../components/figureVisual'
import { createGalleryNodeView } from './galleryNodeView.svelte'
import { slugFromInternalHref } from '../linkHref'
import HeadingAnchor from '../../components/HeadingAnchor.svelte'
import CiteNoteMarker from './CiteNoteMarker.svelte'
import type { Citation } from '$lib/wikipedia/data/types'

/** A non-rendered attribute: carried in JSON, never emitted as a DOM attribute
 * (we render structured attrs by hand in `renderHTML`). */
const jsonAttr = (fallback: unknown = null) => ({ default: fallback, rendered: false })

/** Like `jsonAttr` but `keepOnSplit` — the single-surface per-block metadata (`blockId`)
 * must survive an Enter split so continuing a block stays in the same `text_block`
 * (element identity carries across the split). */
const metaAttr = (fallback: unknown = null) => ({
	default: fallback,
	rendered: false,
	keepOnSplit: true,
})

// ── Identity-preserving replacements for two StarterKit defaults ───────────────

/** Link carrying ONLY `href` (the converter's sole link attr). StarterKit's Link
 * injects target/rel/class/title into the JSON, which would break identity. */
const HrefLink = Link.extend({
	addAttributes() {
		return { href: { default: null } }
	},
})

/** OrderedList with no `start`/`type` attrs (the converter emits none). Trade-off:
 * typed auto-start numbering (e.g. "3. " to begin at 3) is intentionally inert. */
const PlainOrderedList = OrderedList.extend({
	addAttributes() {
		return {}
	},
})

// ── Nodes ─────────────────────────────────────────────────────────────────────

const CALLOUT_CLASS: Record<string, string> = {
	note: 'border-border bg-muted/40',
	info: 'border-primary/50 bg-primary/5',
	warning: 'border-destructive/50 bg-destructive/5',
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** `callout` — a note/info/warning box wrapping block content. The variant + title
 * render as chrome (not editable here — deferred); the variant word is always shown
 * (not color-only) and the whole box carries an `aria-label`. `role="note"` (not
 * `<aside>`) avoids spawning a complementary landmark per callout. `contentElement`
 * confines parsing to the body so the title chrome can never be re-parsed as content
 * on an internal copy/paste. */
export const Callout = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,
	addAttributes() {
		return {
			variant: {
				default: 'note',
				rendered: false,
				parseHTML: (el: HTMLElement) => el.getAttribute('data-callout') ?? 'note',
			},
			title: {
				default: null,
				rendered: false,
				parseHTML: (el: HTMLElement) => el.getAttribute('data-callout-title') || null,
			},
		}
	},
	parseHTML() {
		return [{ tag: 'div[data-callout]', contentElement: '[data-callout-body]' }]
	},
	renderHTML({ node }) {
		const variant = String(node.attrs.variant ?? 'note')
		const title = node.attrs.title ? String(node.attrs.title) : ''
		const attrs = {
			'data-callout': variant,
			...(title ? { 'data-callout-title': title } : {}),
			role: 'note',
			'aria-label': title ? `${cap(variant)} callout: ${title}` : `${cap(variant)} callout`,
			class: `my-3 rounded-md border-l-4 px-3 py-2 ${CALLOUT_CLASS[variant] ?? CALLOUT_CLASS.note}`,
		}
		// visible label (variant word always shown, not color-only); aria-hidden since
		// the box's aria-label already conveys it to AT.
		const heading = [
			'div',
			{ class: 'mb-1 font-semibold', 'aria-hidden': 'true', contenteditable: 'false' },
			title ? `${cap(variant)}: ${title}` : cap(variant),
		]
		const body = ['div', { 'data-callout-body': '' }, 0]
		return ['div', attrs, heading, body]
	},
})

/** `table` — atom node holding `headers` + `rows`; rendered read-only from attrs. */
export const TableBlock = Node.create({
	name: 'table',
	group: 'block',
	atom: true,
	selectable: true,
	addAttributes() {
		return { headers: jsonAttr([]), rows: jsonAttr([]) }
	},
	parseHTML() {
		return [{ tag: 'table[data-block-table]' }]
	},
	renderHTML({ node }) {
		const headers = Array.isArray(node.attrs.headers) ? (node.attrs.headers as string[]) : []
		const rows = Array.isArray(node.attrs.rows) ? (node.attrs.rows as string[][]) : []
		return [
			'table',
			{
				'data-block-table': '',
				'aria-label': headers.length
					? `Table (structure locked): ${headers.join(', ')}`
					: 'Table (structure locked)',
				class: 'my-3 w-full border-collapse text-sm',
			},
			[
				'thead',
				{},
				[
					'tr',
					{},
					...headers.map((h) => [
						'th',
						{
							scope: 'col',
							class: 'border border-border px-2 py-1 text-left font-semibold',
						},
						h,
					]),
				],
			],
			[
				'tbody',
				{},
				...rows.map((r) => [
					'tr',
					{},
					...r.map((c) => ['td', { class: 'border border-border px-2 py-1' }, c]),
				]),
			],
		]
	},
})

/** `gallery` — an ATOM standing in for a `gallery_block` element inside the single-surface page
 * doc (B-lite). It carries the element `blockId` + the authored `items` so the save-time
 * `docToPage` derivation can restore the `gallery_block` losslessly. `renderHTML` is the
 * serialization form (and the read fallback); `addNodeView` (below) supplies the INTERACTIVE
 * editor render — Phase 3 metadata/order editing (reorder items, edit alt/caption/credit,
 * add/remove placeholder items). `items` stays attr-carried JSON, so only its POSITION lives in
 * the doc and the round-trip stays untouched (per-image merge quality preserved); real media
 * upload/crop is still backlogged (no media pipeline in the demo). */
export const GalleryBlock = Node.create({
	name: 'gallery',
	group: 'block',
	atom: true,
	selectable: true,
	addAttributes() {
		return { blockId: jsonAttr(null), items: jsonAttr([]) }
	},
	parseHTML() {
		return [{ tag: 'div[data-gallery]' }]
	},
	renderHTML({ node }) {
		const items = (Array.isArray(node.attrs.items) ? node.attrs.items : []) as Array<{
			id?: string
			alt?: string
			caption?: string
			source?: string
			width?: number
			height?: number
		}>
		const n = items.length
		// One read-only `<figure>` per image, rebuilding the reader's `Figure` affordance as
		// a hyperscript array: the same tone-gradient placeholder box + `<figcaption>` shape,
		// off the SAME `TONES` palette (shared via figureVisual.ts) so the editor's gallery
		// matches the reader instead of the old icon-tile row. Tone is hashed from the item id
		// (no `tone` field on `GalleryItem`). The outer atom is a `div` (not `figure`) so its
		// per-item `<figcaption>`s don't read ambiguously against an outer figure caption (A.3).
		const boxes = items.map((it) => {
			const ratio = it.width && it.height ? it.width / it.height : 16 / 9
			const caption = it.caption ? String(it.caption) : ''
			const credit = it.source ? String(it.source) : ''
			return [
				'figure',
				{ class: 'flex flex-col gap-2' },
				[
					'div',
					{
						class: `flex items-center justify-center rounded-lg bg-gradient-to-br p-4 text-center ${toneClass(String(it.id ?? ''))}`,
						style: `aspect-ratio: ${ratio}`,
					},
					['span', { class: 'text-sm text-foreground' }, String(it.alt ?? '')],
				],
				...(caption || credit
					? [
							[
								'figcaption',
								{ class: 'text-sm text-muted-foreground' },
								...(caption ? [caption] : []),
								...(credit
									? [
											...(caption ? [' · '] : []),
											['span', { class: 'italic' }, credit],
										]
									: []),
							],
						]
					: []),
			]
		})
		return [
			'div',
			{
				'data-gallery': '',
				contenteditable: 'false',
				// `role="group"` keeps the `aria-label` exposed now the outer element is a plain
				// `div` (a bare `aria-label` on a generic element is ignored by AT).
				role: 'group',
				'aria-label': `Gallery (read-only): ${n} image${n === 1 ? '' : 's'}`,
				class: 'my-4 flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4',
			},
			...boxes,
			['p', { class: 'text-xs text-muted-foreground' }, "Image editing isn't available yet."],
		]
	},
	// Interactive editor view (Phase 3, §F): a raw ProseMirror NodeView mounts a Svelte component
	// so items can be reordered + their alt/caption/credit edited + placeholder items added/removed.
	// `renderHTML` above is DELIBERATELY kept — `getJSON()` serializes from attrs, not this DOM, so
	// docToPage/blockId recovery are untouched; the NodeView only swaps the interactive render.
	addNodeView() {
		return (props) =>
			createGalleryNodeView({
				node: props.node,
				editor: props.editor,
				getPos: props.getPos as () => number | undefined,
			})
	},
})

/** `math` — atom node holding a TeX string (rendered as source; no KaTeX in the demo). */
export const MathBlock = Node.create({
	name: 'math',
	group: 'block',
	atom: true,
	selectable: true,
	addAttributes() {
		return { tex: jsonAttr(''), display: jsonAttr(false) }
	},
	parseHTML() {
		return [{ tag: 'div[data-math]' }, { tag: 'span[data-math]' }]
	},
	renderHTML({ node }) {
		return [
			node.attrs.display ? 'div' : 'span',
			{
				'data-math': '',
				role: 'math',
				'aria-label': `Math formula (read-only): ${String(node.attrs.tex ?? '')}`,
				class: node.attrs.display
					? 'my-3 block rounded bg-muted px-3 py-2 font-mono text-sm'
					: 'rounded bg-muted px-1 font-mono text-sm',
			},
			String(node.attrs.tex ?? ''),
		]
	},
})

// ── Marks ───────────────────────────────────────────────────────────────────

/** `cite` — a citation reference (attrs.id → a `Citation`). `getAttrs` restores the
 * id from the DOM so a paste round-trips it too.
 *
 * NOT styled as a link: the reader (`InlineRuns.svelte`) renders a `cite`-marked run's TEXT
 * as plain — only a small appended `[n]` HoverCard marker (matching the `note` mark's own treatment) is a real link. Styling the
 * whole marked span as a full blue underlined link here (the previous treatment) made an
 * entire cited sentence look like one giant hyperlink while editing — found live during the
 * link-color/span bug investigation, and the exact "edit mode spans more words" symptom it
 * described. `border-b border-dotted` (no colour) mirrors the sibling `Note` mark below —
 * "this text carries a mark" without reading as "this text is a link". */
export const Cite = Mark.create({
	name: 'cite',
	addAttributes() {
		return {
			id: {
				default: null,
				rendered: false,
				parseHTML: (el: HTMLElement) => el.getAttribute('data-cite') || null,
			},
		}
	},
	parseHTML() {
		return [{ tag: 'span[data-cite]' }]
	},
	renderHTML({ mark }) {
		const id = mark.attrs.id ? String(mark.attrs.id) : ''
		return [
			'span',
			{
				'data-cite': id,
				'aria-label': id ? `Citation ${id}` : 'Citation',
				class: 'border-b border-dotted border-muted-foreground',
			},
			0,
		]
	},
})

/** `note` — an inline sidenote (attrs.text carries the note body). The body is
 * exposed to assistive tech via `aria-label` (not only a mouse-hover `title`), and
 * stored in `data-note` so a paste restores it. A fully keyboard-focusable
 * disclosure for the note body is deferred (v1). */
export const Note = Mark.create({
	name: 'note',
	addAttributes() {
		return {
			text: {
				default: null,
				rendered: false,
				parseHTML: (el: HTMLElement) => el.getAttribute('data-note') || null,
			},
		}
	},
	parseHTML() {
		return [{ tag: 'span[data-note]' }]
	},
	renderHTML({ mark }) {
		const text = mark.attrs.text ? String(mark.attrs.text) : ''
		return [
			'span',
			{
				'data-note': text,
				class: 'border-b border-dotted border-muted-foreground',
				...(text ? { title: text, 'aria-label': `Note: ${text}` } : {}),
			},
			0,
		]
	},
})

/** The converter puts an optional `attribution` attr on `blockquote`; StarterKit's
 * blockquote doesn't know it, so declare it globally (non-rendered → round-trips). */
export const BlockquoteAttribution = Extension.create({
	name: 'blockquoteAttribution',
	addGlobalAttributes() {
		return [{ types: ['blockquote'], attributes: { attribution: jsonAttr(null) } }]
	},
})

// ── Single-surface (B-lite) additions ─────────────────────────────────────────
// The block types that can appear at the TOP level of the page doc and therefore
// carry the per-block metadata (`blockId`). A run of consecutive top-level nodes that
// belong to the same element = one `text_block` on save; `gallery` is its own element.
// Nested paragraphs inside a listItem/callout/blockquote also inherit the global attr
// (default `null`); `docToPage` strips it from stored content entirely, so a nested
// default never leaks into a `text_block`'s PM JSON.
// KEEP IN SYNC with the top-level-capable `group:'block'` nodes in `blockExtensions()`
// — a missing type would silently carry no metadata and default to a fresh id at save
// (asserted by `pageDoc.svelte.test.ts` → "every block node carries the metadata attrs").
export const BLOCK_META_TYPES = [
	'paragraph',
	'heading',
	'bulletList',
	'orderedList',
	'blockquote',
	'callout',
	'table',
	'math',
	'gallery',
] as const

/**
 * Per-block metadata on the single page doc, non-rendered + `keepOnSplit`: `blockId`, the
 * source element's id carried on its nodes, so `docToPage` recovers element ids
 * CONTENT-anchored (not positional) — robust to reorder/boundary shifts, the same way the
 * `gallery` atom carries its `blockId`. Stripped from stored content. Correctness does NOT
 * rely on any command call-site re-stamping this — `BlockMetaNormalizer` below repairs it at
 * the transaction layer after ANY transform (toolbar, native keyboard shortcut, slash, paste,
 * list-lift), so no editing path can silently drop an element's identity.
 */
export const BlockMeta = Extension.create({
	name: 'blockMeta',
	addGlobalAttributes() {
		return [
			{
				types: [...BLOCK_META_TYPES],
				attributes: { blockId: metaAttr(null) },
			},
		]
	},
})

const META_TYPES = new Set<string>(BLOCK_META_TYPES)

/** A node that may DONATE its identity to a fresh neighbour: a metadata-bearing node that
 * already has a `blockId`, EXCLUDING the `gallery` atom — a gallery's id is about its images,
 * not the prose around it, so a new paragraph next to a gallery must never inherit the
 * gallery's `blockId` (it would be silently merged into the wrong element). Galleries always
 * get their `blockId` at insertion, so they never need to RECEIVE metadata either. */
function isMetaDonor(node: PMNode): boolean {
	return (
		node.type.name !== 'gallery' &&
		META_TYPES.has(node.type.name) &&
		typeof node.attrs.blockId === 'string'
	)
}

/** The `blockId` of the first descendant (self included) that may donate it — the metadata
 * of the content a new wrapper/lift node was built from. */
function inheritedMeta(node: PMNode): { blockId: string } | null {
	let found: { blockId: string } | null = null
	const visit = (n: PMNode): boolean => {
		if (found) return false
		if (isMetaDonor(n)) {
			found = { blockId: n.attrs.blockId as string }
			return false
		}
		n.forEach((c) => visit(c))
		return true
	}
	visit(node)
	return found
}

/**
 * Repair per-block metadata at the TRANSACTION layer. After any doc-changing transaction,
 * every top-level metadata-bearing node that lacks a `blockId` (a fresh node from a
 * wrap/lift/paste/keyboard-shortcut — TipTap's wrap commands create the wrapper with the
 * schema DEFAULT `null`) inherits `blockId` from (a) its first descendant that already
 * carries a `blockId` — the wrapped/lifted content — else (b) the nearest top-level sibling
 * that has one (a paste inherits the surrounding element). This is the single guarantee that
 * no editing path silently loses an element's identity, replacing the fragile per-call-site
 * stamping the expert panel flagged.
 *
 * Footgun-free by construction: it ONLY sets attrs (never inserts/removes nodes, unlike the
 * avoided TrailingNode), it is IDEMPOTENT (once every top-level node has a `blockId` it makes
 * no change → the appended transaction converges, no loop), and it runs only on `docChanged`
 * transactions — so a load / selection / normal-typing transaction leaves the doc byte-identical
 * (the round-trip identity tests still hold).
 */
export const BlockMetaNormalizer = Extension.create({
	name: 'blockMetaNormalizer',
	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('blockMetaNormalizer'),
				appendTransaction(trs, _oldState, newState) {
					if (!trs.some((t) => t.docChanged)) return null
					const tops: { node: PMNode; offset: number }[] = []
					newState.doc.forEach((node, offset) => tops.push({ node, offset }))
					let tr: ReturnType<typeof newState.tr.setNodeAttribute> | null = null
					for (let i = 0; i < tops.length; i++) {
						const { node, offset } = tops[i]
						if (!META_TYPES.has(node.type.name)) continue
						if (typeof node.attrs.blockId === 'string') continue // already identified
						// (a) inherit from wrapped/lifted content, else (b) nearest eligible sibling
						// (a `gallery` is never an eligible donor — see `isMetaDonor`). The
						// previous-before-next tie-break is deliberate: new content at a boundary
						// attaches to the EARLIER block's element, matching `segment()`'s forward-join.
						let meta = inheritedMeta(node)
						for (let j = i - 1; !meta && j >= 0; j--) {
							const s = tops[j].node
							if (isMetaDonor(s)) meta = { blockId: s.attrs.blockId }
						}
						for (let j = i + 1; !meta && j < tops.length; j++) {
							const s = tops[j].node
							if (isMetaDonor(s)) meta = { blockId: s.attrs.blockId }
						}
						if (!meta) continue // genuinely new content — leave default (fresh id at save)
						tr = (tr ?? newState.tr).setNodeAttribute(offset, 'blockId', meta.blockId)
					}
					return tr
				},
			}),
		]
	},
})

/**
 * A VIEW-ONLY decoration that stamps each heading node with the `id` its ToC entry uses, so
 * `#id` anchor scrolling (ToC + citation refs) keeps working once the read `<ArticleBody>` is
 * replaced by the live editor surface. It walks TOP-LEVEL nodes only — `articleToc` derives
 * from `article.blocks`, a flat top-level list, via `doc.forEach`. A `descendants` walk would
 * also count a heading nested inside a `callout` (schema-legal — Callout's content is `block+`
 * — and reachable in practice via the toolbar's H2/H3 buttons, which have no depth guard,
 * unlike the slash menu's top-level-only trigger), consuming a `toc[i]` slot `articleToc`
 * never produced and misaligning every id from that point on.
 *
 * `getToc` is a getter (the reader's `toc`, frozen to the last save), so a heading added
 * before the next Save simply has no matching id yet — consistent with the ToC not growing
 * until save. Because the id is a decoration and NOT a stored node attr, it never appears in
 * `editor.getJSON()`, so `docToPage`'s output and the round-trip identity tests are unaffected.
 */
export function headingIdDecoration(getToc: () => readonly { id: string }[]) {
	const build = (doc: PMNode): DecorationSet => {
		const toc = getToc()
		const decos: Decoration[] = []
		let i = 0
		doc.forEach((node, offset) => {
			if (node.type.name !== 'heading') return
			const entry = toc[i++]
			if (entry) decos.push(Decoration.node(offset, offset + node.nodeSize, { id: entry.id }))
		})
		return DecorationSet.create(doc, decos)
	}
	return Extension.create({
		name: 'headingIdDecoration',
		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey('headingIdDecoration'),
					state: {
						init: (_config, state) => build(state.doc),
						apply: (tr, value, _oldState, newState) =>
							tr.docChanged ? build(newState.doc) : value,
					},
					props: {
						decorations(state) {
							return this.getState(state)
						},
					},
				}),
			]
		},
	})
}

/**
 * A VIEW-ONLY decoration that marks each internal link whose target article doesn't exist
 * ("redlink") so the editor can render it with the SAME visual treatment as the reader
 * (`InlineRuns.svelte`) — dotted red vs. solid blue, a non-colour cue per WCAG 1.4.1. Without
 * this, every `<a>` in `.tiptap-body` gets ONE blanket blue style (see `ArticleEditor.svelte`),
 * so a redlink read mode correctly shows in red is indistinguishable from a real link while
 * editing. `exists` is the SAME `articleExists` the reader uses (`wikiStore.svelte.ts`), passed
 * in rather than imported here to keep this module's shape consistent with
 * `headingIdDecoration`'s callback style.
 *
 * Mirrors `headingIdDecoration`'s shape (a docChanged-rebuilt
 * `DecorationSet`, view-only → never in `editor.getJSON()`, so `docToPage`/round-trip identity
 * are unaffected). Internal-link hrefs are the STORED unprefixed form (`/slug`, see
 * `linkHref.ts`); an href that isn't internal (external URL) is left undecorated — external
 * links have no "redlink" concept, matching the reader.
 *
 * Same staleness caveat as `headingIdDecoration`'s `toc` (frozen to the last save): this only
 * rebuilds on `tr.docChanged`, so if `exists(slug)` for a slug already in the open doc changes
 * via an EXTERNAL `wikiStore` mutation with no transaction dispatched to THIS editor, the
 * redlink styling goes stale until the next edit anywhere in the doc. Low practical risk today —
 * `wikiStore` is a single in-memory per-tab singleton, only one `ArticleEditor` is ever mounted
 * at a time, and the one path that mutates it (`ArticleReader.svelte`'s `publish()`) immediately
 * unmounts the editor whose doc it would affect — but noted here (found in expert review) since
 * that invariant isn't enforced by this function itself.
 */
export function linkExistenceDecoration(exists: (slug: string) => boolean) {
	const build = (doc: PMNode): DecorationSet => {
		const decos: Decoration[] = []
		doc.descendants((node, pos) => {
			if (!node.isText) return
			const link = node.marks.find((m) => m.type.name === 'link')
			if (!link) return
			const href = typeof link.attrs.href === 'string' ? link.attrs.href : ''
			const slug = slugFromInternalHref(href)
			if (slug !== null && !exists(slug)) {
				decos.push(
					Decoration.inline(pos, pos + node.nodeSize, {
						class: 'editor-link-redlink',
						// mirrors InlineRuns.svelte's own redlink `title` verbatim — without this the
						// editor's redlink carried zero accessible signal beyond a CSS class (found in
						// expert review).
						title: 'This article does not exist yet',
					}),
				)
			}
		})
		return DecorationSet.create(doc, decos)
	}
	return Extension.create({
		name: 'linkExistenceDecoration',
		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey('linkExistenceDecoration'),
					state: {
						init: (_config, state) => build(state.doc),
						apply: (tr, value, _oldState, newState) =>
							tr.docChanged ? build(newState.doc) : value,
					},
					props: {
						decorations(state) {
							return this.getState(state)
						},
					},
				}),
			]
		},
	})
}

/**
 * A VIEW-ONLY decoration adding the reader's hover/tap "copy link to section" affordance
 * (`HeadingAnchor.svelte`) beside every top-level heading — the live-editor-as-reader
 * counterpart of `ArticleBody.svelte`'s own `<HeadingAnchor>` usage. Reader-only chrome
 * (unlike `headingIdDecoration`/`linkExistenceDecoration`, this is NOT also applied to the
 * editable instance — a copy-link affordance while actively editing wasn't asked for and
 * would be scope creep onto the edit surface). Recomputes the SAME `toc[i++]` zip
 * `headingIdDecoration` does (duplicated rather than shared: folding this into
 * `headingIdDecoration` would leak reader-only chrome into the extension the editable
 * instance also uses).
 *
 * Also stamps the `group` class `HeadingAnchor`'s own `group-hover:opacity-100` hover-reveal
 * styling needs on the heading element itself — `headingIdDecoration` only stamps `id`.
 *
 * Widget cleanup: `Decoration.widget` has no destroy hook (unlike a NodeView's `destroy()`),
 * so a mounted `HeadingAnchor` never gets an explicit `unmount()` call when its decoration is
 * replaced. Safe here specifically because this extension is only ever used on the READ-ONLY
 * mounted `Editor` (`ArticleTipTapReader.svelte`): `editable: false` means no transaction is
 * ever dispatched after the initial mount, so this plugin's `apply` never rebuilds past
 * `init`, and every mounted `HeadingAnchor` lives for exactly the reader's lifetime — torn
 * down as a whole (DOM removed) when the reader itself unmounts. Would need real per-widget
 * lifecycle tracking if this were ever reused on an instance where decorations genuinely
 * rebuild mid-session.
 */
export function headingAnchorDecoration(getToc: () => readonly { id: string }[]) {
	const build = (doc: PMNode): DecorationSet => {
		const toc = getToc()
		const decos: Decoration[] = []
		let i = 0
		doc.forEach((node, offset) => {
			if (node.type.name !== 'heading') return
			const entry = toc[i++]
			if (!entry) return
			decos.push(Decoration.node(offset, offset + node.nodeSize, { class: 'group' }))
			decos.push(
				Decoration.widget(offset + node.nodeSize - 1, () => {
					const el = document.createElement('span')
					mount(HeadingAnchor, {
						target: el,
						props: { id: entry.id, label: node.textContent, class: 'shrink-0' },
					})
					return el
				}),
			)
		})
		return DecorationSet.create(doc, decos)
	}
	return Extension.create({
		name: 'headingAnchorDecoration',
		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey('headingAnchorDecoration'),
					state: {
						init: (_config, state) => build(state.doc),
						apply: (tr, value, _oldState, newState) =>
							tr.docChanged ? build(newState.doc) : value,
					},
					props: {
						decorations(state) {
							return this.getState(state)
						},
					},
				}),
			]
		},
	})
}

/**
 * A VIEW-ONLY decoration porting `ArticleBody.svelte`'s mobile h2-section collapse (Wikipedia's
 * mobile skin: a body section starts collapsed below the `lg` breakpoint; the intro before the
 * first h2 never collapses; desktop never collapses anything) onto the live-editor-as-reader
 * surface. Reader-only, like `headingAnchorDecoration` above — not applied to the editable
 * instance.
 *
 * Section boundaries are H2-only (matching `ArticleBody`'s own `b.level === 2` split); h3/h4
 * headings inside a section are ordinary members, hidden/shown with the rest of their section,
 * not independently collapsible — same as today.
 *
 * State shape: per-section user OVERRIDES live in real ProseMirror plugin state (a
 * `Map<sectionId, open>`), updated via a `tr.setMeta(key, {toggle: sectionId})` transaction
 * dispatched from the trigger widget's click handler — genuine PM state, not a side-channel,
 * since a user toggling a section IS a real state change that should survive/replay like any
 * other transaction-driven update. A section with no override falls back to the viewport
 * default (`matchMedia('(min-width: 1024px)')`, computed fresh on each build — cheap, and
 * avoids needing an external reactive getter for something this extension can just check
 * itself). The `view()` hook's own `matchMedia` listener dispatches a `{refresh: true}` marker
 * transaction on a breakpoint crossing, since a bare resize doesn't otherwise trigger `apply`.
 *
 * Known a11y gap vs. the original `Collapsible`-based `ArticleBody`: the trigger carries
 * `aria-expanded` but no `aria-controls` — the collapsed content here is several independently
 * `hidden`-toggled sibling nodes, not one wrapped container with a real id to point at. Would
 * need a bigger schema change (grouping a section's nodes under a real `section` node) to fix
 * properly; not attempted in this pass.
 *
 * Trigger chevron: plain DOM + inline SVG (not a mounted Svelte component, unlike
 * `headingAnchorDecoration`'s `HeadingAnchor`) — deliberately, since this widget IS torn down
 * and rebuilt on every toggle (a toggle transaction has no `docChanged`, so `apply` rebuilds
 * every widget in this plugin's own `DecorationSet`, `headingAnchorDecoration`'s separately-
 * owned widgets untouched) — a plain DOM node has no Svelte-side cleanup to skip, unlike
 * `HeadingAnchor`'s "only safe because it never rebuilds" justification above.
 */
export function mobileSectionCollapseDecoration(getToc: () => readonly { id: string }[]) {
	interface State {
		overrides: Map<string, boolean>
		decorations: DecorationSet
	}
	const key = new PluginKey<State>('mobileSectionCollapseDecoration')
	const isDesktop = () =>
		typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

	const CHEVRON_SVG =
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'

	const build = (doc: PMNode, overrides: Map<string, boolean>): DecorationSet => {
		const toc = getToc()
		const decos: Decoration[] = []
		let i = 0
		let sectionId: string | null = null
		let sectionOpen = true
		doc.forEach((node, offset) => {
			const isHeading = node.type.name === 'heading'
			const entry = isHeading ? toc[i++] : undefined
			if (isHeading && node.attrs.level === 2) {
				sectionId = entry?.id ?? null
				sectionOpen = sectionId ? (overrides.get(sectionId) ?? isDesktop()) : true
				if (sectionId) {
					const id = sectionId
					const label = node.textContent
					const open = sectionOpen
					decos.push(
						Decoration.widget(offset + node.nodeSize - 1, (view) => {
							const btn = document.createElement('button')
							btn.type = 'button'
							// `data-slot`: a stable selector for tests — `lg:hidden` below means this
							// button is CSS `display:none` (removed from the accessibility tree
							// entirely) on desktop, so `getByRole('button', ...)` can never find it
							// there; a plain attribute locator still can, by design (its native
							// visibility still correctly reports hidden — this is only about
							// LOCATING it, not asserting it's shown).
							btn.dataset.slot = 'mobile-section-trigger'
							btn.className =
								'ml-auto inline-flex shrink-0 items-center text-muted-foreground transition-transform lg:hidden' +
								(open ? '' : ' -rotate-90')
							btn.setAttribute('aria-expanded', String(open))
							btn.setAttribute(
								'aria-label',
								`${open ? 'Collapse' : 'Expand'} "${label}" section`,
							)
							btn.innerHTML = CHEVRON_SVG
							btn.addEventListener('click', () => {
								view.dispatch(view.state.tr.setMeta(key, { toggle: id }))
							})
							return btn
						}),
					)
				}
				return
			}
			if (sectionId && !sectionOpen) {
				decos.push(Decoration.node(offset, offset + node.nodeSize, { class: 'hidden' }))
			}
		})
		return DecorationSet.create(doc, decos)
	}

	return Extension.create({
		name: 'mobileSectionCollapseDecoration',
		addProseMirrorPlugins() {
			return [
				new Plugin<State>({
					key,
					state: {
						init: (_config, state) => ({
							overrides: new Map(),
							decorations: build(state.doc, new Map()),
						}),
						apply(tr, value, _oldState, newState) {
							const meta = tr.getMeta(key) as
								{ toggle?: string; refresh?: boolean } | undefined
							if (!tr.docChanged && !meta) return value
							const overrides = new Map(value.overrides)
							if (meta?.toggle) {
								const wasOpen = overrides.get(meta.toggle) ?? isDesktop()
								overrides.set(meta.toggle, !wasOpen)
							}
							return { overrides, decorations: build(newState.doc, overrides) }
						},
					},
					view(editorView) {
						const mql = window.matchMedia('(min-width: 1024px)')
						const onChange = () => {
							editorView.dispatch(editorView.state.tr.setMeta(key, { refresh: true }))
						}
						mql.addEventListener('change', onChange)
						return { destroy: () => mql.removeEventListener('change', onChange) }
					},
					props: {
						decorations(state) {
							return key.getState(state)?.decorations
						},
					},
				}),
			]
		},
	})
}

/**
 * A VIEW-ONLY decoration mounting the numbered `[n]` hover/tap marker (`CiteNoteMarker.svelte`)
 * right after every `cite`/`note`-marked text run — the live-editor counterpart of
 * `InlineRuns.svelte`'s citation/footnote treatment. Applied to BOTH the read-only and the
 * editable instance (unlike `headingAnchorDecoration`/`mobileSectionCollapseDecoration` above,
 * which are reader-only) — hovering/focusing a citation or footnote is equally useful while
 * composing around it.
 *
 * Numbering: a citation's `[n]` matches its position in `getCitations()` (same as the
 * References section / `InlineRuns.svelte`'s `citeNumber`, i.e. citation-array order, NOT
 * document-appearance order); a note's `[n]` is a plain running count in document order (notes
 * have no external list to index into). Both recomputed fresh on every rebuild — cheap doc
 * walks, matching every other decoration in this file rather than an incremental diff.
 *
 * Widget cleanup, unlike `headingAnchorDecoration` (safe there ONLY because it's reader-only —
 * `editable: false` means `apply` never rebuilds past `init`): this extension DOES rebuild
 * continuously on the editable instance, and `Decoration.widget` has no destroy hook of its own,
 * so every previously-mounted `CiteNoteMarker` is explicitly `unmount()`-ed before building the
 * next `DecorationSet` (`disposeAll`, called at the top of `build()` and again from the plugin's
 * `view().destroy()` for the editor's own teardown) — otherwise every keystroke would leak one
 * detached Svelte instance per citation/note in the doc.
 */
export function citeNoteMarkerDecoration(getCitations: () => readonly Citation[]) {
	return Extension.create({
		name: 'citeNoteMarkerDecoration',
		addProseMirrorPlugins() {
			let mounted: Array<() => void> = []
			const disposeAll = () => {
				for (const dispose of mounted) dispose()
				mounted = []
			}
			const mountMarker = (props: {
				kind: 'cite' | 'note'
				number: number
				citation?: Citation
				noteText?: string
				isFirst?: boolean
			}) => {
				const el = document.createElement('span')
				const instance = mount(CiteNoteMarker, { target: el, props })
				mounted.push(() => unmount(instance))
				return el
			}
			const build = (doc: PMNode): DecorationSet => {
				disposeAll()
				const citations = getCitations()
				const decos: Decoration[] = []
				let noteN = 0
				// The SAME citation can be cited more than once in an article; only the first
				// occurrence gets the `cite-ref-N` id the References list backlinks to (a
				// duplicate id per repeat occurrence would be invalid HTML, and a hand-picked
				// jump target has to be exactly one element anyway).
				const citeFirstSeen = new Set<number>()
				doc.descendants((node, pos) => {
					if (!node.isText) return
					const cite = node.marks.find((m) => m.type.name === 'cite')
					if (cite) {
						const id = typeof cite.attrs.id === 'string' ? cite.attrs.id : ''
						const n = citations.findIndex((c) => c.id === id) + 1
						const citation = citations.find((c) => c.id === id)
						if (citation && n > 0) {
							const isFirst = !citeFirstSeen.has(n)
							citeFirstSeen.add(n)
							const at = pos + node.nodeSize
							decos.push(
								Decoration.widget(at, () =>
									mountMarker({ kind: 'cite', number: n, citation, isFirst }),
								),
							)
						}
					}
					const note = node.marks.find((m) => m.type.name === 'note')
					if (note) {
						const text = typeof note.attrs.text === 'string' ? note.attrs.text : ''
						if (text) {
							noteN++
							const n = noteN
							const at = pos + node.nodeSize
							decos.push(
								Decoration.widget(at, () =>
									mountMarker({ kind: 'note', number: n, noteText: text }),
								),
							)
						}
					}
				})
				return DecorationSet.create(doc, decos)
			}
			return [
				new Plugin({
					key: new PluginKey('citeNoteMarkerDecoration'),
					state: {
						init: (_config, state) => build(state.doc),
						apply: (tr, value, _oldState, newState) =>
							tr.docChanged ? build(newState.doc) : value,
					},
					props: {
						decorations(state) {
							return this.getState(state)
						},
					},
					view() {
						return { destroy: disposeAll }
					},
				}),
			]
		},
	})
}

/**
 * The extension set for the SINGLE-SURFACE page editor (B-lite): the plain
 * `blockExtensions()` PLUS the `gallery` atom and the per-block `BlockMeta`
 * (`blockId`). Kept strictly additive so the plain schema
 * (`blockExtensions()` — the SSOT that `canonicalize` + the structural merge diff
 * against) is unchanged: a stored `text_block`'s content never carries the metadata or
 * `gallery`, only the live doc does. Slash-insert is layered on at the component.
 */
export function pageDocExtensions(placeholder = 'Write, or press "/" for blocks…') {
	return [...blockExtensions(placeholder), GalleryBlock, BlockMeta, BlockMetaNormalizer]
}

/**
 * The full extension set for a text_block editor. StarterKit provides the common
 * nodes/marks EXCEPT `link` and `orderedList`, which are swapped for the
 * identity-preserving variants above. Pass a `placeholder` for empty blocks.
 */
export function blockExtensions(placeholder = 'Write…') {
	return [
		// `trailingNode: false` — StarterKit's TrailingNode injects an empty paragraph
		// after any block whose last node isn't a paragraph (math/table/blockquote/list/
		// callout/heading), the moment the editor takes a transaction. That would bake a
		// phantom <p> into getJSON() on the first edit and break the identity round-trip.
		// Also disable strike/underline (marks) and codeBlock/horizontalRule (blocks): the
		// domain model (data/types.ts) has none of them, the toolbar exposes none, and the
		// converter emits none — so keeping them on would only let a keyboard shortcut / input
		// rule (```, ---) inject a node/mark the model doesn't know. codeBlock/horizontalRule
		// are `group:'block'` top-level nodes, so leaving them enabled would also create a
		// metadata-less block (no `blockId`) — an identity-loss vector.
		StarterKit.configure({
			link: false,
			orderedList: false,
			trailingNode: false,
			strike: false,
			underline: false,
			codeBlock: false,
			horizontalRule: false,
		}),
		HrefLink.configure({ openOnClick: false, autolink: false }),
		PlainOrderedList,
		Placeholder.configure({ placeholder }),
		Callout,
		TableBlock,
		MathBlock,
		Cite,
		Note,
		BlockquoteAttribution,
	]
}
