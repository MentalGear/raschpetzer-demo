/**
 * Pure keybinding resolver — no Svelte/DOM. Parses chord strings and matches
 * them against a `KeybindingConfig` to return a `CommandId`.
 *
 * Chord format: modifier(s) joined by `+`, then the key name. Order of modifiers
 * within the chord does not matter during matching (both `"shift+mod+k"` and
 * `"mod+shift+k"` match the same physical key combination). Keys are
 * case-insensitive (`"K"` == `"k"`).
 *
 * Supported modifiers:
 *   `mod`   — ⌘ on macOS / Ctrl elsewhere (platform detection happens in the UI
 *              layer; the resolver receives an already-normalized chord where the
 *              physical key has been mapped to `mod`).
 *   `ctrl`  — explicit Ctrl (distinct from `mod` only when the app needs to
 *              differentiate ⌘ from Ctrl — uncommon).
 *   `shift` — Shift key.
 *   `alt`   — Alt / Option key.
 *   `meta`  — OS/Super key (pass-through; rarely used in web apps).
 *
 * Platform neutrality: this module is pure TypeScript — no `navigator`, no
 * `window`, no `KeyboardEvent`. The UI layer normalizes the physical event into a
 * chord string (e.g. maps `metaKey` on macOS → `mod`) before calling `matchChord`.
 */

import type { CommandId, KeybindingConfig } from './types'

/** The recognized modifier tokens (module-scoped — not re-allocated per parse). */
const MODIFIERS = new Set(['mod', 'ctrl', 'shift', 'alt', 'meta'])

/**
 * A parsed, normalized chord — an immutable value type used internally for
 * comparison. Modifiers are stored as a frozen boolean set; the key is
 * lowercased.
 */
export interface NormalizedChord {
	readonly mod: boolean
	readonly ctrl: boolean
	readonly shift: boolean
	readonly alt: boolean
	readonly meta: boolean
	readonly key: string
}

/**
 * Parse a chord string such as `"mod+k"`, `"shift+/"`, or `"mod+shift+enter"`
 * into a `NormalizedChord`. Modifier names are case-insensitive; the key is the
 * final non-modifier segment, also lowercased.
 *
 * Modifier order does not matter: `"shift+mod+k"` and `"mod+shift+k"` produce
 * identical `NormalizedChord` values.
 *
 * Throws if the chord string is empty or has no non-modifier segment.
 *
 * @example
 * parseChord("mod+k")          // { mod:true, key:"k", ... }
 * parseChord("shift+/")        // { shift:true, key:"/", ... }
 * parseChord("mod+shift+enter") // { mod:true, shift:true, key:"enter", ... }
 */
export function parseChord(chord: string): NormalizedChord {
	if (!chord || !chord.trim()) {
		throw new Error(`[keybindings] parseChord: empty chord string`)
	}

	// Split on `+` — but a bare `+` key is valid (e.g. `"shift++"`).
	// We handle the edge case: if the chord ends with `++`, the last `+` is the key.
	// Trim each segment so `"mod + k"` normalizes the same as `"mod+k"` (whitespace
	// around `+` shouldn't fold into the key and silently break matching).
	const parts = chord
		.toLowerCase()
		.split('+')
		.map((p) => p.trim())

	const mods = { mod: false, ctrl: false, shift: false, alt: false, meta: false }
	const nonModParts: string[] = []

	for (const part of parts) {
		if (MODIFIERS.has(part)) {
			mods[part as keyof typeof mods] = true
		} else {
			nonModParts.push(part)
		}
	}

	// `nonModParts` can be empty if someone wrote `"mod"` alone — the key is `mod`
	// itself (unusual but valid for passthrough). More commonly, one non-modifier part.
	// If there are multiple non-modifier parts, the user likely used a `+` as a key
	// name (e.g. `"shift++"` splits to `["shift","",""]` — join back to `""`).
	// The key is the joined remaining segment (empty string → `"+"` when the only
	// split artifact is from a trailing `+`).
	let key: string
	if (nonModParts.length === 0) {
		throw new Error(
			`[keybindings] parseChord: no key segment found in chord "${chord}". ` +
				`The key must follow the modifiers (e.g. "mod+k", "shift+/").`,
		)
	} else if (nonModParts.length === 1) {
		key = nonModParts[0]
		if (key === '') {
			// e.g. chord = "shift++" → split ["shift","",""] → non-mods = ["",""]
			// handled below
			key = '+'
		}
	} else {
		// Multiple non-modifier parts: joining them back with `+` recovers the key.
		// e.g. `"shift++"` → parts `["shift","",""]` → nonModParts `["",""]`
		//      → joined `"+"` → key is `"+"`
		key = nonModParts.join('+')
		if (key === '') key = '+'
	}

	return Object.freeze({ ...mods, key })
}

/**
 * Return `true` if two `NormalizedChord` values represent the same physical key
 * combination.
 */
export function chordsEqual(a: NormalizedChord, b: NormalizedChord): boolean {
	return (
		a.mod === b.mod &&
		a.ctrl === b.ctrl &&
		a.shift === b.shift &&
		a.alt === b.alt &&
		a.meta === b.meta &&
		a.key === b.key
	)
}

/**
 * Given a `KeybindingConfig` and a pre-normalized chord (from the UI layer),
 * return the first matching `CommandId`, or `undefined` if no binding matches.
 *
 * Bindings are evaluated in order. A binding with a `when` predicate matches ONLY
 * if the predicate passes — and it **fails closed**: if the binding has a `when`
 * but no `ctx` was supplied, the binding is skipped (an un-evaluatable guard must
 * not fire; e.g. a `when: c => !c.readOnly` delete binding must not trigger when the
 * caller forgot to pass `ctx`).
 *
 * @param config  - The `KeybindingConfig` array to search.
 * @param chord   - The already-normalized chord to match against.
 * @param ctx     - Optional runtime context passed to `when` predicates.
 *
 * @example
 * const config: KeybindingConfig = [{ command: 'palette.open', key: 'mod+k' }]
 * const chord = parseChord('mod+k')
 * matchChord(config, chord) // → 'palette.open'
 */
export function matchChord(
	config: KeybindingConfig,
	chord: NormalizedChord,
	ctx?: Record<string, unknown>,
): CommandId | undefined {
	for (const binding of config) {
		let bindingChord: NormalizedChord
		try {
			bindingChord = parseChord(binding.key)
		} catch {
			// Malformed binding — skip it.
			continue
		}

		if (!chordsEqual(bindingChord, chord)) continue

		// Optional `when` predicate — FAIL CLOSED: a guarded binding never fires
		// without a ctx to evaluate against (an un-evaluatable guard must not pass).
		if (binding.when) {
			if (!ctx || !binding.when(ctx)) continue
		}

		return binding.command
	}
	return undefined
}
