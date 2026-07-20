import { describe, it, expect } from 'vitest'
import { TagValues } from 'piexif-ts'
import {
	toExifDateTime,
	buildExifForWrite,
	toDMSRational,
	toExposureRational,
	type ExifSummary,
} from './mediaMetadata'

describe('toExifDateTime', () => {
	it('formats an ISO date into EXIF’s "YYYY:MM:DD HH:MM:SS" form', () => {
		// constructed from explicit local components (not parsed from a UTC-suffixed string) so the
		// expected H:M:S isn't sensitive to the test runner's timezone
		const d = new Date(2026, 0, 15, 9, 30, 5) // Jan 15 2026, 09:30:05 local
		expect(toExifDateTime(d.toISOString())).toBe(
			`2026:01:15 ${String(d.getHours()).padStart(2, '0')}:30:05`,
		)
	})

	it('zero-pads single-digit month/day/hour/minute/second', () => {
		const d = new Date(2026, 2, 5, 4, 6, 7) // Mar 5 2026, 04:06:07 local
		expect(toExifDateTime(d.toISOString())).toBe(
			`2026:03:05 ${String(d.getHours()).padStart(2, '0')}:06:07`,
		)
	})
})

describe('toDMSRational', () => {
	it('converts a simple decimal degree into whole degrees/minutes/seconds', () => {
		// 48.8584° → 48°, 0.8584×60 = 51.504′ → 51′, 0.504×60 = 30.24″
		const [deg, min, sec] = toDMSRational(48.8584)
		expect(deg).toEqual([48, 1])
		expect(min).toEqual([51, 1])
		expect(sec[0]).toBeCloseTo(3024, 0) // 30.24" × 100
		expect(sec[1]).toBe(100)
	})

	it('carries a seconds value that rounds up to 60.00 into the next minute (regression guard)', () => {
		// Regression guard (expert review): rounding the seconds component to 2 decimal places can
		// itself round UP to an invalid "60.00 seconds" (e.g. 59.997 → 60.00) instead of carrying into
		// the next minute — some EXIF readers reject or misinterpret this, the DMS equivalent of a
		// clock showing "12:59:60" instead of "13:00:00".
		// 48° + 59.999999999/60 minutes ≈ 48.99999998°, whose minutes component is 59.9999998... —
		// its ROUNDED seconds (59.999988"×100 ≈ 5999.9988, rounds to 6000) must carry to 49°00′00.00″.
		const deg = 48
		const almostWholeDegree = deg + 59.999999 / 60
		const [d, m, s] = toDMSRational(almostWholeDegree)
		expect(d).toEqual([49, 1])
		expect(m).toEqual([0, 1])
		expect(s).toEqual([0, 100])
	})

	it('never returns a seconds value of 60.00 or a minutes value of 60', () => {
		// sweep a range of decimal degrees, including values deliberately close to a whole-second
		// boundary, and assert the DMS invariant holds for all of them
		for (let deg = 0; deg < 10; deg += 0.01) {
			const [, min, sec] = toDMSRational(deg)
			expect(sec[0]).toBeLessThan(6000)
			expect(min[0]).toBeLessThan(60)
		}
	})
})

describe('buildExifForWrite', () => {
	it('returns null when there is nothing to write (no original, no field overrides)', () => {
		expect(buildExifForWrite(null, undefined)).toBeNull()
		expect(buildExifForWrite(null, {})).toBeNull()
	})

	it('writes simple string fields into the 0th IFD', () => {
		const exif = buildExifForWrite(null, {
			artist: 'A. Photographer',
			copyright: '© 2026',
			description: 'A test photo',
		})
		expect(exif?.['0th']?.[TagValues.ImageIFD.Artist]).toBe('A. Photographer')
		expect(exif?.['0th']?.[TagValues.ImageIFD.Copyright]).toBe('© 2026')
		expect(exif?.['0th']?.[TagValues.ImageIFD.ImageDescription]).toBe('A test photo')
	})

	it('writes dateTimeOriginal into the Exif IFD in EXIF datetime form', () => {
		const d = new Date(2026, 0, 15, 9, 30, 5)
		const exif = buildExifForWrite(null, { dateTimeOriginal: d.toISOString() })
		expect(exif?.Exif?.[TagValues.ExifIFD.DateTimeOriginal]).toBe(
			toExifDateTime(d.toISOString()),
		)
	})

	it('encodes GPS lat/lng as degrees/minutes/seconds rationals with the correct hemisphere refs', () => {
		// Eiffel Tower: 48.8584°N, 2.2945°E
		const exif = buildExifForWrite(null, { gpsLatitude: 48.8584, gpsLongitude: 2.2945 })
		const gps = exif?.GPS
		expect(gps?.[TagValues.GPSIFD.GPSLatitudeRef]).toBe('N')
		expect(gps?.[TagValues.GPSIFD.GPSLongitudeRef]).toBe('E')
		const lat = gps?.[TagValues.GPSIFD.GPSLatitude] as [number, number][]
		expect(lat[0]).toEqual([48, 1]) // whole degrees
		expect(lat[1][0]).toBe(51) // whole minutes: (0.8584*60) = 51.504
	})

	it('uses S/W refs for negative latitude/longitude', () => {
		// Sydney Opera House: -33.8568°, 151.2153°E — negative latitude only, to isolate the ref
		const exif = buildExifForWrite(null, { gpsLatitude: -33.8568, gpsLongitude: 151.2153 })
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLatitudeRef]).toBe('S')
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLongitudeRef]).toBe('E')
	})

	it('field overrides win over the original EXIF for the same field', () => {
		const original: ExifSummary = { artist: 'Original Artist', make: 'Acme' }
		const exif = buildExifForWrite(original, { artist: 'Edited Artist' })
		expect(exif?.['0th']?.[TagValues.ImageIFD.Artist]).toBe('Edited Artist')
	})

	it('an unedited original field still gets written through (preserve, not just override)', () => {
		const original: ExifSummary = { artist: 'Original Artist' }
		const exif = buildExifForWrite(original, {})
		expect(exif?.['0th']?.[TagValues.ImageIFD.Artist]).toBe('Original Artist')
	})

	it('an explicitly CLEARED field (null) is OMITTED, not resurrected from the original (privacy-critical)', () => {
		// Regression guard (BLOCKER, expert review): the whole point of a clearable field is that
		// clearing it actually REMOVES it from the export. Before the fix, a cleared field was
		// deleted from the overrides object — indistinguishable from "never touched" — so this exact
		// merge would fall back to the original GPS coordinates instead of omitting them.
		const original: ExifSummary = {
			artist: 'Original Artist',
			gpsLatitude: 48.8584,
			gpsLongitude: 2.2945,
		}
		const exif = buildExifForWrite(original, { artist: null })
		expect(exif?.['0th']?.[TagValues.ImageIFD.Artist]).toBeUndefined()
		// an UNRELATED original field the user did NOT clear must still be preserved
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLatitude]).toBeDefined()
	})

	it('clearing ONE half of a GPS pair omits the whole coordinate, not just the cleared half', () => {
		const original: ExifSummary = { gpsLatitude: 48.8584, gpsLongitude: 2.2945 }
		const exif = buildExifForWrite(original, { gpsLatitude: null })
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLatitude]).toBeUndefined()
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLongitude]).toBeUndefined()
	})

	it('clearing every field the original had returns null (nothing left to write)', () => {
		const original: ExifSummary = { artist: 'Original Artist' }
		const exif = buildExifForWrite(original, { artist: null })
		expect(exif).toBeNull()
	})

	it('omits GPS entirely when only one of lat/lng is present (a half-coordinate is not writable)', () => {
		const exif = buildExifForWrite(null, { gpsLatitude: 48.8584 })
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLatitude]).toBeUndefined()
	})

	it('returns null when the original + fields merge to nothing meaningful', () => {
		const original: ExifSummary = { iso: undefined, make: undefined }
		expect(buildExifForWrite(original, {})).toBeNull()
	})

	it('writes exposureTime as an exposure rational (regression guard: was read but never written)', () => {
		// Round 2 review (MAJOR): exposureTime was part of ExifSummary and read by readExif, but
		// buildExifForWrite had no case for it at all — an explicit "preserve original metadata"
		// export silently dropped shutter-speed data the tool itself had just read. exposureTime is
		// read-only (not in MetadataFields — there's no UI to edit it), so it only ever arrives via
		// `original`, the same "preserve, not just override" path as make/model/lensModel.
		const original: ExifSummary = { exposureTime: 0.002 } // 1/500s
		const exif = buildExifForWrite(original, {})
		expect(exif?.Exif?.[TagValues.ExifIFD.ExposureTime]).toEqual([1, 500])
	})

	it('encodes focalLength with a fractional denominator, not rounded to a whole mm', () => {
		// Round 2 review (MINOR): a source with a fractional focal length (e.g. 18.5mm) was silently
		// rounded to 19mm on the PRESERVE path, even though this field is never user-edited (also
		// read-only/original-only, like exposureTime above).
		const original: ExifSummary = { focalLength: 18.5 }
		const exif = buildExifForWrite(original, {})
		expect(exif?.Exif?.[TagValues.ExifIFD.FocalLength]).toEqual([185, 10])
	})

	it('rejects an out-of-range GPS coordinate instead of writing an invalid DMS value', () => {
		// Round 2 review (MINOR): every other user-adjustable field is clamped to a valid range
		// (clampStraighten, clampRedactionRect) — GPS lat/lng had no equivalent guard, so a typo like
		// latitude 999 was written straight into the export as an invalid coordinate.
		const exif = buildExifForWrite(null, { gpsLatitude: 999, gpsLongitude: 2.2945 })
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLatitude]).toBeUndefined()
		expect(exif?.GPS?.[TagValues.GPSIFD.GPSLongitude]).toBeUndefined()
	})
})

describe('toExposureRational', () => {
	it('encodes a sub-second exposure as 1/x, the conventional camera form', () => {
		expect(toExposureRational(0.002)).toEqual([1, 500])
		expect(toExposureRational(0.01)).toEqual([1, 100])
	})

	it('encodes a multi-second exposure as a millisecond-denominator rational', () => {
		expect(toExposureRational(2.5)).toEqual([2500, 1000])
	})

	it('treats a zero/negative exposure as the degenerate 0/1 rational', () => {
		expect(toExposureRational(0)).toEqual([0, 1])
		expect(toExposureRational(-1)).toEqual([0, 1])
	})
})
