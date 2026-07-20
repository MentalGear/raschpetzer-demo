<script lang="ts">
	/**
	 * Light MediaEditor — runes-native crop + rotate/flip + straighten. Domain-free, in-memory,
	 * non-destructive: never imports `Photo`. The promotable seam — see
	 * docs/kit/components/media-editor-plan.md.
	 *
	 * Crop runs on our own `cropEngine` + `MediaCropStage` (no Cropper.js / no imperative
	 * web-component seam); export bakes at SOURCE resolution via `mediaExport`. The crop rect is
	 * stored normalized (0–1) so a reopen re-applies at any size. Rotate (90° steps), flip
	 * (horizontal/vertical mirror toggles, same tool tab as rotate), and straighten (fine tilt,
	 * ±45°) are all applied as output transforms at bake time, and all are LIVE-previewed in
	 * `MediaCropStage` — rotate+flip reorient the whole crop box as one rigid unit, straighten tilts
	 * the image within a fixed box with a `fillScale` auto-zoom (no transparent corners).
	 */
	import { onMount, onDestroy, tick, untrack } from 'svelte'
	import { cn } from '@kit/ui/shadcn-utils'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import * as Field from '@kit/ui/shadcn-components/ui/field'
	import { Input } from '@kit/ui/shadcn-components/ui/input'
	import { Slider } from '@kit/ui/shadcn-components/ui/slider'
	import { Separator } from '@kit/ui/shadcn-components/ui/separator'
	import * as Select from '@kit/ui/shadcn-components/ui/select'
	import { Checkbox } from '@kit/ui/shadcn-components/ui/checkbox'
	import { Label } from '@kit/ui/shadcn-components/ui/label'
	import CropIcon from '@lucide/svelte/icons/crop'
	import RotateCw from '@lucide/svelte/icons/rotate-cw'
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
	import FlipHorizontal from '@lucide/svelte/icons/flip-horizontal'
	import FlipVertical from '@lucide/svelte/icons/flip-vertical'
	import Ruler from '@lucide/svelte/icons/ruler'
	import EyeOff from '@lucide/svelte/icons/eye-off'
	import Info from '@lucide/svelte/icons/info'
	import Plus from '@lucide/svelte/icons/plus'
	import Trash2 from '@lucide/svelte/icons/trash-2'
	import Undo2 from '@lucide/svelte/icons/undo-2'
	import Redo2 from '@lucide/svelte/icons/redo-2'
	import Check from '@lucide/svelte/icons/check'
	import X from '@lucide/svelte/icons/x'
	import {
		applyCommand,
		createHistory,
		push as pushHistory,
		undo as undoHistory,
		redo as redoHistory,
		canUndo as canUndoHistory,
		canRedo as canRedoHistory,
		STRAIGHTEN_LIMIT,
		clampStraighten,
		type MediaEdit,
		type EditCommand,
		type Redaction,
		type MetadataFields,
		type Tool,
	} from './mediaEdit'
	import { createCropEngine, FULL_CROP } from './cropEngine.svelte'
	import { exportCrop } from './mediaExport'
	import { readExif, type ExifSummary } from './mediaMetadata'
	import MediaCropStage from './MediaCropStage.svelte'
	import MediaRedactLayer from './MediaRedactLayer.svelte'

	interface Props {
		/** BYO image in — never a domain type (no `Photo`). */
		source: Blob | ImageBitmap
		/** Reopen an existing edit (re-applied over `source`). */
		edit?: MediaEdit
		tools?: Tool[]
		/** Baked pixels + the (small, serializable) edit record. */
		onCommit: (result: { blob: Blob; edit: MediaEdit }) => void
		onCancel?: () => void
		class?: string
	}
	let {
		source,
		edit,
		tools = ['crop', 'rotate', 'straighten', 'redact', 'metadata'],
		onCommit,
		onCancel,
		class: className,
	}: Props = $props()

	let overlay = $state<HTMLDivElement>()
	let cancelBtnEl = $state<HTMLButtonElement | null>(null)
	let activeTool = $state<Tool>(untrack(() => tools[0] ?? 'crop'))
	let announcement = $state('')

	// --- edit record + undo/redo (command stack over MediaEdit) ---
	// `edit` is caller-supplied (the "reopen" contract) — clamp `straighten` on ingest, the same as
	// every value the straighten COMMAND path already clamps (clampStraighten), so a hand-crafted or
	// corrupted out-of-range record can't silently bake an unbounded tilt if the user hits Done
	// without ever touching the slider.
	const initialEdit = untrack(() => {
		if (!edit) return {}
		return edit.straighten === undefined
			? edit
			: { ...edit, straighten: clampStraighten(edit.straighten) }
	})
	let history = $state.raw(createHistory<MediaEdit>(initialEdit))
	const currentEdit = $derived(history.entries[history.pointer])
	const canUndo = $derived(canUndoHistory(history))
	const canRedo = $derived(canRedoHistory(history))
	function dispatch(cmd: EditCommand) {
		history = pushHistory(history, applyCommand(currentEdit, cmd))
	}
	function doUndo() {
		if (!canUndo) return
		cancelPendingStraightenCommit()
		history = undoHistory(history)
		announcement = 'Undo'
	}
	function doRedo() {
		if (!canRedo) return
		cancelPendingStraightenCommit()
		history = redoHistory(history)
		announcement = 'Redo'
	}

	// --- crop engine (runes-native — replaces Cropper.js) ---
	const engine = createCropEngine()

	// --- source → display URL + export source (HTMLImageElement or canvas) + natural size ---
	let imageUrl = $state.raw('')
	let exportSource = $state.raw<CanvasImageSource>()
	let revokeUrl: string | undefined

	onMount(() => {
		let cancelled = false
		void (async () => {
			let bitmapUrl: string
			if (source instanceof Blob) {
				bitmapUrl = URL.createObjectURL(source)
			} else {
				// ImageBitmap → canvas → blob URL (needs a `src` for <img>); release the bitmap.
				const c = document.createElement('canvas')
				c.width = source.width
				c.height = source.height
				c.getContext('2d')?.drawImage(source, 0, 0)
				source.close()
				const blob = await new Promise<Blob | null>((r) => c.toBlob(r))
				if (!blob) {
					if (!cancelled) announcement = 'Could not load image'
					return
				}
				bitmapUrl = URL.createObjectURL(blob)
			}
			// unmounted during the (ImageBitmap) await? the onMount cleanup already ran with
			// revokeUrl still undefined, so revoke this URL ourselves and bail (no leak).
			if (cancelled) {
				URL.revokeObjectURL(bitmapUrl)
				return
			}
			revokeUrl = bitmapUrl
			const img = new Image()
			img.onload = () => {
				if (cancelled || !img.naturalWidth) return
				engine.setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
				engine.init(edit?.crop ? toRect(edit.crop) : undefined)
				exportSource = img
				imageUrl = bitmapUrl
			}
			img.src = bitmapUrl
		})()
		return () => {
			cancelled = true
			if (revokeUrl) URL.revokeObjectURL(revokeUrl)
		}
	})

	const toRect = (c: { x: number; y: number; w: number; h: number }) => ({
		x: c.x,
		y: c.y,
		width: c.w,
		height: c.h,
	})

	// Push the record's crop into the engine when it changed for a reason OTHER than a live drag
	// (undo/redo/reopen). setNormalized is idempotent, so this can't loop with onCropInteractionEnd.
	// Must sync EVEN when `crop` is absent (undo unwound past every crop command back to "no crop
	// set") — the original `if (!crop) return` early-out left the engine (and thus the numeric
	// fields + overlay) stuck at the last dragged/typed rect instead of resetting to the full image,
	// so Undo looked broken for crop specifically (bug report: "undo/redo should work across all
	// tools" — reproduced by a cross-tool undo/redo e2e test).
	$effect(() => {
		engine.setNormalized(currentEdit.crop ? toRect(currentEdit.crop) : FULL_CROP)
	})

	// A crop drag/keyboard interaction ended → record the engine's current crop as a command and
	// announce the new size (crop was previously the only silent action on the live region).
	function onCropInteractionEnd() {
		const n = engine.coordinates.normalized
		dispatch({ type: 'crop', rect: { x: n.x, y: n.y, w: n.width, h: n.height } })
		const p = engine.coordinates.pixels
		announcement = `Crop ${Math.round(p.width)} by ${Math.round(p.height)} pixels`
	}

	// --- numeric crop fields (source pixels) — the keyboard-friendly crop path ---
	const px = $derived(engine.coordinates.pixels)
	function applyField(key: 'x' | 'y' | 'w' | 'h', value: number) {
		const size = engine.imageSize
		if (!size.width) return
		const cur = engine.coordinates.pixels
		const next = { x: cur.x, y: cur.y, width: cur.width, height: cur.height }
		if (key === 'x') next.x = value
		else if (key === 'y') next.y = value
		else if (key === 'w') next.width = value
		else next.height = value
		engine.setNormalized({
			x: next.x / size.width,
			y: next.y / size.height,
			width: next.width / size.width,
			height: next.height / size.height,
		})
		onCropInteractionEnd()
	}

	// Tab label is "Rotate & Flip" (not just "Rotate") since this tool tab groups both coarse,
	// one-shot orientation controls together — the internal Tool id stays 'rotate' (unchanged), only
	// the user-facing label + announcement text reflect the wider scope.
	const TOOL_LABEL: Record<Tool, string> = {
		crop: 'Crop',
		rotate: 'Rotate & Flip',
		straighten: 'Straighten',
		redact: 'Redact',
		metadata: 'Metadata',
	}
	function selectTool(tool: Tool) {
		activeTool = tool
		announcement = `${TOOL_LABEL[tool]} tool selected`
	}
	function rotateBy(delta: number) {
		dispatch({ type: 'rotate', delta })
		announcement = `Rotated ${delta > 0 ? 'right' : 'left'}`
	}
	// RAW, UNBOUNDED accumulator (90, 180, 270, 360, 450, ...) — fed to MediaCropStage's CSS
	// transform so a rotate-transition ALWAYS animates a clean ±90° step. Normalizing this to [0,360)
	// before the transform (the original, buggy approach) makes the 4th click's value wrap 270→0 —
	// the browser then animates the literal NUMERIC delta between those two exact values (-270°),
	// spinning the image backward three-quarters of a turn instead of forward by 90° (bug report;
	// MediaCropStage's own `isQuarterTurn`/`rotateDeltaToImageSpace` already normalize internally via
	// modulo, so passing them the raw value changes nothing for their own math).
	const rotationRaw = $derived(currentEdit.rotate ?? 0)
	// normalized to [0, 360) — for the readout only; nobody wants to read "Output rotation: 630°".
	const rotation = $derived((((currentEdit.rotate ?? 0) % 360) + 360) % 360)
	const flipHorizontal = $derived(currentEdit.flipHorizontal ?? false)
	const flipVertical = $derived(currentEdit.flipVertical ?? false)
	function toggleFlipHorizontal() {
		dispatch({ type: 'toggleFlipHorizontal' })
		// read AFTER dispatch — `flipHorizontal` is a $derived, always up to date synchronously
		// (see the redact tool's own `addRedaction` comment for the same Svelte 5 reactivity note).
		// Both branches are full, symmetric clauses (found by expert review: the original "removed"
		// wording was an ungrammatical noun-phrase fragment, breaking the parallel-structure
		// convention every other paired toggle in this file follows, e.g. setMetadataStrip's
		// "will be stripped" / "will be kept").
		announcement = flipHorizontal ? 'Flipped horizontally' : 'Horizontal flip removed'
	}
	function toggleFlipVertical() {
		dispatch({ type: 'toggleFlipVertical' })
		announcement = flipVertical ? 'Flipped vertically' : 'Vertical flip removed'
	}

	// --- redact/blur regions ---
	const REDACT_STYLE_LABEL: Record<Redaction['style'], string> = {
		blur: 'Blur',
		pixelate: 'Pixelate',
		solid: 'Solid',
	}
	const redactions = $derived(currentEdit.redactions ?? [])
	let selectedRedaction = $state<number | null>(null)
	let addRedactionBtnEl = $state<HTMLButtonElement | null>(null)
	function addRedaction() {
		const redaction: Redaction = { x: 0.4, y: 0.4, w: 0.2, h: 0.2, style: 'blur' }
		dispatch({ type: 'addRedaction', redaction })
		// `redactions` is a $derived — Svelte 5 reads are always up to date, so by THIS line it
		// already reflects the just-dispatched add; the new item's index is length-1, not length.
		const index = redactions.length - 1
		selectedRedaction = index
		announcement = 'Added a redaction region'
		// Move focus into the fields the click just revealed, rather than leaving it on "Add region"
		// (a keyboard user would otherwise need an extra Tab to reach the very thing they just added).
		tick().then(() => document.getElementById(`me-redact-${index}-x`)?.focus())
	}
	// Fired by MediaRedactLayer's Konva drag/resize (commit-on-release) AND by the numeric fields
	// below — both funnel through the same command, so either path is fully equivalent (the numeric
	// form is the PRIMARY, keyboard-operable path per docs/kit/components/media-editor-plan.md's a11y
	// note; the canvas drag is a pointer-only enhancement). Announces on every commit, matching the
	// crop tool's own numeric-field path (`onCropInteractionEnd`) — a privacy-relevant resize
	// shouldn't be the one mutating action in this tool that gives no live-region feedback.
	function updateRedactionRect(
		index: number,
		rect: { x: number; y: number; w: number; h: number },
	) {
		dispatch({ type: 'updateRedaction', index, rect })
		const size = engine.imageSize
		const w = Math.round(rect.w * size.width)
		const h = Math.round(rect.h * size.height)
		announcement = `Redaction ${index + 1} resized to ${w} by ${h} pixels`
	}
	function setRedactionStyle(index: number, style: Redaction['style']) {
		dispatch({ type: 'setRedactionStyle', index, style })
		announcement = `Redaction ${index + 1} set to ${REDACT_STYLE_LABEL[style]}`
	}
	function removeRedaction(index: number) {
		dispatch({ type: 'removeRedaction', index })
		if (selectedRedaction === index) selectedRedaction = null
		else if (selectedRedaction !== null && selectedRedaction > index) selectedRedaction -= 1
		announcement = `Removed redaction ${index + 1}`
		// Without this, the just-deleted row's DOM node (and any focus it held) is gone — focus would
		// otherwise fall back to <body>, stranding a keyboard/AT user right after this action.
		// "Add region" always exists, so it's a reliable, always-available landing spot.
		tick().then(() => addRedactionBtnEl?.focus())
	}
	// Numeric fields work in SOURCE pixels (matching the crop tool's own numeric fields) — convert
	// to/from the normalized [0,1] storage space via the source image's natural size.
	function redactionPixelField(index: number, key: 'x' | 'y' | 'w' | 'h', value: number) {
		const size = engine.imageSize
		if (!size.width || !size.height) return
		const r = redactions[index]
		if (!r) return
		const px = {
			x: r.x * size.width,
			y: r.y * size.height,
			w: r.w * size.width,
			h: r.h * size.height,
		}
		px[key] = value
		updateRedactionRect(index, {
			x: px.x / size.width,
			y: px.y / size.height,
			w: px.w / size.width,
			h: px.h / size.height,
		})
	}

	// --- metadata (EXIF read/edit/strip) ---
	// `undefined` = still reading; `null` = read, but no EXIF found (or `source` is an ImageBitmap,
	// which has no embedded bytes at all — see `readExif`'s own doc comment).
	let originalExif = $state<ExifSummary | null | undefined>(undefined)
	// `commit()` awaits this directly (not the reactive `originalExif` above) so an export can never
	// race a still-pending read — without it, clicking Done right after unchecking "Strip" (before
	// `readExif` resolves) could silently export with no metadata at all, the OPPOSITE of what the
	// user just asked for (found by expert review).
	let originalExifPromise: Promise<ExifSummary | null> = Promise.resolve(null)
	onMount(() => {
		let cancelled = false
		originalExifPromise = readExif(source)
		void originalExifPromise.then((result) => {
			if (!cancelled) {
				originalExif = result
				// The "Reading metadata…" → resolved transition was previously only a visual change
				// (static conditional markup, not tied into the live region) — a screen-reader user
				// browsing the Metadata tool while the read is still in flight had no cue when it
				// finished (found by expert review).
				announcement = result ? 'Metadata loaded' : 'No metadata found in this image'
			}
		})
		return () => {
			cancelled = true
		}
	})
	// Checked unless the user EXPLICITLY unchecked it — mirrors `shouldPreserveMetadata`'s own
	// "strip is the default, preserve only on an explicit opt-out" contract (mediaExport.ts).
	const metadataStripChecked = $derived(currentEdit.metadata?.strip !== false)
	const metadataFields = $derived(currentEdit.metadata?.fields ?? {})
	const hasAnyMetadata = $derived(
		!!originalExif || Object.values(metadataFields).some((v) => v !== undefined),
	)
	function setMetadataStrip(strip: boolean) {
		dispatch({ type: 'setMetadataStrip', strip })
		announcement = strip
			? 'Metadata will be stripped on export'
			: 'Metadata will be kept on export'
	}
	// The value shown/edited: the user's own override if present, else the ORIGINAL exif value (a
	// read-only baseline) — the same "sparse override on top of a base" shape as everywhere else in
	// this file (crop/redactions). Committing an empty string CLEARS the override (falls back to the
	// original again), matching `setMetadataField`'s own reducer contract.
	function metadataFieldValue(key: keyof MetadataFields): string {
		const override = metadataFields[key]
		// `null` means explicitly CLEARED — must show empty, not fall back to the original (else the
		// field visually "snaps back" to the value the user just removed, and the empty check in
		// `setMetadataTextField`/etc. below would treat re-blurring an already-empty field as a no-op
		// edit rather than a confusing resurrection).
		if (override === null) return ''
		if (override !== undefined) return String(override)
		const base = originalExif?.[key]
		return base !== undefined ? String(base) : ''
	}
	const METADATA_FIELD_LABEL: Record<keyof MetadataFields, string> = {
		dateTimeOriginal: 'Date taken',
		gpsLatitude: 'Latitude',
		gpsLongitude: 'Longitude',
		artist: 'Artist',
		copyright: 'Copyright',
		description: 'Description',
	}
	// Every other mutating action in this tool announces (see the redact tool's own round-1 fix,
	// which called out exactly this gap for its numeric fields) — these 3 field-commit paths were
	// the last silent ones, found by expert review.
	function announceMetadataField(key: keyof MetadataFields, cleared: boolean) {
		announcement = cleared
			? `${METADATA_FIELD_LABEL[key]} cleared`
			: `${METADATA_FIELD_LABEL[key]} updated`
	}
	function setMetadataTextField(key: keyof MetadataFields, value: string) {
		dispatch({ type: 'setMetadataField', key, value: value === '' ? undefined : value })
		announceMetadataField(key, value === '')
	}
	function setMetadataNumberField(key: keyof MetadataFields, value: string) {
		if (value === '') {
			dispatch({ type: 'setMetadataField', key, value: undefined })
			announceMetadataField(key, true)
			return
		}
		const n = Number(value)
		if (Number.isFinite(n)) {
			dispatch({ type: 'setMetadataField', key, value: n })
			announceMetadataField(key, false)
		}
	}
	// `<input type="datetime-local">` needs LOCAL "YYYY-MM-DDTHH:mm" with no timezone suffix — the
	// inverse of `mediaMetadata.ts`'s own `toExifDateTime` (which targets EXIF's format, not HTML's).
	function toDatetimeLocal(iso: string): string {
		const d = new Date(iso)
		const pad = (n: number) => String(n).padStart(2, '0')
		// includes seconds (the input's `step="1"` exposes a seconds field) — omitting them here
		// would silently truncate any non-zero seconds the original EXIF had every time the field is
		// merely displayed, even before the user makes an edit.
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
	}
	function setMetadataDateField(value: string) {
		if (value === '') {
			dispatch({ type: 'setMetadataField', key: 'dateTimeOriginal', value: undefined })
			announceMetadataField('dateTimeOriginal', true)
			return
		}
		const d = new Date(value) // no 'Z' suffix on a datetime-local value → parsed as local time
		if (!Number.isNaN(d.getTime())) {
			dispatch({ type: 'setMetadataField', key: 'dateTimeOriginal', value: d.toISOString() })
			announceMetadataField('dateTimeOriginal', false)
		}
	}

	// --- straighten (fine tilt) ---
	// `straightenAngle` drives the LIVE preview during a slider drag; a command is recorded only on
	// release (onValueCommit) so one drag = one undo step, not one per pixel of movement. Kept in
	// sync with the record so undo/redo/reopen move the slider too.
	// seeded from the SAME already-clamped `initialEdit` (not `edit` directly) so a corrupted/
	// out-of-range reopened record can't slip through here either.
	let straightenAngle = $state(untrack(() => initialEdit.straighten ?? 0))
	// True from the first live change of a gesture until its commit actually flushes — guards the
	// sync effect below from clobbering an in-flight drag if undo/redo fires mid-gesture (Ctrl+Z is
	// a global window shortcut, reachable even while the slider has focus).
	let straightenDragging = false
	$effect(() => {
		const recorded = currentEdit.straighten ?? 0
		untrack(() => {
			if (!straightenDragging && recorded !== straightenAngle) straightenAngle = recorded
		})
	})
	function onStraightenChange(v: number) {
		straightenAngle = v
		straightenDragging = true
	}
	// bits-ui's Slider fires onValueCommit exactly once per pointer-release gesture, but on EVERY
	// keydown while nudging with arrow keys — so holding a key (OS auto-repeat) would otherwise
	// record one undo-stack entry + one live-region announcement PER repeat tick. Debounce so a
	// burst of keyboard nudges (or a pointer release) yields exactly one commit, matching the "one
	// drag = one undo step" intent this component already delivers for the crop stencil's own
	// keyboard path (see MediaCropStage's keyup-batched onCropChange).
	let pendingStraightenCommit: { timer: ReturnType<typeof setTimeout>; value: number } | null =
		null
	function flushStraightenCommit() {
		if (!pendingStraightenCommit) return
		clearTimeout(pendingStraightenCommit.timer)
		const v = pendingStraightenCommit.value
		pendingStraightenCommit = null
		straightenDragging = false
		dispatch({ type: 'straighten', angle: v })
		announcement = `Straightened ${v >= 0 ? 'right' : 'left'} to ${Math.abs(v).toFixed(1)} degrees`
	}
	// DISCARDS a pending commit (vs. flushStraightenCommit, which records it). Undo/Redo must call
	// this — not flush — before touching `history`: Ctrl+Z is a global window shortcut reachable
	// mid-debounce, and flushing there would `dispatch` the stale pre-undo value on TOP of the
	// just-undone state as a phantom new history entry (found + confirmed by expert review).
	// Also wired to the Undo/Redo BUTTONS' onmousedown (not just their onclick): clicking a button
	// shifts DOM focus away from the slider as part of mousedown's own default action, which fires
	// onStraightenBlur — and onStraightenBlur now FLUSHES a pending commit — strictly BEFORE the
	// click event (and thus doUndo/doRedo) runs. Without this, that flush would race ahead and push
	// the pending nudge as a real history entry, so "Undo" would land one step short of where the
	// test (and the user) expects (round 3 regression, caught by re-running the round-2 e2e guard).
	function cancelPendingStraightenCommit() {
		if (!pendingStraightenCommit) return
		clearTimeout(pendingStraightenCommit.timer)
		pendingStraightenCommit = null
		straightenDragging = false
	}
	function onStraightenCommit(v: number) {
		if (pendingStraightenCommit) clearTimeout(pendingStraightenCommit.timer)
		pendingStraightenCommit = { value: v, timer: setTimeout(flushStraightenCommit, 200) }
	}
	// Safety net wired via onfocusout (NOT onblur — bits-ui's Slider puts DOM focus on a descendant
	// Thumb, not the Root we attach to, and native `blur` doesn't bubble; `focusout` does, so it's
	// the only one of the pair that actually reaches an ancestor listener; expert-review round 3).
	// Two distinct cases, both reachable once focus leaves the slider:
	//  1. A commit is already pending (its 200ms debounce hasn't fired yet) — FLUSH it right away
	//     rather than discarding, matching commit()'s own "flush before Done" guarantee: a keyboard
	//     nudge the user just made is a real, intentional edit and must not be silently dropped.
	//  2. Nothing is pending but a gesture is still marked in-flight — this is the abandoned-drag
	//     case (bits-ui only listens for pointerup/pointerleave, not pointercancel, so an OS-level
	//     interrupt mid-drag never fires onValueCommit). There's no committed value to flush, so
	//     just clear the flag and resync the visible slider back to the last recorded value.
	function onStraightenBlur() {
		if (pendingStraightenCommit) {
			flushStraightenCommit()
			return
		}
		if (!straightenDragging) return
		straightenDragging = false
		straightenAngle = currentEdit.straighten ?? 0
	}
	onDestroy(() => {
		if (pendingStraightenCommit) clearTimeout(pendingStraightenCommit.timer)
	})

	// --- focus mgmt + keys ---
	let prevFocus: HTMLElement | null = null
	onMount(() => {
		prevFocus = document.activeElement as HTMLElement | null
		tick().then(() => cancelBtnEl?.focus())
		return () => prevFocus?.focus?.()
	})
	function trapTab(e: KeyboardEvent) {
		if (e.key !== 'Tab' || !overlay) return
		// `:not(:disabled)` matters: a disabled trailing control (Redo before any edit exists, or a
		// metadata field while "Strip" is checked) can never actually receive focus, so if it were
		// counted as `last` the wraparound check (`activeElement === last`) would never fire — Tab
		// from the true last focusable control would then escape the dialog entirely instead of
		// wrapping to `first` (found by expert review; `:disabled` also catches a disabled
		// `<fieldset>`'s descendants, not just an element's own `disabled` attribute).
		const f = overlay.querySelectorAll<HTMLElement>(
			'button:not([tabindex="-1"]):not(:disabled), input:not([tabindex="-1"]):not(:disabled), [tabindex]:not([tabindex="-1"])',
		)
		if (!f.length) return
		const first = f[0]
		const last = f[f.length - 1]
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault()
			last.focus()
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault()
			first.focus()
		}
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Tab') return trapTab(e)
		if (e.key === 'Escape') {
			e.preventDefault()
			onCancel?.()
			return
		}
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault()
			if (e.shiftKey) doRedo()
			else doUndo()
		}
	}

	// --- Done: bake crop (source pixels) + rotate (output) to a Blob ---
	let baking = $state(false)
	async function commit() {
		if (!exportSource || baking) return
		// A straighten commit may still be debounced (e.g. Done clicked right after nudging the
		// slider) — flush it FIRST so the baked pixels always match what's about to be read.
		flushStraightenCommit()
		const editAtStart = currentEdit
		baking = true
		try {
			// Await the PROMISE, not the reactive `originalExif` snapshot — guarantees the export
			// always uses the final resolved EXIF even if Done is clicked before the read settles.
			const resolvedExif = await originalExifPromise
			const blob = await exportCrop(exportSource, engine.coordinates.pixels, {
				rotation: editAtStart.rotate ?? 0,
				straighten: editAtStart.straighten ?? 0,
				flipX: editAtStart.flipHorizontal ?? false,
				flipY: editAtStart.flipVertical ?? false,
				redactions: editAtStart.redactions,
				metadata: editAtStart.metadata,
				originalExif: resolvedExif,
				format: 'image/png',
			})
			onCommit({ blob, edit: editAtStart })
		} catch {
			announcement = 'Could not export the edited image'
		} finally {
			baking = false
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class={cn('editor-overlay', className)}
	role="dialog"
	aria-modal="true"
	aria-label="Edit photo"
	tabindex="-1"
	bind:this={overlay}
>
	<header class="editor-header">
		<Button
			variant="ghost"
			bind:ref={cancelBtnEl}
			onclick={() => onCancel?.()}
			data-testid="media-editor-cancel"
		>
			<X data-icon="inline-start" /> Cancel
		</Button>
		<div class="title">Edit photo</div>
		<Button onclick={commit} disabled={baking} data-testid="media-editor-done">
			<Check data-icon="inline-start" /> Done
		</Button>
	</header>

	<div class="editor-body">
		<div class="canvas-wrap" data-testid="media-editor-canvas">
			{#if imageUrl}
				<!-- canvas-frame gives the crop engine a smaller measured container than canvas-wrap
				     itself (canvas-wrap's own padding is the breathing room), so the fitted image sits
				     with visible space on every side -- the crop handles' extended hit area (see
				     MediaCropStage's .handle::before) then has room to live in without being flush
				     against the dialog edge, which made them fiddly to grab (bug report). Also keeps
				     MediaRedactLayer's `position:absolute; inset:0` aligned to the SAME box as
				     MediaCropStage's 100%/100% sizing -- an absolutely positioned child's containing
				     block is its nearest positioned ancestor's PADDING box, so putting the padding on
				     canvas-wrap directly (with these two as its immediate children) would have let
				     MediaRedactLayer's canvas overflow past MediaCropStage's smaller image area. -->
				<div class="canvas-frame">
					<MediaCropStage
						src={imageUrl}
						{engine}
						rotation={rotationRaw}
						straighten={straightenAngle}
						{flipHorizontal}
						{flipVertical}
						onCropChange={onCropInteractionEnd}
					/>
					{#if activeTool === 'redact'}
						<MediaRedactLayer
							src={imageUrl}
							imageSize={engine.imageSize}
							{redactions}
							selectedIndex={selectedRedaction}
							onSelect={(i) => (selectedRedaction = i)}
							onCommit={updateRedactionRect}
						/>
					{/if}
				</div>
			{/if}
		</div>

		<aside class="tool-panel" class:baking aria-label="Edit tools">
			<div
				role="toolbar"
				aria-label="Active tool"
				aria-orientation="horizontal"
				class="tool-toggle"
			>
				{#if tools.includes('crop')}
					<Button
						variant={activeTool === 'crop' ? 'default' : 'outline'}
						aria-pressed={activeTool === 'crop'}
						onclick={() => selectTool('crop')}
						class="flex-1 gap-1.5"
					>
						<CropIcon aria-hidden="true" /> Crop
					</Button>
				{/if}
				{#if tools.includes('rotate')}
					<Button
						variant={activeTool === 'rotate' ? 'default' : 'outline'}
						aria-pressed={activeTool === 'rotate'}
						onclick={() => selectTool('rotate')}
						class="flex-1 gap-1.5"
					>
						<RotateCw aria-hidden="true" /> Rotate & Flip
					</Button>
				{/if}
				{#if tools.includes('straighten')}
					<Button
						variant={activeTool === 'straighten' ? 'default' : 'outline'}
						aria-pressed={activeTool === 'straighten'}
						onclick={() => selectTool('straighten')}
						class="flex-1 gap-1.5"
					>
						<Ruler aria-hidden="true" /> Straighten
					</Button>
				{/if}
				{#if tools.includes('redact')}
					<Button
						variant={activeTool === 'redact' ? 'default' : 'outline'}
						aria-pressed={activeTool === 'redact'}
						onclick={() => selectTool('redact')}
						class="flex-1 gap-1.5"
					>
						<EyeOff aria-hidden="true" /> Redact
					</Button>
				{/if}
				{#if tools.includes('metadata')}
					<Button
						variant={activeTool === 'metadata' ? 'default' : 'outline'}
						aria-pressed={activeTool === 'metadata'}
						onclick={() => selectTool('metadata')}
						class="flex-1 gap-1.5"
					>
						<Info aria-hidden="true" /> Metadata
					</Button>
				{/if}
			</div>

			<Separator />

			{#if activeTool === 'crop'}
				<Field.FieldSet>
					<Field.FieldLegend>Crop dimensions (pixels)</Field.FieldLegend>
					<Field.FieldGroup>
						<Field.Field>
							<Field.FieldLabel for="me-crop-x">X</Field.FieldLabel>
							<Input
								id="me-crop-x"
								type="number"
								value={Math.round(px.x)}
								onchange={(e) => applyField('x', +e.currentTarget.value)}
							/>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="me-crop-y">Y</Field.FieldLabel>
							<Input
								id="me-crop-y"
								type="number"
								value={Math.round(px.y)}
								onchange={(e) => applyField('y', +e.currentTarget.value)}
							/>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="me-crop-w">Width</Field.FieldLabel>
							<Input
								id="me-crop-w"
								type="number"
								value={Math.round(px.width)}
								onchange={(e) => applyField('w', +e.currentTarget.value)}
							/>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="me-crop-h">Height</Field.FieldLabel>
							<Input
								id="me-crop-h"
								type="number"
								value={Math.round(px.height)}
								onchange={(e) => applyField('h', +e.currentTarget.value)}
							/>
						</Field.Field>
					</Field.FieldGroup>
				</Field.FieldSet>
			{:else if activeTool === 'rotate'}
				<div class="rotate-controls">
					<div role="group" aria-label="Rotate" class="tool-subgroup">
						<Button
							variant="outline"
							onclick={() => rotateBy(-90)}
							data-testid="rotate-ccw"
						>
							<RotateCcw data-icon="inline-start" /> Rotate −90°
						</Button>
						<Button
							variant="outline"
							onclick={() => rotateBy(90)}
							data-testid="rotate-cw"
						>
							<RotateCw data-icon="inline-start" /> Rotate +90°
						</Button>
						<p class="rotate-readout" data-testid="rotate-readout">
							Output rotation: {rotation}°
						</p>
					</div>
					<Separator />
					<div role="group" aria-label="Flip" class="tool-subgroup">
						<Button
							variant={flipHorizontal ? 'default' : 'outline'}
							aria-pressed={flipHorizontal}
							onclick={toggleFlipHorizontal}
							data-testid="flip-horizontal"
						>
							<FlipHorizontal data-icon="inline-start" /> Flip Horizontal
						</Button>
						<Button
							variant={flipVertical ? 'default' : 'outline'}
							aria-pressed={flipVertical}
							onclick={toggleFlipVertical}
							data-testid="flip-vertical"
						>
							<FlipVertical data-icon="inline-start" /> Flip Vertical
						</Button>
					</div>
				</div>
			{:else if activeTool === 'straighten'}
				<div class="straighten-controls">
					<div class="straighten-readout">
						<label for="me-straighten">Straighten</label>
						<span class="angle" data-testid="straighten-angle"
							>{straightenAngle.toFixed(1)}°</span
						>
					</div>
					<Slider
						id="me-straighten"
						type="single"
						value={straightenAngle}
						min={-STRAIGHTEN_LIMIT}
						max={STRAIGHTEN_LIMIT}
						step={0.5}
						aria-label="Straighten (tilts the photo only — the crop frame stays fixed)"
						aria-valuetext={`${straightenAngle.toFixed(1)} degrees`}
						onValueChange={onStraightenChange}
						onValueCommit={onStraightenCommit}
						onfocusout={onStraightenBlur}
					/>
					<!-- Straighten and Rotate look similar (both spin the image) but behave differently:
					     Rotate reorients image+crop-box together; Straighten tilts ONLY the photo within
					     a FIXED crop box (so the horizon can be levelled without moving the frame). Call
					     that out for sighted users too, not just via the aria-label above. -->
					<p class="straighten-hint">Tilts the photo — the crop frame stays fixed.</p>
				</div>
			{:else if activeTool === 'redact'}
				<div class="redact-controls">
					<Button
						variant="outline"
						bind:ref={addRedactionBtnEl}
						onclick={addRedaction}
						data-testid="redact-add"
					>
						<Plus data-icon="inline-start" /> Add region
					</Button>
					{#if redactions.length === 0}
						<p class="redact-hint">
							No redaction regions yet. Add one to blur, pixelate, or black out part
							of the photo.
						</p>
					{:else}
						<!-- The PRIMARY, keyboard-operable path (a numeric form per selected region) —
						     dragging the region in the canvas is a pointer-only enhancement on the same
						     commands, per docs/kit/components/media-editor-plan.md's a11y note. -->
						<div class="redact-list" role="group" aria-label="Redaction regions">
							{#each redactions as r, i (i)}
								{@const size = engine.imageSize}
								<div class="redact-row">
									<button
										type="button"
										class="redact-row-select"
										aria-pressed={selectedRedaction === i}
										aria-expanded={selectedRedaction === i}
										aria-controls={`redact-detail-${i}`}
										onclick={() =>
											(selectedRedaction =
												selectedRedaction === i ? null : i)}
										data-testid={`redact-select-${i}`}
									>
										Region {i + 1} · {REDACT_STYLE_LABEL[r.style]}
									</button>
									<Button
										variant="ghost"
										size="icon"
										class="redact-delete-btn"
										aria-label={`Delete region ${i + 1}`}
										onclick={() => removeRedaction(i)}
										data-testid={`redact-delete-${i}`}
									>
										<Trash2 />
									</Button>
								</div>
								{#if selectedRedaction === i}
									<div class="redact-detail" id={`redact-detail-${i}`}>
										<Select.Root
											type="single"
											value={r.style}
											onValueChange={(v) =>
												setRedactionStyle(i, v as Redaction['style'])}
										>
											<Select.Trigger
												aria-label={`Style for region ${i + 1}`}
											>
												{REDACT_STYLE_LABEL[r.style]}
											</Select.Trigger>
											<Select.Content>
												<Select.Group>
													<Select.Item value="blur" label="Blur" />
													<Select.Item
														value="pixelate"
														label="Pixelate"
													/>
													<Select.Item value="solid" label="Solid" />
												</Select.Group>
											</Select.Content>
										</Select.Root>
										<Field.FieldSet>
											<Field.FieldLegend
												>Region {i + 1} dimensions (pixels)</Field.FieldLegend
											>
											<Field.FieldGroup>
												<Field.Field>
													<Field.FieldLabel for={`me-redact-${i}-x`}
														>X</Field.FieldLabel
													>
													<Input
														id={`me-redact-${i}-x`}
														type="number"
														value={Math.round(r.x * size.width)}
														onchange={(e) =>
															redactionPixelField(
																i,
																'x',
																+e.currentTarget.value,
															)}
													/>
												</Field.Field>
												<Field.Field>
													<Field.FieldLabel for={`me-redact-${i}-y`}
														>Y</Field.FieldLabel
													>
													<Input
														id={`me-redact-${i}-y`}
														type="number"
														value={Math.round(r.y * size.height)}
														onchange={(e) =>
															redactionPixelField(
																i,
																'y',
																+e.currentTarget.value,
															)}
													/>
												</Field.Field>
												<Field.Field>
													<Field.FieldLabel for={`me-redact-${i}-w`}
														>Width</Field.FieldLabel
													>
													<Input
														id={`me-redact-${i}-w`}
														type="number"
														value={Math.round(r.w * size.width)}
														onchange={(e) =>
															redactionPixelField(
																i,
																'w',
																+e.currentTarget.value,
															)}
													/>
												</Field.Field>
												<Field.Field>
													<Field.FieldLabel for={`me-redact-${i}-h`}
														>Height</Field.FieldLabel
													>
													<Input
														id={`me-redact-${i}-h`}
														type="number"
														value={Math.round(r.h * size.height)}
														onchange={(e) =>
															redactionPixelField(
																i,
																'h',
																+e.currentTarget.value,
															)}
													/>
												</Field.Field>
											</Field.FieldGroup>
										</Field.FieldSet>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTool === 'metadata'}
				<div class="metadata-controls">
					<div class="metadata-strip-row">
						<Checkbox
							id="me-metadata-strip"
							checked={metadataStripChecked}
							onCheckedChange={(v) => setMetadataStrip(v === true)}
						/>
						<Label for="me-metadata-strip">Strip all metadata on export</Label>
					</div>
					<p class="metadata-hint">
						{#if metadataStripChecked}
							No EXIF data (date, location, camera info) will be included in the
							exported photo.
						{:else}
							The fields below are written into the exported photo (JPEG only — the
							only format that can carry EXIF).
						{/if}
					</p>

					{#if originalExif === undefined}
						<p class="metadata-hint">Reading metadata…</p>
					{:else if !hasAnyMetadata}
						<p class="metadata-hint">No metadata found in this image.</p>
					{/if}

					<Field.FieldSet
						disabled={metadataStripChecked || originalExif === undefined}
						class="metadata-fields"
					>
						<Field.FieldLegend>Editable fields</Field.FieldLegend>
						<Field.FieldGroup>
							<Field.Field>
								<Field.FieldLabel for="me-metadata-date"
									>Date taken</Field.FieldLabel
								>
								<Input
									id="me-metadata-date"
									type="datetime-local"
									step="1"
									value={metadataFieldValue('dateTimeOriginal')
										? toDatetimeLocal(metadataFieldValue('dateTimeOriginal'))
										: ''}
									onchange={(e) => setMetadataDateField(e.currentTarget.value)}
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="me-metadata-lat">Latitude</Field.FieldLabel>
								<Input
									id="me-metadata-lat"
									type="number"
									step="any"
									min={-90}
									max={90}
									value={metadataFieldValue('gpsLatitude')}
									onchange={(e) =>
										setMetadataNumberField(
											'gpsLatitude',
											e.currentTarget.value,
										)}
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="me-metadata-lng">Longitude</Field.FieldLabel>
								<Input
									id="me-metadata-lng"
									type="number"
									step="any"
									min={-180}
									max={180}
									value={metadataFieldValue('gpsLongitude')}
									onchange={(e) =>
										setMetadataNumberField(
											'gpsLongitude',
											e.currentTarget.value,
										)}
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="me-metadata-artist">Artist</Field.FieldLabel>
								<Input
									id="me-metadata-artist"
									type="text"
									value={metadataFieldValue('artist')}
									onchange={(e) =>
										setMetadataTextField('artist', e.currentTarget.value)}
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="me-metadata-copyright"
									>Copyright</Field.FieldLabel
								>
								<Input
									id="me-metadata-copyright"
									type="text"
									value={metadataFieldValue('copyright')}
									onchange={(e) =>
										setMetadataTextField('copyright', e.currentTarget.value)}
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="me-metadata-description"
									>Description</Field.FieldLabel
								>
								<Input
									id="me-metadata-description"
									type="text"
									value={metadataFieldValue('description')}
									onchange={(e) =>
										setMetadataTextField('description', e.currentTarget.value)}
								/>
							</Field.Field>
						</Field.FieldGroup>
					</Field.FieldSet>

					{#if originalExif}
						{@const camera = [originalExif.make, originalExif.model]
							.filter(Boolean)
							.join(' ')}
						<div class="metadata-readonly" data-testid="metadata-readonly">
							{#if camera}
								<p>Camera: {camera}</p>
							{/if}
							{#if originalExif.lensModel}
								<p>Lens: {originalExif.lensModel}</p>
							{/if}
							{#if originalExif.iso}
								<p>ISO {originalExif.iso}</p>
							{/if}
							{#if originalExif.fNumber}
								<p>f/{originalExif.fNumber}</p>
							{/if}
							{#if originalExif.focalLength}
								<p>{originalExif.focalLength}mm</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<Separator />

			<div class="history-controls">
				<Button
					variant="ghost"
					size="icon"
					disabled={!canUndo}
					onmousedown={cancelPendingStraightenCommit}
					onclick={doUndo}
					aria-label="Undo"
				>
					<Undo2 />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					disabled={!canRedo}
					onmousedown={cancelPendingStraightenCommit}
					onclick={doRedo}
					aria-label="Redo"
				>
					<Redo2 />
				</Button>
			</div>
		</aside>
	</div>

	<div class="sr-live" role="status" aria-live="polite">{announcement}</div>
</div>

<style>
	.editor-overlay {
		position: fixed;
		inset: 0;
		/* Below 50, NOT above it: shadcn/bits-ui popovers (Select, Tooltip, DropdownMenu, ...)
		 * portal to `document.body` at the shared z-50 convention used across this app (see
		 * Lightbox.svelte's own `.overlay`/`.closing-backdrop`, both z-50) — including the
		 * Redact panel's OWN style Select, opened from right inside this overlay. A portalled
		 * popover becomes a SIBLING of this element under body, not a descendant, so raw
		 * z-index numbers are all that decides paint order there; a bare `60` (this element's
		 * old value) sat ABOVE that shared layer and silently painted over every popover
		 * opened from within the editor — still clickable (hit-testing matched the popover
		 * underneath), just invisible, which read as "the dropdown doesn't open" (bug report:
		 * "blur is not even ui-selectable", 2026-07-18). This overlay only ever needs to sit
		 * above ordinary page content — the viewer it replaces (`{#if editing}` swaps OUT the
		 * Lightbox's own `.overlay`/closing-fly-clip branches, so those never coexist with this one
		 * and this never needs to outrank them — see Lightbox.svelte's `editing` branch). */
		z-index: 40;
		background: var(--background);
		color: var(--foreground);
		display: grid;
		grid-template-rows: auto 1fr;
	}
	.editor-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
	}
	.editor-header .title {
		flex: 1;
		text-align: center;
		font-weight: 600;
	}
	.editor-body {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr auto;
		min-height: 0;
	}
	.canvas-wrap {
		position: relative;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		/* breathing room around the photo (see canvas-frame's own comment at the call site) */
		padding: 2rem;
	}
	.canvas-frame {
		position: relative;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}
	.tool-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem 1rem 1rem;
		background: var(--card);
		border-top: 1px solid var(--border);
		overflow-y: auto;
		/* Explicit (not just the default `visible`): per the CSS Overflow spec, an
		 * `overflow-y` value other than visible/clip forces the COMPUTED overflow-x to
		 * `auto` too if left unset — so any future content that's ever wider than this
		 * fixed-width panel would silently become horizontally scrollable rather than
		 * wrapping/clipping, and a click that auto-scrolls a focused control into view
		 * (e.g. selecting the last tab) would then shift the ENTIRE panel out of view
		 * instead of just that control (bug: the Metadata tab's fields were invisible,
		 * scrolled off to the right — root cause was .tool-toggle overflowing, fixed
		 * there too, but this is a real footgun worth closing off explicitly). */
		overflow-x: hidden;
	}
	.tool-toggle {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		width: 100%;
	}
	/* Each tab button shares its ROW's width equally via flex-basis, not the whole
	 * toggle's — a bare `flex: 1` (used on each Button via its own `flex-1` class)
	 * would otherwise refuse to shrink below its label's natural width once the panel
	 * has more tabs than fit on one line (5 tabs incl. "Rotate & Flip"/"Straighten"
	 * never fit 320px unwrapped), forcing the whole row — and therefore the panel —
	 * to overflow horizontally instead of wrapping. */
	.tool-toggle > :global(*) {
		flex-basis: calc(33% - 0.5rem);
	}
	.rotate-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	/* the Rotate and Flip sub-groups within the "Rotate & Flip" tab — same nested-flex layout as the
	   outer .rotate-controls, distinctly named so the two aren't confused (found by expert review:
	   AT users had no equivalent of the visual Separator distinguishing the two clusters). */
	.tool-subgroup {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.rotate-readout {
		font-size: 0.8rem;
		color: var(--muted-foreground);
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.straighten-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.5rem 0.25rem;
	}
	.straighten-readout {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 0.9rem;
	}
	.straighten-readout .angle {
		font-variant-numeric: tabular-nums;
		color: var(--muted-foreground);
	}
	.straighten-hint {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin: 0;
	}
	.redact-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.redact-hint {
		font-size: 0.8rem;
		color: var(--muted-foreground);
		margin: 0;
	}
	.redact-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.redact-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	/* the generic `.tool-panel :global(button)` rule below only floors button HEIGHT at 44px — the
	   Delete icon-button (36px wide, shadcn's `size="icon"`) needs its own width floor too, the same
	   way `.history-controls :global(button)` already does for Undo/Redo. Scoped to this specific
	   button (not a bare `.redact-row :global(button)`) so it can't also widen `.redact-row-select`,
	   which is a `flex: 1` button in the same row and doesn't need — or want — a fixed min-width. */
	.redact-row :global(.redact-delete-btn) {
		min-width: 44px;
	}
	.redact-row-select {
		flex: 1;
		text-align: left;
		font-size: 0.85rem;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius, 0.5rem);
		border: 1px solid var(--border);
		background: transparent;
		color: inherit;
		min-height: 44px;
	}
	.redact-row-select[aria-pressed='true'] {
		border-color: var(--primary);
		background: color-mix(in oklch, var(--primary) 12%, transparent);
	}
	.redact-detail {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem 0.6rem 0.75rem;
		border-left: 2px solid var(--border);
		margin-left: 0.4rem;
	}
	.metadata-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	/* A `<fieldset>` (Field.FieldSet renders one) has a browser-default intrinsic
	 * `min-width: min-content` that refuses to shrink below its widest descendant's
	 * natural width — in a narrow 320px tool panel, the "Date taken" datetime input's
	 * own natural width is wider than that, so the fieldset (and everything after it)
	 * overflowed the panel to the right instead of wrapping/shrinking (bug: the
	 * Metadata tab's fields were pushed off-screen). */
	:global(.metadata-fields) {
		min-width: 0;
	}
	.metadata-strip-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
	}
	/* the generic `.tool-panel :global(button)` rule below floors height at 44px, but the Checkbox's
	   own `size-4` (16px) class fixes its WIDTH — same category of gap the redact tool's Delete
	   button hit in its own round-1 review (a floor on only one axis leaves an elongated sliver, not
	   a proper touch-target square). min-width wins over the smaller fixed `width` per the CSS spec,
	   so this symmetrically completes it into a real 44×44 target; the small check glyph stays
	   centered via the primitive's own flex layout. */
	.metadata-strip-row :global([data-slot='checkbox']) {
		min-width: 44px;
	}
	.metadata-hint {
		font-size: 0.8rem;
		color: var(--muted-foreground);
		margin: 0;
	}
	.metadata-readonly {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		font-size: 0.8rem;
		color: var(--muted-foreground);
		padding-top: 0.25rem;
		border-top: 1px solid var(--border);
	}
	.metadata-readonly p {
		margin: 0;
	}
	.history-controls {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}
	.tool-panel :global(button),
	.tool-panel :global(input),
	.editor-header :global(button) {
		min-height: 44px;
	}
	.history-controls :global(button) {
		min-width: 44px;
	}
	/* The shadcn Slider's thumb renders as a 12px <span> with an already-enlarged (~28px) invisible
	   hit-area (after:-inset-2) — short of this panel's own 44px touch-target floor above (which only
	   targets button/input, so it never reaches the thumb). Grow the hit-area further; the visible
	   thumb stays the primitive's normal small size. */
	.tool-panel :global([data-slot='slider-thumb'])::after {
		inset: -16px;
	}
	.tool-panel.baking {
		pointer-events: none;
		opacity: 0.6;
	}
	@media (min-width: 768px) {
		.editor-body {
			grid-template-columns: 1fr 320px;
			grid-template-rows: 1fr;
		}
		.tool-panel {
			border-top: none;
			border-left: 1px solid var(--border);
		}
	}
	.sr-live {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
