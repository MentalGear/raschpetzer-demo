/**
 * Shared visual data for figure/gallery placeholders (front-end only — no network
 * images; the demo draws themed token-only gradients). The `TONES` palette is
 * single-sourced here so the reader's `Figure.svelte` and the editor's read-only
 * `gallery` atom (`extensions.ts` → `GalleryBlock.renderHTML`) can't drift: each renders
 * in its own runtime idiom (a Svelte template vs. a TipTap hyperscript array) off the
 * SAME palette. Pure TS (no Svelte/DOM) so the editor schema can import it too.
 */

/** Card width/gap (px) for the gallery slider — `GalleryNodeView.svelte` now renders the SAME
 *  read-mode-shaped slider in both read and edit mode (the retired `GalleryReader.svelte`'s
 *  render was ported wholesale into it), and its own edit-dialog card grid, both off these
 *  literals so the slider's shape stays identical everywhere it appears. (`GALLERY_CARD_GAP`
 *  added after expert review found `GAP` was still independently declared in both files despite
 *  the shared-constant intent — the `flex gap-4` Tailwind class in each template's markup must
 *  stay in sync with this value by hand, since a Tailwind class name can't be templated from a
 *  JS constant.) */
export const GALLERY_CARD_WIDTH = 256
export const GALLERY_CARD_GAP = 16

/** Max height (a CSS length, not a number — used directly in an inline `style` string) for a
 *  single gallery card's image box. Width is flex-grown to fill the row (fills the available
 *  width when there are few items — deliberate, see the "cards fill width" behavior), and height
 *  is normally derived from that width via `aspect-ratio` — with NO cap, a portrait item (or any
 *  item whose ratio is < 1) at a wide, few-item-grown width would render very tall (e.g. a 2:3
 *  portrait at ~700px width → ~1050px tall), which can visually dominate or even exceed the
 *  viewport. This value bounds that: 70% of the viewport height, but never more than 640px (a
 *  short/landscape viewport shouldn't get a card taller than a sane absolute cap either). Paired
 *  with `width: min(100%, calc(<this> * ratio))` at the call site (GalleryNodeView.svelte) rather
 *  than a bare `max-height` alone — capping height without also capping width would visually
 *  squash the placeholder box below its own declared aspect ratio; deriving width FROM the cap
 *  instead keeps every card's proportions correct, just narrower once the cap binds. */
export const GALLERY_CARD_MAX_HEIGHT = 'min(70vh, 640px)'

/** Token-only gradient classes (no raw colors) — varied per figure for visual variety. */
export const TONES = [
	'from-muted to-accent',
	'from-accent to-muted',
	'from-secondary to-muted',
	'from-muted to-secondary',
	'from-accent to-secondary',
	'from-secondary to-accent',
]

/**
 * Deterministic tone INDEX for a gallery item (0..TONES.length-1). `GalleryItem` carries no
 * `tone` field (unlike the read model's `FigureBlock`), and tone is purely decorative, so
 * it's derived from a small stable string hash of the item's `id` — computed at render time,
 * never stored — so multiple images in one gallery still look visually distinct. Exported
 * (not just `toneClass` below) so a numeric tone is available wherever one is needed, e.g.
 * `galleryPlaceholder.ts`'s `galleryPlaceholderSrc(tone: number, ...)` for the editor's
 * unified gallery NodeView (which, unlike the read model's `GalleryItemRef`, has no stored
 * `tone` field either).
 */
export function toneIndex(id: string): number {
	let h = 0
	for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0
	return Math.abs(h) % TONES.length
}

/** Deterministic tone gradient CLASS for a gallery item — `TONES[toneIndex(id)]`. */
export function toneClass(id: string): string {
	return TONES[toneIndex(id)]
}

/**
 * `TONES[tone]`, wrapping `tone` into range with a sign-safe modulo (mirrors
 * `galleryPlaceholderSrc`'s `((tone % n) + n) % n` in `galleryPlaceholder.ts` — a plain `%`
 * returns a negative index for negative input, e.g. `-1 % 6 === -5`, silently producing
 * `TONES[undefined]`). `FigureBlock.tone`/`GalleryItemRef.tone` are typed as a plain `number`
 * (not a 0..5 literal union), so nothing at the type level rules this out for a caller
 * carrying a `tone` from an untrusted/derived source.
 */
export function toneClassForTone(tone: number): string {
	const n = TONES.length
	return TONES[((tone % n) + n) % n]
}
