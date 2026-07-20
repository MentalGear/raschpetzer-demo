/**
 * Trackpad horizontal-swipe → one-step navigation, as a pure reducer.
 *
 * Momentum (kinetic) scrolling fires a long tail of DECAYING wheel events after
 * the fingers lift. To make one swipe = exactly one step: after a step we LOCK,
 * and only unlock for a new step once the tail has clearly decelerated (|deltaX|
 * dipped near zero) AND a fresh, deliberate push re-accelerates. That decel→
 * reaccel buffer rejects the tail but lets intentional back-to-back swipes
 * through.
 *
 * Pure w.r.t. time: the idle-timeout unlock (a wall-clock concern) is the
 * caller's job — call `resetWheelNav` from that timer. Extracted from the
 * Lightbox so the gate is unit-testable (e2e only ever fires single deltas, never
 * a realistic momentum tail). Thresholds are Swiper-inspired.
 */
export interface WheelNavState {
	accum: number
	locked: boolean
	decayed: boolean
}

export function initWheelNav(): WheelNavState {
	return { accum: 0, locked: false, decayed: false }
}

export function resetWheelNav(s: WheelNavState): void {
	s.accum = 0
	s.locked = false
	s.decayed = false
}

/**
 * Whether a wheel event is a horizontal-dominant swipe (the only kind that
 * navigates). The single source of truth — `feedWheel` ignores anything this
 * rejects, and the caller uses it to decide whether to arm its idle-unlock timer,
 * so the dominance rule lives in exactly one place.
 */
export function isHorizontalWheel(deltaX: number, deltaY: number): boolean {
	return Math.abs(deltaX) > Math.abs(deltaY)
}

/**
 * Feed one wheel event's deltas; mutates `s` and returns the nav step:
 *   -1 = previous, +1 = next, 0 = no step (ignored / absorbed tail / accumulating).
 */
export function feedWheel(s: WheelNavState, deltaX: number, deltaY: number): -1 | 0 | 1 {
	const ax = Math.abs(deltaX)
	if (!isHorizontalWheel(deltaX, deltaY)) return 0 // vertical-dominant: ignore
	if (s.locked) {
		if (ax < 6) s.decayed = true // kinetic tail has wound down (Swiper: ≤6px)
		// only a deliberate, strong push AFTER the tail decayed counts as a new
		// swipe — a high floor (40) so a single non-monotonic flick can't re-trigger
		if (s.decayed && ax > 40) {
			s.locked = false
			s.decayed = false
			s.accum = 0
		} else {
			return 0
		}
	}
	s.accum += deltaX
	// short flick threshold: a brief two-finger swipe should already advance
	if (Math.abs(s.accum) > 35) {
		const step = s.accum < 0 ? -1 : 1
		s.accum = 0
		s.locked = true
		s.decayed = false
		return step
	}
	return 0
}
