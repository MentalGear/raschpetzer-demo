<script module lang="ts">
	/** On-screen rect the close animation flies the closing item toward. */
	export type Rect = { left: number; top: number; width: number; height: number }

	/** Per-render context handed to the `slide` snippet for the current item. */
	export interface MediaLightboxSlideContext {
		/** current item index — mirrors the `index` prop, provided so the snippet
		 *  doesn't have to close over it separately */
		index: number
		/** CSS `transform` (pan + zoom) — bind via `style:transform` on the
		 *  slide's `<img>` so pinch/wheel/keyboard zoom-pan actually moves it */
		transform: string
		/** Mirrors the `loading` prop — true while the CURRENT item's real
		 *  content hasn't loaded yet. Apply `class:media-lightbox-loading={ctx.loading}`
		 *  (or equivalent) to the specific `<img>` that should show the
		 *  progressive blur-up treatment. Passed through context, rather than
		 *  applied by the composite itself via a blanket descendant selector,
		 *  because only the `slide` snippet's own implementation knows which
		 *  element is the CURRENT one when its DOM momentarily holds more than
		 *  one `<img>` (e.g. a manual cross-fade keyed on index) — see
		 *  `loading`'s own doc comment in Props for the bug this fixes. */
		loading: boolean
	}
</script>

<script lang="ts" generics="T">
	/**
	 * Generic full-screen media viewer — domain-free and reusable across apps.
	 *
	 * Owns the overlay chrome, the gesture-bearing stage (pinch/wheel/click zoom,
	 * drag-pan, swipe nav, swipe-down-to-dismiss), keyboard map, focus trap +
	 * return-focus, the close-to-origin fly animation, and the a11y live regions.
	 * Per-item visual content is supplied by the consumer via the `slide` snippet
	 * (bring-your-own-media); an optional metadata panel (`info`) and filmstrip/
	 * rail (`filmstrip`) are also consumer-supplied, since both are inherently
	 * domain-shaped (EXIF, thumbnails, …). See docs/kit/components/media-lightbox.md.
	 *
	 * Extracted from the Photos `Lightbox` — see docs/kit/components/lightbox.md for
	 * the pre-extraction history and every gesture/animation edge case this preserves.
	 */
	import { tick, untrack, onDestroy, type Snippet } from 'svelte'
	import { fade } from 'svelte/transition'
	import type { TransitionConfig } from 'svelte/transition'
	import { cn } from '@kit/ui/shadcn-utils'
	import { prefersReducedMotion } from '../reducedMotion.svelte'
	import {
		initWheelNav,
		feedWheel,
		resetWheelNav,
		isHorizontalWheel,
		clamp,
		clampPan as clampPanMath,
		anchoredPan,
		imageContentRect,
		rectContains,
	} from '@kit/core'
	import NavArrow from './NavArrow.svelte'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import Maximize2 from '@lucide/svelte/icons/maximize-2'
	import Minimize2 from '@lucide/svelte/icons/minimize-2'
	import X from '@lucide/svelte/icons/x'
	import Info from '@lucide/svelte/icons/info'

	/**
	 * `.stage`'s 'scale' look — `scale(0.92) → scale(1)` + opacity `0 → 1` over
	 * 240ms, linear — is a single CSS `@keyframes` rule (`media-lightbox-stage-scale-reveal`,
	 * below), NOT a Svelte `in:` transition. That's deliberate, not incidental:
	 * this exact visual is needed from THREE different trigger points, two of
	 * which can't share a `css`-transition callback with the third —
	 *   1. `openAnimation === 'scale'` directly: known synchronously, at mount.
	 *   2. `openAnimation === 'fly'` without a `flyRect` supplied: ALSO known
	 *      synchronously, at mount — there's nothing to even attempt flying
	 *      from, so this is really just 'scale' again under a different prop
	 *      value.
	 *   3. `openAnimation === 'fly'`'s fallback, once a `flyRect()` that WAS
	 *      supplied fails to resolve a usable rect: known only ASYNCHRONOUSLY,
	 *      up to `RECT_TIMEOUT_MS` (500ms) after mount — by which point a
	 *      Svelte `in:` transition (which can only ever fire once,
	 *      synchronously, at the element's creation) has already run and
	 *      decided nothing.
	 * A plain CSS class (`stage-scale-reveal`, `$derived` below) covers all
	 * three: present from the first render for cases 1–2 (a CSS `animation` —
	 * unlike `transition` — plays automatically on element insertion whenever
	 * it's already set, no "before" state needed), added LATER for case 3
	 * (still plays correctly, since that's a genuine absent → present class
	 * change). One `@keyframes` rule, one trigger condition, no second copy of
	 * the numbers to keep in sync by hand — an EARLIER version used a separate
	 * hand-duplicated `@keyframes` block for case 3 that silently drifted to a
	 * different easing than the others; this refactor removes the second copy
	 * entirely instead of just re-fixing the drift. See `stageScaleReveal`
	 * (declared further down, alongside the rest of the open-fly state it
	 * depends on) for the actual `$derived` driving the class. */

	/** Dispatches per the `openAnimation` prop (read fresh each time the intro
	 *  fires, so it's safe as a reactive prop): 'fade' is the only variant still
	 *  driven by a Svelte `in:` transition (no async fallback needed — it never
	 *  participates in the fly-fails-over-to-something-else logic below, so
	 *  there's no second trigger point for it to ever need to agree with).
	 *  'scale' and 'fly' both resolve to 0 duration here — see the
	 *  `stageScaleReveal` comment above for what actually drives 'scale's own
	 *  visual, and `startOpenFly` below for 'fly's (the `.opening-fly` clone,
	 *  or the same `stage-scale-reveal` class if it can't complete). See "Open
	 *  animation" in docs/kit/components/media-lightbox.md. */
	function stageIntro(node: Element): TransitionConfig {
		if (openAnimation === 'fade')
			return fade(node, { duration: reduceMotion ? 0 : STAGE_FADE_MS })
		return { duration: 0 }
	}

	interface Props {
		items: T[]
		index: number
		/** Controls visibility. The component stays mounted so the close animation
		 *  can play (a parent `{#if}` would destroy it before the animation runs);
		 *  internal `{#if open && item && !closing}` unmounts the interactive chrome
		 *  while the close animation, driven by local `closing` state, keeps playing. */
		open?: boolean
		/** Accessible description of the current item — announced via a polite
		 *  live region on every navigate; the consumer computes it (index/total/
		 *  caption are all domain-shaped). */
		alt: string
		/** Visible header title. */
		title?: string
		/** Accessible name for the dialog itself. */
		ariaLabel?: string
		/** restore focus to the previously-focused element on close. Set false when
		 *  the parent manages focus itself. */
		returnFocus?: boolean
		onClose?: () => void
		onIndex?: (i: number) => void
		/** Resolves the on-screen rect of the item's "origin" — a grid tile, a
		 *  thumbnail, wherever it visually lives outside the viewer — used
		 *  BIDIRECTIONALLY by the 'fly' animation: as the rect to fly FROM on open,
		 *  and the rect to fly TO on close. `null`/omitted falls back to a plain
		 *  fade for whichever direction actually needed it. Awaited once per
		 *  open/close (raced against a timeout so a slow/hung caller can't leave
		 *  the animation stuck). Same callback either direction — Photos passes one
		 *  `flyRect` that reveals+measures the grid tile for the current index,
		 *  reused as-is for both — but IS told which direction via `reason`, since a
		 *  caller whose reveal has side effects beyond scrolling (e.g. focusing the
		 *  revealed tile, as Photos' does to return focus to the grid on close)
		 *  needs to suppress that side effect for the 'open' call: `.stage` is
		 *  already focused/focus-trapped by the time 'open' asks for a rect purely
		 *  to compute the fly's starting point, and a caller that focused something
		 *  else there would be stealing focus back out of the just-opened dialog. */
		flyRect?: (reason: 'open' | 'close') => Promise<Rect | null> | Rect | null
		/** Fired once per swipe-down-to-dismiss gesture, the moment the drag axis
		 *  locks vertical (or the trackpad wheel-drawer gesture starts) — well before
		 *  the drag necessarily commits to closing. A consumer whose `flyRect`
		 *  does real work (e.g. scrolling a list to reveal the target) can use this to
		 *  start that work speculatively, so it's already settled by the time the drag
		 *  actually completes instead of only starting then. Not fired for Esc/
		 *  backdrop-click/close-button dismissal (those go straight to `flyRect`
		 *  with nothing to prefetch ahead of). Never fired more than once per gesture,
		 *  even if the drag snaps back and the item stays open. */
		onDismissDragStart?: () => void
		/** True while the consumer's real content for the CURRENT item hasn't
		 *  loaded yet — e.g. a full-res image still fetching behind a blurred
		 *  low-res placeholder. The composite owns the TIMING of the entire
		 *  progressive blur-up treatment when this is used: this flag both
		 *  drives `ctx.loading` (handed to the `slide` snippet — see
		 *  `MediaLightboxSlideContext`, apply it to the current `<img>` via
		 *  `class:media-lightbox-loading`) AND blurs the 'fly' open animation's clone
		 *  unconditionally for its whole flight (the clone only ever shows the
		 *  placeholder anyway — see "always the placeholder on open" in
		 *  media-lightbox.md), something a consumer could never do itself
		 *  since the clone is entirely internal to this component. An earlier
		 *  version had the consumer both OWN and APPLY `class:loading` on its
		 *  own `<img>`, separately coordinated with an `onOpenSettled`
		 *  callback to avoid deblurring mid-animation; the callback is gone
		 *  now because it's no longer needed — the clone being unconditionally
		 *  blurred throughout the fly means the STAGE (always invisible during
		 *  the fly, see `stage-fly-pending`) can safely just reflect `loading`
		 *  directly the instant it's revealed, with no possibility of a
		 *  premature sharp reveal. Reported live, 2026-07-19: "the image
		 *  should deblur only once the lightbox has fully settled, not during
		 *  lightbox animation... blur while they fly in." Default `false`
		 *  (no blur). The composite still can't apply the blur class itself —
		 *  it doesn't own the `slide` snippet's DOM, so it can't tell which
		 *  `<img>` is "current" when the snippet momentarily renders more than
		 *  one (e.g. a manual cross-fade keyed on index, which Photos'
		 *  `Lightbox.svelte` does for ~160ms on every navigate). An earlier
		 *  version of this fix applied the blur via a blanket `.stage
		 *  :global(img)` descendant selector gated on a `stage-loading` class —
		 *  caught by an independent-expert-review panel as a BLOCKER, since it
		 *  blurred BOTH the incoming and outgoing image during that cross-fade,
		 *  including an already-sharp outgoing image with no transition. Piping
		 *  `loading` through `ctx.loading` instead keeps the composite owning
		 *  WHEN to blur/deblur while leaving WHICH element gets the class to
		 *  the only code that actually knows — the `slide` snippet itself. */
		loading?: boolean
		/** Open intro style — shares its 3 options with `closeAnimation` (below),
		 *  though each direction picks its own default. 'scale' (default) is a
		 *  small, quick center scale-in-from-0.92 + fade. 'fly' animates a clone in
		 *  from `flyRect()` (falls back to 'scale' if `flyRect` is omitted or
		 *  resolves nothing). 'fade' skips any scale/fly and fades the stage in at
		 *  full size. See "Open animation" in docs/kit/components/media-lightbox.md. */
		openAnimation?: 'fade' | 'fly' | 'scale'
		/** Close style — same 3 options as `openAnimation`. 'fly' (default)
		 *  attempts `flyRect` and flies the item there, falling back to 'fade' if
		 *  it resolves `null`/times out/is omitted. 'scale' is a center scale-out
		 *  (to 0.92) + fade, in place. 'fade' always fades in place, skipping any
		 *  scale or fly. */
		closeAnimation?: 'fade' | 'fly' | 'scale'
		/** When true (and `overrideContent` is supplied), replaces the ENTIRE viewer
		 *  chrome (header, stage, filmstrip) with `overrideContent` — e.g. a
		 *  full-screen editor. Rendered as its own top-level surface, not nested
		 *  inside the dialog, so its own focus trap/keyboard handling never fights
		 *  the viewer's. The viewer's own keyboard shortcuts no-op while this is on. */
		showOverride?: boolean
		/** Per-item visual content — must render exactly one `<img>` (directly or
		 *  nested) as the visible media: the composite hit-tests, measures, and
		 *  drives pan/zoom transform against it. Bind `style:transform={ctx.transform}`
		 *  on that `<img>`. See `loading` (above) for the composite's own built-in
		 *  progressive blur-up treatment — the composite owns WHEN to blur (via
		 *  `ctx.loading`); apply `class:media-lightbox-loading={ctx.loading}` on that same
		 *  `<img>` to opt in. See docs/kit/components/media-lightbox.md. */
		slide: Snippet<[T, MediaLightboxSlideContext]>
		/** Optional metadata panel, toggled by the info button / `i` key. Omit to
		 *  drop the info affordance entirely. */
		info?: Snippet<[T]>
		/** Optional filmstrip/rail rendered below the stage. */
		filmstrip?: Snippet
		/** Optional extra header buttons/badges (e.g. favorite, edit), rendered
		 *  before the built-in info toggle. */
		headerActions?: Snippet
		/** Content rendered instead of the viewer chrome while `showOverride` is true. */
		overrideContent?: Snippet
		/** Accessible label for the built-in info toggle button (only rendered when
		 *  `info` is supplied). */
		infoLabel?: string
		/** Accessible label for the previous/next nav buttons. */
		prevLabel?: string
		nextLabel?: string
		/** Accessible label for the built-in focus-mode toggle button — see "Focus
		 *  mode" below. `aria-pressed` conveys the current state, same as `infoLabel`'s
		 *  button; one label describes the affordance, not two per-state strings. */
		focusModeLabel?: string
		/** Extra class(es) merged onto the root `.overlay` element via `cn()`. */
		class?: string
	}
	let {
		items,
		index,
		open = false,
		alt,
		title = '',
		ariaLabel = 'Media viewer',
		returnFocus = true,
		onClose,
		onIndex,
		flyRect,
		onDismissDragStart,
		loading = false,
		openAnimation = 'scale',
		closeAnimation = 'fly',
		showOverride = false,
		slide,
		info,
		filmstrip,
		headerActions,
		overrideContent,
		infoLabel = 'Info',
		prevLabel = 'Previous',
		nextLabel = 'Next',
		focusModeLabel = 'Focus mode',
		class: className,
	}: Props = $props()

	// guards against a double-click-to-open immediately zooming the image;
	// reset each time the viewer opens (component is always-mounted)
	let openedAt = Date.now()
	// wall-clock of the last successful navigation — guards a rapid double-click on
	// a boundary nav arrow (the first click unmounts that arrow via `{#if}`, so the
	// second lands on whatever is now underneath).
	let lastNavAt = 0

	let showInfo = $state(false)
	// Focus mode: fades the header/filmstrip/info chrome to let the media fill the
	// screen undistracted. Entered via the header icon or a stage click/tap (see
	// `onStageClick`/`ptrUp`); exited the same way (a toggle, not two separate
	// actions) or via Esc (see `key`'s three-stage Escape).
	let focusMode = $state(false)
	function toggleFocusMode(): void {
		focusMode = !focusMode
	}
	let overlay = $state<HTMLDivElement>()
	let stageEl = $state<HTMLDivElement>()
	let openBackdropEl = $state<HTMLDivElement>()
	const item = $derived(items[index])

	// --- close animation: fly the item back to its origin (Apple-Photos-style) ---
	// Single continuous motion owned entirely here. `closing` unmounts the
	// interactive chrome the instant a close is requested; `closeAnim` (a plain
	// cloned <img>, positioned at the real image's last on-screen rect) takes over
	// the visual, first sitting exactly where the real image was (imperceptible
	// swap), then either tweening to `to` once `flyRect()` resolves it
	// (`closeAnimation === 'fly'`), or fading (± a center scale-out, see the
	// 'scale' handling in the template below) in place otherwise — no rect
	// resolves, `flyRect` is omitted, or it doesn't resolve within
	// `RECT_TIMEOUT_MS`.
	// Shift-held slow-motion: hold Shift while an open/close fly animation
	// STARTS to play it back at `SLOWMO_FACTOR`x its normal duration. Sampled
	// at trigger time (not from whatever event triggered it) because several
	// trigger paths — a backdrop click, a swipe-release, the PARENT's own
	// thumbnail click that flips `open` true for the OPEN fly — have no single
	// event this component could read `.shiftKey` off directly. Tracked
	// instead via a persistent window keydown/keyup pair (see `key` and the
	// `<svelte:window>` tag below), always live regardless of `open` — this
	// component is always-mounted (see the props comment above), so Shift can
	// legitimately already be held by the time `open` flips true. For the OPEN
	// side specifically, "trigger time" means synchronously when `open` flips
	// true — NOT once `startOpenFly`'s async chain gets around to it — because
	// the backdrop reveal (`backdropRevealMs` below) starts in that SAME
	// synchronous tick, independent of whether the fly itself ever resolves.
	const SLOWMO_FACTOR = 5
	let shiftHeld = false
	// Must match the CSS `transition` durations on .closing-backdrop/.closing-fly —
	// the actual applied duration is `activeCloseMs` below (this constant times
	// `SLOWMO_FACTOR` when Shift is held), bound to both elements via inline
	// `style:transition-duration` in the template so it can vary per-invocation.
	// 500ms — first bumped 300 -> 450 ("increase fly in/out time animation
	// time by about 50%"), then rounded up to an even 500 the same day
	// ("make fly in/out an even 500ms"). `OPEN_FLY_MS` (below) is aliased to
	// this constant, so both directions moved together each time.
	const CLOSE_FLY_MS = 500
	let activeCloseMs = $state(CLOSE_FLY_MS)
	const RECT_TIMEOUT_MS = 500
	let closing = $state(false)
	let closeAnim = $state.raw<{ src: string; from: Rect; to: Rect | null } | null>(null)
	let closeAnimIn = $state(false) // flips true once the CSS transition may safely start
	// How dim .closing-backdrop should START, to seamlessly continue whatever
	// dimness the screen was actually showing the instant requestClose fires —
	// the product of `.media-lightbox-open-backdrop`'s own computed opacity (see its own
	// CSS comment) and drawerBackdropOpacity (the drag-fade). Hardcoding
	// either to 1 would pop from whatever the true combined dimness really was
	// straight to fully opaque in one frame — a review panel caught this
	// reading `.overlay`'s own opacity instead, 2026-07-19, right after the
	// backdrop reveal moved off `.overlay` onto its own dedicated child
	// element: `.overlay` itself no longer has any opacity animation of its
	// own to read (that's the whole point of the move), so the OLD read here
	// had silently gone stale, always returning 1 regardless of how far the
	// open reveal had actually progressed — closing mid-reveal (easy to
	// trigger deliberately with Shift slow-motion) would have popped straight
	// to fully dark for one frame, the exact class of bug this whole
	// mechanism exists to prevent.
	let closeBackdropFrom = $state(1)
	let closeTimer: ReturnType<typeof setTimeout> | undefined
	// Double-rAF ids for the FLIP flip (see requestClose) — tracked so a leftover,
	// still-pending chain from a PREVIOUS close cycle can never fire into and
	// corrupt a NEW cycle's state.
	let closeRaf1: number | undefined
	let closeRaf2: number | undefined
	function cancelCloseRaf(): void {
		if (closeRaf1 !== undefined) cancelAnimationFrame(closeRaf1)
		if (closeRaf2 !== undefined) cancelAnimationFrame(closeRaf2)
		closeRaf1 = closeRaf2 = undefined
	}
	// Per-invocation identity for `requestClose`'s async continuations — `closing`
	// alone can't tell "my own cycle was aborted" apart from "a LATER cycle is now
	// active" (see the reopen-reset effect below).
	let closeGen = 0

	// `flyRect` may focus + scroll a caller-owned view to measure the
	// target rect ONCE, up front — if the user then interacts with that view
	// during the ~500ms fly, the target moves out from under the now-stale `to`
	// rect. `.closing-backdrop`'s `pointer-events: auto` blocks the wheel/touch
	// vector; the keyboard vector needs an explicit swallow since a caller's own
	// keydown handler may run in the bubble phase before this component's
	// `<svelte:window onkeydown>` (also bubble phase) gets a chance to guard it.
	// Scoped two ways: by key (only the keys a typical list/grid nav handler would
	// act on) and by focus target (`closeFocusTarget`, captured right after
	// `flyRect` runs its own focus side effect) — Tab legitimately moves
	// focus off that target during a close, and once it has, these keys belong to
	// whatever the user tabbed into, not the original target. (This close-only
	// defense has no OPEN counterpart — see `startOpenFly`'s own comment for why
	// the open-fly doesn't need it: the dialog is already mounted + focus-trapped
	// before it runs, so the grid is never reachable during it.)
	const NAV_KEYS = new Set([
		'ArrowUp',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'Home',
		'End',
		'Enter',
		' ',
	])
	let closeFocusTarget: Element | null = null
	$effect(() => {
		if (!closing) return
		const swallow = (e: KeyboardEvent) => {
			if (!NAV_KEYS.has(e.key)) return
			if (!closeFocusTarget || document.activeElement !== closeFocusTarget) return
			e.preventDefault()
			e.stopPropagation()
		}
		window.addEventListener('keydown', swallow, true)
		return () => {
			window.removeEventListener('keydown', swallow, true)
			closeFocusTarget = null
		}
	})

	async function requestClose(): Promise<void> {
		if (closing) return // already animating out — ignore a second dismiss input
		cancelCloseRaf() // defensive: never let two chains coexist regardless of which branch below returns
		// Measure the current on-screen rect of the item BEFORE anything else changes.
		// getBoundingClientRect() includes any live CSS transform (zoom/pan, or the
		// drawer's dragY translate on .overlay), so this naturally continues from
		// wherever the user left the image.
		const imgs = overlay?.querySelectorAll<HTMLImageElement>('.stage img')
		const img = imgs && imgs[imgs.length - 1]
		const box = img?.naturalWidth
			? imageContentRect(img.naturalWidth, img.naturalHeight, img.getBoundingClientRect())
			: null
		const src = img?.currentSrc || img?.src

		if (reduceMotion || !box || !src) {
			onClose?.() // instant close — parent unmounts us via `open`, no animation
			return
		}

		const from: Rect = { left: box.x0, top: box.y0, width: box.cw, height: box.ch }
		// A legitimate computed opacity of exactly 0 is falsy — `|| 1` would
		// silently reproduce the "pop to fully opaque" bug this capture exists to
		// prevent, so check for NaN explicitly instead. Reads `openBackdropEl`
		// (`.media-lightbox-open-backdrop`), NOT `overlay` — `.overlay` itself carries no
		// opacity animation of its own (see `closeBackdropFrom`'s own comment
		// above for why an earlier version reading `overlay` here had gone
		// stale after the backdrop reveal moved onto its own element).
		const backdropOpacity = openBackdropEl
			? Number(getComputedStyle(openBackdropEl).opacity)
			: NaN
		closeBackdropFrom =
			(Number.isNaN(backdropOpacity) ? 1 : backdropOpacity) * drawerBackdropOpacity
		const myGen = ++closeGen
		// Snapshot BEFORE `closing` flips true: `.closing-backdrop` mounts on the
		// very next render and its own opacity fade needs this duration from its
		// first frame, not just once the fly clone's `to` rect later resolves.
		activeCloseMs = shiftHeld ? CLOSE_FLY_MS * SLOWMO_FACTOR : CLOSE_FLY_MS
		closing = true
		// Render the clone immediately at `from` (same src, same rect as the real
		// image it replaces) so there's no gap between the interactive chrome
		// unmounting and the clone appearing — only its eventual tween to `to` is visible.
		closeAnim = { src, from, to: null }
		onClose?.() // let the parent update route/history state; independent of the animation

		// Let Svelte actually remove `.overlay` (role="dialog" aria-modal="true")
		// from the DOM before doing anything that could move focus.
		await tick()
		// `myGen !== closeGen` (not `!closing`): this cycle may have been ABORTED
		// and a NEWER cycle already started.
		if (myGen !== closeGen) return

		let to: Rect | null = null
		if (closeAnimation === 'fly' && flyRect) {
			try {
				const rectPromise = flyRect('close')
				// Capture whatever `flyRect`'s synchronous focus side effect
				// just focused, so the keydown swallow above can scope itself to
				// exactly that element instead of the whole page.
				closeFocusTarget = document.activeElement
				let raceTimeout: ReturnType<typeof setTimeout> | undefined
				const r = await Promise.race([
					Promise.resolve(rectPromise),
					new Promise<null>((resolve) => {
						raceTimeout = setTimeout(() => resolve(null), RECT_TIMEOUT_MS)
					}),
				])
				clearTimeout(raceTimeout) // no-op if the timeout branch itself won
				if (r) to = { left: r.left, top: r.top, width: r.width, height: r.height }
			} catch {
				to = null
			}
		}
		// closeAnimation !== 'fly' (or `flyRect` omitted, or it resolved nothing)
		// skips the rect entirely — `to` stays null, so the in-place fade/scale-out
		// path below (template) runs instead.
		if (myGen !== closeGen) return // this cycle was aborted while awaiting flyRect

		closeAnim = { src, from, to }
		// Double rAF: a single rAF still fires before the browser paints the
		// just-flushed "from" state, so flipping `closeAnimIn` there would let the
		// browser coalesce both writes into one paint — no "before" frame for the
		// CSS transition to animate from. The first rAF lets that paint happen; the
		// second flips the transform/opacity.
		closeRaf1 = requestAnimationFrame(() => {
			closeRaf2 = requestAnimationFrame(() => {
				closeRaf1 = closeRaf2 = undefined
				if (myGen !== closeGen) return
				closeAnimIn = true
				clearTimeout(closeTimer)
				closeTimer = setTimeout(() => {
					closing = false
					closeAnim = null
					closeAnimIn = false
				}, activeCloseMs)
			})
		})
	}

	const reduceMotion = $derived(prefersReducedMotion())

	// --- open animation: fly a clone in from its origin (mirrors the close-fly
	// above, but simpler — see the template comment above `.opening-fly` for why
	// no close-style keydown-swallow/focus-target defense is needed here: the
	// interactive `.stage` is already mounted + focus-trapped by the time this
	// runs, so there's nothing reachable behind it to guard against). ---
	// Same duration as `CLOSE_FLY_MS` — aliased, not a separately-tracked
	// literal, so the two can never drift apart again. Reported live,
	// 2026-07-19: "make the opening anim as quick as the closing." Reverses an
	// EARLIER decision the opposite direction: originally 300ms (matching
	// close), bumped to 420 then 550 after two live reports the SAME day that
	// opening read as too quick/rushed compared to closing ("opening animation
	// is too quick... not as smooth as Apple Photos or even our own close fly
	// out", then "open lightbox fly in doesn't feel quite right... make the
	// animation longer") — at equal duration, opening (small → large) DOES
	// read as faster than closing (large → small) to the eye, and the
	// invisible pre-animation setup (waiting for the placeholder to decode +
	// `flyRect()` to resolve — see `stageFlyPending`) further eats into the
	// perceived total before any visible motion starts. Both of those are
	// still true; this is a deliberate product tradeoff (symmetry over
	// per-direction perceptual tuning), not a discovery that the earlier
	// reasoning was wrong. Must match `.opening-fly`'s own CSS `transition`
	// duration below.
	const OPEN_FLY_MS = CLOSE_FLY_MS
	// The actual applied duration is `activeOpenMs` (this constant times
	// `SLOWMO_FACTOR` when Shift is held — see that constant's own comment
	// above), bound to `.opening-fly` via inline `style:transition-duration`
	// in the template so it can vary per-invocation.
	let activeOpenMs = $state(OPEN_FLY_MS)
	// The `loading`-prop deblur (sharpen) transition — see `.stage :global(img.media-lightbox-loading)`'s
	// own CSS comment for the blur radius. Aliased to `OPEN_FLY_MS` (the open-fly
	// CLONE's own duration, `.opening-fly`), not a separately-tracked literal —
	// reported live, 2026-07-19: "change it to the same time (actually var) as
	// the cloned fly-over image," after an earlier round had already bumped it
	// to 400ms (from an original 300ms, "maybe make it slightly longer") as its
	// own independent number. Aliasing means a future change to `OPEN_FLY_MS`
	// (or the `CLOSE_FLY_MS` it's itself aliased to) moves this too, instead of
	// three related durations needing to be kept in sync by hand. Included in
	// the same Shift-held slow-motion as the open/close fly (`deblurMs` below,
	// `SLOWMO_FACTOR`x when Shift is held) — bound as a CSS custom property
	// (`--media-lightbox-deblur-ms`) on `.stage` rather than inline on the
	// consumer's own `<img>`, since this component doesn't own that element's
	// markup (it's rendered via the `slide` snippet) the way it owns
	// `.closing-backdrop`/`.opening-fly`, which get their durations via a
	// direct `style:transition-duration` binding instead.
	const DEBLUR_MS = OPEN_FLY_MS
	let deblurMs = $state(DEBLUR_MS)
	// `loading`'s raw prop can flip true → false almost instantly for an
	// already-cached/fast-resolving image — live-traced via a MutationObserver
	// on a filmstrip navigate, as little as ~12-25ms in Photos' own demo
	// dataset — far too fast for the deblur transition below to ever be
	// visually perceptible; the blur pops on and back off before a human eye
	// registers it, reading as "there's no deblur happening" even though the
	// transition itself is wired correctly. `heldLoading` mirrors `loading`
	// but holds it true for AT LEAST `MIN_LOADING_HOLD_MS` from the moment it
	// first became true — reported live, 2026-07-19: "can't we wait for it?"
	// Aliased to `DEBLUR_MS` (not a separately-tracked number) so the hold and
	// the fade can't drift apart: the worst case (an instantly-resolved image)
	// shows `MIN_LOADING_HOLD_MS` of genuinely visible blur followed by the
	// full `DEBLUR_MS` fade; a real load slower than the hold already exceeds
	// it on its own, so nothing is artificially delayed beyond what that load
	// already took. `ctx.loading` (handed to the `slide` snippet, below) and
	// this file's own `deblurMs` effect both key off `heldLoading`, not the
	// raw prop, so the whole blur/deblur sequence — not just the transition
	// duration — respects the hold.
	const MIN_LOADING_HOLD_MS = DEBLUR_MS
	// Seeded `false` (matching the `loading` prop's own default), not a direct
	// read of `loading` — the `$effect` below re-syncs it immediately on mount
	// regardless, and seeding from the live prop only captures its value once
	// (Svelte's own `state_referenced_locally` warning).
	let heldLoading = $state(false)
	let loadingBecameTrueAt = 0
	$effect(() => {
		if (loading) {
			loadingBecameTrueAt = performance.now()
			heldLoading = true
			return
		}
		const remaining = MIN_LOADING_HOLD_MS - (performance.now() - loadingBecameTrueAt)
		if (remaining <= 0) {
			heldLoading = false
			return
		}
		const holdTimer = setTimeout(() => {
			heldLoading = false
		}, remaining)
		return () => clearTimeout(holdTimer)
	})
	// Sampled the moment `heldLoading` actually settles false (not continuously
	// reactive to `shiftHeld` afterward) — mirrors `activeOpenMs`/`activeCloseMs`'s
	// own "sample once, at the transition's start" philosophy, so holding/releasing
	// Shift mid-sharpen doesn't retroactively change a transition already in flight.
	$effect(() => {
		if (heldLoading) return
		deblurMs = untrack(() => shiftHeld) ? DEBLUR_MS * SLOWMO_FACTOR : DEBLUR_MS
	})
	let openAnim = $state.raw<{ src: string; from: Rect; to: Rect } | null>(null)
	let openAnimIn = $state(false)
	// 'fade' `openAnimation`'s own Svelte `in:` duration (`stageIntro`, below) and
	// the 'scale' reveal's CSS `@keyframes` duration (`.stage.stage-scale-reveal`,
	// see that rule's own comment) — named here so `chromeReady`'s own timers
	// (below) can reference them instead of a second copy of the numbers.
	// `STAGE_SCALE_MS` must match the `animation: media-lightbox-stage-scale-reveal 240ms`
	// declaration in the stylesheet (a plain CSS `animation`, not JS-driven, so
	// there's no single binding to share the way `activeOpenMs` does).
	const STAGE_FADE_MS = 200
	const STAGE_SCALE_MS = 240
	// True once the OPEN animation has genuinely settled — the fly clone has
	// landed (or its fallback's scale-reveal keyframe has finished), the
	// direct 'scale' reveal's keyframe has finished, or the 'fade' intro has
	// finished. Gates the floating chrome's (header/filmstrip) own fade-in via
	// `chrome-pending` below, so it appears AFTER the item's own open
	// animation completes rather than popping in simultaneously with it.
	// Reported live, 2026-07-19: "only fade in the lightbox controls once the
	// animation is completed." Deliberately does NOT also gate the nav
	// arrows — those are already invisible by default (NavArrow's own
	// hover-reveal, see `:global(.media-lightbox-nav)`'s CSS) and, for the 'fly' case
	// specifically, already fully covered by `.stage.stage-fly-pending`'s own
	// `opacity: 0` (nav arrows are children of `.stage`); only a narrow
	// residual gap remains — a cursor already resting over where an arrow
	// would render, during a NON-fly open's 200-240ms reveal window — judged
	// not worth the CSS-specificity fight needed to override NavArrow's own
	// `:hover` rule for that edge case.
	let chromeReady = $state(false)
	let chromeReadyTimer: ReturnType<typeof setTimeout> | undefined
	// `.stage` starts invisible (class `stage-fly-pending`) the instant a fly is
	// actually attempted (`flyRect` supplied, not reduced-motion — `stageIntro`
	// above already routes every OTHER case to 0 duration, so these two only
	// matter for a genuine in-flight attempt). Whichever way the attempt
	// resolves, `stageFlyPending` clears: on success, only once `openTimer`
	// fires at the END of the clone's flight (NOT the instant `openAnim` is
	// set) — revealing the real, full-size stage any earlier showed the
	// destination fully in place from the fly's first frame, with only a small
	// clone (same src) animating on top of a portion of it, defeating the
	// whole illusion (reported live, 2026-07-19: "lightbox shows before fly in
	// completes"); on failure alongside `stageFallbackReveal` — a fly that
	// CAN'T complete should still animate in somehow, not just pop in with
	// nothing, so it borrows the exact same `stage-scale-reveal` class
	// `openAnimation === 'scale'` uses directly (see `stageScaleReveal` below
	// and `stageIntro`'s own comment above for why this HAS to be a plain CSS
	// class rather than a second `in:` transition).
	let stageFlyPending = $state(false)
	let stageFallbackReveal = $state(false)
	// `openAnimation === 'fly'` WITHOUT a `flyRect` is its own synchronous
	// fallback to this same reveal (known at render time, no need to wait for
	// anything) — distinct from `stageFallbackReveal` above, which is the
	// ASYNC fallback for when `flyRect` IS supplied but fails. Both end up at
	// the identical `stage-scale-reveal` class either way. `!reduceMotion`
	// gates the whole thing: under reduced motion `.stage` always just
	// appears, no class, no animation, regardless of which case above applies.
	const stageScaleReveal = $derived(
		!reduceMotion &&
			(openAnimation === 'scale' ||
				(openAnimation === 'fly' && !flyRect) ||
				stageFallbackReveal),
	)
	// Backdrop reveal duration — see `.media-lightbox-open-backdrop`'s own CSS comment
	// for the element this drives. A GENUINE `'fly'` attempt (the same
	// synchronous condition `stageScaleReveal` above uses to detect the
	// non-fly/fallback cases) syncs this to `activeOpenMs` — the same
	// duration the fly clone and its motion use — so the backdrop dims in at
	// the same pace as the image lands, mirroring how `.closing-backdrop`
	// always shares ONE duration (`activeCloseMs`) with its own clone, in
	// every `closeAnimation` mode. The other two modes ('scale'/'fade', and
	// 'fly' 's own synchronous no-`flyRect` fallback) use the original 200ms
	// — already close enough to their own stage intro (200-240ms) that
	// re-syncing them wasn't reported as an issue, and stretching them out to
	// `activeOpenMs` would just trade one mismatch for another (a
	// fully-landed 'scale' stage under a still-fading backdrop).
	const backdropRevealMs = $derived(
		reduceMotion ? 0 : openAnimation === 'fly' && flyRect ? activeOpenMs : 200,
	)
	// `.media-lightbox-open-backdrop`'s own reveal state — see that element's CSS comment
	// for why this exists as a SEPARATE, dedicated element/mechanism (a
	// JS-driven CSS `transition` + double-rAF paint-flush, exactly like
	// `.closing-backdrop`) rather than the `.overlay`-level Svelte `in:fade`
	// this replaces. Driven entirely from the open effect below, independent
	// of whether `startOpenFly` ever resolves — the screen should start
	// dimming the instant the viewer opens, not wait on a `flyRect()`/image
	// round-trip that has nothing to do with how dark the screen should be.
	let backdropIn = $state(false)
	let backdropRaf1: number | undefined
	let backdropRaf2: number | undefined
	function cancelBackdropRaf(): void {
		if (backdropRaf1 !== undefined) cancelAnimationFrame(backdropRaf1)
		if (backdropRaf2 !== undefined) cancelAnimationFrame(backdropRaf2)
		backdropRaf1 = backdropRaf2 = undefined
	}
	let openGen = 0
	let openRaf1: number | undefined
	let openRaf2: number | undefined
	function cancelOpenRaf(): void {
		if (openRaf1 !== undefined) cancelAnimationFrame(openRaf1)
		if (openRaf2 !== undefined) cancelAnimationFrame(openRaf2)
		openRaf1 = openRaf2 = undefined
	}
	let openTimer: ReturnType<typeof setTimeout> | undefined

	// The stage's <img> may not have decoded dimensions on the very first frame
	// after mount. A handful of rAF ticks is enough for the small placeholder the
	// fly always starts from (see "always the placeholder on open" in
	// media-lightbox.md) — if it still isn't ready, give up rather than hang.
	async function waitForImageReady(img: HTMLImageElement): Promise<boolean> {
		for (let i = 0; i < 10; i++) {
			if (img.naturalWidth) return true
			await new Promise(requestAnimationFrame)
		}
		return false
	}

	/** Runs the 'fly' open animation: clones the stage's own (placeholder) image
	 *  at `flyRect()`'s rect — the origin, e.g. a grid tile — and animates it to
	 *  the real image's own live rect, then removes the clone. If `flyRect`
	 *  resolves nothing, times out, or the image never becomes ready, falls back
	 *  to the SAME `stage-scale-reveal` scale-in `openAnimation === 'scale'` uses
	 *  directly (see the state comment above) rather than leaving `.stage`
	 *  invisible or popping it in unanimated. Only
	 *  called when `flyRect` is supplied and not reduced-motion (see
	 *  `stageIntro`) — those cases never make `.stage` pending in the first
	 *  place, so there's nothing to reveal here. */
	async function startOpenFly(): Promise<void> {
		if (!flyRect || reduceMotion) return
		cancelOpenRaf()
		clearTimeout(openTimer)
		const myGen = ++openGen
		stageFlyPending = true
		stageFallbackReveal = false
		const fallback = () => {
			if (myGen !== openGen) return
			stageFlyPending = false
			stageFallbackReveal = true
			// The fallback plays the SAME `stage-scale-reveal` keyframe as a direct
			// 'scale' open (see `stageScaleReveal`) — `chromeReady` waits out that
			// same `STAGE_SCALE_MS` before the chrome fades in, just like the
			// direct-'scale' branch in the open effect below.
			clearTimeout(chromeReadyTimer)
			chromeReadyTimer = setTimeout(() => {
				if (myGen !== openGen) return
				chromeReady = true
			}, STAGE_SCALE_MS)
		}
		await tick() // let .stage + its <img> actually mount
		if (myGen !== openGen || !open) return
		const img = overlay?.querySelector<HTMLImageElement>('.stage img')
		if (!img || !(await waitForImageReady(img))) return fallback()
		if (myGen !== openGen || !open) return

		const src = img.currentSrc || img.src
		let from: Rect | null = null
		try {
			let raceTimeout: ReturnType<typeof setTimeout> | undefined
			const r = await Promise.race([
				Promise.resolve(flyRect('open')),
				new Promise<null>((resolve) => {
					raceTimeout = setTimeout(() => resolve(null), RECT_TIMEOUT_MS)
				}),
			])
			clearTimeout(raceTimeout) // no-op if the timeout branch itself won
			if (r) from = { left: r.left, top: r.top, width: r.width, height: r.height }
		} catch {
			from = null
		}
		if (myGen !== openGen || !open) return
		if (!from) return fallback()

		const box = imageContentRect(
			img.naturalWidth,
			img.naturalHeight,
			img.getBoundingClientRect(),
		)
		const to: Rect = { left: box.x0, top: box.y0, width: box.cw, height: box.ch }
		// `activeOpenMs` is already set (synchronously, at trigger time — see the
		// open effect above) by the time this runs.
		openAnim = { src, from, to }
		// `.stage` STAYS pending (invisible) through the whole flight, not just
		// until the clone appears — revealing it here (as an earlier version did)
		// meant the real, full-size stage was already fully visible from the
		// FIRST frame of the fly, with only a small clone (same src) animating on
		// top of a portion of it: the "lightbox" was showing before the fly-in
		// actually completed, defeating the whole illusion. Reported live,
		// 2026-07-19: "lightbox shows before fly in completes." Cleared instead
		// alongside `openAnim = null` below, once the clone has actually reached
		// `to` and is about to be removed — a clean handoff, since the real
		// stage's own layout at that exact moment is identical to where the
		// clone just landed.
		// Double rAF — same paint-flush gotcha as the close-fly above: a single
		// rAF still fires before the browser paints the just-flushed `from` state.
		openRaf1 = requestAnimationFrame(() => {
			openRaf2 = requestAnimationFrame(() => {
				openRaf1 = openRaf2 = undefined
				if (myGen !== openGen) return
				openAnimIn = true
				clearTimeout(openTimer)
				openTimer = setTimeout(() => {
					if (myGen !== openGen) return
					openAnim = null
					openAnimIn = false
					stageFlyPending = false
					chromeReady = true
				}, activeOpenMs)
			})
		})
	}

	// Focus management: capture the previously-focused element when the viewer
	// opens, focus the close button, and restore on close. Using $effect (keyed on
	// `open`) instead of onMount lets this work correctly for an always-mounted
	// component where the parent passes open=true/false instead of mounting/
	// unmounting.
	let prevFocus: HTMLElement | null = null
	$effect(() => {
		if (!open) return
		// A reopen (e.g. the parent's `open` flips true again via native browser
		// Back/Forward navigation, which nothing in `requestClose` can intercept)
		// while a previous close animation was still mid-flight must not leave its
		// stale `closing`/`closeAnim` state blocking the freshly-reopened
		// interactive chrome for however long was left on that old timer. Read
		// `closing` UNTRACKED: this effect must react only to `open` transitioning
		// true, never to `closing` itself — `open` stays true for the ENTIRE close
		// animation, so a tracked read here would re-fire this effect the instant
		// `requestClose` sets `closing = true` and immediately reset it back to
		// `false`, cancelling every close animation before it could ever play.
		untrack(() => {
			if (closing) {
				closeGen++ // invalidate this aborted cycle's async continuations
				clearTimeout(closeTimer)
				cancelCloseRaf()
				closing = false
				closeAnim = null
				closeAnimIn = false
			}
		})
		openedAt = Date.now()
		// Snapshot HERE, synchronously, before `.overlay` even renders below — not
		// inside `startOpenFly` (as it used to be) — because the backdrop reveal
		// (see `backdropRevealMs`) needs this value at MOUNT time, which happens
		// synchronously in this same effect, well before `startOpenFly`'s
		// `await`-heavy chain would otherwise get around to setting it.
		// `shiftHeld` itself can't change between here and there in any way that
		// would matter in practice.
		activeOpenMs = shiftHeld ? OPEN_FLY_MS * SLOWMO_FACTOR : OPEN_FLY_MS
		// Start the backdrop reveal (`.media-lightbox-open-backdrop`, see its own CSS
		// comment) — entirely SELF-CONTAINED here, not gated on `startOpenFly`
		// resolving: the screen should start dimming the instant the viewer
		// opens, regardless of whether the fly clone itself ever lands. Double
		// rAF, same paint-flush gotcha as `requestClose`/`startOpenFly` below —
		// a single rAF still fires before the browser paints the just-flushed
		// "from" (opacity 0) state.
		backdropIn = false
		cancelBackdropRaf()
		if (reduceMotion) {
			backdropIn = true
		} else {
			backdropRaf1 = requestAnimationFrame(() => {
				backdropRaf2 = requestAnimationFrame(() => {
					backdropRaf1 = backdropRaf2 = undefined
					backdropIn = true
				})
			})
		}
		// Chrome fade-in gate — see `chromeReady`'s own doc comment above for the
		// full design. Reset here (fresh per open); `openAnimation === 'fly' &&
		// flyRect` is the one case NOT resolved here — `startOpenFly()` (called
		// below) owns setting `chromeReady` itself for that case, once the fly
		// genuinely lands (or its fallback's own scale-reveal finishes). Every
		// OTHER case (direct 'scale', 'fade', and 'fly' without a `flyRect` —
		// itself a synchronous fallback to the same scale-reveal, see
		// `stageScaleReveal`) is fully synchronous/timer-driven, so it's handled
		// right here instead.
		chromeReady = false
		clearTimeout(chromeReadyTimer)
		if (reduceMotion) {
			chromeReady = true
		} else if (openAnimation !== 'fly' || !flyRect) {
			chromeReadyTimer = setTimeout(
				() => {
					chromeReady = true
				},
				openAnimation === 'fade' ? STAGE_FADE_MS : STAGE_SCALE_MS,
			)
		}
		prevFocus = document.activeElement as HTMLElement | null
		// Focus the dialog CONTAINER (`.overlay`, already `tabindex="-1"`), not the
		// close button — autofocusing an actionable button meant Space (not an
		// actual lightbox shortcut — Escape is) natively activated it via the
		// browser's own default action, closing the viewer as an accidental side
		// effect of arrow-key browsing (which never moves DOM focus away, since
		// it's handled by the window-level `key()` listener below, not by
		// focusing anything). Reported live, 2026-07-19: opening with Space, then
		// arrow-navigating, then pressing Space again closed AND immediately
		// reopened the viewer (repeatedly) — the accidental close returned focus
		// to the originating grid tile, whose own Space-activates-the-focused-
		// item handler reopened it. A neutral focus target removes the trigger
		// entirely; Tab still reaches the close/nav/info buttons normally.
		tick().then(() => overlay?.focus())
		if (openAnimation === 'fly') startOpenFly()
		return () => {
			// Invalidate any still-in-flight open-fly so its async continuations
			// (or a pending double-rAF) can't land after the viewer has closed.
			openGen++
			cancelOpenRaf()
			clearTimeout(openTimer)
			cancelBackdropRaf()
			backdropIn = false
			openAnim = null
			openAnimIn = false
			stageFlyPending = false
			stageFallbackReveal = false
			clearTimeout(chromeReadyTimer)
			chromeReady = false
			clearTimeout(cursorIdleTimer)
			cursorIdle = false
			clearTimeout(keyboardPanTimer)
			keyboardPanning = false
			if (returnFocus) prevFocus?.focus?.()
		}
	})

	function go(delta: number): void {
		// Don't navigate once the overlay is closing: it stays mounted +
		// gesture-interactive through the ~500ms out-transition while `open` is
		// already false, so a swipe/wheel landing in that window could otherwise
		// change the parent's index mid-close.
		if (!open) return
		const next = index + delta
		if (next >= 0 && next < items.length) {
			onIndex?.(next)
			lastNavAt = Date.now()
		}
	}

	// Click on the dark backdrop (anywhere that isn't the image, a control, the
	// header, the info panel, or the filmstrip) closes the viewer. The image
	// fills the stage (object-fit:contain), so compute its rendered rect to tell
	// a letterbox click from an image click. Ignored while zoomed.
	function onBackdropClick(e: MouseEvent): void {
		// Don't treat the tail of another gesture as a deliberate backdrop dismiss.
		if (e.detail > 1) return
		if (Date.now() - zoomToggledAt < 350) return
		if (Date.now() - openedAt < 350) return
		if (Date.now() - lastNavAt < 300) return
		const t = e.target as HTMLElement
		if (
			zoomed ||
			t.closest('button, header, .media-lightbox-info-slot, .media-lightbox-filmstrip-slot')
		)
			return
		// during the cross-fade two imgs coexist; the LAST is the incoming/current
		// item, so hit-test against it
		const imgs = overlay?.querySelectorAll<HTMLImageElement>('.stage img')
		const img = imgs && imgs[imgs.length - 1]
		if (img?.naturalWidth) {
			const box = imageContentRect(
				img.naturalWidth,
				img.naturalHeight,
				img.getBoundingClientRect(),
			)
			if (rectContains(box, e.clientX, e.clientY)) return // clicked the image itself
		}
		requestClose()
	}

	// Mouse single-click on the image toggles zoom (zoom-in toward click point, or
	// reset). This is the ONLY mouse zoom path — the second click of a
	// double-click (`detail > 1`) is ignored, leaving the first click's toggle to
	// stand. Touch uses its own double-tap detector in ptrUp.
	function onStageClick(e: MouseEvent): void {
		if (!open) return // ignore stage clicks once the overlay is closing
		if ((e.target as HTMLElement).closest('button')) return
		if (lastPointerType !== 'mouse') return
		if (e.detail > 1) return e.stopPropagation()
		// Mouse has no spare gesture to dedicate to entering focus mode (single-click
		// already means zoom) — but once IN focus mode, a click's likeliest intent is
		// "bring the chrome back", not "zoom further", so it takes priority and exits
		// instead. Mirrors the touch single-tap toggle below for the same gesture.
		if (focusMode) {
			e.stopPropagation() // don't also read as a backdrop-dismiss click
			toggleFocusMode()
			return
		}
		if (Date.now() - openedAt < 350) return
		if (Date.now() - lastNavAt < 300) return
		const moved = Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY)
		if (moved > 5) return
		const imgs = overlay?.querySelectorAll<HTMLImageElement>('.stage img')
		const img = imgs && imgs[imgs.length - 1]
		if (!img?.naturalWidth) return
		const r = img.getBoundingClientRect()
		if (
			!rectContains(
				imageContentRect(img.naturalWidth, img.naturalHeight, r),
				e.clientX,
				e.clientY,
			)
		)
			return

		e.stopPropagation()
		zoomToPoint(e.clientX, e.clientY)
	}

	// Discrete zoom toward a screen point — shared by mouse click, touch
	// double-tap, and scroll-up-to-zoom. Toggles: if already zoomed it resets;
	// otherwise it zooms to `target` anchored so the point under the cursor stays put.
	function zoomToPoint(clientX: number, clientY: number, target = 2.5): void {
		zoomToggledAt = Date.now() // so a following tail-click isn't read as a dismiss
		animateZoom()
		if (zoomed) {
			scale = 1
			tx = 0
			ty = 0
			return
		}
		const r = stageEl?.getBoundingClientRect()
		if (r) {
			const relX = clientX - (r.left + r.width / 2)
			const relY = clientY - (r.top + r.height / 2)
			;[tx, ty] = anchoredPan(relX, relY, 0, 0, target)
		}
		scale = target
	}

	function trapTab(e: KeyboardEvent): void {
		if (e.key !== 'Tab' || !overlay) return
		const f = overlay.querySelectorAll<HTMLElement>(
			'button:not([tabindex="-1"]):not(:disabled), [href], input:not([tabindex="-1"]):not(:disabled), [tabindex]:not([tabindex="-1"])',
		)
		if (f.length === 0) return
		const first = f[0]
		const lastEl = f[f.length - 1]
		// `document.activeElement === overlay` — whenever `.overlay` ITSELF holds
		// focus, Shift+Tab must wrap to `lastEl`, same as landing on `first`: it's
		// a deliberately inert tabindex="-1" container (see the open effect
		// below), EXCLUDED from `f` by this query's own `:not([tabindex="-1"])`
		// clause, so it can never itself be `first`/`lastEl` — without this OR
		// branch, Shift+Tab from `.overlay` fell through unintercepted, a real
		// focus-trap escape (WCAG 2.4.3) a review panel caught, 2026-07-19, right
		// after the open-time autofocus target changed from the close button to
		// `.overlay`. This isn't a one-shot "only right after open" case — a
		// backdrop click that lands on `.overlay` itself (not `.overlay-content`
		// or any child) and doesn't close (e.g. suppressed by one of
		// `onBackdropClick`'s own early-return guards) refocuses it the same way,
		// so the check has to hold unconditionally, not just for the first press.
		// Forward Tab from `.overlay` needs no equivalent guard: the browser's
		// native "next tabbable in DOM order" from a container's own start
		// position already lands on `first` with no help from this function.
		if (
			e.shiftKey &&
			(document.activeElement === first || document.activeElement === overlay)
		) {
			e.preventDefault()
			lastEl.focus()
		} else if (!e.shiftKey && document.activeElement === lastEl) {
			e.preventDefault()
			first.focus()
		}
	}

	// Shift-held tracking for the open/close slow-motion feature (see
	// `SLOWMO_FACTOR`'s own comment above). Set on the `<svelte:window>`
	// keydown/keyup pair below rather than inside `key` itself — `key` bails
	// out entirely while `!open`, but Shift may legitimately already be held
	// before the viewer opens (e.g. held while clicking a thumbnail), so this
	// has to run unconditionally on every keydown/keyup regardless of `open`.
	function trackShiftDown(e: KeyboardEvent): void {
		if (e.key === 'Shift') shiftHeld = true
		key(e)
	}
	function trackShiftUp(e: KeyboardEvent): void {
		if (e.key === 'Shift') shiftHeld = false
	}

	function key(e: KeyboardEvent): void {
		if (!open || closing) return
		// While an override (e.g. an editor) is shown, it owns the keyboard.
		if (showOverride) return
		if (e.key === 'Tab') return trapTab(e)

		const step = e.shiftKey ? PAN_STEP_LARGE : PAN_STEP

		// Arrow keys are context-sensitive: pan while zoomed, navigate while not.
		if (e.key === 'ArrowRight') {
			if (zoomed) {
				e.preventDefault()
				animateKeyboardPan()
				;[tx, ty] = clampPan(tx - step, ty)
			} else {
				keyboardArrowNavUsed = true
				go(1)
			}
		} else if (e.key === 'ArrowLeft') {
			if (zoomed) {
				e.preventDefault()
				animateKeyboardPan()
				;[tx, ty] = clampPan(tx + step, ty)
			} else {
				keyboardArrowNavUsed = true
				go(-1)
			}
		} else if (e.key === 'ArrowDown') {
			if (zoomed) {
				e.preventDefault()
				animateKeyboardPan()
				;[tx, ty] = clampPan(tx, ty - step)
			}
		} else if (e.key === 'ArrowUp') {
			if (zoomed) {
				e.preventDefault()
				animateKeyboardPan()
				;[tx, ty] = clampPan(tx, ty + step)
			}
			// Esc is two-stage: first press resets zoom (without closing), second closes.
		} else if (e.key === 'Escape') {
			// Three-stage, same "undo the most local thing first" idea as the rest of
			// this handler: reset zoom, then exit focus mode, then close — never two
			// at once, so Esc is never surprising about how much it just undid.
			if (zoomed) {
				animateZoom()
				scale = 1
				tx = 0
				ty = 0
				panning = false
				zoomAnnouncement = 'Zoom reset — use arrow keys to navigate'
			} else if (focusMode) {
				focusMode = false
			} else {
				requestClose()
			}
		} else if (e.key.toLowerCase() === 'i' && info) {
			showInfo = !showInfo
		} else if (e.key === '+' || e.key === '=') {
			animateZoom()
			scale = Math.min(scale + 0.5, MAX_SCALE)
			;[tx, ty] = clampPan(tx, ty)
			zoomAnnouncement = `Zoomed to ${scale.toFixed(1)}× — use arrow keys to pan, 0 to reset`
		} else if (e.key === '-' || e.key === '_') {
			animateZoom()
			scale = Math.max(1, scale - 0.5)
			;[tx, ty] = clampPan(tx, ty)
			if (scale === 1) panning = false
			zoomAnnouncement =
				scale === 1
					? 'Zoom reset — use arrow keys to navigate'
					: `Zoomed to ${scale.toFixed(1)}× — use arrow keys to pan, 0 to reset`
		} else if (e.key === '0') {
			animateZoom()
			scale = 1
			tx = 0
			ty = 0
			panning = false
			zoomAnnouncement = 'Zoom reset — use arrow keys to navigate'
		}
	}

	// --- zoom + pan + swipe gesture engine (PhotoSwipe-class, native) ---
	const MAX_SCALE = 5
	const PAN_STEP = 60
	const PAN_STEP_LARGE = 300
	let scale = $state(1)
	let tx = $state(0)
	let ty = $state(0)
	const zoomed = $derived(scale > 1.01)
	let zoomAnnouncement = $state('')

	// Keyboard arrow-key panning (while zoomed) is a discrete PAN_STEP/
	// PAN_STEP_LARGE jump and should ANIMATE, the same way `animateZoom` makes
	// a discrete zoom step animate rather than pop — but `.stage.zoomed
	// :global(img)` unconditionally sets `transition: none` so POINTER-drag
	// panning and the wheel-zoom rAF loop stay 1:1/lag-free (both write a new
	// transform every frame already, so a CSS transition on top would double-
	// smooth into a laggy rubber-band). Keyboard panning shares that same img,
	// so it inherited the same `transition: none` and jumped instantly instead
	// of animating — reported live, 2026-07-19: "zoomed in: keyboard panning
	// should be animated." A separate transient `.keyboard-panning` class
	// (mirroring `zooming`'s own timer pattern) re-enables a transform
	// transition just for the duration of one step, ordered after `.zoomed`/
	// `.panning` in the stylesheet so it wins the cascade.
	let keyboardPanning = $state(false)
	let keyboardPanTimer: ReturnType<typeof setTimeout> | undefined
	const KEYBOARD_PAN_MS = 250
	function animateKeyboardPan(): void {
		keyboardPanning = true
		clearTimeout(keyboardPanTimer)
		keyboardPanTimer = setTimeout(() => (keyboardPanning = false), KEYBOARD_PAN_MS)
	}

	// Discrete zoom (click / double-click / keyboard) should ANIMATE the scale in
	// rather than jump. Continuous gestures (pinch / wheel / drag-pan) must stay
	// 1:1 with no transition lag.
	let zooming = $state(false)
	let zoomTimer: ReturnType<typeof setTimeout> | undefined
	let zoomToggledAt = 0
	// 520ms — 20ms past the CSS transition's own 500ms (`.stage.zooming
	// :global(img)` below) so the transition has genuinely finished before
	// switching back to 1:1 gesture-tracking. Reported live, 2026-07-19: "make
	// [the click/double-tap zoom-in time] at least 500ms" (was 280ms/300ms).
	const ZOOM_ANIM_MS = 520
	function animateZoom(): void {
		zooming = true
		clearTimeout(zoomTimer)
		zoomTimer = setTimeout(() => (zooming = false), ZOOM_ANIM_MS)
		stopWheelZoomLoop()
	}

	// Trackpad pinch / Ctrl+scroll zoom smoothing: `scale`/`tx`/`ty` stay the
	// *displayed* values; `targetScale`/`targetTx`/`targetTy` track the wheel
	// input directly; a persistent rAF loop eases the displayed values toward the
	// target every frame.
	let targetScale = $state(1)
	let targetTx = $state(0)
	let targetTy = $state(0)
	let wheelZoomRaf: number | undefined
	function stepWheelZoom(): void {
		const dScale = targetScale - scale
		const dTx = targetTx - tx
		const dTy = targetTy - ty
		if (Math.abs(dScale) < 0.001 && Math.abs(dTx) < 0.5 && Math.abs(dTy) < 0.5) {
			scale = targetScale
			tx = targetTx
			ty = targetTy
			wheelZoomRaf = undefined
			return
		}
		scale += dScale * 0.25
		tx += dTx * 0.25
		ty += dTy * 0.25
		wheelZoomRaf = requestAnimationFrame(stepWheelZoom)
	}
	function startWheelZoomLoop(): void {
		if (wheelZoomRaf !== undefined) return
		wheelZoomRaf = requestAnimationFrame(stepWheelZoom)
	}
	function stopWheelZoomLoop(): void {
		if (wheelZoomRaf !== undefined) {
			cancelAnimationFrame(wheelZoomRaf)
			wheelZoomRaf = undefined
		}
		untrack(() => {
			targetScale = scale
			targetTx = tx
			targetTy = ty
		})
	}

	// reset transform (and any stale zoom announcement) whenever the item changes or reopens
	$effect(() => {
		void [open, index]
		scale = 1
		tx = 0
		ty = 0
		stopWheelZoomLoop()
		zoomAnnouncement = ''
		dragY = 0
		dragAxis = 'none'
		dragSamples = []
		dragStartNotified = false
		drawerGestureActive = false
		zoomInGestureActive = false
		vAccum = 0
		lastTapAt = 0
		clearTimeout(singleTapTimer)
	})

	// Focus mode deliberately does NOT reset on `index` alone — it should stay
	// active across a next/prev navigation while the viewer stays open, and only
	// auto-clear once the viewer is closed (so it starts fresh, off, next time it
	// opens). A separate effect keyed only on `open` (not `index`) keeps that
	// distinct from the transform/gesture reset above, which correctly DOES fire
	// on every navigation.
	$effect(() => {
		if (!open) focusMode = false
	})

	// Once a user demonstrates they're navigating by keyboard (Left/Right, not
	// the mouse), the nav arrows are just visual clutter they aren't looking
	// at — hidden until the mouse hovers `.stage` again (see the
	// `.keyboard-nav-used` CSS below), which is itself unambiguous evidence
	// they've switched back to pointer-driven interaction. Applies regardless
	// of focus mode — went through two rounds of live refinement, 2026-07-19:
	// "just always hide arrows in focus mode" → "only if the user's actually
	// using the keyboard, scoped to focus mode" → this, dropping the focus-mode
	// scoping entirely once it became clear focus mode was never really the
	// point. Mouse-hover users still get the normal hover-reveal throughout —
	// this only ever affects the keyboard-nav path. Reset on close for
	// hygiene — a fresh open starts with arrows hover-revealable again.
	let keyboardArrowNavUsed = $state(false)
	$effect(() => {
		if (!open) keyboardArrowNavUsed = false
	})

	// Nav-arrow + OS-cursor idle-fade: even while genuinely hovering `.stage`
	// (so the CSS hover-reveal would otherwise keep them shown), fade the
	// arrows out — and hide the actual cursor too — once the cursor has sat
	// still for a few seconds — video-player-style auto-hide. Reported live,
	// 2026-07-19: "when the cursor hasn't moved over the lightbox for a few
	// seconds, fade out the lightbox's navarrows," then "cursor should also
	// hide after the same amount." Reset by the SAME genuine-mouse-move gate
	// `ptrMove` already uses for `keyboardArrowNavUsed` (not a static `:hover`
	// check, for the identical reason documented there — a `:hover` state
	// alone can't distinguish "the cursor just arrived" from "the cursor has
	// been sitting here idle"). `:not(:focus-visible)` in the nav-arrow CSS
	// keeps a keyboard-focused arrow visible through idle regardless (WCAG
	// 2.4.7), matching `.keyboard-nav-used`'s own focus-visible carve-out
	// below.
	const CURSOR_IDLE_MS = 3000
	let cursorIdle = $state(false)
	let cursorIdleTimer: ReturnType<typeof setTimeout> | undefined

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- imperative pointer-tracking map (pinch/pan), never read reactively
	const pointers = new Map<number, { x: number; y: number }>()
	let startDist = 0
	let startScale = 1
	let panTx = 0
	let panTy = 0
	let panX = 0
	let panY = 0
	let swipeX = 0
	let pinchOriginX = 0
	let pinchOriginY = 0
	let startMidX = 0
	let startMidY = 0
	let startTxPinch = 0
	let startTyPinch = 0

	let mouseDownX = 0
	let mouseDownY = 0
	let lastPointerType = ''
	let panning = $state(false)

	// --- swipe-down-to-close (drawer dismiss) ---
	const CLOSE_DRAG = 110
	// Distance (px) of downward drag over which the backdrop fades from fully dim to
	// fully transparent — doubled from the original 320 (reported live: wanted the
	// fade to read as roughly half as fast during the gesture). Still linear in
	// `dragY`, just spread over more drag distance, so it stays ~83% opaque at the
	// CLOSE_DRAG commit point (was ~65% at the original 320) — see lightbox.md's
	// drawer-dismiss invariant for why staying mostly opaque at the commit point
	// matters (so the reveal scrim doesn't vanish before the user has committed).
	const DRAWER_FADE_DISTANCE = 640
	let swipeY = 0
	let dragAxis: 'none' | 'h' | 'v' = 'none'
	let dragY = $state(0)
	const drawerBackdropOpacity = $derived(
		dragY > 0 ? Math.max(0, 1 - dragY / DRAWER_FADE_DISTANCE) : 1,
	)
	let snapping = $state(false)
	let snapTimer: ReturnType<typeof setTimeout> | undefined
	let lastTapAt = 0
	let lastTapX = 0
	let lastTapY = 0
	// Debounces a solo touch tap (toggles focus mode) from the first tap of a
	// double-tap (zooms) — see `ptrUp`.
	let singleTapTimer: ReturnType<typeof setTimeout> | undefined

	// Fires `onDismissDragStart` at most once per drawer-drag gesture (pointer or
	// wheel) — call sites check-and-set this immediately before dragY first goes
	// positive, and it's cleared whenever a gesture actually ends (snap-back or
	// the reset-on-photo/open-change effect), so the NEXT drag gesture notifies again.
	let dragStartNotified = false
	function notifyDismissDragStart(): void {
		if (dragStartNotified) return
		dragStartNotified = true
		onDismissDragStart?.()
	}

	function snapDrawerBack(): void {
		if (dragY === 0) return
		snapping = true
		dragY = 0
		dragStartNotified = false
		clearTimeout(snapTimer)
		snapTimer = setTimeout(() => (snapping = false), 220)
	}
	// Momentum-aware release: a pure distance threshold commits to closing (or
	// not) the instant `dragY` crosses `CLOSE_DRAG`, with no way back even if
	// the user is still visibly reconsidering — e.g. a slow drag that happens to
	// cross the line, then eases back upward before release, still force-closes
	// today. Reported live, 2026-07-19: "the best approach calculates the
	// momentum once the user lets go, on whether to snap up again or out."
	// `dragSamples` is a short rolling window (last `VELOCITY_WINDOW_MS`) of
	// {y, t} read only synchronously in `finalizeDrawer` — plain array, not
	// `$state` (never rendered, no reactivity needed).
	const VELOCITY_WINDOW_MS = 80
	// px/ms. A "fast flick" downward commits to closing even short of the full
	// distance threshold; picked as a typical mobile fling speed (~500px/s).
	const FLING_VELOCITY = 0.5
	// px/ms, upward (negative). Past the distance threshold but still visibly
	// recoiling at release reads as "changed their mind" — snap back instead of
	// force-closing. Deliberately a gentler magnitude than FLING_VELOCITY:
	// committing to STAY open should be easy to trigger, closing should not be
	// easy to trigger by accident.
	const RECOIL_VELOCITY = -0.35
	let dragSamples: { y: number; t: number }[] = []
	function recordDragSample(y: number): void {
		const t = performance.now()
		dragSamples.push({ y, t })
		while (dragSamples.length > 2 && t - dragSamples[0].t > VELOCITY_WINDOW_MS)
			dragSamples.shift()
	}
	// px/ms, positive = moving down. 0 with fewer than 2 samples (e.g. the
	// wheel-driven drawer path below never calls `recordDragSample` at all —
	// it has no pointer-position samples to derive a velocity from, so it
	// always falls through to the original pure-distance behavior unchanged).
	function dragVelocity(): number {
		if (dragSamples.length < 2) return 0
		const first = dragSamples[0]
		const last = dragSamples[dragSamples.length - 1]
		const dt = last.t - first.t
		return dt > 0 ? (last.y - first.y) / dt : 0
	}
	function finalizeDrawer(): void {
		const v = dragVelocity()
		dragSamples = []
		if (dragY > CLOSE_DRAG) {
			if (v < RECOIL_VELOCITY) snapDrawerBack()
			else requestClose()
		} else if (v > FLING_VELOCITY) {
			requestClose()
		} else {
			snapDrawerBack()
		}
	}

	const dist = (): number => {
		const [a, b] = [...pointers.values()]
		return Math.hypot(a.x - b.x, a.y - b.y)
	}
	function clampPan(newTx: number, newTy: number, s = scale): [number, number] {
		const r = stageEl?.getBoundingClientRect()
		if (!r) return [newTx, newTy]
		return clampPanMath(newTx, newTy, s, r.width, r.height)
	}

	function ptrDown(e: PointerEvent): void {
		if (!open) return
		;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
		zooming = false
		clearTimeout(zoomTimer)
		stopWheelZoomLoop()
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
		if (pointers.size === 2) {
			startDist = dist()
			startScale = scale
			panning = false
			dragAxis = 'none'
			dragY = 0
			dragSamples = []
			clearTimeout(snapTimer)
			snapping = false
			const pts = [...pointers.values()]
			startMidX = (pts[0].x + pts[1].x) / 2
			startMidY = (pts[0].y + pts[1].y) / 2
			startTxPinch = tx
			startTyPinch = ty
			const r = stageEl?.getBoundingClientRect()
			if (r) {
				pinchOriginX = r.left + r.width / 2
				pinchOriginY = r.top + r.height / 2
			}
		} else if (pointers.size === 1) {
			mouseDownX = e.clientX
			mouseDownY = e.clientY
			lastPointerType = e.pointerType
			if (zoomed) {
				panX = e.clientX
				panY = e.clientY
				panTx = tx
				panTy = ty
			} else {
				swipeX = e.clientX
				swipeY = e.clientY
				dragAxis = 'none'
				// NOT seeded with this pointerdown's own position/time — a review
				// panel caught a first-draft version of this fix that DID seed here
				// (to cover a fast/short flick releasing after only one `ptrMove`),
				// but that let a preceding DWELL (pointer held still before the
				// flick starts — `dragAxis` only locks once real movement is
				// detected, so nothing here fires during the dwell itself) leak
				// into the velocity denominator via the seed's stale `ptrDown`
				// timestamp, diluting a genuinely fast flick's computed velocity.
				// `recordDragSample` below already fires on the SAME `ptrMove` that
				// locks `dragAxis` to `'v'` (both `if`s run in sequence, not
				// else-if), so the sample window naturally starts at axis-lock
				// time with no separate seed needed — a release before any FURTHER
				// move event is a genuine edge case real pointer input rarely hits
				// (meaningful travel distance implies multiple move events), and
				// falls back to pure-distance, not a wrong answer.
				dragSamples = []
				clearTimeout(snapTimer)
				snapping = false
			}
		}
	}

	function ptrMove(e: PointerEvent): void {
		// A GENUINE mouse movement over the stage — not just "the cursor happens
		// to already be sitting here" (a static `:hover` check can't tell those
		// apart, which is exactly why the CSS-only version of this didn't work:
		// if the mouse was already resting on `.stage` when a keyboard nav key
		// was pressed, `:hover` was already true, so nothing visibly changed on
		// the next press either — reported live, 2026-07-19). This runs before
		// the `pointers.has()` early-return below so it fires on every hover-
		// move too, not just active-gesture moves.
		if (e.pointerType === 'mouse') {
			if (keyboardArrowNavUsed) keyboardArrowNavUsed = false
			cursorIdle = false
			clearTimeout(cursorIdleTimer)
			cursorIdleTimer = setTimeout(() => {
				cursorIdle = true
			}, CURSOR_IDLE_MS)
		}
		if (!pointers.has(e.pointerId)) return
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
		if (pointers.size === 2) {
			if (startDist < 1) return
			const newScale = clamp((startScale * dist()) / startDist, 1, MAX_SCALE)
			scale = newScale
			if (newScale <= 1.01) {
				tx = 0
				ty = 0
			} else {
				const [ax, ay] = anchoredPan(
					startMidX - pinchOriginX,
					startMidY - pinchOriginY,
					startTxPinch,
					startTyPinch,
					newScale / startScale,
				)
				;[tx, ty] = clampPan(ax, ay, newScale)
			}
		} else if (pointers.size === 1 && zoomed) {
			;[tx, ty] = clampPan(panTx + (e.clientX - panX), panTy + (e.clientY - panY))
			panning = true
		} else if (pointers.size === 1 && !zoomed) {
			const dx = e.clientX - swipeX
			const dy = e.clientY - swipeY
			if (dragAxis === 'none' && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
				dragAxis = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h'
			}
			if (dragAxis === 'v') {
				// Notify the moment the drag actually starts pulling the sheet DOWN (not
				// just axis-locked vertical, which can also be an upward flick) — the
				// earliest point a consumer's prefetch (e.g. scrolling a list to reveal
				// the close target) is worth starting.
				if (dy > 0) notifyDismissDragStart()
				dragY = Math.max(0, dy)
				recordDragSample(e.clientY)
			}
		}
	}

	function ptrUp(e: PointerEvent): void {
		const wasMulti = pointers.size >= 2
		pointers.delete(e.pointerId)
		if (pointers.size === 0) panning = false

		if (e.pointerType === 'touch' && !wasMulti && pointers.size === 0 && dragAxis !== 'v') {
			const moved = Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY)
			if (moved <= 12) {
				const now = Date.now()
				const near = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 40
				if (now - lastTapAt < 300 && near && now - openedAt >= 350) {
					lastTapAt = 0
					// This tap completes a double-tap — cancel the OTHER tap's pending
					// single-tap timer so a double-tap-to-zoom never also flickers the
					// chrome via its own first tap.
					clearTimeout(singleTapTimer)
					zoomToPoint(e.clientX, e.clientY)
					dragAxis = 'none'
					return
				}
				lastTapAt = now
				lastTapX = e.clientX
				lastTapY = e.clientY
				// Defer: only a genuinely SOLO tap (no follow-up within the double-tap
				// window above) toggles focus mode. Toggles both ways — the same
				// gesture that fades the chrome out brings it back.
				clearTimeout(singleTapTimer)
				singleTapTimer = setTimeout(() => {
					singleTapTimer = undefined
					if (!open) return
					toggleFocusMode()
				}, 300)
			}
		}

		if (!wasMulti && pointers.size === 0 && !zoomed) {
			if (dragAxis === 'v') {
				finalizeDrawer()
			} else {
				const dx = e.clientX - swipeX
				if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
			}
			dragAxis = 'none'
		}
		if (pointers.size === 1) {
			const p = [...pointers.values()][0]
			panX = p.x
			panY = p.y
			panTx = tx
			panTy = ty
		}
		if (!zoomed) {
			tx = 0
			ty = 0
		}
	}

	const wheelNav = initWheelNav()
	let wheelIdle: ReturnType<typeof setTimeout> | undefined
	let vIdle: ReturnType<typeof setTimeout> | undefined
	let vAccum = 0
	let wheelZoomGuardUntil = 0
	let drawerGestureActive = false
	let zoomInGestureActive = false

	onDestroy(() => {
		clearTimeout(vIdle)
		clearTimeout(wheelIdle)
		clearTimeout(snapTimer)
		clearTimeout(zoomTimer)
		clearTimeout(closeTimer)
		clearTimeout(singleTapTimer)
		cancelCloseRaf()
		if (wheelZoomRaf !== undefined) cancelAnimationFrame(wheelZoomRaf)
	})

	function smoothZoomTick(e: WheelEvent): void {
		const newScale = clamp(targetScale * (1 - e.deltaY * 0.003125), 1, MAX_SCALE)
		if (newScale <= 1.01) {
			targetScale = 1
			targetTx = 0
			targetTy = 0
		} else {
			const r = stageEl?.getBoundingClientRect()
			const cx = r ? r.left + r.width / 2 : e.clientX
			const cy = r ? r.top + r.height / 2 : e.clientY
			const [ax, ay] = anchoredPan(
				e.clientX - cx,
				e.clientY - cy,
				targetTx,
				targetTy,
				newScale / targetScale,
			)
			;[targetTx, targetTy] = clampPan(ax, ay, newScale)
			targetScale = newScale
		}
		startWheelZoomLoop()
	}

	function onWheel(e: WheelEvent): void {
		if (!open) return
		e.preventDefault()
		if (!e.ctrlKey && Date.now() < wheelZoomGuardUntil) return
		if (e.ctrlKey) {
			smoothZoomTick(e)
			return
		}
		if (zoomInGestureActive) {
			clearTimeout(vIdle)
			vIdle = setTimeout(() => {
				zoomInGestureActive = false
				vAccum = 0
				wheelZoomGuardUntil = Date.now() + 220
			}, 150)
			smoothZoomTick(e)
			return
		}
		if (zoomed) {
			stopWheelZoomLoop()
			;[tx, ty] = clampPan(tx - e.deltaX, ty - e.deltaY)
			return
		}
		if (dragY <= 0 && isHorizontalWheel(e.deltaX, e.deltaY)) {
			clearTimeout(wheelIdle)
			wheelIdle = setTimeout(() => resetWheelNav(wheelNav), 90)
			const step = feedWheel(wheelNav, e.deltaX, e.deltaY)
			if (step) go(step)
			return
		}
		if (e.deltaY > 0 || dragY > 0 || drawerGestureActive) {
			drawerGestureActive = true
			const vh = typeof window !== 'undefined' ? window.innerHeight : 900
			dragY = clamp(dragY + e.deltaY, 0, vh)
			// Same "notify the moment the sheet is actually pulled down" rule as the
			// pointer-drag path above.
			if (dragY > 0) notifyDismissDragStart()
			clearTimeout(vIdle)
			vIdle = setTimeout(() => {
				drawerGestureActive = false
				finalizeDrawer()
			}, 130)
			return
		}
		vAccum += e.deltaY
		if (vAccum >= -50) {
			clearTimeout(vIdle)
			vIdle = setTimeout(() => (vAccum = 0), 150)
			return
		}
		vAccum = 0
		zoomInGestureActive = true
		clearTimeout(vIdle)
		vIdle = setTimeout(() => {
			zoomInGestureActive = false
			vAccum = 0
			wheelZoomGuardUntil = Date.now() + 220
		}, 150)
		smoothZoomTick(e)
	}
</script>

<svelte:window onkeydown={trackShiftDown} onkeyup={trackShiftUp} />

{#if open && item && !closing}
	{#if showOverride && overrideContent}
		{@render overrideContent()}
	{:else}
		<!-- backdrop click closes; the keyboard equivalent is Esc (handled on window) -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!--
			`.overlay`'s own `background` is ONLY set while `dragY > 0` (an active
			swipe-down-to-dismiss drag) — undefined (transparent) otherwise. It used to be
			unconditional (always `color-mix(...*drawerBackdropOpacity%...)`, ~97% opaque
			at rest since `drawerBackdropOpacity` is 1 when not dragging), which was safe
			ONLY as long as `.overlay-content` had its own solid background sitting on top
			of it. Once that masking background was removed in favor of the dedicated
			`.media-lightbox-open-backdrop` reveal element (see that element below), `.overlay`'s
			always-on background became an unmasked opaque layer BENEATH the reveal — the
			composited result stayed constant dark from frame 0 regardless of
			`.media-lightbox-open-backdrop`'s own genuinely-animating opacity, silently reintroducing
			the exact backdrop-pop-in bug this refactor was meant to fix (caught by an
			independent-expert-review panel). Gating to `dragY > 0` means this background
			is only ever visible during the intentional drag-reveal peek — its ONE actual
			purpose — and stays transparent (letting `.media-lightbox-open-backdrop` own the reveal)
			everywhere else, including snap-back (`.overlay.snapping`'s existing
			`transition: background-color 0.22s` still applies since `dragY` and
			`snapping` flip together in `snapDrawerBack()`).
		-->
		<div
			class={cn('overlay', className)}
			class:snapping
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			tabindex="-1"
			bind:this={overlay}
			style:background={dragY > 0
				? `color-mix(in oklch, var(--media-lightbox-overlay-bg, var(--background)) ${97 * drawerBackdropOpacity}%, transparent)`
				: undefined}
			onclick={onBackdropClick}
		>
			<div
				class="overlay-content"
				class:snapping
				class:dragging={dragY > 0}
				class:focus-mode={focusMode}
				class:chrome-pending={!chromeReady}
				class:keyboard-nav-used={keyboardArrowNavUsed}
				class:reduce-motion={reduceMotion}
				style:transform={dragY > 0 ? `translateY(${dragY}px)` : undefined}
			>
				<div
					class="media-lightbox-open-backdrop"
					class:in={backdropIn}
					aria-hidden="true"
					bind:this={openBackdropEl}
					style:transition-duration="{backdropRevealMs}ms"
				></div>
				<header>
					<Button
						variant="ghost"
						size="icon-sm"
						class="icon close touch-target"
						onclick={requestClose}
						aria-label="Close viewer"
					>
						<X aria-hidden="true" />
					</Button>
					<div class="title">{title}</div>
					<div class="actions">
						{@render headerActions?.()}
						<Button
							variant="ghost"
							size="icon-sm"
							class={cn('icon touch-target', focusMode && 'on')}
							aria-pressed={focusMode}
							onclick={toggleFocusMode}
							aria-label={focusModeLabel}
						>
							{#if focusMode}
								<Minimize2 aria-hidden="true" />
							{:else}
								<Maximize2 aria-hidden="true" />
							{/if}
						</Button>
						{#if info}
							<Button
								variant="ghost"
								size="icon-sm"
								class={cn('icon touch-target', showInfo && 'on')}
								aria-pressed={showInfo}
								onclick={() => (showInfo = !showInfo)}
								aria-label={infoLabel}
							>
								<Info aria-hidden="true" />
							</Button>
						{/if}
					</div>
				</header>

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- The stage is a pointer-gesture surface (pan/pinch/dbl-click-zoom/wheel) —
				     mouse/touch enhancements with no keyboard role; nav uses the buttons +
				     arrow keys handled at the dialog level. -->
				<div
					class="stage"
					class:zoomed
					class:panning
					class:zooming
					class:keyboard-panning={keyboardPanning}
					class:stage-fly-pending={stageFlyPending}
					class:stage-scale-reveal={stageScaleReveal}
					class:cursor-idle={cursorIdle}
					in:stageIntro
					bind:this={stageEl}
					style:--media-lightbox-deblur-ms="{deblurMs}ms"
					onpointerdown={ptrDown}
					onpointermove={ptrMove}
					onpointerup={ptrUp}
					onpointercancel={ptrUp}
					onwheel={onWheel}
					onclick={onStageClick}
				>
					{#if index > 0}
						<NavArrow
							direction="prev"
							class="media-lightbox-nav"
							iconSize={30}
							onclick={() => go(-1)}
							ariaLabel={prevLabel}
						/>
					{/if}
					{@render slide(item, {
						index,
						transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
						loading: heldLoading,
					})}
					{#if index < items.length - 1}
						<NavArrow
							direction="next"
							class="media-lightbox-nav"
							iconSize={30}
							onclick={() => go(1)}
							ariaLabel={nextLabel}
						/>
					{/if}
					{#if zoomed}<div class="zoom-badge" aria-hidden="true">
							{scale.toFixed(1)}×
						</div>{/if}
				</div>
				<!-- announce the whole item, not just an ordinal -->
				<div class="sr-live" aria-live="polite">{alt}</div>
				<!-- zoom mode changes announced assertively on discrete keyboard actions only
				     (not on continuous gesture changes, which fire too often to announce) -->
				<div class="sr-live" aria-live="assertive" aria-atomic="true">
					{zoomAnnouncement}
				</div>

				{#if showInfo && info}
					<div class="media-lightbox-info-slot" style="display:contents">
						{@render info(item)}
					</div>
				{/if}

				{#if filmstrip}
					<div class="media-lightbox-filmstrip-slot">
						{@render filmstrip()}
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/if}

<!-- Close animation: a plain backdrop + a cloned, CROPPED <img>, independent of the
     interactive overlay above (which is already unmounted by the time this renders —
     see `closing`). The clone starts at the real image's last on-screen rect (`from`)
     — an imperceptible swap — then tweens to the target rect (`to`) once `flyRect()`
     resolves it (`closeAnimation === 'fly'`). If `to` never resolves (no rect available
     — `closeAnimation` is 'scale', or it's 'fly' but `flyRect` was omitted/timed
     out/resolved nothing), it fades in place instead — WITH a center scale-out
     unless `closeAnimation === 'fade'` explicitly (a fly that can't complete falls
     back to the SAME look 'scale' uses, not to a bare fade).
     `.closing-fly-clip` (`overflow:hidden`, its OWN `width`/`height` transitioned as
     real layout properties, not `transform: scale()`) wraps `.closing-fly-img`
     (`object-fit: cover`, always 100%×100% of its parent) — see `.closing-fly-clip`'s
     own CSS comment for why a "clip + cover" pair replaced a single non-uniformly
     `transform: scale()`d `<img>`. -->
{#if closing}
	<div
		class="closing-backdrop"
		aria-hidden="true"
		style:opacity={closeAnimIn ? 0 : closeBackdropFrom}
		style:transition-duration="{activeCloseMs}ms"
	></div>
{/if}
{#if closeAnim}
	<div
		class="closing-fly-clip"
		class:scale-out={closeAnimation !== 'fade' && !closeAnim.to}
		style:left="{closeAnim.from.left}px"
		style:top="{closeAnim.from.top}px"
		style:width={(closeAnimIn && closeAnim.to ? closeAnim.to.width : closeAnim.from.width) +
			'px'}
		style:height={(closeAnimIn && closeAnim.to ? closeAnim.to.height : closeAnim.from.height) +
			'px'}
		style:transform={closeAnimIn
			? closeAnim.to
				? `translate(${closeAnim.to.left - closeAnim.from.left}px, ${closeAnim.to.top - closeAnim.from.top}px)`
				: closeAnimation !== 'fade'
					? 'scale(0.92)'
					: 'none'
			: 'none'}
		style:opacity={closeAnimIn && !closeAnim.to ? 0 : 1}
		style:transition-duration="{activeCloseMs}ms"
	>
		<img class="closing-fly-img" src={closeAnim.src} alt="" />
	</div>
{/if}

<!-- Open animation: a plain cloned, CROPPED <img> flying FROM `flyRect()` (the origin
     — e.g. a grid tile) TO the real stage image's own live rect, then removed — the
     mirror image of the close-fly above, but simpler: the interactive `.stage` above
     is already mounted (not unmounted, unlike close), so this is purely a decorative
     overlay that fades away once it lands, not something the rest of the chrome's
     mount/unmount depends on. See `startOpenFly`. Same `.opening-fly-clip` (clip
     box) / `.opening-fly-img` (`object-fit: cover`) split as the close-fly above. -->
{#if openAnim}
	<div
		class="opening-fly-clip"
		style:left="{openAnim.from.left}px"
		style:top="{openAnim.from.top}px"
		style:width={(openAnimIn ? openAnim.to.width : openAnim.from.width) + 'px'}
		style:height={(openAnimIn ? openAnim.to.height : openAnim.from.height) + 'px'}
		style:transform={openAnimIn
			? `translate(${openAnim.to.left - openAnim.from.left}px, ${openAnim.to.top - openAnim.from.top}px)`
			: 'none'}
		style:transition-duration="{activeOpenMs}ms"
	>
		<img class="opening-fly-img" src={openAnim.src} alt="" />
	</div>
{/if}

<style>
	/* `--media-lightbox-thumbnail-fly-blur` (`.opening-fly`'s own blur radius,
	   further down) and `--media-lightbox-image-loading-blur` (the real stage
	   `<img>`'s own blur while `loading` — `.stage :global(img.media-lightbox-
	   loading)`, further down) are declared here at `:global(:root)`, not just
	   referenced via a `var(..., fallback)` at their usage sites — reported
	   live, 2026-07-19: "place at root" — so they show up as real, inspectable/
	   editable custom properties in devtools (under `:root`) immediately,
	   rather than only existing implicitly as a fallback until a consumer
	   happens to set them. The `var(..., fallback)` at each usage site stays
	   too, defensively, in case this rule's CSS hasn't loaded yet for any
	   reason. DELIBERATELY TWO SEPARATE properties, not one shared between
	   both usage sites — reported live, 2026-07-19: "make the root level css
	   blur var distinct from thumbnail fly blur and image loading blur." An
	   earlier version shared ONE variable between `.opening-fly` and the real
	   stage `<img>` specifically so the fly-clone-to-stage handoff (the clone
	   hands off to the real `.stage` image with `loading` still true) couldn't
	   pop from a mismatched blur value — see each rule's own comment further
	   down for that history. Splitting them reopens that exact handoff-pop
	   risk if a consumer sets the two to different values (as this file's OWN
	   defaults now do — 3px vs 5px, a visible but much smaller mismatch than
	   an earlier 0.5px vs 5px pairing that read as having no fly-blur at all)
	   — an accepted tradeoff per this ask, not an oversight; a consumer
	   wanting a seamless handoff should set both to the same value. */
	:global(:root) {
		--media-lightbox-thumbnail-fly-blur: 3px;
		--media-lightbox-image-loading-blur: 5px;
	}
	/* Token-pure by default (composite rule 8): the scrim/chrome colors are a
	   themeable CSS custom-property surface with semantic-token defaults, the
	   same pattern HScroller uses for its own fade/arrow colors (see
	   docs/kit/components/hscroller.md) — a FUTURE consumer that wants a fixed
	   always-dark look would override these from its OWN scoped CSS instead of
	   this file ever hardcoding a literal color. Photos' own Lightbox does NOT
	   do this today — it uses the theme-adaptive default as-is (see
	   media-lightbox.md's token-purity invariant for why). */
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		color: var(--media-lightbox-overlay-fg, var(--foreground));
		overscroll-behavior: contain;
	}
	.overlay.snapping {
		transition: background-color 0.22s cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Layered, not stacked: the media fills the ENTIRE overlay edge-to-edge
	   (`.stage` is `inset: 0`, not a shrunk grid row) and the header/filmstrip
	   float on top of it — an immersive/"lightbox" layout instead of the media
	   living in a boxed-in middle strip. See "Layout: layered, not stacked" in
	   docs/kit/components/media-lightbox.md for the full rationale + the focus
	   mode this layout enables. */
	.overlay-content {
		position: relative;
		width: 100%;
		height: 100%;
		/* No `background` of its own — `.media-lightbox-open-backdrop` (below, its first
		   child) owns providing the dark fill, so it can reveal it gradually on
		   open instead of it being opaque from frame 1. This ONLY works because
		   `.overlay` (this element's parent) also stays transparent except
		   during an active drawer drag — see the comment above `.overlay`'s
		   `style:background` binding in the markup. A solid background on
		   EITHER of these two ancestors unmasks it and defeats the reveal, even
		   though `.media-lightbox-open-backdrop`'s own opacity keeps animating correctly
		   (this shipped once as a BLOCKER, caught by review, precisely because
		   the backdrop element's own animation looked fine in isolation). */
	}
	.overlay-content.snapping {
		transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Dedicated backdrop-reveal element, mirroring `.closing-backdrop`'s own
	   proven mechanism (a JS-driven CSS `transition` + double-rAF paint-flush,
	   NOT a Svelte `in:` transition) instead of the previous approach of
	   fading `.overlay`'s own opacity (background + header + hidden stage
	   together) via `in:fade`. That bundled approach was the actual bug, not
	   just its duration: a Svelte `in:` transition's params are captured once,
	   at the moment the node mounts — which happens as part of the SAME
	   render pass that inserts `.overlay`, strictly BEFORE the `$effect`
	   (which sets `backdropRevealMs`'s own dependencies) has necessarily run,
	   since effects fire after DOM updates. Reported live, 2026-07-19, STILL
	   reproducing after a first attempt that only fixed the duration and kept
	   the `in:fade` mechanism: "still the same issue... shows its dark
	   backdrop immediately." The dialog itself (`.overlay`, focus trap, ARIA)
	   still mounts immediately regardless — a11y requires the interactive
	   shell to exist from frame 1, that part can't be deferred — but the
	   VISUAL backdrop reveal is now fully decoupled from that mount, driven
	   entirely by JS (`backdropIn`, see the open effect in the script) exactly
	   like `.closing-backdrop` already is during close. A permanent child
	   (not swapped out once settled) — same "one thing that's always there"
	   simplicity `.overlay-content`'s own static background used to have,
	   just now capable of animating its own reveal. */
	.media-lightbox-open-backdrop {
		position: absolute;
		inset: 0;
		background-color: var(--media-lightbox-overlay-bg, var(--background));
		opacity: 0;
		transition: opacity 200ms ease;
		pointer-events: none;
	}
	.media-lightbox-open-backdrop.in {
		opacity: 1;
	}
	.overlay-content.dragging,
	.overlay-content.snapping {
		will-change: transform;
	}
	header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		transition:
			opacity 0.25s ease,
			visibility 0.25s ease;
	}
	/* Scrim behind the floating header so its text/icons stay legible over
	   arbitrary image content — tints toward `--media-lightbox-overlay-bg` (the surface
	   color the header's own `--media-lightbox-overlay-fg` text is already designed to
	   contrast against), fading to nothing by the time it reaches the image.
	   A separate element (not the header's own background) so it can extend
	   well past the header's own height for a gradual fade, and so it never
	   interferes with the header's actual hit-testing/click targets (`inert`
	   to pointer events). */
	header::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		/* Same fix as `.media-lightbox-filmstrip-slot::before` below — 100%, not 200%, so the
		   fade resolves to transparent by the header's own real height instead of
		   still being visibly tinted there. */
		height: 100%;
		z-index: -1;
		background: linear-gradient(
			to bottom,
			color-mix(
				in oklch,
				var(--media-lightbox-overlay-bg, var(--background)) 65%,
				transparent
			),
			transparent
		);
		pointer-events: none;
	}
	header .title {
		flex: 1;
		text-align: center;
		font-weight: 600;
	}
	.actions {
		display: flex;
		gap: 0.25rem;
	}
	/* Focus mode: fade the floating header/filmstrip out (see MediaLightboxSvelte's
	   `focusMode` state) — `visibility` (not just `opacity`) so they're also
	   genuinely non-interactive and out of the a11y tree while hidden, without
	   needing a separate `pointer-events` override (a discrete property like
	   `visibility` still animates smoothly when paired with a `transition` — the
	   browser delays the hidden flip until the opacity fade finishes, and flips
	   to visible immediately on the way back in, which is why both are listed in
	   the `transition` shorthand above/below rather than just `opacity`). */
	.overlay-content.focus-mode header,
	.overlay-content.focus-mode .media-lightbox-filmstrip-slot {
		opacity: 0;
		visibility: hidden;
	}
	/* Same mechanism as focus mode above (opacity+visibility, so the chrome is
	   also non-interactive/out of the a11y tree while pending, not just
	   invisible), gated on `chromeReady` (see its own script comment) instead
	   of `focusMode` — the header/filmstrip stay hidden until the item's own
	   open animation has genuinely settled, then fade in via `header`'s/
	   `.media-lightbox-filmstrip-slot`'s own existing `transition: opacity 0.25s ease,
	   visibility 0.25s ease`, rather than popping in simultaneously with (or
	   ahead of) the item's own reveal. Reported live, 2026-07-19: "only fade
	   in the lightbox controls once the animation is completed." */
	.overlay-content.chrome-pending header,
	.overlay-content.chrome-pending .media-lightbox-filmstrip-slot {
		opacity: 0;
		visibility: hidden;
	}
	.overlay-content.reduce-motion header,
	.overlay-content.reduce-motion .media-lightbox-filmstrip-slot {
		transition-duration: 0s;
	}
	/* Keyboard nav: the nav arrows are clutter a keyboard-only user isn't
	   looking at (they're using Left/Right, not the buttons), so hide them even
	   past NavArrow's own hover-reveal. `keyboardArrowNavUsed` is reset in JS
	   (`ptrMove`), not by a `.stage:hover` CSS restore rule — an EARLIER version
	   used `:hover`, but `:hover` is a static "is the cursor currently within
	   bounds" check, not an event: if the mouse was already resting on `.stage`
	   (e.g. right after clicking a thumbnail to open) when an arrow key was
	   pressed, `:hover` was already true, so the suppression below never
	   visibly took effect at all (reported live, 2026-07-19: "still not
	   hiding"). `ptrMove` resets the flag only on a GENUINE fresh mouse
	   movement, so once it's false again, NavArrow's own normal hover-reveal
	   just works unmodified — no CSS restore rule needed here at all. Mouse-
	   only users never trigger `.keyboard-nav-used` in the first place, so
	   they're unaffected either way. */
	.overlay-content.keyboard-nav-used :global(.kit-nav-arrow) {
		opacity: 0;
	}
	.overlay-content.keyboard-nav-used :global(.kit-nav-arrow:focus-visible) {
		opacity: 1;
	}
	/* `.icon` is a small reusable icon-button contract available to `headerActions`
	   content too (not just the built-in close/focus-mode/info buttons) — global so
	   it also reaches buttons rendered by the consumer's snippet, which carries its
	   OWN Svelte scope, not this component's (Photos' own `headerActions` still uses
	   a plain `<button class="icon">`/`<span class="icon on">`, unconverted — see
	   `lightbox.md`). The 3 BUILT-IN buttons render via shadcn's `Button`
	   (`variant="ghost" size="icon-sm"`) instead of a hand-rolled `<button>` —
	   reported live, 2026-07-19: "make the lightbox toolbar icons proper shadcn
	   btns/icons" — for Button's own focus-ring/hover/disabled handling and
	   consistent sizing with the rest of the app's icon-only buttons (e.g.
	   `GridViewOptions`'s identical `ghost`/`icon-sm` pattern). `.icon` itself only
	   layers this component's own themed color/shape on top of that — this viewer
	   needs self-consistent overlay-chrome contrast regardless of the app's ambient
	   theme (same reasoning as the nav-pill/zoom-badge color pairing further down),
	   not a generic "override shadcn's own colors" pattern. */
	header :global(button.icon[data-slot='button']),
	header :global(span.icon) {
		/* Bounding-box centering, same technique as `NavArrow`'s own chevrons
		   (`display: grid; place-items: center`, see its doc comment) — needed for
		   Photos' own plain `<button class="icon">`, which has no default content-
		   centering of its own and whose native UA button padding (unset here, so
		   left at the browser default) isn't symmetric enough at this fixed
		   circular size to center the glyph/svg inside it (reported live,
		   2026-07-19: "the lightbox toolbar icons not having centered icons").
		   `Button`'s own base class already centers its children
		   (`inline-flex items-center justify-center`), so this is redundant but
		   harmless for the 3 built-in buttons — kept on the shared selector so
		   both paths behave identically rather than splitting the rule in two. */
		display: grid;
		place-items: center;
		color: var(--media-lightbox-overlay-fg, var(--foreground));
		border-radius: 50%;
	}
	/* No composite-local `:active` press-feedback rule needed here (unlike main's
	   independent line, which added one for its own hand-rolled `<button>` with no
	   `data-slot` — see docs/kit/components/press-feedback.md tier 3): shadcn's
	   `Button` always renders `data-slot="button"`, which the shared TIER-1 rule in
	   `packages/tokens/src/theme.css` (`[data-slot='button']:active { transform:
	   translateY(1px); transition-duration: 0.1s }`) already covers app-wide —
	   converting the 3 built-in buttons to `Button` got this for free. */
	/* `[data-slot='button']` in each selector below is a specificity bump, not a
	   functional requirement — `Button` always renders it. Without it, Tailwind's
	   own `dark:hover:bg-accent/50` utility on `Button`'s `ghost` variant (3
	   classes' worth of specificity via its `.dark` ancestor selector) can outrank
	   a plain `button.icon:hover` selector (2) in dark mode specifically, leaving
	   the wrong (accent-tinted) hover color visible there while light mode looked
	   correct — caught while converting the 3 built-in buttons to `Button` above. */
	header :global(button.icon[data-slot='button']:hover) {
		background: color-mix(
			in oklch,
			var(--media-lightbox-overlay-fg, var(--foreground)) 12%,
			transparent
		);
	}
	header :global(button.icon[data-slot='button'].on),
	header :global(span.icon.on) {
		color: var(--media-lightbox-icon-on, var(--destructive));
	}
	/* `transition-duration: 500ms` here is only the fallback for the brief gap
	   before JS's own `style:transition-duration` (bound in the template,
	   driven by `activeCloseMs`) takes over — it's always present by the time
	   this element actually mounts, but keeping this in sync with
	   `CLOSE_FLY_MS` avoids a mismatched flash if that binding were ever
	   removed. See `SLOWMO_FACTOR`'s own comment in the script for why the
	   real duration has to be dynamic (Shift-held slow-motion) rather than a
	   fixed CSS value. */
	.closing-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: var(--media-lightbox-overlay-bg, var(--background));
		pointer-events: auto;
		will-change: opacity;
		transition: opacity 500ms ease;
	}
	/* `overflow: hidden` clip box, its OWN `width`/`height` transitioned as real
	   layout properties (not `transform: scale()`) — replaces an EARLIER
	   version where `.closing-fly` was a single `<img>` non-uniformly
	   `transform: scale(w, h)`d from `from` to `to`. That STRETCHED the whole
	   (uncropped) image whenever `from`/`to` had different aspect ratios —
	   reported live, 2026-07-19: "open/close lightbox fly-in on non-justified
	   grid items squeezes the thumbnail item." Root cause: a grid tile in
	   square/non-justified layout is forced 1:1 and shows the photo via
	   `object-fit: cover` (a CROP, never a stretch — see `PhotoGrid.svelte`'s
	   `.tile-img`), but the OLD clone had no `object-fit` at all, so animating
	   its aspect-mismatched `from`→`to` visibly squished the whole photo
	   instead of cropping it the way the real tile does. Fixed by splitting
	   the clone into this clip box (`.closing-fly-clip`, sized/positioned to
	   `from`/`to`) plus an inner `<img>` (`.closing-fly-img`, always 100%×100%
	   of its parent with `object-fit: cover`) — the crop then follows
	   `object-fit: cover`'s own algorithm as the box resizes, automatically
	   matching the destination tile's crop with no manual crop-math needed.
	   Position (`left`/`top`, fixed at `from` for the WHOLE flight) still
	   moves via `transform: translate()` (GPU-cheap, no layout); only size
	   needs a real `width`/`height` transition, which is NOT GPU-accelerated —
	   a deliberate tradeoff (a short ~500ms clone is in practice not
	   perceptibly janky from this, even on modest hardware) over the
	   alternative (hand-rolled `clip-path`/scale math to keep everything on
	   `transform`), which was judged not worth the added complexity here. */
	.closing-fly-clip {
		position: fixed;
		z-index: 51;
		overflow: hidden;
		pointer-events: none;
		transform-origin: 0 0;
		transition:
			transform 500ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 500ms ease,
			width 500ms cubic-bezier(0.22, 1, 0.36, 1),
			height 500ms cubic-bezier(0.22, 1, 0.36, 1);
		will-change: transform, opacity, width, height;
	}
	/* `closeAnimation === 'scale'` fade-in-place case only (`closeAnim.to` is
	   null): a center scale-out reads as "shrinking away", which needs the
	   opposite transform-origin from the fly case above (which anchors at 0 0
	   because its own translate math already accounts for position — a scale
	   centered there would drift the image toward the top-left as it shrinks).
	   No crop question here — `width`/`height` never change in this fallback
	   (there's no `to` to fly toward), so `.closing-fly-img`'s `object-fit:
	   cover` is a no-op against a box that already matches the image's own
	   aspect (`from` was computed via `imageContentRect`, itself aspect-correct). */
	.closing-fly-clip.scale-out {
		transform-origin: center;
	}
	/* `max-width`/`max-height` override a global `img { max-width: 100% }`
	   reset (Tailwind's preflight, or any similar base stylesheet) — this
	   `<img>` is `position: fixed` and can legitimately need to render WIDER
	   than the viewport (e.g. flying from a zoomed-in stage image, whose
	   on-screen rect can exceed the viewport by the zoom factor). Without
	   this override the browser silently clips the image's rendered width to
	   the viewport while leaving `height` alone, visibly distorting its
	   aspect — reported live, 2026-07-19: "closing lightboxes with zoomed in
	   pictures shows a wrongly aspected fly-out-clone." The inline `width`/
	   `height` computed by the script were ALREADY aspect-correct in that
	   case (confirmed live via `getBoundingClientRect()`/`naturalWidth`
	   comparison); only the CSS reset's max-width was clipping the rendered
	   result, not the underlying math. */
	.closing-fly-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		max-width: none;
		max-height: none;
	}
	/* Mirrors `.closing-fly-clip`/`.closing-fly-img` above, for
	   `openAnimation === 'fly'` (see `startOpenFly`) — a decorative clone
	   flying FROM `flyRect()` TO the real stage image's own live rect, then
	   removed. No opacity transition (unlike close): the clone and the real
	   stage image underneath show the SAME src throughout (both start from
	   the placeholder — see "always the placeholder on open" in
	   media-lightbox.md), so there's nothing to fade; only its position/size
	   needs to animate. Unconditionally blurred (no `loading`-gated class,
	   unlike `.stage`'s own img below) — the clone only EVER shows the
	   placeholder, for its entire life, so there's no "is the real content
	   ready" question to ask for it; it's always the blurred stand-in. See
	   `loading`'s own prop doc for why this is what makes the settle-gate
	   this file used to need (`onOpenSettled`) unnecessary: the only thing
	   ever visible during the fly is this permanently-blurred clone, so the
	   real `.stage` (invisible throughout, see `.stage-fly-pending` below)
	   can safely just reflect `loading` directly the instant it's revealed,
	   with no risk of a premature sharp pop. */
	.opening-fly-clip {
		position: fixed;
		z-index: 52;
		overflow: hidden;
		pointer-events: none;
		transform-origin: 0 0;
		/* `--media-lightbox-thumbnail-fly-blur` — same custom-property override
		   surface as `--media-lightbox-overlay-bg` etc. (see "Theming" in
		   media-lightbox.md), exposed 2026-07-19 ("expose the blur amount as a
		   global var i can adjust in css / dev") so a consumer/devtools session
		   can override it without editing this file. On the CLIP box (not the
		   inner `<img>`) so the filter renders once against the composited,
		   already-cropped result rather than needing to be reapplied as the
		   inner image's own effective crop changes. A SEPARATE property from
		   `.stage :global(img.media-lightbox-loading)`'s own blur below
		   (`--media-lightbox-image-loading-blur`) — reported live, 2026-07-19:
		   "make the root level css blur var distinct from thumbnail fly blur
		   and image loading blur." An EARLIER version shared ONE property
		   between the two specifically so the clone-to-stage handoff (the
		   clone hands off to the real stage img with `loading` still true)
		   couldn't pop from a mismatched blur value — splitting them reopens
		   that risk if a consumer sets the two to different values (this
		   file's OWN defaults now do: 3px here vs 5px on the stage img — see
		   `:global(:root)`'s own comment further up for the accepted-tradeoff
		   framing). Value history: 14px ("too strong... 80% less or more") →
		   3px → 1px ("enough to hide low res artifacts") → 0.5px (further live
		   follow-up) → back up to 3px, 2026-07-19, once 0.5px turned out to
		   read as NO blur at all rather than a subtle one ("I'm sure there's no
		   blur applied" — confirmed live via a rAF-sampled `getComputedStyle`
		   trace that `blur(0.5px)` genuinely was applied throughout the flight;
		   the value was just perceptually below the threshold of visibility on
		   a real display, not a wiring bug). 14px's own problem was different
		   from "too subtle": blur's visual impact is nonlinear (most of a
		   linear-in-px transition from a large radius still LOOKS heavily
		   blurred until the very end, reading as a sudden "pop" to sharp even
		   though the underlying value is animating the whole time — confirmed
		   via a rAF-sampled trace, not a guess), so a smaller radius also keeps
		   the deblur transition (`--media-lightbox-deblur-ms`, see the script's
		   `DEBLUR_MS`) perceptually smooth; 3px stays well inside that
		   smooth-deblur range while no longer reading as invisible. */
		filter: blur(var(--media-lightbox-thumbnail-fly-blur, 3px));
		/* Must match `CLOSE_FLY_MS`/`OPEN_FLY_MS` (aliased to each other now —
		   see `OPEN_FLY_MS`'s own comment in the script). Fallback only, same
		   as `.closing-backdrop`/`.closing-fly-clip` above — the real duration
		   is JS's `style:transition-duration`, driven by `activeOpenMs`
		   (Shift-held slow-motion). */
		transition:
			transform 500ms cubic-bezier(0.22, 1, 0.36, 1),
			width 500ms cubic-bezier(0.22, 1, 0.36, 1),
			height 500ms cubic-bezier(0.22, 1, 0.36, 1);
		will-change: transform, width, height;
	}
	/* Same Tailwind-preflight `max-width: 100%` override as `.closing-fly-img`
	   above — see its own comment. */
	.opening-fly-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		max-width: none;
		max-height: none;
	}
	.stage {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		overflow: hidden;
		touch-action: none;
		overscroll-behavior: contain;
	}
	/* `openAnimation="fly"` mid-attempt (see `startOpenFly`): invisible for the
	   WHOLE flight, not just while the outcome is unknown — the real stage
	   reveals only once `.opening-fly`'s clone has actually finished landing
	   at its destination, so the destination is never already-fully-visible
	   underneath a still-animating clone. */
	.stage.stage-fly-pending {
		opacity: 0;
	}
	/* `.stage`'s 'scale' open animation — used BOTH by `openAnimation === 'scale'`
	   directly (class present from `.stage`'s very first render) AND by
	   `openAnimation === 'fly'`'s fallback once `flyRect()` fails to resolve a
	   usable rect (class added LATER, once that async outcome is known — see
	   `stageScaleReveal` and `stageIntro`'s own comments in the script for why
	   this has to be a plain CSS class rather than a second Svelte `in:`
	   transition). A keyframe `animation` (not a `transition`) is used
	   deliberately: it always plays from its own explicit `from` keyframe
	   regardless of the element's current computed style, so it animates
	   correctly whether the class was there from the start OR just added — a
	   `transition` would need an intermediate paint between two style writes to
	   have anything to interpolate from for the "just added" case (the same
	   double-rAF class of gotcha the close-fly avoids elsewhere in this file —
	   `@keyframes` sidesteps it, and unlike `transition`, DOES play automatically
	   on element insertion when already present, so it works for the
	   "there from the start" case too). ONE rule, ONE set of numbers — no
	   second copy to keep in sync by hand (an earlier version had exactly that,
	   and it silently drifted to a different easing than this same look's other
	   trigger point). */
	.stage.stage-scale-reveal {
		/* Must match the script's `STAGE_SCALE_MS` (`chromeReady`'s own timer for
		   this case reads that constant, not this literal — plain CSS `animation`
		   durations can't be JS-bound the way `activeOpenMs`/`activeCloseMs` are). */
		animation: media-lightbox-stage-scale-reveal 240ms linear;
	}
	@keyframes media-lightbox-stage-scale-reveal {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	/* The `slide` snippet's `<img>` carries the CONSUMER's Svelte scope, not this
	   component's — `:global()` is required for these rules to reach it. Order is
	   load-bearing: `.zooming` after the base rule so it wins while active, and
	   `.panning` declared LAST so it always overrides `.zooming` if the two overlap. */
	.stage :global(img) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		transform-origin: center center;
		/* `filter`'s duration is `--media-lightbox-deblur-ms` (set on `.stage` itself, see
		   `deblurMs` in the script) rather than a literal number, so the
		   deblur/sharpen transition can vary per-invocation — specifically, so
		   it can play back at `SLOWMO_FACTOR`x under Shift-held slow-motion the
		   same way the open/close fly already does (reported live, 2026-07-19:
		   "include it in the shift-triggered slowmotion"), AND so it stays
		   aliased to `OPEN_FLY_MS`/`CLOSE_FLY_MS` (`DEBLUR_MS`'s own script
		   comment) rather than drifting as its own independent number. The
		   `500ms` fallback (matching `DEBLUR_MS`'s current value) only applies
		   if `.stage` somehow isn't an ancestor (defensive; always is in
		   practice). */
		transition:
			transform 0.08s ease-out,
			filter var(--media-lightbox-deblur-ms, 500ms) ease-out;
		will-change: transform;
		cursor: zoom-in;
	}
	/* Blurred low-res placeholder; sharpens once `loading` flips false. No
	   filter transition here so the blur applies instantly (only the sharpen
	   animates, via the base rule). Driven by `ctx.loading` — the `slide`
	   snippet applies `class:media-lightbox-loading` to its own current `<img>` (see
	   `loading`'s doc comment in Props). NOT a blanket `.stage :global(img)`
	   descendant selector: an earlier version blurred every `<img>` under
	   `.stage`, which caught BOTH images during a consumer's cross-fade
	   (Photos' `Lightbox.svelte` keeps two `<img>`s alive for ~160ms on
	   navigate) — a BLOCKER caught by an independent-expert-review panel.
	   Scoping to a class the consumer applies to the specific element fixes
	   it, since only the consumer's own `slide` implementation knows which
	   `<img>` is current when more than one exists at once. */
	.stage :global(img.media-lightbox-loading) {
		/* `--media-lightbox-image-loading-blur` — its OWN custom property, distinct
		   from `.opening-fly`'s `--media-lightbox-thumbnail-fly-blur` above (see
		   that rule's own comment for why they're split, and the tradeoff that
		   reopens). Default 5px (bumped from an initial 2px the same day,
		   reported live: "the right feeling value is ... 5px") — stronger than
		   `.opening-fly`'s 3px default since this is the blur a viewer actually
		   lingers on while real content loads (a fresh open under 'fly', a
		   filmstrip navigate to an uncached photo), not a brief clone glimpsed
		   mid-flight, so it can afford — and benefits from — being more visible. */
		filter: blur(var(--media-lightbox-image-loading-blur, 5px));
		transition: transform 0.08s ease-out;
	}
	.stage.zoomed {
		cursor: zoom-out;
	}
	.stage.zoomed :global(img) {
		cursor: zoom-out;
		transition: none;
	}
	.stage.zooming :global(img) {
		/* Must match `ZOOM_ANIM_MS` (minus its 20ms buffer) in the script. */
		transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.stage.panning,
	.stage.panning :global(img) {
		cursor: grabbing;
	}
	.stage.panning :global(img) {
		transition: none;
	}
	/* Keyboard arrow-key panning while zoomed is a discrete PAN_STEP/
	   PAN_STEP_LARGE jump, not a continuous 1:1-tracked gesture like pointer-
	   drag panning or the wheel-zoom rAF loop (both of which need `.zoomed
	   :global(img)`'s `transition: none` above to stay lag-free, since they
	   already write a new transform every frame themselves) — so it should
	   ANIMATE the jump, the same way a discrete `+`/`-`/click zoom step does
	   via `.zooming` above. `animateKeyboardPan()` (script) sets this class for
	   `KEYBOARD_PAN_MS` (250ms) per key press; ordered after `.zoomed`/
	   `.panning` so it wins the cascade tie. Reported live, 2026-07-19: "zoomed
	   in: keyboard panning should be animated." */
	.stage.keyboard-panning :global(img) {
		transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Hides the actual OS cursor too, not just the nav arrows — reported live,
	   2026-07-19: "cursor should also hide after the same amount [as the
	   nav-arrow idle-fade]." Same `cursor-idle` class/timer as the nav-arrow
	   rule above; placed LAST among `.stage`'s own `cursor` rules so it wins
	   the equal-specificity tie against `.zoomed`/`.panning` regardless of
	   which gesture state was active right before the cursor went idle
	   (idle by definition means no active gesture is moving it anyway). */
	.stage.cursor-idle,
	.stage.cursor-idle :global(img) {
		cursor: none;
	}
	.zoom-badge {
		position: absolute;
		/* Clears a typical filmstrip's height now that `.stage` is full-bleed and
		   the filmstrip floats over its bottom edge (rather than living in a
		   separate row below it) — a generous, non-dynamic clearance, since the
		   composite doesn't know the consumer-supplied filmstrip's actual height.
		   See "Open design questions" in media-lightbox.md: a very tall
		   (user-resized) filmstrip can still overlap it. */
		bottom: 6rem;
		left: 50%;
		transform: translateX(-50%);
		background: color-mix(
			in oklch,
			var(--media-lightbox-overlay-bg, var(--background)) 60%,
			transparent
		);
		color: var(--media-lightbox-overlay-fg, var(--foreground));
		font-size: 0.8rem;
		padding: 0.2rem 0.6rem;
		border-radius: 12px;
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}
	/* Structure (position/size/border-radius/cursor), the hover-reveal-on-fine-
	   pointer / hidden-on-touch behavior, and the inactive/focus-visible dance are
	   all owned by NavArrow itself (`.kit-nav-arrow`) — this only supplies the
	   Lightbox-flavored visuals via :global(), since NavArrow renders in ITS OWN
	   component scope, not this file's. See NavArrow.svelte's doc comment. */
	:global(.media-lightbox-nav) {
		z-index: 2;
		--nav-arrow-size: 3rem;
		--nav-arrow-inset: 1rem;
		/* SAME-hue pairing as the header's own chrome — the pill tints with
		   `--media-lightbox-overlay-bg` (the surface color the header/filmstrip scrims also
		   use), and the icon uses `--media-lightbox-overlay-fg` (the ink color header icons
		   already use). This reads as genuinely dark chrome in dark mode (dark
		   pill, light icon) and genuinely light chrome in light mode, instead of
		   an earlier version that inverted the pairing (pill tinted with the
		   FOREGROUND color, icon in the background color) — that inversion did
		   guarantee contrast, but produced a pale/white pill in dark mode that
		   read as inconsistent with the rest of the (properly dark) chrome. See
		   media-lightbox.md's "Nav-pill / icon contrast" invariant for the
		   earlier, lower-contrast bug this design still avoids: `--media-lightbox-overlay-bg`/
		   `--media-lightbox-overlay-fg` are a complementary token pair by construction (this
		   app's own light/dark themes), so pairing pill-background with one and
		   icon-color with the other is contrasty in both themes without needing
		   to invert which token plays which role. */
		background: color-mix(
			in oklch,
			var(--media-lightbox-overlay-bg, var(--background)) 35%,
			transparent
		);
		color: var(--media-lightbox-overlay-fg, var(--foreground));
	}
	:global(.media-lightbox-nav:hover) {
		background: color-mix(
			in oklch,
			var(--media-lightbox-overlay-bg, var(--background)) 55%,
			transparent
		);
	}
	/* Reveal on hovering the stage (a fine pointer only — NavArrow itself hides
	   entirely on touch, see its own doc comment). The `:not()` is defensive,
	   not currently load-bearing (MediaLightbox always fully unmounts its nav
	   arrows at the item boundaries via {#if}, so `inactive`/kit-nav-arrow-
	   inactive never occurs here today) — kept symmetric with HScroller's own
	   hover-reveal rule so the same "don't re-show a boundary-inactive arrow on
	   hover" guarantee holds automatically if this component ever adopts
	   HScroller's mount-while-focused pattern instead of unmounting outright. */
	.stage:hover :global(.kit-nav-arrow:not(.kit-nav-arrow-inactive)) {
		opacity: 1;
	}
	/* Idle-fade: even while genuinely hovering, fade the arrows back out once
	   the cursor's sat still for `CURSOR_IDLE_MS` (see `cursorIdle` in the
	   script) — video-player-style auto-hide, reported live, 2026-07-19.
	   Higher specificity than the hover-reveal rule above (an extra class,
	   `.cursor-idle`) so it wins regardless of source order; `:not(:focus-
	   visible)` keeps a keyboard-focused arrow visible through idle
	   regardless (WCAG 2.4.7), the same carve-out `.keyboard-nav-used`
	   already makes below for its own suppression. */
	.stage.cursor-idle:hover
		:global(.kit-nav-arrow:not(.kit-nav-arrow-inactive):not(:focus-visible)) {
		opacity: 0;
	}
	/* Floats over the bottom edge of the now-full-bleed stage, sized to its own
	   content height (no `top`, so it doesn't stretch) — not `display:contents`
	   like `.media-lightbox-info-slot` below, since it needs a real box both to position
	   itself here and for the focus-mode fade transition above. Narrow enough
	   (just the filmstrip's own height) that it doesn't need a `pointer-events`
	   opt-out the way a full-`inset:0` overlay would — see media-lightbox.md's
	   "Layout: layered, not stacked" invariant for why `.media-lightbox-info-slot` stays
	   `display:contents` instead of getting the same treatment. */
	.media-lightbox-filmstrip-slot {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 3;
		/* Dimmed by default, full opacity on hover/keyboard-focus — reported
		   live, 2026-07-19: "the filmstrip should fade in full opacity when
		   gaining focus/pointer hover over." `:focus-within` (not just
		   `:hover`) so tabbing to a thumbnail inside also counts as "gaining
		   focus", not just a mouse hover. Reuses the SAME opacity transition
		   below (and its existing `.reduce-motion` override further up) for
		   both this dim/undim AND the focus-mode/chrome-pending hide states —
		   those hide rules win regardless (higher-or-equal specificity, see
		   their own comments) since a `visibility: hidden` element can't
		   actually receive hover/focus in the first place, so the two never
		   genuinely compete.
		   `opacity` is 0.5s, not `header`'s 0.25s — reported live, 2026-07-19:
		   "filmstrip hover/focus: fade should be 500ms." Since this same
		   transition also governs the focus-mode/chrome-pending hide (see
		   above), that fade is now 0.5s here too, slightly slower than
		   header's matching 0.25s fade — an accepted, deliberately scoped
		   side effect of the ask being specifically about the filmstrip, not
		   both floating-chrome elements. `visibility` stays 0.25s (it only
		   ever matters for the hide states, and shouldn't itself gate how
		   long the interactive dim/undim feels). */
		opacity: 0.6;
		transition:
			opacity 0.5s ease,
			visibility 0.25s ease;
	}
	.media-lightbox-filmstrip-slot:hover,
	.media-lightbox-filmstrip-slot:focus-within {
		opacity: 1;
	}
	.media-lightbox-filmstrip-slot::before {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		/* 100%, not 200% — the gradient below should fully resolve to transparent
		   BY the filmstrip's own real top edge, not still be visibly tinted there.
		   At 200% the opaque→transparent fade only reached its midpoint at 100% of
		   the filmstrip's actual height, leaving a visible tinted "bleed" above the
		   real strip instead of a clean fade (reported live, screenshot-confirmed). */
		height: 100%;
		z-index: -1;
		background: linear-gradient(
			to top,
			color-mix(
				in oklch,
				var(--media-lightbox-overlay-bg, var(--background)) 65%,
				transparent
			),
			transparent
		);
		pointer-events: none;
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
