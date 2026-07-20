import { describe, it, expect } from 'vitest'
import { parseChord, chordsEqual, matchChord } from './keybindings'
import type { KeybindingConfig } from './types'

describe('parseChord', () => {
	it('parses a simple mod+key chord', () => {
		const c = parseChord('mod+k')
		expect(c).toMatchObject({ mod: true, ctrl: false, shift: false, alt: false, key: 'k' })
	})

	it('parses shift+/ (non-letter key)', () => {
		const c = parseChord('shift+/')
		expect(c).toMatchObject({ shift: true, mod: false, key: '/' })
	})

	it('parses a chord with multiple modifiers', () => {
		const c = parseChord('mod+shift+k')
		expect(c).toMatchObject({ mod: true, shift: true, ctrl: false, key: 'k' })
	})

	it('modifier order does not affect the result (shift+mod+k == mod+shift+k)', () => {
		const a = parseChord('shift+mod+k')
		const b = parseChord('mod+shift+k')
		expect(chordsEqual(a, b)).toBe(true)
	})

	it('is case-insensitive for both modifiers and the key', () => {
		const a = parseChord('MOD+K')
		const b = parseChord('mod+k')
		expect(chordsEqual(a, b)).toBe(true)
	})

	it('trims whitespace around segments so "mod + k" == "mod+k"', () => {
		expect(chordsEqual(parseChord('mod + k'), parseChord('mod+k'))).toBe(true)
	})

	it('still parses the literal "+" key (shift++)', () => {
		expect(parseChord('shift++')).toMatchObject({ shift: true, key: '+' })
	})

	it('parses a bare key with no modifiers', () => {
		const c = parseChord('escape')
		expect(c).toMatchObject({
			mod: false,
			ctrl: false,
			shift: false,
			alt: false,
			key: 'escape',
		})
	})

	it('parses all modifier variants', () => {
		const c = parseChord('ctrl+alt+meta+shift+mod+enter')
		expect(c).toMatchObject({
			ctrl: true,
			alt: true,
			meta: true,
			shift: true,
			mod: true,
			key: 'enter',
		})
	})

	it('throws on an empty string', () => {
		expect(() => parseChord('')).toThrow()
	})

	it('throws on a whitespace-only string', () => {
		expect(() => parseChord('   ')).toThrow()
	})

	it('returns a frozen (immutable) chord object', () => {
		const c = parseChord('mod+k')
		expect(Object.isFrozen(c)).toBe(true)
	})
})

describe('chordsEqual', () => {
	it('returns true for identical chords', () => {
		const a = parseChord('mod+k')
		const b = parseChord('mod+k')
		expect(chordsEqual(a, b)).toBe(true)
	})

	it('returns false for different keys', () => {
		const a = parseChord('mod+k')
		const b = parseChord('mod+j')
		expect(chordsEqual(a, b)).toBe(false)
	})

	it('returns false for different modifier sets', () => {
		const a = parseChord('mod+k')
		const b = parseChord('shift+k')
		expect(chordsEqual(a, b)).toBe(false)
	})

	it('returns false when one chord has an extra modifier', () => {
		const a = parseChord('mod+shift+k')
		const b = parseChord('mod+k')
		expect(chordsEqual(a, b)).toBe(false)
	})
})

describe('matchChord', () => {
	const config: KeybindingConfig = [
		{ command: 'palette.open', key: 'mod+k' },
		{ command: 'help.toggle', key: 'shift+/' },
		{ command: 'item.delete', key: 'backspace', when: (c) => !c['readOnly'] },
	]

	it('returns the matching command id for a plain binding', () => {
		const chord = parseChord('mod+k')
		expect(matchChord(config, chord)).toBe('palette.open')
	})

	it('returns the second binding when the first does not match', () => {
		const chord = parseChord('shift+/')
		expect(matchChord(config, chord)).toBe('help.toggle')
	})

	it('returns undefined for a chord that matches nothing', () => {
		const chord = parseChord('ctrl+z')
		expect(matchChord(config, chord)).toBeUndefined()
	})

	it('returns the conditional binding when ctx satisfies the when predicate', () => {
		const chord = parseChord('backspace')
		const result = matchChord(config, chord, { readOnly: false })
		expect(result).toBe('item.delete')
	})

	it('skips the conditional binding when ctx fails the when predicate', () => {
		const chord = parseChord('backspace')
		const result = matchChord(config, chord, { readOnly: true })
		expect(result).toBeUndefined()
	})

	it('FAILS CLOSED: a when-gated binding does NOT fire when no ctx is provided', () => {
		const chord = parseChord('backspace')
		// No ctx → the guard can't be evaluated → the binding must NOT match
		// (an un-evaluatable `when: c => !c.readOnly` delete must not fire).
		const result = matchChord(config, chord)
		expect(result).toBeUndefined()
	})

	it('an UNGUARDED binding still matches with no ctx', () => {
		expect(matchChord(config, parseChord('mod+k'))).toBe('palette.open')
	})

	it('returns undefined for an empty config', () => {
		const chord = parseChord('mod+k')
		expect(matchChord([], chord)).toBeUndefined()
	})

	it('returns the first match in a config with multiple bindings for the same key', () => {
		const multiConfig: KeybindingConfig = [
			{ command: 'first.cmd', key: 'mod+k' },
			{ command: 'second.cmd', key: 'mod+k' },
		]
		const chord = parseChord('mod+k')
		expect(matchChord(multiConfig, chord)).toBe('first.cmd')
	})

	it('modifier order independence: mod+shift+k matches a "shift+mod+k" binding', () => {
		const cfg: KeybindingConfig = [{ command: 'test.cmd', key: 'shift+mod+k' }]
		const chord = parseChord('mod+shift+k')
		expect(matchChord(cfg, chord)).toBe('test.cmd')
	})
})
