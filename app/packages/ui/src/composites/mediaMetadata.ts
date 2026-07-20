/**
 * EXIF read/edit/strip for the light MediaEditor's Metadata tool. Two libraries, one job each,
 * per docs/research/photo-editing-libs-2026-06.md:
 *  - **`exifr`** reads EXIF from the source image's own bytes (`readExif`).
 *  - **`piexif-ts`** (a maintained TS fork of piexifjs, JPEG-only) writes EXIF back into a freshly
 *    baked export (`embedExifInJpeg`) — MediaEditor never imports `Photo` (domain-free, so it can
 *    also serve Wikipedia's Figure editor later); this tool operates purely on the image's own
 *    embedded metadata, never the app's own photo-record fields.
 *
 * Baking normally produces plain pixels with no EXIF of its own, so the PRIVACY-FIRST DEFAULT
 * (strip everything) needs no special handling at export time — it's PRESERVING/editing the
 * original EXIF that takes work, via `embedExifInJpeg`.
 */
import exifr from 'exifr'
// Named imports only — piexif-ts's CJS bundle sets `__esModule: true` with no `exports.default`,
// so a default import (`import piexif from ...`) resolves to `undefined` under Vite's commonjs
// interop; `dump`/`insert` are real named exports on the bundle and work correctly.
import { dump, insert, TagValues, type IExif } from 'piexif-ts'
import type { MetadataFields } from './mediaEdit'

/** A curated subset of everything `exifr` can read — the fields a user would plausibly want to
 *  view or correct (date, location, attribution) plus a few read-only camera facts shown for
 *  context. Anything not in this list is intentionally not surfaced (see media-editor-plan.md's
 *  "light" scope fence). */
export interface ExifSummary {
	dateTimeOriginal?: string // ISO 8601
	gpsLatitude?: number
	gpsLongitude?: number
	artist?: string
	copyright?: string
	description?: string
	make?: string
	model?: string
	lensModel?: string
	iso?: number
	fNumber?: number
	exposureTime?: number
	focalLength?: number
}

/** Reads a curated EXIF summary from `source`'s own bytes via `exifr`. Returns `null` when there's
 *  nothing to read — an `ImageBitmap` has no embedded bytes at all (not a bug: it's decoded pixels,
 *  by definition metadata-free), the source has no EXIF, or parsing fails for any reason (a
 *  corrupt/foreign segment shouldn't crash the editor over a read-only, best-effort feature). */
export async function readExif(source: Blob | ImageBitmap): Promise<ExifSummary | null> {
	if (!(source instanceof Blob)) return null
	let tags: Record<string, unknown> | undefined
	try {
		tags = await exifr.parse(source, { translateValues: true })
	} catch {
		return null
	}
	if (!tags) return null
	const dt = tags.DateTimeOriginal
	const summary: ExifSummary = {
		dateTimeOriginal: dt instanceof Date ? dt.toISOString() : undefined,
		gpsLatitude: typeof tags.latitude === 'number' ? tags.latitude : undefined,
		gpsLongitude: typeof tags.longitude === 'number' ? tags.longitude : undefined,
		artist: typeof tags.Artist === 'string' ? tags.Artist : undefined,
		copyright: typeof tags.Copyright === 'string' ? tags.Copyright : undefined,
		description: typeof tags.ImageDescription === 'string' ? tags.ImageDescription : undefined,
		make: typeof tags.Make === 'string' ? tags.Make : undefined,
		model: typeof tags.Model === 'string' ? tags.Model : undefined,
		lensModel: typeof tags.LensModel === 'string' ? tags.LensModel : undefined,
		iso: typeof tags.ISO === 'number' ? tags.ISO : undefined,
		fNumber: typeof tags.FNumber === 'number' ? tags.FNumber : undefined,
		exposureTime: typeof tags.ExposureTime === 'number' ? tags.ExposureTime : undefined,
		focalLength: typeof tags.FocalLength === 'number' ? tags.FocalLength : undefined,
	}
	return Object.values(summary).some((v) => v !== undefined) ? summary : null
}

/** Pure: a decimal seconds value → EXIF's exposure-time rational form. Cameras conventionally
 *  encode sub-second exposures as `1/x` (e.g. 0.002s → [1, 500]) rather than a decimal fraction over
 *  1000, which is both the more human-readable convention and avoids the precision loss a fixed
 *  denominator would cause for very fast shutter speeds. */
export function toExposureRational(seconds: number): [number, number] {
	if (seconds <= 0) return [0, 1]
	if (seconds >= 1) return [Math.round(seconds * 1000), 1000]
	return [1, Math.round(1 / seconds)]
}

/** Pure: an ISO 8601 timestamp → EXIF's own `"YYYY:MM:DD HH:MM:SS"` datetime form. */
export function toExifDateTime(iso: string): string {
	const d = new Date(iso)
	const pad = (n: number) => String(n).padStart(2, '0')
	return (
		`${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ` +
		`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
	)
}

/** Pure: a decimal degree → EXIF's [[deg,1],[min,1],[sec×100,100]] rational-triple form. Rounding the
 *  seconds component to 2 decimal places can itself round UP to 60.00 (e.g. 59.997 → 60.00) — an
 *  invalid DMS value some EXIF readers reject or misinterpret — so this carries a rounded-up-to-60
 *  seconds into the next minute (and a rounded-up-to-60 minutes into the next degree), the same way
 *  a clock reading "12:59:60" gets normalized to "13:00:00" (found by expert review). */
export function toDMSRational(absDeg: number): [number, number][] {
	let wholeDeg = Math.floor(absDeg)
	const minutesFloat = (absDeg - wholeDeg) * 60
	let wholeMin = Math.floor(minutesFloat)
	let secondsHundredths = Math.round((minutesFloat - wholeMin) * 60 * 100)
	if (secondsHundredths >= 6000) {
		secondsHundredths = 0
		wholeMin += 1
	}
	if (wholeMin >= 60) {
		wholeMin = 0
		wholeDeg += 1
	}
	return [
		[wholeDeg, 1],
		[wholeMin, 1],
		[secondsHundredths, 100],
	]
}

/** Pure: merges the source's original EXIF with the user's sparse field edits (edits win) into the
 *  `IExif` shape `piexif-ts` needs to write. Returns `null` when there's nothing meaningful to
 *  write at all — the caller should skip the whole JPEG/piexif path in that case (matches
 *  `bakeRedactions`'s "no-op when there's nothing to do" convention). GPS is only written when
 *  BOTH latitude and longitude are present — a half-coordinate isn't a writable location. */
export function buildExifForWrite(
	original: ExifSummary | null,
	fields: MetadataFields | undefined,
): IExif | null {
	// `null` (an explicit clear, see `MetadataFields`'s own doc comment) is a legal per-field value
	// here even though `ExifSummary` itself never contains one — every guard below already treats
	// `null` as falsy/"don't write", the same as `undefined`.
	const merged: { [K in keyof ExifSummary]?: ExifSummary[K] | null } = { ...original, ...fields }
	if (!Object.values(merged).some((v) => v !== undefined)) return null

	const zeroth: Record<number, unknown> = {}
	const exif: Record<number, unknown> = {}
	const gps: Record<number, unknown> = {}

	if (merged.artist) zeroth[TagValues.ImageIFD.Artist] = merged.artist
	if (merged.copyright) zeroth[TagValues.ImageIFD.Copyright] = merged.copyright
	if (merged.description) zeroth[TagValues.ImageIFD.ImageDescription] = merged.description
	if (merged.make) zeroth[TagValues.ImageIFD.Make] = merged.make
	if (merged.model) zeroth[TagValues.ImageIFD.Model] = merged.model

	if (merged.dateTimeOriginal)
		exif[TagValues.ExifIFD.DateTimeOriginal] = toExifDateTime(merged.dateTimeOriginal)
	if (merged.lensModel) exif[TagValues.ExifIFD.LensModel] = merged.lensModel
	if (typeof merged.iso === 'number') exif[TagValues.ExifIFD.ISOSpeedRatings] = merged.iso
	if (typeof merged.fNumber === 'number')
		exif[TagValues.ExifIFD.FNumber] = [Math.round(merged.fNumber * 10), 10]
	// A fractional denominator (not a flat /1) — a read-only, never-user-edited field shouldn't lose
	// precision (e.g. an 18.5mm focal length) just by passing through the "preserve original" path.
	if (typeof merged.focalLength === 'number')
		exif[TagValues.ExifIFD.FocalLength] = [Math.round(merged.focalLength * 10), 10]
	if (typeof merged.exposureTime === 'number')
		exif[TagValues.ExifIFD.ExposureTime] = toExposureRational(merged.exposureTime)

	// GPS coordinates are the one field range-validated here rather than left to the caller — unlike
	// every other editable field, an out-of-range lat/lng (e.g. typing 999) doesn't fail loudly, it
	// silently writes an invalid EXIF coordinate that some readers may misinterpret rather than
	// reject (found by expert review).
	if (
		typeof merged.gpsLatitude === 'number' &&
		typeof merged.gpsLongitude === 'number' &&
		Math.abs(merged.gpsLatitude) <= 90 &&
		Math.abs(merged.gpsLongitude) <= 180
	) {
		gps[TagValues.GPSIFD.GPSLatitudeRef] = merged.gpsLatitude >= 0 ? 'N' : 'S'
		gps[TagValues.GPSIFD.GPSLatitude] = toDMSRational(Math.abs(merged.gpsLatitude))
		gps[TagValues.GPSIFD.GPSLongitudeRef] = merged.gpsLongitude >= 0 ? 'E' : 'W'
		gps[TagValues.GPSIFD.GPSLongitude] = toDMSRational(Math.abs(merged.gpsLongitude))
	}

	if (!Object.keys(zeroth).length && !Object.keys(exif).length && !Object.keys(gps).length)
		return null
	return { '0th': zeroth, Exif: exif, GPS: gps }
}

/** Writes `exifObj` into a freshly-baked canvas, re-encoding as JPEG (the only format `piexif-ts`
 *  can write into) and returning a Blob with the EXIF embedded. `piexif-ts` operates on JPEG DATA
 *  URLS, not Blobs/binary strings (see its README) — `canvas.toDataURL` avoids an extra Blob→
 *  DataURL round trip, and this is the one place that API quirk is contained. */
export async function embedExifInJpeg(
	canvas: HTMLCanvasElement,
	exifObj: IExif,
	quality: number,
): Promise<Blob> {
	const dataUrl = canvas.toDataURL('image/jpeg', quality)
	const exifBytes = dump(exifObj)
	const withExif = insert(exifBytes, dataUrl)
	const res = await fetch(withExif)
	return res.blob()
}
