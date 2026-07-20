/**
 * Canvas export for the MediaEditor: bake a crop (+ optional 90°-step rotation / flip) to a Blob at
 * **source resolution** — `crop` is in the source image's own pixels, so the output is full-res, not
 * the on-screen preview size (fixes the Cropper.js `$toCanvas()` preview-resolution export).
 *
 * Export approach learned/adapted from **svelte-chop-chop** (`src/lib/core/export.ts`), MIT © 2026
 * We Are Singular — https://github.com/we-are-singular/svelte-chop-chop. Reimplemented here (no
 * dependency). The pure `outputSize` split out so it's unit-testable without a DOM.
 */
import type { Rect, Size } from './coordinateSystem'
import { fillScale, type MetadataEdit, type Redaction } from './mediaEdit'
import { type ExifSummary, buildExifForWrite, embedExifInJpeg } from './mediaMetadata'

export interface ExportOptions {
	/** Output rotation in degrees — the editor's 90°-step rotate tool; a simple post-crop rotation. */
	rotation?: number
	/** Fine straighten tilt in degrees (see mediaEdit.ts / `fillScale`). Unlike `rotation`, the crop
	 *  rect describes a FIXED axis-aligned window and the source image is tilted (+ auto-zoomed via
	 *  `fillScale`, about the crop's own centre) to fill it — matching `MediaCropStage`'s live
	 *  preview — so baking draws the WHOLE source through that same transform rather than the crop
	 *  sub-rect (a plain `drawImage` source-rect can't window a rotated image correctly). */
	straighten?: number
	flipX?: boolean
	flipY?: boolean
	format?: 'image/png' | 'image/jpeg' | 'image/webp'
	quality?: number
	/** Cap output dimensions (downscale, preserving aspect) — omit for full source resolution. */
	maxWidth?: number
	maxHeight?: number
	/** Blur/pixelate/solid regions, in normalized (0–1) SOURCE-image space (see `Redaction`). Baked
	 *  into the source BEFORE crop/rotate/straighten, so a redaction stays pinned to the image
	 *  content it covers regardless of the crop/rotate/straighten chosen around it. */
	redactions?: Redaction[]
	/** EXIF strip/edit instructions. Baking already only ever produces plain pixels with no EXIF of
	 *  its own, so the privacy-first default (strip) needs nothing extra here — PRESERVING or editing
	 *  the original EXIF is the special case, and switches the OUTPUT to JPEG regardless of `format`
	 *  (the only format `piexif-ts` can write into). */
	metadata?: MetadataEdit
	/** The source's own EXIF, already read (via `mediaMetadata.ts`'s `readExif`) by the caller before
	 *  export — kept out of this (synchronous-canvas-heavy) function's own responsibilities. */
	originalExif?: ExifSummary | null
}

/** Pure: the output pixel size for a crop, applying optional maxWidth/maxHeight downscale
 *  (aspect-preserving). Rounded to whole pixels. */
export function outputSize(
	crop: Size,
	opts: Pick<ExportOptions, 'maxWidth' | 'maxHeight'> = {},
): Size {
	let width = Math.round(crop.width)
	let height = Math.round(crop.height)
	if (opts.maxWidth && width > opts.maxWidth) {
		height = Math.round(height * (opts.maxWidth / width))
		width = opts.maxWidth
	}
	if (opts.maxHeight && height > opts.maxHeight) {
		width = Math.round(width * (opts.maxHeight / height))
		height = opts.maxHeight
	}
	return { width: Math.max(1, width), height: Math.max(1, height) }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
			type,
			quality,
		),
	)
}

/** Pure: the OUTPUT canvas size for an image of `out` rotated by `rotationDeg`. A 90°/270° step
 *  swaps width/height (a 90° rotation of a non-square draw needs the swapped bounding box, else it
 *  clips). Only 90° steps are supported (the editor's rotate tool); other angles pass through. */
export function bakeCanvasSize(out: Size, rotationDeg: number): Size {
	const rot = ((rotationDeg % 360) + 360) % 360
	return rot === 90 || rot === 270 ? { width: out.height, height: out.width } : { ...out }
}

/** Pure: integer source-rect (sx,sy,sw,sh) for a crop, rounding the EDGES (x, x+width) rather than
 *  x and width independently, so sx+sw can never exceed the source raster by a rounding pixel. */
export function sourceRect(crop: Rect): { sx: number; sy: number; sw: number; sh: number } {
	const sx = Math.round(crop.x)
	const sy = Math.round(crop.y)
	return {
		sx,
		sy,
		sw: Math.round(crop.x + crop.width) - sx,
		sh: Math.round(crop.y + crop.height) - sy,
	}
}

/** Pure: integer pixel rect for a normalized (0–1) `Redaction`, against the SOURCE image's OWN
 *  natural size — NOT the crop/output size, since a redaction is defined in full-image space (see
 *  `Redaction`'s doc comment) and must be baked before crop/rotate/straighten run. Rounds the edges
 *  the same way `sourceRect` does, so x+width can never exceed the source raster by a rounding pixel. */
export function redactionPixelRect(
	r: { x: number; y: number; w: number; h: number },
	natural: Size,
): { x: number; y: number; width: number; height: number } {
	const x = Math.round(r.x * natural.width)
	const y = Math.round(r.y * natural.height)
	return {
		x,
		y,
		width: Math.round((r.x + r.w) * natural.width) - x,
		height: Math.round((r.y + r.h) * natural.height) - y,
	}
}

/** A censor-bar solid fill — deliberately a fixed color, not a semantic token: this editor's own
 *  overlay chrome is already an intentionally always-dark surface (see `.editor-overlay` below), and
 *  a redaction is a privacy affordance that should read the same "blacked out" way in every theme,
 *  not follow light/dark like the surrounding UI. */
const REDACT_SOLID_FILL = '#0a0a0b'

function naturalSizeOf(image: CanvasImageSource): Size {
	if (image instanceof HTMLImageElement)
		return { width: image.naturalWidth, height: image.naturalHeight }
	if (image instanceof HTMLCanvasElement || image instanceof ImageBitmap)
		return { width: image.width, height: image.height }
	return { width: 0, height: 0 }
}

/** Pure: the mosaic block size (in SOURCE pixels) for a 'pixelate' redaction, anchored to the FULL
 *  SOURCE IMAGE's shorter dimension — NOT the individual redaction region's own width/height.
 *  Anchoring to the region itself (the original approach) let a thin/wide region (e.g. a license-
 *  plate-width strip) end up with a tiny absolute block size even with "12 blocks across the short
 *  edge", since 12 blocks of a 20px-tall region is a ~2px block — visually near-unpixelated and a
 *  real privacy bug, not a cosmetic one (found by expert review). A block size anchored to the whole
 *  source instead gives every redaction the same, dependably-obscuring absolute block size regardless
 *  of its own shape. */
export function pixelateCellSize(natural: Size): number {
	return Math.max(8, Math.round(Math.min(natural.width, natural.height) * 0.02))
}

const BLUR_RADIUS_RATIO = 0.015

/** Bake `redactions` onto a copy of `image` at the SOURCE's own native resolution, returning a
 *  canvas the rest of `exportCrop`'s pipeline can draw from exactly like the original source (a
 *  no-op that returns `image` unchanged when there's nothing to redact, so the common case pays no
 *  extra canvas). Order matters: this runs BEFORE crop/rotate/straighten, so redactions are defined
 *  once against the stable source image and stay correct no matter how the crop/rotate/straighten
 *  around them changes later.
 *
 *  Redactions are applied in ARRAY ORDER, each reading the CURRENT (already-redacted-so-far) canvas
 *  state — so overlapping regions with different styles composite the way a layer stack would (the
 *  later one wins, and a 'blur' drawn after a 'solid' blurs the ALREADY-blacked-out pixels, not the
 *  original ones underneath). An earlier version cached one whole-image blur up front and reused it
 *  for every 'blur' redaction — correct only when no other redaction touched the canvas in between;
 *  with a 'solid' then a 'blur' over the SAME region, the stale cache re-revealed a blur of the
 *  original, unredacted pixels instead of blurring the black fill just drawn — a real privacy bug
 *  (found by expert review), fixed by recomputing the blur fresh, from the CURRENT canvas, per
 *  'blur' redaction.
 *
 *  - `solid`: an opaque fill — exact, no approximation.
 *  - `blur`: blur the CURRENT whole canvas into a scratch canvas, then window just the region — a
 *    single blurred `drawImage(sourceRegion → blurredCanvas, ...)` per redaction avoids Canvas 2D's
 *    filter edge-darkening you'd get blurring the sub-rect in isolation (the filter has no
 *    surrounding pixels to sample past a tight sub-rect's own edge).
 *  - `pixelate`: the standard mosaic technique — downscale the region to a small canvas sized by
 *    `pixelateCellSize` (nearest-neighbor happens for free on the upscale below) then draw it back up
 *    with image smoothing disabled, so each downscaled pixel becomes a visible block. */
export function bakeRedactions(
	image: CanvasImageSource,
	redactions: Redaction[] | undefined,
	natural: Size,
): CanvasImageSource {
	if (!redactions?.length) return image
	if (natural.width <= 0 || natural.height <= 0) {
		// A privacy-sensitive silent failure — the caller believes redactions were applied — is worse
		// than a loud one: throw rather than quietly returning the unredacted `image` (found by
		// expert review). The sole current caller (`exportCrop`) only ever reaches this with a
		// natural size already known from a loaded `HTMLImageElement`, so this path is not expected
		// to fire in practice; it's a guard against a future caller passing an unrecognized
		// `CanvasImageSource` (see `naturalSizeOf`) alongside non-empty redactions.
		throw new Error(
			"bakeRedactions: could not determine the source image's natural size — refusing to silently skip redactions",
		)
	}

	const canvas = document.createElement('canvas')
	canvas.width = natural.width
	canvas.height = natural.height
	const ctx = canvas.getContext('2d')
	if (!ctx) return image
	ctx.drawImage(image, 0, 0, natural.width, natural.height)

	for (const r of redactions) {
		const { x, y, width, height } = redactionPixelRect(r, natural)
		if (width <= 0 || height <= 0) continue
		if (r.style === 'solid') {
			ctx.fillStyle = REDACT_SOLID_FILL
			ctx.fillRect(x, y, width, height)
		} else if (r.style === 'blur') {
			const blurred = document.createElement('canvas')
			blurred.width = natural.width
			blurred.height = natural.height
			const bctx = blurred.getContext('2d')
			if (bctx) {
				const radius = Math.max(
					4,
					Math.round(Math.min(natural.width, natural.height) * BLUR_RADIUS_RATIO),
				)
				bctx.filter = `blur(${radius}px)`
				bctx.drawImage(canvas, 0, 0) // the CURRENT canvas — includes any earlier redactions
				ctx.drawImage(blurred, x, y, width, height, x, y, width, height)
			}
		} else {
			const cell = pixelateCellSize(natural)
			const cols = Math.max(1, Math.round(width / cell))
			const rows = Math.max(1, Math.round(height / cell))
			const mosaic = document.createElement('canvas')
			mosaic.width = cols
			mosaic.height = rows
			const mctx = mosaic.getContext('2d')
			if (mctx) {
				mctx.drawImage(canvas, x, y, width, height, 0, 0, cols, rows)
				ctx.imageSmoothingEnabled = false
				ctx.drawImage(mosaic, 0, 0, cols, rows, x, y, width, height)
				ctx.imageSmoothingEnabled = true
			}
		}
	}
	return canvas
}

export interface DrawTransform {
	rotateRad: number
	scale: number
	translateX: number
	translateY: number
}

/** Pure: the ctx transform for baking a straightened crop — draw the WHOLE source image rotated
 *  `straightenDeg`°, scaled by `fillScale` (composed with `out`'s own aspect-preserving downscale
 *  factor `k = out.width/crop.width`), then translated so the crop's own centre lands at the
 *  origin — where the caller has already centred + coarse-rotated the canvas. Guards a degenerate
 *  (zero-height) crop the same way the live preview does (`MediaCropStage`'s `straightenAspect`),
 *  since `crop` is a public parameter here, not guaranteed to come from `cropEngine`'s own
 *  minimum-size clamp. The riskiest new geometry in the straighten feature — extracted specifically
 *  so it's unit-testable without a DOM/canvas (mirrors `outputSize`'s existing split). */
export function straightenDrawTransform(
	crop: Rect,
	straightenDeg: number,
	out: Size,
): DrawTransform {
	const aspect = crop.height > 0 ? crop.width / crop.height : 1
	const fill = fillScale(straightenDeg, aspect)
	const k = crop.width > 0 ? out.width / crop.width : 1
	return {
		rotateRad: (straightenDeg * Math.PI) / 180,
		scale: fill * k,
		translateX: -(crop.x + crop.width / 2),
		translateY: -(crop.y + crop.height / 2),
	}
}

/** Pure: whether export should attempt to WRITE metadata into the output (vs. the privacy-first
 *  default of stripping it). True ONLY when the user explicitly opted out of stripping
 *  (`strip: false`) — an ABSENT `metadata` (the Metadata tool was never opened) and an EXPLICIT
 *  `strip: true` both strip. This must be the narrower ("preserve only if explicitly false")
 *  condition, not its inverse ("strip only if explicitly true") — the latter would let an untouched
 *  edit record silently WRITE an image's original EXIF forward into the export instead of
 *  stripping it, the exact opposite of the stated default. */
export function shouldPreserveMetadata(metadata: MetadataEdit | undefined): boolean {
	return metadata?.strip === false
}

/**
 * Bake `crop` (in SOURCE pixels) of `image` to a Blob at source resolution, applying an optional
 * output rotation/flip. `image` is any `CanvasImageSource` (HTMLImageElement / ImageBitmap / canvas).
 */
export async function exportCrop(
	image: CanvasImageSource,
	crop: Rect,
	opts: ExportOptions = {},
): Promise<Blob> {
	const {
		rotation = 0,
		straighten = 0,
		flipX = false,
		flipY = false,
		format = 'image/png',
		quality = 0.92,
		redactions,
		metadata,
		originalExif,
	} = opts
	// Redact BEFORE crop/rotate/straighten — redactions are defined once against the stable source
	// image (see `bakeRedactions`'s own doc comment for why the ordering matters).
	const source = redactions?.length
		? bakeRedactions(image, redactions, naturalSizeOf(image))
		: image
	const out = outputSize(crop, opts)
	const canvasSize = bakeCanvasSize(out, rotation)

	const canvas = document.createElement('canvas')
	canvas.width = canvasSize.width
	canvas.height = canvasSize.height
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('Could not get a 2D canvas context')

	// Rotate about the (possibly swapped) canvas centre, then draw so a 90° step lands in the
	// swapped bounding box instead of being clipped.
	ctx.save()
	ctx.translate(canvas.width / 2, canvas.height / 2)
	if (rotation) ctx.rotate((rotation * Math.PI) / 180)
	if (flipX || flipY) ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1)

	if (straighten) {
		// Straighten: draw the WHOLE source, tilted + auto-zoomed about the crop's own centre and
		// translated so the crop window lands centred in the (rotated) canvas — the same transform
		// the live preview applies (MediaCropStage), just at full source resolution.
		const t = straightenDrawTransform(crop, straighten, out)
		ctx.rotate(t.rotateRad)
		ctx.scale(t.scale, t.scale)
		ctx.translate(t.translateX, t.translateY)
		ctx.drawImage(source, 0, 0)
	} else {
		const { sx, sy, sw, sh } = sourceRect(crop)
		ctx.drawImage(
			source,
			sx,
			sy,
			sw,
			sh,
			-out.width / 2,
			-out.height / 2,
			out.width,
			out.height,
		)
	}
	ctx.restore()

	// Baking already produces plain pixels with no EXIF of its own — the privacy-first DEFAULT (strip
	// everything) is already what happens below with no special-casing. Only an EXPLICIT opt-out
	// (see `shouldPreserveMetadata`'s own doc comment for why this must be the narrower condition)
	// engages the JPEG/piexif write-back. Deliberately uncaught here (unlike `readExif`'s own
	// defensive try/catch): a failure writing metadata the user explicitly asked to keep should abort
	// the WHOLE export (surfaced by MediaEditor's own commit() try/catch as "Could not export the
	// edited image") rather than silently falling back to the unbaked/unwritten toBlob() path below —
	// that fallback would report success while quietly dropping the metadata the user asked for.
	if (shouldPreserveMetadata(metadata)) {
		const exifObj = buildExifForWrite(originalExif ?? null, metadata?.fields)
		if (exifObj) return embedExifInJpeg(canvas, exifObj, quality)
	}
	return toBlob(canvas, format, quality)
}
