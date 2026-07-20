/**
 * Keybinding action for @kit/ui — attaches a global `keydown` listener that
 * resolves pressed chords to command ids via the @kit/core pure resolver and
 * dispatches them through the supplied `CommandRegistry`.
 *
 * SSR-safe: all browser API access (`addEventListener`, `removeEventListener`,
 * `document`) lives inside the returned cleanup function / $effect callbacks —
 * this module is safe to import server-side.
 *
 * Platform: normalizes ⌘ (metaKey on macOS) and Ctrl to `mod` so the resolver
 * stays platform-agnostic.
 *
 * @module
 */

import { onMount } from 'svelte'
import { parseChord, matchChord } from '@kit/core'
import type { KeybindingConfig, CommandCtx } from '@kit/core'
import type { CommandRegistry } from './composites/commands'

/** Tags that are always "typing" — key events while focused here are ignored. */
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Returns `true` if the currently focused element is a text-input context
 * (input, textarea, select, or contenteditable) where most key events should
 * NOT trigger commands.
 *
 * Pass `isGlobal = true` to bypass this check for commands that must fire even
 * while typing (e.g. ⌘K to open the palette).
 */
function isTypingContext(): boolean {
	const el = document.activeElement
	if (!el) return false
	if (TYPING_TAGS.has(el.tagName)) return true
	if ((el as HTMLElement).isContentEditable) return true
	return false
}

/**
 * Normalize a `KeyboardEvent` into a chord string that the @kit/core resolver
 * understands:
 *
 * - `metaKey` (⌘ on macOS)  → `mod`
 * - `ctrlKey` (Ctrl)         → `mod`   (both map to `mod` for cross-platform shortcuts)
 * - `shiftKey`               → `shift`
 * - `altKey`                 → `alt`
 * - `key` is lowercased and used as-is.
 *
 * Note: `ctrl` vs `cmd` cannot be distinguished in cross-platform mode — if an
 * app needs to distinguish them, add a `rawCtrl` modifier and bypass this helper.
 *
 * Shift handling: `event.key` already encodes Shift for printable NON-letter
 * characters (`/` vs `?`, `1` vs `!`), and WHICH physical key+Shift yields a given
 * punctuation char is layout-dependent (on German QWERTZ `/` is Shift+7). Emitting a
 * synthetic `shift` token for those double-counts Shift and makes a bare-punctuation
 * binding like `"/"` unmatchable on any layout that needs Shift to type it. So we only
 * emit `shift` for letters (`k` → `shift+k`, matching a `"shift+k"` binding) and named
 * multi-char keys (`Enter`, `Tab`, `ArrowUp`); a punctuation/digit character carries its
 * own Shift and binds by the produced character (`"?"`, not `"shift+/"`).
 *
 * Exported for unit testing.
 */
export function eventToChord(event: KeyboardEvent): string {
	const parts: string[] = []
	if (event.metaKey || event.ctrlKey) parts.push('mod')
	// A single printable non-letter char (`/`, `?`, `!`, `.`) already bakes Shift into
	// the character; only letters and named keys take a separate `shift` token.
	const key = event.key
	const shiftBakedIntoKey = key.length === 1 && !/[a-z]/i.test(key)
	if (event.shiftKey && !shiftBakedIntoKey) parts.push('shift')
	if (event.altKey) parts.push('alt')
	parts.push(key.toLowerCase())
	return parts.join('+')
}

export interface UseKeybindingsOptions {
	/** The keybinding config mapping command ids to chord strings. */
	config: KeybindingConfig
	/** The command registry to dispatch through. */
	registry: CommandRegistry
	/**
	 * Runtime context passed to `when` predicates and command handlers.
	 *
	 * Pass a **getter** (`() => ctx`) when the context is reactive — it is called
	 * fresh on every keydown, so a `$derived` read inside it stays current. A plain
	 * value is read once at call time and then frozen (it will NOT track updates),
	 * so only use the value form for a genuinely static context.
	 *
	 * @example ctx: () => ({ readOnly: isReadOnly, selection })  // reactive
	 */
	ctx?: CommandCtx | (() => CommandCtx)
	/**
	 * Set of command ids that fire even while the user is typing in an
	 * input/textarea/select/contenteditable (global shortcuts).
	 * Defaults to an empty set.
	 *
	 * @example `globalCommands: new Set(['palette.open'])`
	 */
	globalCommands?: Set<string>
}

/**
 * Attach a global `keydown` listener inside an `onMount` / cleanup cycle.
 *
 * Call this once during component initialization (not inside an effect). The
 * listener is automatically removed when the component is destroyed.
 *
 * **Usage inside a `.svelte` component:**
 * ```svelte
 * <script lang="ts">
 *   import { useKeybindings } from '@kit/ui'
 *   import { getCommandRegistry } from '@kit/ui'
 *
 *   const registry = getCommandRegistry()
 *   const ctx = $derived(...)
 *
 *   useKeybindings({
 *     config: myKeybindingConfig,
 *     registry,
 *     ctx,
 *     globalCommands: new Set(['palette.open']),
 *   })
 * </script>
 * ```
 */
export function useKeybindings(options: UseKeybindingsOptions): void {
	onMount(() => {
		// Resolve `ctx` fresh on every event: if a getter was supplied, call it so a
		// reactive `$derived` read stays current; otherwise use the (static) value.
		const resolveCtx = (): CommandCtx | undefined =>
			typeof options.ctx === 'function' ? (options.ctx as () => CommandCtx)() : options.ctx

		function handleKeyDown(event: KeyboardEvent): void {
			// Never intercept when a modifier-free printable character is typed
			// in a typing context (and the shortcut isn't a global).
			const chordStr = eventToChord(event)
			const ctx = resolveCtx()
			let commandId: string | undefined

			try {
				const chord = parseChord(chordStr)
				commandId = matchChord(
					options.config,
					chord,
					ctx as Record<string, unknown> | undefined,
				)
			} catch {
				// Malformed chord (e.g. bare modifier key tap) — ignore.
				return
			}

			if (!commandId) return

			// If in a typing context and this is not a global command, skip.
			if (isTypingContext() && !options.globalCommands?.has(commandId)) return

			// Don't swallow the keystroke for a command that's disabled by its command-level
			// `when` — otherwise a key bound to a gated command (e.g. delete-on-selection)
			// would cancel the browser default (Backspace-navigation, etc.) and do nothing.
			if (!options.registry.isEnabled(commandId, ctx ?? {})) return

			// Prevent the browser's own handler (e.g. ⌘K for address bar).
			event.preventDefault()
			options.registry.run(commandId, ctx ?? {})
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	})
}
