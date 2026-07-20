// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/content/src/schema.ts.
// Re-vendor to update; do not hand-edit the schemas/types below, EXCEPT for the one other
// deliberate deviation this header now documents alongside LOCALE RECONCILIATION:
//
// AUDIENCE REMOVAL (2026-07-19): upstream's `audience: 'public'|'expert'` per-element tier
// (D15, the "Model B" in-article progressive-disclosure reader) is deleted from this app's
// fork. SupraAppKit replaced it with a genuinely separate, cross-linked Simple-Wikipedia-style
// article (`Article.simpleOfId` in `../../data/types.ts`) instead of an in-article collapse —
// real Wikipedia has no in-article expertise-tier toggle; Simple English Wikipedia is a
// separate wiki. `elements[].audience` and `audienceSchema` are gone; every element is public
// by construction now. Re-vendoring this file must re-apply this deletion (like the locale
// note below, this is a standing local divergence, not a one-off edit).
//
// LOCALE RECONCILIATION (the other deliberate deviation from a byte-for-byte vendor):
// upstream's schema.ts imports LOCALES/localeSchema/Locale from `@thesoria/identity-core`.
// This app vendors that same identity-core SUBSET locally (./identity/locales.ts — see its
// own provenance header) instead of inlining a second locale set. The two repos' locale
// SETS are identical ({en, de, fr, lb}), just listed in a different array order upstream
// (['de','fr','en','lb'] vs. this app's previous inline ['en','de','fr','lb']) — order is
// immaterial to `z.enum`/the `Locale` union type, so `./identity` is imported unchanged and
// is the SOLE source of `LOCALES`/`localeSchema`/`Locale` (no second/conflicting Locale type).
// `SOURCE_LOCALE`, however, is NOT part of identity-core in either repo — it is a schema.ts-
// level constant, so it legitimately stays a per-app choice: upstream defaults it to 'de';
// this app's demo corpus (data/mock.ts) is authored English-first, so it stays 'en' (as it
// was before this vendor pass) — see the locale-primitives section below.
// ============================================================================
// Content schema — single source of truth (PRD Phase 1)
// ----------------------------------------------------------------------------
// Zod is the SSOT: every content file is validated against these schemas at
// build time and pre-commit, and all content TypeScript types are derived via
// z.infer (no hand-written drift). See docs/PRD-cms.md.
//
// CONTRACTS (frozen at schemaVersion 1):
//  - Path convention: content/pages/<slug>/<locale>.json; the SOURCE_LOCALE file
//    (de.json) is the translation source. `slug` == its directory name.
//  - Cross-locale alignment (D2): elements are aligned across locales by `id`,
//    NOT by array index. DE `elements` order is canonical; targets render in DE
//    order. An `id` present in a target locale but absent in DE is an ERROR
//    (validated by the Phase 2 loader).
//  - Translation staleness (FR6): a target element stores `i18n.sourceHash` =
//    hashSourceElement() of the DE element at translation time; drift => stale.
//    `i18n.status` is DERIVED/ADVISORY (recomputed from hash drift), never
//    trusted as an authoritative author-set value (except `machine`).
//  - SECURITY: the link/image URL guard below is DEFENSE-IN-DEPTH only. The
//    AUTHORITATIVE XSS control is render-time DOMPurify at the {@html} boundary
//    (Phase 2, D4) — the permissive `attrs` here can carry arbitrary keys, so
//    the render allowlist (strip on*/style/srcdoc, allowlist tags/attrs/URLs)
//    is non-negotiable.
// ============================================================================
import { z } from 'zod'

// ----------------------------------------------------------------------------
// Locales (D3) — see the LOCALE RECONCILIATION note at the top of this file.
// LOCALES/localeSchema/Locale are the vendored identity-core subset's SSOT
// (./identity/locales.ts), re-exported here so every existing
// `$lib/wikipedia/content/schema` import is unchanged. SOURCE_LOCALE is this
// app's own constant (demo corpus is English-first).
// ----------------------------------------------------------------------------
import { LOCALES, localeSchema, type Locale } from './identity'
export { LOCALES, localeSchema, type Locale }
export const SOURCE_LOCALE = 'en' satisfies (typeof LOCALES)[number]

// ----------------------------------------------------------------------------
// Per-element i18n / translation-staleness metadata (FR6). On a target-locale
// element, `sourceHash` records hashSourceElement() of the DE element at
// translation time. Absent on the DE source. `status` is derived/advisory.
// ----------------------------------------------------------------------------
export const translationMetaSchema = z.object({
	sourceHash: z.string().optional(),
	status: z.enum(['missing', 'stale', 'current', 'machine']).optional(),
	lastTranslatedAt: z.string().datetime().optional(),
})
export type TranslationMeta = z.infer<typeof translationMetaSchema>

// ----------------------------------------------------------------------------
// ProseMirror document (D1) — TipTap output stored as canonical JSON (not HTML).
// `.passthrough()` preserves any unknown TipTap keys so the round-trip is
// LOSSLESS (Zod strips unknown keys by default). The interfaces carry an index
// signature to match. Rendered to sanitized HTML at build (Phase 2).
// ----------------------------------------------------------------------------
export interface ProseMirrorMark {
	type: string
	attrs?: Record<string, unknown>
	[key: string]: unknown
}
export interface ProseMirrorNode {
	type: string
	attrs?: Record<string, unknown>
	content?: ProseMirrorNode[]
	marks?: ProseMirrorMark[]
	text?: string
	[key: string]: unknown
}

const proseMirrorMarkSchema: z.ZodType<ProseMirrorMark> = z
	.object({
		type: z.string().min(1),
		attrs: z.record(z.unknown()).optional(),
	})
	.passthrough()

const proseMirrorNodeSchema: z.ZodType<ProseMirrorNode> = z.lazy(() =>
	z
		.object({
			type: z.string().min(1),
			attrs: z.record(z.unknown()).optional(),
			content: z.array(proseMirrorNodeSchema).optional(),
			marks: z.array(proseMirrorMarkSchema).optional(),
			text: z.string().optional(),
		})
		.passthrough(),
)

// URL allowlists (D4 — block javascript:/data: XSS). DEFENSE-IN-DEPTH; the
// authoritative control is render-time DOMPurify (Phase 2).
const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:)/i
const SAFE_IMG_SRC = /^(https?:\/\/|\/|data:image\/)/i

/** Walk the PM tree and reject dangerous URLs on link marks AND image nodes. */
function assertSafeUrls(node: ProseMirrorNode, ctx: z.RefinementCtx) {
	for (const mark of node.marks ?? []) {
		if (mark.type === 'link') {
			const href = mark.attrs?.['href']
			if (typeof href === 'string' && !SAFE_HREF.test(href.trim())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Disallowed link href protocol: ${href}`,
				})
			}
		}
	}
	if (node.type === 'image') {
		const src = node.attrs?.['src']
		if (typeof src === 'string' && !SAFE_IMG_SRC.test(src.trim())) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Disallowed image src: ${src}`,
			})
		}
	}
	for (const child of node.content ?? []) assertSafeUrls(child, ctx)
}

export const proseMirrorDocSchema = z
	.object({
		type: z.literal('doc'),
		content: z.array(proseMirrorNodeSchema).default([]),
	})
	.passthrough()
	.superRefine((doc, ctx) => assertSafeUrls(doc as ProseMirrorNode, ctx))
export type ProseMirrorDoc = z.infer<typeof proseMirrorDocSchema>

// ----------------------------------------------------------------------------
// Page elements (discriminated union). Ordering = array index (D13). Each
// element carries a stable cross-locale `id` (D2).
// ----------------------------------------------------------------------------
const elementBase = {
	/** Stable identifier, shared across locales for the same logical element (D2). */
	id: z.string().min(1),
	i18n: translationMetaSchema.optional(),
}

export const textBlockSchema = z.object({
	...elementBase,
	type: z.literal('text_block'),
	content: proseMirrorDocSchema,
})
export type TextBlock = z.infer<typeof textBlockSchema>

// Gallery item: AUTHORED fields are separate from BUILD-DERIVED fields (D9/D14).
// `alt` is REQUIRED and distinct from caption (D14, WCAG 1.1.1). `image` is a
// repo-relative path (no URL scheme). width/height + derivative paths are
// populated by the media manifest at build — optional here.
export const galleryItemSchema = z.object({
	id: z.string().min(1),
	/** Repo-relative path of the authored master image (no URL scheme). */
	image: z
		.string()
		.min(1)
		.refine(
			(p) => !/^[a-z][a-z\d+.-]*:/i.test(p.trim()),
			'image must be a repo-relative path (no URL scheme like javascript:/data:/http:)',
		),
	/** REQUIRED descriptive alternative text (separate from caption). */
	alt: z.string().min(1, 'alt text is required for every image (WCAG 1.1.1)'),
	caption: z.string().optional(),
	description: z.string().optional(),
	// Rights / provenance (heritage preservation).
	author: z.string().optional(),
	license: z.string().optional(),
	source: z.string().optional(),
	rightsStatus: z.string().optional(),
	// Build-derived (media manifest) — never hand-authored.
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
})
export type GalleryItem = z.infer<typeof galleryItemSchema>

export const galleryBlockSchema = z.object({
	...elementBase,
	type: z.literal('gallery_block'),
	items: z.array(galleryItemSchema).default([]),
})
export type GalleryBlock = z.infer<typeof galleryBlockSchema>

export const pageElementSchema = z.discriminatedUnion('type', [textBlockSchema, galleryBlockSchema])
export type PageElement = z.infer<typeof pageElementSchema>

/** One "Quick facts" row: a plain label/value pair. Deliberately NOT a `PageElement` —
 *  it has no ProseMirror content, no position within the doc, and is never edited inline
 *  in the body; it's a page-level structured-facts sidecar edited via its own modal (see
 *  `InfoboxEditDialog.svelte`), written back through `EditSession.edit()` directly (no
 *  `pageToDoc`/`docToPage` involvement at all — this is the smallest schema surface that
 *  still puts infobox edits through the SAME save → review → publish gate as everything
 *  else). Demo-authored today; a real deployment would ultimately populate/reconcile these
 *  from a structured knowledge graph rather than hand-typed rows — out of scope here (no
 *  such backend exists in this demo), but the shape (plain label/value pairs) is exactly
 *  what a KG-backed sync would target. */
export const infoboxFieldSchema = z.object({
	label: z.string().min(1),
	value: z.string().min(1),
})
export type InfoboxField = z.infer<typeof infoboxFieldSchema>

// ----------------------------------------------------------------------------
// Page (one file per slug per locale: content/pages/<slug>/<locale>.json)
// ----------------------------------------------------------------------------
export const SCHEMA_VERSION = 1 as const

export const pageSchema = z
	.object({
		schemaVersion: z.literal(SCHEMA_VERSION),
		slug: z.string().min(1),
		locale: localeSchema,
		title: z.string().min(1),
		description: z.string().optional(),
		/** Breadcrumb / directory path for display. */
		directory: z.string().optional(),
		/**
		 * Model B "In brief" (D15): a short, plain-language public on-ramp (a
		 * register-simplification of the body). Optional for now (we're trialling
		 * it; may be lengthened). Per-locale, sanitized + staleness-tracked like
		 * any derived text. Public render shows this above the academic body.
		 */
		summary: proseMirrorDocSchema.optional(),
		elements: z.array(pageElementSchema).default([]),
		/** "Quick facts" — see `infoboxFieldSchema`. Absent/undefined = no infobox. */
		infobox: z.array(infoboxFieldSchema).optional(),
	})
	// Element ids must be unique within a page (precondition for D2 alignment);
	// gallery item ids must be unique within their gallery.
	.superRefine((page, ctx) => {
		const ids = new Set<string>()
		page.elements.forEach((el, i) => {
			if (ids.has(el.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate element id: ${el.id}`,
					path: ['elements', i, 'id'],
				})
			}
			ids.add(el.id)
			if (el.type === 'gallery_block') {
				const itemIds = new Set<string>()
				el.items.forEach((it, j) => {
					if (itemIds.has(it.id)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Duplicate gallery item id: ${it.id}`,
							path: ['elements', i, 'items', j, 'id'],
						})
					}
					itemIds.add(it.id)
				})
			}
		})
	})
export type Page = z.infer<typeof pageSchema>

// ----------------------------------------------------------------------------
// Site structure / navigation (FR9): content/site.json
// `labels` is a partial locale->label map; missing labels fall back via the D3
// chain, then to `slug` as a last resort (resolved by the Phase 2 loader).
// ----------------------------------------------------------------------------
export interface NavNode {
	slug: string
	/** Partial locale->label map; missing labels fall back via D3 chain -> slug. */
	labels?: Record<string, string>
	children?: NavNode[]
}
export const navNodeSchema: z.ZodType<NavNode> = z.lazy(() =>
	z.object({
		slug: z.string().min(1),
		labels: z.record(z.string(), z.string()).optional(),
		children: z.array(navNodeSchema).optional(),
	}),
)
export const siteSchema = z.object({
	schemaVersion: z.literal(SCHEMA_VERSION),
	nav: z.array(navNodeSchema).default([]),
})
export type Site = z.infer<typeof siteSchema>

// ============================================================================
// Canonical translation-staleness hash (FROZEN at schemaVersion 1).
// ----------------------------------------------------------------------------
// hashSourceElement(el) hashes ONLY the translatable payload of a source-locale
// element with a stable, key-sorted serialization, so a target locale can detect
// drift. Excludes id, type, i18n meta, and non-translatable gallery
// fields (image/author/license/source/rightsStatus/width/height). Granularity is
// PER-ELEMENT (a gallery_block yields one hash over all items' translatable
// strings); per-string granularity is a documented backlog refinement (PRD §9).
// The normalization here is forward-committing: changing it invalidates every
// stored sourceHash, so it must stay frozen for schemaVersion 1.
// ============================================================================
export function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value) ?? 'null'
	}
	if (Array.isArray(value)) {
		return '[' + value.map(stableStringify).join(',') + ']'
	}
	const obj = value as Record<string, unknown>
	return (
		'{' +
		Object.keys(obj)
			.sort()
			.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
			.join(',') +
		'}'
	)
}

/** cyrb53 — fast, deterministic, non-cryptographic 53-bit hash (drift detection). */
export function hashString(str: string, seed = 0): string {
	let h1 = 0xdeadbeef ^ seed
	let h2 = 0x41c6ce57 ^ seed
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i)
		h1 = Math.imul(h1 ^ ch, 2654435761)
		h2 = Math.imul(h2 ^ ch, 1597334677)
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
	const out = 4294967296 * (2097151 & h2) + (h1 >>> 0)
	return out.toString(16).padStart(14, '0')
}

/** The translatable-only payload of an element (basis of the staleness hash). */
export function translatablePayload(el: PageElement): unknown {
	if (el.type === 'text_block') return el.content
	return el.items.map((it) => ({
		alt: it.alt,
		caption: it.caption ?? null,
		description: it.description ?? null,
	}))
}

/** Stable hash of a source element's translatable content (FR6 staleness). */
export function hashSourceElement(el: PageElement): string {
	return hashString(stableStringify(translatablePayload(el)))
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
/** Parse + validate a page (throws on invalid). */
export function parsePage(data: unknown): Page {
	return pageSchema.parse(data)
}
/** Parse + validate the site structure (throws on invalid). */
export function parseSite(data: unknown): Site {
	return siteSchema.parse(data)
}
