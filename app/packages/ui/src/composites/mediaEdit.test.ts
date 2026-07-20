import { describe, it, expect } from 'vitest'
import {
	applyCommand,
	createHistory,
	push,
	undo,
	redo,
	canUndo,
	canRedo,
	current,
	fillScale,
	clampRedactionRect,
	REDACT_MIN_SIZE,
	type MediaEdit,
} from './mediaEdit'

describe('applyCommand', () => {
	it('applies a crop command, replacing any previous crop', () => {
		const edit: MediaEdit = {}
		const rect = { x: 10, y: 20, w: 100, h: 80 }
		const next = applyCommand(edit, { type: 'crop', rect })
		expect(next.crop).toEqual(rect)
		expect(next).not.toBe(edit) // pure — original untouched
		expect(edit.crop).toBeUndefined()
	})

	it('applies a rotate command as a delta on top of undefined (treated as 0)', () => {
		const next = applyCommand({}, { type: 'rotate', delta: 90 })
		expect(next.rotate).toBe(90)
	})

	it('rotate is pure — returns a new record, leaves the input untouched', () => {
		const edit: MediaEdit = { rotate: 90 }
		const next = applyCommand(edit, { type: 'rotate', delta: 90 })
		expect(next.rotate).toBe(180)
		expect(next).not.toBe(edit)
		expect(edit.rotate).toBe(90) // original untouched
	})

	it('a second crop replaces the first (crop is not accumulated)', () => {
		let edit = applyCommand({}, { type: 'crop', rect: { x: 0, y: 0, w: 10, h: 10 } })
		edit = applyCommand(edit, { type: 'crop', rect: { x: 5, y: 5, w: 20, h: 20 } })
		expect(edit.crop).toEqual({ x: 5, y: 5, w: 20, h: 20 })
	})

	it('accumulates rotate commands (two +90 → 180)', () => {
		let edit: MediaEdit = {}
		edit = applyCommand(edit, { type: 'rotate', delta: 90 })
		edit = applyCommand(edit, { type: 'rotate', delta: 90 })
		expect(edit.rotate).toBe(180)
	})

	it('rotate accumulates independently of crop (both preserved)', () => {
		let edit: MediaEdit = {}
		edit = applyCommand(edit, { type: 'crop', rect: { x: 0, y: 0, w: 50, h: 50 } })
		edit = applyCommand(edit, { type: 'rotate', delta: 90 })
		edit = applyCommand(edit, { type: 'rotate', delta: -90 })
		expect(edit.crop).toEqual({ x: 0, y: 0, w: 50, h: 50 })
		expect(edit.rotate).toBe(0)
	})
})

describe('History<T>', () => {
	it('starts with a single entry at pointer 0, both undo/redo unavailable', () => {
		const h = createHistory<MediaEdit>({})
		expect(current(h)).toEqual({})
		expect(canUndo(h)).toBe(false)
		expect(canRedo(h)).toBe(false)
	})

	it('push adds a new current entry and enables undo', () => {
		let h = createHistory<MediaEdit>({})
		h = push(h, { rotate: 90 })
		expect(current(h)).toEqual({ rotate: 90 })
		expect(canUndo(h)).toBe(true)
		expect(canRedo(h)).toBe(false)
	})

	it('undo moves the pointer back to the previous entry', () => {
		let h = createHistory<MediaEdit>({})
		h = push(h, { rotate: 90 })
		h = push(h, { rotate: 180 })
		h = undo(h)
		expect(current(h)).toEqual({ rotate: 90 })
		expect(canUndo(h)).toBe(true)
		expect(canRedo(h)).toBe(true)
	})

	it('redo re-applies the entry that was undone', () => {
		let h = createHistory<MediaEdit>({})
		h = push(h, { rotate: 90 })
		h = push(h, { rotate: 180 })
		h = undo(h)
		h = redo(h)
		expect(current(h)).toEqual({ rotate: 180 })
		expect(canRedo(h)).toBe(false)
	})

	it('undo is a no-op at the start of history (canUndo false)', () => {
		const h = createHistory<MediaEdit>({ rotate: 0 })
		const still = undo(h)
		expect(still).toBe(h) // unchanged reference — no-op
		expect(canUndo(still)).toBe(false)
	})

	it('two undos step back to the initial state, then undo is a no-op', () => {
		let h = createHistory<MediaEdit>({})
		h = push(h, { rotate: 90 })
		h = push(h, { rotate: 180 })
		h = undo(h)
		h = undo(h)
		expect(current(h)).toEqual({})
		expect(canUndo(h)).toBe(false)
		expect(canRedo(h)).toBe(true)
		expect(undo(h)).toBe(h) // no-op at the start
	})

	it('redo is a no-op at the end of history (canRedo false)', () => {
		let h = createHistory<MediaEdit>({})
		h = push(h, { rotate: 90 })
		const still = redo(h)
		expect(still).toBe(h)
		expect(canRedo(still)).toBe(false)
	})

	it('pushing after an undo truncates the redo branch', () => {
		let h = createHistory<MediaEdit>({})
		h = push(h, { rotate: 90 })
		h = push(h, { rotate: 180 })
		h = undo(h) // back to rotate:90, rotate:180 is now a redo-able branch
		h = push(h, { rotate: 45 }) // new branch — discards rotate:180
		expect(current(h)).toEqual({ rotate: 45 })
		expect(canRedo(h)).toBe(false)
		expect(h.entries).toEqual([{}, { rotate: 90 }, { rotate: 45 }])
	})
})

describe('straighten command', () => {
	it('sets an absolute (clamped) fine tilt, not accumulated', () => {
		let edit = applyCommand({}, { type: 'straighten', angle: 5 })
		expect(edit.straighten).toBe(5)
		edit = applyCommand(edit, { type: 'straighten', angle: 12 })
		expect(edit.straighten).toBe(12) // replaced, not 17
	})
	it('clamps to ±45°', () => {
		expect(applyCommand({}, { type: 'straighten', angle: 90 }).straighten).toBe(45)
		expect(applyCommand({}, { type: 'straighten', angle: -90 }).straighten).toBe(-45)
	})
	it('is independent of rotate and crop', () => {
		let edit = applyCommand({}, { type: 'rotate', delta: 90 })
		edit = applyCommand(edit, { type: 'crop', rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } })
		edit = applyCommand(edit, { type: 'straighten', angle: 7 })
		expect(edit).toEqual({
			rotate: 90,
			crop: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
			straighten: 7,
		})
	})
})

describe('flip commands', () => {
	it('toggleFlipHorizontal flips false→true→false, independent of flipVertical', () => {
		let edit = applyCommand({}, { type: 'toggleFlipHorizontal' })
		expect(edit.flipHorizontal).toBe(true)
		expect(edit.flipVertical).toBeUndefined()
		edit = applyCommand(edit, { type: 'toggleFlipHorizontal' })
		expect(edit.flipHorizontal).toBe(false)
	})
	it('toggleFlipVertical flips false→true→false, independent of flipHorizontal', () => {
		let edit = applyCommand({}, { type: 'toggleFlipVertical' })
		expect(edit.flipVertical).toBe(true)
		expect(edit.flipHorizontal).toBeUndefined()
		edit = applyCommand(edit, { type: 'toggleFlipVertical' })
		expect(edit.flipVertical).toBe(false)
	})
	it('both flips can be active at once (a 180° mirror, distinct from rotate)', () => {
		let edit = applyCommand({}, { type: 'toggleFlipHorizontal' })
		edit = applyCommand(edit, { type: 'toggleFlipVertical' })
		expect(edit.flipHorizontal).toBe(true)
		expect(edit.flipVertical).toBe(true)
	})
	it('is independent of rotate, straighten, and crop', () => {
		let edit = applyCommand({}, { type: 'rotate', delta: 90 })
		edit = applyCommand(edit, { type: 'crop', rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } })
		edit = applyCommand(edit, { type: 'straighten', angle: 7 })
		edit = applyCommand(edit, { type: 'toggleFlipHorizontal' })
		expect(edit).toEqual({
			rotate: 90,
			crop: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
			straighten: 7,
			flipHorizontal: true,
		})
	})
	it('is pure — returns a new record, leaves the input untouched', () => {
		const initial = { rotate: 90 }
		const next = applyCommand(initial, { type: 'toggleFlipHorizontal' })
		expect(next).not.toBe(initial)
		expect(initial).toEqual({ rotate: 90 })
	})
})

describe('redaction commands', () => {
	const rect = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 }

	it('addRedaction appends to an empty/undefined list', () => {
		const next = applyCommand(
			{},
			{ type: 'addRedaction', redaction: { ...rect, style: 'blur' } },
		)
		expect(next.redactions).toEqual([{ ...rect, style: 'blur' }])
	})

	it('addRedaction appends without disturbing existing entries (pure)', () => {
		const edit: MediaEdit = { redactions: [{ ...rect, style: 'solid' }] }
		const next = applyCommand(edit, {
			type: 'addRedaction',
			redaction: { x: 0.5, y: 0.5, w: 0.1, h: 0.1, style: 'pixelate' },
		})
		expect(next.redactions).toHaveLength(2)
		expect(next.redactions?.[0]).toEqual({ ...rect, style: 'solid' })
		expect(edit.redactions).toHaveLength(1) // original untouched
	})

	it('updateRedaction replaces the rect at index, leaving style and other entries alone', () => {
		const edit: MediaEdit = {
			redactions: [
				{ ...rect, style: 'blur' },
				{ x: 0.6, y: 0.6, w: 0.1, h: 0.1, style: 'solid' },
			],
		}
		const next = applyCommand(edit, {
			type: 'updateRedaction',
			index: 0,
			rect: { x: 0.2, y: 0.2, w: 0.3, h: 0.3 },
		})
		expect(next.redactions?.[0]).toEqual({ x: 0.2, y: 0.2, w: 0.3, h: 0.3, style: 'blur' })
		expect(next.redactions?.[1]).toEqual({ x: 0.6, y: 0.6, w: 0.1, h: 0.1, style: 'solid' })
	})

	it('updateRedaction clamps the incoming rect into normalized bounds', () => {
		const edit: MediaEdit = { redactions: [{ ...rect, style: 'blur' }] }
		const next = applyCommand(edit, {
			type: 'updateRedaction',
			index: 0,
			rect: { x: -0.5, y: 0.9, w: 2, h: 0.05 },
		})
		const r = next.redactions?.[0]
		expect(r?.x).toBeGreaterThanOrEqual(0)
		expect(r && r.x + r.w).toBeLessThanOrEqual(1 + 1e-9)
		expect(r?.h).toBeGreaterThanOrEqual(REDACT_MIN_SIZE)
	})

	it('updateRedaction on an out-of-range index is a no-op (returns the same reference)', () => {
		const edit: MediaEdit = { redactions: [{ ...rect, style: 'blur' }] }
		const next = applyCommand(edit, {
			type: 'updateRedaction',
			index: 5,
			rect: { x: 0, y: 0, w: 0.1, h: 0.1 },
		})
		expect(next).toBe(edit)
	})

	it('setRedactionStyle replaces only the style, leaving the rect untouched', () => {
		const edit: MediaEdit = { redactions: [{ ...rect, style: 'blur' }] }
		const next = applyCommand(edit, { type: 'setRedactionStyle', index: 0, style: 'solid' })
		expect(next.redactions?.[0]).toEqual({ ...rect, style: 'solid' })
	})

	it('removeRedaction drops only the targeted entry', () => {
		const edit: MediaEdit = {
			redactions: [
				{ ...rect, style: 'blur' },
				{ x: 0.6, y: 0.6, w: 0.1, h: 0.1, style: 'solid' },
			],
		}
		const next = applyCommand(edit, { type: 'removeRedaction', index: 0 })
		expect(next.redactions).toEqual([{ x: 0.6, y: 0.6, w: 0.1, h: 0.1, style: 'solid' }])
	})

	it('removeRedaction on an out-of-range index is a no-op (returns the same reference)', () => {
		const edit: MediaEdit = { redactions: [{ ...rect, style: 'blur' }] }
		expect(applyCommand(edit, { type: 'removeRedaction', index: 9 })).toBe(edit)
	})

	it('removing the last redaction leaves an empty array, not undefined (list identity is stable)', () => {
		const edit: MediaEdit = { redactions: [{ ...rect, style: 'blur' }] }
		const next = applyCommand(edit, { type: 'removeRedaction', index: 0 })
		expect(next.redactions).toEqual([])
	})
})

describe('clampRedactionRect', () => {
	it('leaves an already-valid rect unchanged', () => {
		expect(clampRedactionRect({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 })).toEqual({
			x: 0.1,
			y: 0.2,
			w: 0.3,
			h: 0.4,
		})
	})
	it('clamps a negative origin back into [0,1]', () => {
		const r = clampRedactionRect({ x: -0.2, y: -0.1, w: 0.3, h: 0.3 })
		expect(r.x).toBe(0)
		expect(r.y).toBe(0)
	})
	it('shrinks an oversized rect to fit within [0,1]', () => {
		const r = clampRedactionRect({ x: 0, y: 0, w: 1.5, h: 2 })
		expect(r.w).toBeLessThanOrEqual(1)
		expect(r.h).toBeLessThanOrEqual(1)
	})
	it('enforces a minimum size rather than collapsing to a point', () => {
		const r = clampRedactionRect({ x: 0.5, y: 0.5, w: 0.0001, h: 0.0001 })
		expect(r.w).toBeCloseTo(REDACT_MIN_SIZE)
		expect(r.h).toBeCloseTo(REDACT_MIN_SIZE)
	})
	it('repositions (rather than just shrinks) a rect that overflows the far edge', () => {
		const r = clampRedactionRect({ x: 0.9, y: 0.9, w: 0.3, h: 0.3 })
		expect(r.x + r.w).toBeLessThanOrEqual(1 + 1e-9)
		expect(r.y + r.h).toBeLessThanOrEqual(1 + 1e-9)
	})
})

describe('metadata commands', () => {
	it('setMetadataStrip sets the flag without disturbing other metadata', () => {
		const edit: MediaEdit = { metadata: { fields: { artist: 'A. Photographer' } } }
		const next = applyCommand(edit, { type: 'setMetadataStrip', strip: true })
		expect(next.metadata).toEqual({ strip: true, fields: { artist: 'A. Photographer' } })
	})

	it('setMetadataStrip is pure — returns a new record, leaves the input untouched', () => {
		const edit: MediaEdit = {}
		const next = applyCommand(edit, { type: 'setMetadataStrip', strip: true })
		expect(next).not.toBe(edit)
		expect(edit.metadata).toBeUndefined()
	})

	it('setMetadataField sets a string field on an empty record', () => {
		const next = applyCommand(
			{},
			{ type: 'setMetadataField', key: 'artist', value: 'A. Photographer' },
		)
		expect(next.metadata?.fields?.artist).toBe('A. Photographer')
	})

	it('setMetadataField sets a numeric field (GPS) without disturbing string fields', () => {
		let edit = applyCommand(
			{},
			{ type: 'setMetadataField', key: 'artist', value: 'A. Photographer' },
		)
		edit = applyCommand(edit, { type: 'setMetadataField', key: 'gpsLatitude', value: 48.8584 })
		expect(edit.metadata?.fields).toEqual({ artist: 'A. Photographer', gpsLatitude: 48.8584 })
	})

	it('setMetadataField with an empty string CLEARS the field to an explicit tombstone (null)', () => {
		// Regression guard (BLOCKER, expert review round 1): clearing a field must be
		// distinguishable from NEVER TOUCHING it. Deleting the key entirely (the old, buggy
		// behavior) makes "cleared" and "untouched" the same absent-key state — buildExifForWrite's
		// merge would then silently fall back to the ORIGINAL EXIF value for that field, resurrecting
		// exactly what the user was trying to remove (e.g. GPS location, cleared for privacy). An
		// explicit `null` tombstone is required so the merge can tell "omit this" apart from
		// "no override, use the original."
		let edit = applyCommand(
			{},
			{ type: 'setMetadataField', key: 'artist', value: 'A. Photographer' },
		)
		edit = applyCommand(edit, { type: 'setMetadataField', key: 'artist', value: '' })
		expect(edit.metadata?.fields).toEqual({ artist: null })
		expect(edit.metadata?.fields?.artist).toBeNull()
	})

	it('setMetadataField with undefined CLEARS the field to the same explicit tombstone (null)', () => {
		let edit = applyCommand(
			{},
			{ type: 'setMetadataField', key: 'gpsLatitude', value: 48.8584 },
		)
		edit = applyCommand(edit, {
			type: 'setMetadataField',
			key: 'gpsLatitude',
			value: undefined,
		})
		expect(edit.metadata?.fields?.gpsLatitude).toBeNull()
	})

	it('a field that was never touched at all stays genuinely absent (not null)', () => {
		// The other half of the tombstone distinction: "never interacted with" must NOT become
		// `null` just by touching a DIFFERENT field on the same record.
		const edit = applyCommand(
			{},
			{ type: 'setMetadataField', key: 'artist', value: 'A. Photographer' },
		)
		expect('copyright' in (edit.metadata?.fields ?? {})).toBe(false)
	})

	it('setMetadataField does not disturb the strip flag', () => {
		let edit = applyCommand({}, { type: 'setMetadataStrip', strip: true })
		edit = applyCommand(edit, { type: 'setMetadataField', key: 'copyright', value: '© 2026' })
		expect(edit.metadata?.strip).toBe(true)
		expect(edit.metadata?.fields?.copyright).toBe('© 2026')
	})

	it('metadata commands are independent of crop/rotate/straighten/redactions', () => {
		let edit = applyCommand({}, { type: 'rotate', delta: 90 })
		edit = applyCommand(edit, { type: 'setMetadataField', key: 'artist', value: 'A' })
		expect(edit.rotate).toBe(90)
		expect(edit.metadata?.fields?.artist).toBe('A')
	})
})

describe('fillScale', () => {
	it('is 1 at 0° (no tilt → no scaling)', () => {
		expect(fillScale(0, 1.5)).toBeCloseTo(1, 10)
	})
	it('grows with tilt magnitude and is symmetric in sign', () => {
		expect(fillScale(10, 1.5)).toBeGreaterThan(1)
		expect(fillScale(-10, 1.5)).toBeCloseTo(fillScale(10, 1.5), 10)
		expect(fillScale(20, 1.5)).toBeGreaterThan(fillScale(10, 1.5))
	})
	it('actually fills: the scaled+rotated image covers the viewport corner', () => {
		for (const aspect of [1, 1.5, 0.6, 2.2]) {
			for (const deg of [1, 8, 25, 45]) {
				const s = fillScale(deg, aspect)
				const a = (deg * Math.PI) / 180
				const W = aspect
				const H = 1
				const x = (W / 2) * Math.cos(a) + (H / 2) * Math.sin(a)
				const y = -(W / 2) * Math.sin(a) + (H / 2) * Math.cos(a)
				expect(Math.abs(x)).toBeLessThanOrEqual((s * W) / 2 + 1e-9)
				expect(Math.abs(y)).toBeLessThanOrEqual((s * H) / 2 + 1e-9)
			}
		}
	})
	it('treats a non-positive aspect defensively (falls back to square)', () => {
		expect(fillScale(10, 0)).toBeCloseTo(fillScale(10, 1), 10)
	})
})
