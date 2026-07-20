/**
 * The non-destructive edit record + a command-stack model for the light MediaEditor.
 * Pure, framework-agnostic (no Svelte/DOM) — this is the promotable seam's data layer.
 * See docs/kit/components/media-editor-plan.md.
 */
import { clampRect } from './coordinateSystem'

/** The editor's tool tabs. Lives here (a plain, dependency-light TS module), not in
 *  `MediaEditor.svelte` — a type-only import from a `.svelte` file still forces Vite/
 *  vite-plugin-svelte to resolve it as a real module-graph node, pulling `MediaEditor`'s heavy
 *  dependencies (e.g. `piexif-ts`) into any app's build that merely imports something from the
 *  `@kit/ui` barrel, even one that never uses the editor (confirmed live — it broke `apps/notes`'
 *  build this way), despite the import binding itself being fully type-erased. Any future consumer
 *  that needs to reference `Tool` outside `MediaEditor.svelte` must import it from here, never from
 *  the `.svelte` file. */
export type Tool = 'crop' | 'rotate' | 'straighten' | 'redact' | 'metadata'

/** A rectangular redact/blur region, in the SAME normalized (0–1) image space as `crop` — resolution-
 *  and crop-independent, so a redaction stays pinned to the image content it covers regardless of
 *  subsequent crop/rotate choices. */
export interface Redaction {
	x: number
	y: number
	w: number
	h: number
	style: 'blur' | 'pixelate' | 'solid'
}

/** The sparse, user-editable EXIF fields this editor supports — a curated subset of everything
 *  `exifr` can read (see media/mediaMetadata.ts's `ExifSummary`), chosen because they're the fields
 *  a user would plausibly want to correct or redact for privacy (date, location, attribution) as
 *  opposed to camera-generated data (ISO, aperture, lens) that's shown read-only but never edited.
 *
 *  Each field is `T | null | undefined` — THREE distinct states, not two:
 *   - `undefined` (key absent): never touched — falls back to the source's own original EXIF.
 *   - a concrete value: the user's override.
 *   - `null`: explicitly CLEARED — omit this field entirely, even if the original had a value.
 *  Collapsing "cleared" into "absent" (the original, buggy design) made them indistinguishable, so
 *  clearing a field for privacy (e.g. GPS location) silently let the merge in `buildExifForWrite`
 *  fall back to the ORIGINAL value instead of omitting it — the exact thing this tool exists to
 *  prevent (found by expert review). */
export interface MetadataFields {
	dateTimeOriginal?: string | null // ISO 8601
	gpsLatitude?: number | null
	gpsLongitude?: number | null
	artist?: string | null
	copyright?: string | null
	description?: string | null
}

/** The metadata portion of the edit record.
 *  - `strip`: strip ALL EXIF on export — the default, privacy-first behavior (see the build plan).
 *    Baking already only ever produces fresh pixels with no EXIF of its own, so `strip` needs no
 *    special handling at export time; it's `fields`/keeping the original EXIF that requires work
 *    (writing it back into a JPEG via `piexif-ts`, since baking normally produces plain pixels).
 *  - `fields`: sparse OVERRIDES on top of the source's own original EXIF (read via `exifr`) — only
 *    the fields the user actually changed, same "sparse overrides, not a full copy" shape as the
 *    rest of this edit record. */
export interface MetadataEdit {
	strip?: boolean
	fields?: MetadataFields
}

/** The serializable, non-destructive edit record.
 *  - `crop` is in **normalized (0–1) image space** (see media/coordinateSystem.ts) — resolution- and
 *    viewport-independent, so a reopen re-applies correctly at any size.
 *  - `rotate` = coarse rotation in 90° steps (accumulated).
 *  - `straighten` = fine tilt in degrees, clamped to [-45, 45] (absolute, not accumulated).
 *  - `flipHorizontal`/`flipVertical` = mirror toggles, grouped with `rotate` in the same tool tab
 *    (both are coarse, one-shot orientation changes — unlike straighten's continuous tilt). Booleans
 *    rather than a counter: flipping twice is a no-op, so there's no "accumulated" state to track.
 *  - `redactions` = an ordered list of blur/pixelate/solid regions, baked at export time.
 *  - `metadata` = EXIF strip/edit instructions, applied at export time. */
export interface MediaEdit {
	crop?: { x: number; y: number; w: number; h: number }
	rotate?: number
	straighten?: number
	flipHorizontal?: boolean
	flipVertical?: boolean
	redactions?: Redaction[]
	metadata?: MetadataEdit
}

/** A redaction below this normalized size is a degenerate sliver, not a usable region — enforced by
 *  `clampRedactionRect` the same way `clampStraighten` bounds the tilt. */
export const REDACT_MIN_SIZE = 0.02

/** Clamp a redaction rect into normalized [0,1] bounds with a minimum size, reusing the same
 *  reposition-not-just-shrink `clampRect` the crop engine already relies on. */
export function clampRedactionRect(rect: { x: number; y: number; w: number; h: number }): {
	x: number
	y: number
	w: number
	h: number
} {
	const width = Math.max(REDACT_MIN_SIZE, Math.min(1, rect.w))
	const height = Math.max(REDACT_MIN_SIZE, Math.min(1, rect.h))
	const clamped = clampRect(
		{ x: rect.x, y: rect.y, width, height },
		{ x: 0, y: 0, width: 1, height: 1 },
	)
	return { x: clamped.x, y: clamped.y, w: clamped.width, h: clamped.height }
}

/** Straighten clamp — the fine tilt is bounded to ±45° (past that a coarse rotate is the tool). */
export const STRAIGHTEN_LIMIT = 45
export const clampStraighten = (deg: number): number =>
	Math.max(-STRAIGHTEN_LIMIT, Math.min(STRAIGHTEN_LIMIT, deg))

/** A single user action on the edit record. Commands are applied via `applyCommand`,
 *  never mutate the record directly — this keeps every step serializable and
 *  replayable (the basis for the undo/redo `History<T>` below). */
export type EditCommand =
	| { type: 'crop'; rect: { x: number; y: number; w: number; h: number } }
	| { type: 'rotate'; delta: number }
	| { type: 'straighten'; angle: number }
	| { type: 'toggleFlipHorizontal' }
	| { type: 'toggleFlipVertical' }
	| { type: 'addRedaction'; redaction: Redaction }
	| {
			type: 'updateRedaction'
			index: number
			rect: { x: number; y: number; w: number; h: number }
	  }
	| { type: 'setRedactionStyle'; index: number; style: Redaction['style'] }
	| { type: 'removeRedaction'; index: number }
	| { type: 'setMetadataStrip'; strip: boolean }
	// `value: string | number | undefined` rather than an indexed `MetadataFields[keyof MetadataFields]`
	// — that indexed type LOOKS key-correlated but isn't (TS would still accept a number for
	// `dateTimeOriginal`); callers are the concrete per-field UI handlers in MediaEditor.svelte, each
	// already passing the right type for its own key, so the looser type is honest rather than a
	// false safety net.
	| { type: 'setMetadataField'; key: keyof MetadataFields; value: string | number | undefined }

/** Reducer: applies one command to an edit record, returning a NEW record (the input
 *  is never mutated). `crop` replaces the previous crop rect; `rotate` accumulates;
 *  `straighten` sets the absolute (clamped) fine tilt; the redaction commands operate on
 *  `redactions` by index — an out-of-range index is a no-op (returns the SAME reference, so
 *  callers can cheaply detect "nothing changed" the same way `History.undo`/`redo` do at their
 *  own boundaries). */
export function applyCommand(edit: MediaEdit, cmd: EditCommand): MediaEdit {
	switch (cmd.type) {
		case 'crop':
			return { ...edit, crop: { ...cmd.rect } }
		case 'rotate':
			return { ...edit, rotate: (edit.rotate ?? 0) + cmd.delta }
		case 'straighten':
			return { ...edit, straighten: clampStraighten(cmd.angle) }
		case 'toggleFlipHorizontal':
			return { ...edit, flipHorizontal: !edit.flipHorizontal }
		case 'toggleFlipVertical':
			return { ...edit, flipVertical: !edit.flipVertical }
		case 'addRedaction':
			return { ...edit, redactions: [...(edit.redactions ?? []), { ...cmd.redaction }] }
		case 'updateRedaction': {
			const list = edit.redactions ?? []
			if (cmd.index < 0 || cmd.index >= list.length) return edit
			const next = list.slice()
			next[cmd.index] = { ...clampRedactionRect(cmd.rect), style: list[cmd.index].style }
			return { ...edit, redactions: next }
		}
		case 'setRedactionStyle': {
			const list = edit.redactions ?? []
			if (cmd.index < 0 || cmd.index >= list.length) return edit
			const next = list.slice()
			next[cmd.index] = { ...next[cmd.index], style: cmd.style }
			return { ...edit, redactions: next }
		}
		case 'removeRedaction': {
			const list = edit.redactions ?? []
			if (cmd.index < 0 || cmd.index >= list.length) return edit
			return { ...edit, redactions: list.filter((_, i) => i !== cmd.index) }
		}
		case 'setMetadataStrip':
			return { ...edit, metadata: { ...edit.metadata, strip: cmd.strip } }
		case 'setMetadataField': {
			const fields = { ...edit.metadata?.fields }
			// A clear (`undefined`/`''`) stores an explicit `null` TOMBSTONE rather than deleting the
			// key — deleting would make "cleared" indistinguishable from "never touched", and
			// buildExifForWrite's merge would then silently fall back to the ORIGINAL EXIF value for
			// that field instead of omitting it (found by expert review: clearing GPS location for
			// privacy must not resurrect the source's own coordinates).
			if (cmd.value === undefined || cmd.value === '') fields[cmd.key] = null
			// @ts-expect-error — see the EditCommand union's own comment: `value`'s type is
			// deliberately not key-correlated; callers are trusted to pass the right shape per key.
			else fields[cmd.key] = cmd.value
			return { ...edit, metadata: { ...edit.metadata, fields } }
		}
	}
}

/** Auto-fill scale for a straighten tilt: the minimum uniform scale so an image which fills an
 *  `aspect` (= w/h) viewport at scale 1 STILL covers it after rotating by `angleDeg` — i.e. no
 *  transparent corners. `s = cos|θ| + max(aspect, 1/aspect)·sin|θ|`. Pure + unit-tested. */
export function fillScale(angleDeg: number, aspect: number): number {
	const a = (Math.abs(angleDeg) * Math.PI) / 180
	const ar = aspect > 0 ? aspect : 1
	return Math.cos(a) + Math.max(ar, 1 / ar) * Math.sin(a)
}

/** Undo/redo over an immutable list of states + a pointer at the current entry.
 *  `entries[0]` is always the initial state (before any command). Serializable as-is. */
export interface History<T> {
	entries: T[]
	pointer: number
}

export function createHistory<T>(initial: T): History<T> {
	return { entries: [initial], pointer: 0 }
}

/** The state the history currently points at. */
export function current<T>(history: History<T>): T {
	return history.entries[history.pointer]
}

/** Pushes a new current state. If the pointer isn't at the end (the caller undid
 *  first), the abandoned redo branch is discarded — the standard editor convention. */
export function push<T>(history: History<T>, next: T): History<T> {
	const kept = history.entries.slice(0, history.pointer + 1)
	return { entries: [...kept, next], pointer: kept.length }
}

export function canUndo<T>(history: History<T>): boolean {
	return history.pointer > 0
}

export function canRedo<T>(history: History<T>): boolean {
	return history.pointer < history.entries.length - 1
}

/** No-op (returns the same reference) at the boundary, so callers can cheaply check
 *  `result === history` if they need to know whether anything changed. */
export function undo<T>(history: History<T>): History<T> {
	if (!canUndo(history)) return history
	return { ...history, pointer: history.pointer - 1 }
}

export function redo<T>(history: History<T>): History<T> {
	if (!canRedo(history)) return history
	return { ...history, pointer: history.pointer + 1 }
}
