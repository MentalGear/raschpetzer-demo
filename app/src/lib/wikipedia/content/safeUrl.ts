/**
 * Link/image URL safety — shared by the renderer (`InlineRuns.svelte`), the editor's link
 * insert UI (`LinkDialog.svelte`), and `assertSafeUrlsInDoc` (a non-vendored defense-in-depth
 * pass wired into `pageDoc.ts`'s `docToPage` save path; see that file).
 *
 * Deliberately does NOT use a hand-rolled prefix regex (the previous approach in all three call
 * sites) — the WHATWG URL spec treats a backslash as equivalent to a forward slash for special
 * (http/https) schemes, so a regex like `/^(https?:|mailto:|\/(?!\/))/i` — meant to block
 * protocol-relative `//evil.com` while allowing a same-origin relative path — is bypassed by
 * `/\evil.com` or `\\evil.com`: neither starts with `//`, so the regex lets them through, but
 * `new URL('/\\evil.com', 'https://good.example.org/')` resolves to `https://evil.com/` in every
 * browser (found by expert review, 2026-07-17; reproduced directly against Node's `URL`, the
 * same parser browsers use). Parsing with the real algorithm and checking the resulting origin
 * is the only way to match what a browser will actually navigate to.
 */

// Any fixed, non-real origin works here — it's a "does this resolve to a DIFFERENT origin than
// the one I gave it" probe, not a real page. A literal `.invalid` TLD (RFC 2606) makes it
// obviously not a real destination if it ever leaked into an actual `href`.
const PROBE_BASE = 'https://safe-url-probe.invalid/'
const PROBE_ORIGIN = new URL(PROBE_BASE).origin

/** True for an explicit `mailto:`/`tel:` URL (case-insensitive scheme, no other checks needed —
 *  neither can execute script or navigate the page). */
function isMailtoOrTel(href: string): boolean {
	return /^(mailto|tel):/i.test(href)
}

/** True if `href`, resolved against a fixed probe origin, lands on that SAME origin — the only
 *  way to match what a browser will actually navigate to (a prefix regex is bypassable via a
 *  bare `//` or a backslash-equivalent form; see the module header). Exported so other
 *  same-origin-relative-path checks share this exact check instead of re-deriving a weaker one
 *  (e.g. `linkHref.ts`'s internal-slug recovery, which used to accept anything starting with `/`
 *  — including `//evil.com`/`/\evil.com` — before being fixed to call this). */
export function resolvesSameOrigin(href: string): boolean {
	try {
		return new URL(href, PROBE_BASE).origin === PROBE_ORIGIN
	} catch {
		return false
	}
}

/** Whether `href` is safe to render as a link's `href` or insert via the editor's link UI:
 *  - an in-page `#fragment`
 *  - `mailto:`/`tel:`
 *  - an explicit `http://`/`https://` URL to ANY origin (that's what an "external link" is)
 *  - a genuinely same-origin relative path (`resolvesSameOrigin` — catches `//evil.com` AND the
 *    backslash-equivalent forms a prefix regex misses)
 *  Anything else (`javascript:`, `data:`, an unparseable string, empty) is unsafe. */
export function isSafeHref(raw: string): boolean {
	const href = raw.trim()
	if (href === '') return false
	if (href.startsWith('#')) return true
	if (isMailtoOrTel(href)) return true
	if (/^https?:\/\//i.test(href)) return true
	return resolvesSameOrigin(href)
}

/** Whether `src` is safe for an `<img>` — the same relative/absolute-http(s) rules as
 *  `isSafeHref`, plus `data:image/*` (inline images can't execute script the way `data:text/html`
 *  can, and the original schema explicitly allowed this exception). No `mailto:`/`tel:`/`#`
 *  exception here — those aren't meaningful image sources. */
export function isSafeImageSrc(raw: string): boolean {
	const src = raw.trim()
	if (src === '') return false
	if (/^data:image\//i.test(src)) return true
	if (/^https?:\/\//i.test(src)) return true
	return resolvesSameOrigin(src)
}

/** A minimal structural shape for walking a ProseMirror doc — deliberately not importing
 *  `ProseMirrorNode` from the vendored `./thesoria/schema.ts`, so this module stays a plain,
 *  standalone unit with no type coupling to the vendor's re-vendor cadence. The real
 *  `ProseMirrorNode`/`ProseMirrorDoc` types are structurally compatible (this is a subset). */
interface WalkableNode {
	type: string
	attrs?: Record<string, unknown>
	content?: WalkableNode[]
	marks?: { type: string; attrs?: Record<string, unknown> }[]
}

export class UnsafeUrlError extends Error {}

/** Walk a ProseMirror doc and throw `UnsafeUrlError` on the first disallowed link href or image
 *  src, using `isSafeHref`/`isSafeImageSrc` (the real-URL-parsing checks, not a prefix regex).
 *
 *  This exists as a SECOND, independent check alongside `schema.ts`'s own vendored
 *  `assertSafeUrls` (which uses a weaker prefix-regex allowlist bypassable via a backslash — see
 *  this module's own doc comment) — that file is vendored ("do not hand-edit"; re-vendor to
 *  update), so its regex can't be fixed in place. Wiring this into `pageDoc.ts`'s `docToPage`
 *  (the actual save path, NOT vendored) means a save is safe even while the vendored schema's own
 *  check stays weak, without touching the vendored file (found by expert review, 2026-07-17). */
export function assertSafeUrlsInDoc(node: WalkableNode): void {
	for (const mark of node.marks ?? []) {
		if (mark.type === 'link') {
			const href = mark.attrs?.['href']
			if (typeof href === 'string' && !isSafeHref(href)) {
				throw new UnsafeUrlError(`Disallowed link href: ${href}`)
			}
		}
	}
	if (node.type === 'image') {
		const src = node.attrs?.['src']
		if (typeof src === 'string' && !isSafeImageSrc(src)) {
			throw new UnsafeUrlError(`Disallowed image src: ${src}`)
		}
	}
	for (const child of node.content ?? []) assertSafeUrlsInDoc(child)
}
