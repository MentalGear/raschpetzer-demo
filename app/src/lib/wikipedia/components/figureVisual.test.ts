import { describe, it, expect } from 'vitest'
import { TONES, toneClassForTone } from './figureVisual'

describe('toneClassForTone', () => {
	it('returns TONES[tone] for in-range tones', () => {
		for (let tone = 0; tone < TONES.length; tone++) {
			expect(toneClassForTone(tone)).toBe(TONES[tone])
		}
	})

	it('wraps out-of-range and negative tones via a sign-safe modulo', () => {
		expect(toneClassForTone(TONES.length)).toBe(TONES[0])
		expect(toneClassForTone(TONES.length + 1)).toBe(TONES[1])
		expect(toneClassForTone(-1)).toBe(TONES[TONES.length - 1])
		expect(toneClassForTone(-TONES.length)).toBe(TONES[0])
	})
})
