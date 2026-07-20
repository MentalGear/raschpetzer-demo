/**
 * Solid-fill inline SVG data URI for a gallery item's placeholder "image" — the source
 * `GalleryNodeView.svelte`'s `slide` snippet renders into an `<img>`. This app renders no
 * real images (front-end only, no network): `Figure.svelte` sidesteps the problem
 * entirely by never rendering an `<img>` (a CSS-gradient `<div>` placeholder instead),
 * but `@kit/ui`'s `MediaLightbox` is generically built around a real `<img>` inside its
 * `slide` snippet's contract — it has no "CSS-only placeholder" mode — so
 * `GalleryNodeView.svelte` needs something real to hand it.
 *
 * These are LITERAL, fixed hex colors, not semantic tokens — the same "can't read CSS
 * vars" constraint `scripts/check-token-purity.mjs` already carves out for
 * `MediaRedactLayer.svelte`'s svelte-konva canvas props (see that script's
 * `COMPOSITE_INFO_ONLY` Set and its comment): a `data:` URI is decoded in an isolated
 * image context, not rendered through the page's CSS cascade, so it cannot read a CSS
 * custom property (`var(--muted)`, …) the way a real CSS declaration can. This module is
 * listed alongside `MediaRedactLayer.svelte` in that same `COMPOSITE_INFO_ONLY` carve-out
 * for exactly this reason. The six fills approximate the *feel* of `figureVisual.ts`'s
 * `TONES` gradients (muted/accent/secondary blends) without matching them exactly —
 * impossible anyway, since those are live theme tokens that flip in dark mode and a
 * static SVG can't.
 */
const PLACEHOLDER_FILLS = [
	'#9b9a97', // tone 0 — muted warm gray
	'#a8998c', // tone 1 — accent taupe
	'#8f9a8c', // tone 2 — secondary sage
	'#8c98a8', // tone 3 — muted/secondary blue-gray
	'#a08ca0', // tone 4 — accent/secondary mauve
	'#a8a08c', // tone 5 — secondary/muted khaki
]

/**
 * @param tone 0..5, wraps via modulo (mirrors `TONES[block.tone % TONES.length]` in
 *   `figureVisual.ts` — negative input also wraps into range, unlike a plain `%`).
 * @param longEdge the bounded long-edge px the caller wants — `GalleryNodeView.svelte`
 *   always passes 1600 (`MediaLightbox`'s own "full view" size); there's no separate
 *   blur-placeholder/filmstrip-thumb resolution to juggle here, since a synchronous SVG
 *   generator has no network latency to hide behind a progressive load.
 * @param aspect width/height, default 16/9 (mirrors `GalleryItemRef.ratio`'s own
 *   fallback) — kept aspect-correct so the placeholder never letterbox-mismatches the
 *   "full" image swap (media-lightbox.md's own best practice).
 */
export function galleryPlaceholderSrc(tone: number, longEdge = 800, aspect = 16 / 9): string {
	const w = aspect >= 1 ? longEdge : Math.round(longEdge * aspect)
	const h = aspect >= 1 ? Math.round(longEdge / aspect) : longEdge
	const n = PLACEHOLDER_FILLS.length
	const fill = PLACEHOLDER_FILLS[((tone % n) + n) % n]
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${fill}"/></svg>`
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
