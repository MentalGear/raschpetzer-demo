import { describe, it, expect } from 'vitest'
import { initWheelNav, feedWheel, resetWheelNav } from './wheelNav'

describe('wheelNav one-swipe gate', () => {
	it('ignores vertical-dominant deltas', () => {
		const s = initWheelNav()
		expect(feedWheel(s, 10, 40)).toBe(0)
		expect(feedWheel(s, -10, 40)).toBe(0)
		expect(s.accum).toBe(0)
	})

	it('accumulates small horizontal deltas, then steps once past threshold', () => {
		const s = initWheelNav()
		expect(feedWheel(s, 20, 0)).toBe(0) // 20 ≤ 35, no step yet
		expect(feedWheel(s, 20, 0)).toBe(1) // 40 > 35 → forward, then lock
		expect(s.locked).toBe(true)
	})

	it('a single strong flick steps immediately and in the swipe direction', () => {
		const s = initWheelNav()
		expect(feedWheel(s, -120, 0)).toBe(-1) // backward
		const s2 = initWheelNav()
		expect(feedWheel(s2, 120, 0)).toBe(1) // forward
	})

	it('absorbs the decaying momentum tail after a step (one swipe = one step)', () => {
		const s = initWheelNav()
		expect(feedWheel(s, 120, 0)).toBe(1) // step + lock
		// kinetic tail: decreasing deltas, none should produce another step
		for (const d of [90, 70, 50, 30, 18, 10, 6, 3, 1]) {
			expect(feedWheel(s, d, 0)).toBe(0)
		}
		expect(s.locked).toBe(true)
	})

	it('allows a deliberate back-to-back swipe only after the tail has decayed', () => {
		const s = initWheelNav()
		expect(feedWheel(s, 120, 0)).toBe(1) // step + lock
		// a strong push while still locked but BEFORE decay must not re-trigger
		expect(feedWheel(s, 80, 0)).toBe(0)
		// tail winds down (≤6 marks decayed)…
		expect(feedWheel(s, 4, 0)).toBe(0)
		expect(s.decayed).toBe(true)
		// …then a fresh strong push (>40) unlocks and the next accumulation steps
		expect(feedWheel(s, 120, 0)).toBe(1)
	})

	it('resetWheelNav clears the lock so the idle-timeout caller can unlock', () => {
		const s = initWheelNav()
		feedWheel(s, 120, 0)
		expect(s.locked).toBe(true)
		resetWheelNav(s)
		expect(s).toEqual({ accum: 0, locked: false, decayed: false })
		// after reset a normal flick steps again
		expect(feedWheel(s, 120, 0)).toBe(1)
	})
})
