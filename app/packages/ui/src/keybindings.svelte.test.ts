import { describe, it, expect } from 'vitest'
import { eventToChord } from './keybindings.svelte'

/** Build a KeyboardEvent with the fields eventToChord reads. */
function ev(
	key: string,
	mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {},
) {
	return new KeyboardEvent('keydown', { key, ...mods })
}

describe('eventToChord', () => {
	it('maps meta/ctrl to mod and lowercases the key', () => {
		expect(eventToChord(ev('K', { metaKey: true }))).toBe('mod+k')
		expect(eventToChord(ev('k', { ctrlKey: true }))).toBe('mod+k')
	})

	it('keeps a separate shift token for LETTERS (shift+k, not the produced case)', () => {
		// Shift+K reports event.key === 'K'; the binding convention is "shift+k".
		expect(eventToChord(ev('K', { shiftKey: true }))).toBe('shift+k')
		expect(eventToChord(ev('L', { metaKey: true, shiftKey: true }))).toBe('mod+shift+l')
	})

	it('does NOT add shift for a bare "/" typed WITHOUT shift (US layout)', () => {
		expect(eventToChord(ev('/'))).toBe('/')
	})

	it('does NOT double-count shift for "/" typed WITH shift (QWERTZ: "/" is Shift+7)', () => {
		// The regression: event.key === '/' but shiftKey is true. Must still be "/".
		expect(eventToChord(ev('/', { shiftKey: true }))).toBe('/')
	})

	it('binds shifted punctuation by the produced character, not the physical key', () => {
		// Shift+/ on US produces '?'. The chord is the character '?', bindable directly.
		expect(eventToChord(ev('?', { shiftKey: true }))).toBe('?')
		expect(eventToChord(ev('!', { shiftKey: true }))).toBe('!')
	})

	it('keeps shift for named (multi-char) keys', () => {
		expect(eventToChord(ev('Enter', { shiftKey: true }))).toBe('shift+enter')
		expect(eventToChord(ev('ArrowUp', { shiftKey: true }))).toBe('shift+arrowup')
	})

	it('composes mod+alt with a letter', () => {
		expect(eventToChord(ev('K', { metaKey: true, altKey: true }))).toBe('mod+alt+k')
	})
})
