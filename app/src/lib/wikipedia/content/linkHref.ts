import { resolvesSameOrigin } from './safeUrl'

/**
 * Internal-link hrefs are stored UNPREFIXED (`/${slug}`) in Page/Article content —
 * see `fromArticle.ts`'s `inlineToPM` and `LinkDialog.svelte`'s `insertInternal`. The
 * deploy base path (`$app/paths`' `base`) is applied only at final DOM-render time
 * (`$lib/paths.ts`'s `href()`), never baked into stored marks — so this parses the
 * stored convention, not the rendered one. Anything not starting with `/` is external.
 *
 * A leading `/` alone is NOT sufficient to call an href "internal": `//evil.com` and the
 * backslash-equivalent `/\evil.com` both start with `/` but resolve OFF-origin in a real
 * browser — the exact bypass class `safeUrl.ts` documents and guards against (found by expert
 * review, 2026-07-17; this function reproduced it in a third call site before being fixed to
 * call `resolvesSameOrigin` too). Without this check, a malicious/malformed href could be
 * misclassified as a genuine internal slug and looked up against `wikiStore`.
 */
export function slugFromInternalHref(href: string): string | null {
	if (!href.startsWith('/')) return null
	return resolvesSameOrigin(href) ? href.slice(1) : null
}
