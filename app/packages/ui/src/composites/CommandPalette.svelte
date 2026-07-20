<!--
	Command palette composite — a ⌘K-triggered modal search+run interface driven
	entirely by the `CommandRegistry`. Domain-free: knows how to render the
	palette and dispatch to the registry, never which commands exist.

	Built on the shadcn-svelte Bits-based `Command` + `CommandDialog` primitives.
	A11y/keyboard nav is inherited from Bits — not re-derived here.

	## How it works

	1. The palette reads `registry.list()` to get all registered commands.
	2. Commands with a `title` are shown; those without are skipped (palette is
	   opt-in per command — add `title` to surface a command here).
	3. Commands are filtered by `registry.isEnabled(id, ctx)` — disabled commands
	   are omitted. (Unlike the context menu where disabled = greyed; here disabled
	   = hidden, so the palette stays clean.)
	4. Commands are grouped by `command.group` (ungrouped ones go in a "General"
	   group). A `keybinding` hint on the command is shown next to the title.
	5. Selecting an item calls `registry.run(id, ctx)` then closes the palette.

	## ⌘K / Ctrl+K

	Opening on ⌘K/Ctrl+K is handled by a local `keydown` listener on `document`
	(attached via onMount, SSR-safe). The `open` prop is `$bindable` — consumers
	can also control it programmatically (e.g. a toolbar button).

	## Accessibility

	- Wrapped in `CommandDialog` which supplies a visually-hidden `Dialog.Title`
	  and `Dialog.Description` for screen readers.
	- A custom `ariaLabel` prop overrides the dialog title (for i18n).
	- Keyboard: arrow keys to navigate, Enter to run, Escape to close — all from
	  Bits.
	- No `prefers-reduced-motion` JS animation — the Dialog uses CSS transitions
	  managed by Bits/shadcn; no custom JS animation in this composite.

	RTL: logical CSS properties used where layout matters (Bits handles the list
	layout). The keybinding `kbd` hint is inline-start-anchored by flex. RTL: N/A
	(Bits list is direction-aware; no JS pixel offsets here).
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import { cn } from '@kit/ui/shadcn-utils'
	import * as Command from '@kit/ui/shadcn-components/ui/command'
	import { getCommandRegistryOptional, type CommandRegistry } from './commands'
	import type { CommandCtx } from '@kit/core'

	interface Props {
		/**
		 * Whether the palette is open. `$bindable` — consumers can bind to control
		 * it programmatically (e.g. a toolbar button or the ⌘K listener here).
		 */
		open?: boolean
		/**
		 * Called when the open state changes (rule 11 — paired with `$bindable`).
		 */
		onOpenChange?: (open: boolean) => void
		/**
		 * Accessible label for the dialog (the visually-hidden title).
		 * Defaults to `"Command palette"`.
		 */
		ariaLabel?: string
		/** Placeholder text for the command search input. */
		placeholder?: string
		/** Runtime context passed to `when` predicates and command handlers. */
		ctx?: CommandCtx
		/**
		 * The registry to read commands from and dispatch through. Defaults to
		 * the one provided by `setCommandRegistry()` in an ancestor component.
		 * Pass explicitly in stories/tests.
		 */
		registry?: CommandRegistry
		/** Extra classes applied to the command dialog root (layout/sizing). */
		class?: string
	}

	let {
		open = $bindable(false),
		onOpenChange,
		ariaLabel = 'Command palette',
		placeholder = 'Search commands…',
		ctx = {},
		registry: registryProp,
		class: className,
	}: Props = $props()

	// getContext must run during component init (synchronously).
	const contextRegistry = getCommandRegistryOptional()
	const registry = $derived.by((): CommandRegistry => {
		const r = registryProp ?? contextRegistry
		if (!r) {
			throw new Error(
				'[CommandPalette] no CommandRegistry — pass `registry` prop or call setCommandRegistry() in a parent.',
			)
		}
		return r
	})

	// Notify unidirectional consumers on open-state CHANGES only — skip the initial
	// mount call (open hasn't "changed" yet), so observers don't get a phantom event.
	let prevOpen = untrack(() => open)
	$effect(() => {
		if (open === prevOpen) return
		prevOpen = open
		onOpenChange?.(open)
	})

	// Group the enabled, titled commands for rendering.
	interface GroupedCommand {
		id: string
		title: string
		group: string
		keybinding?: string
	}
	interface CommandGroup {
		name: string
		commands: GroupedCommand[]
	}

	const grouped = $derived.by((): CommandGroup[] => {
		// NOTE: this derives from `registry.list()` — a plain (non-reactive) registry in
		// the framework-agnostic `@kit/core`, so it can't hold `$state`. The tracked deps
		// are `ctx` + the `registry` reference: `when`/enabled gating IS live (rides on
		// `ctx`), but commands (de)registered on the SAME registry instance after mount
		// won't re-group until `ctx`/`registry` changes. Apps register commands once at
		// setup (as this one does), so it's a non-issue here; document if that changes.
		// Use a plain object to accumulate groups (avoids SvelteMap requirement).
		const acc: Record<string, GroupedCommand[]> = {}
		for (const cmd of registry.list()) {
			if (!cmd.title) continue
			if (!registry.isEnabled(cmd.id, ctx)) continue
			const group = cmd.group ?? 'General'
			if (!acc[group]) acc[group] = []
			acc[group].push({ id: cmd.id, title: cmd.title, group, keybinding: cmd.keybinding })
		}
		return Object.entries(acc).map(([name, commands]) => ({ name, commands }))
	})

	function runCommand(id: string): void {
		registry.run(id, ctx)
		open = false
	}

	// Platform-aware modifier symbols for the keybinding hint. Detected in onMount
	// (SSR-safe; navigator is not read at top level — rule 14).
	let isMac = $state(false)
	const MOD_SYMBOL: Record<string, string> = {
		mod: '⌘', // replaced with 'Ctrl' on non-mac below
		meta: '⌘',
		cmd: '⌘',
		super: '⌘',
		ctrl: '⌃',
		control: '⌃',
		shift: '⇧',
		alt: '⌥',
		option: '⌥',
		enter: '↵',
		escape: 'Esc',
		esc: 'Esc',
	}
	/** Format a chord token (`mod+shift+t`) into per-key display strings (`['⌘','⇧','T']`). */
	function formatChord(chord: string): string[] {
		return chord.split('+').map((raw) => {
			const p = raw.trim().toLowerCase()
			if (
				p === 'mod' ||
				p === 'meta' ||
				p === 'cmd' ||
				p === 'super' ||
				p === 'ctrl' ||
				p === 'control'
			) {
				// `mod` = ⌘ on mac, Ctrl elsewhere; a literal ctrl stays ⌃/Ctrl.
				if (p === 'ctrl' || p === 'control') return isMac ? '⌃' : 'Ctrl'
				return isMac ? '⌘' : 'Ctrl'
			}
			if (MOD_SYMBOL[p]) return MOD_SYMBOL[p]
			return raw.trim().length === 1 ? raw.trim().toUpperCase() : raw.trim()
		})
	}

	// ⌘K / Ctrl+K → toggle the palette. SSR-safe: inside onMount.
	onMount(() => {
		isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
		function handleKeyDown(event: KeyboardEvent): void {
			// Require plain ⌘K / Ctrl+K — exclude ⌘⇧K / ⌘⌥K (common devtools/browser
			// combos) so they aren't swallowed and don't spuriously toggle the palette.
			if (
				(event.metaKey || event.ctrlKey) &&
				!event.shiftKey &&
				!event.altKey &&
				event.key.toLowerCase() === 'k'
			) {
				event.preventDefault()
				open = !open
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	})
</script>

<Command.Dialog
	bind:open
	title={ariaLabel}
	description="Type to search for a command."
	class={cn(className)}
>
	<Command.Input {placeholder} />
	<Command.List>
		<Command.Empty>No commands found.</Command.Empty>
		{#each grouped as { name: groupName, commands } (groupName)}
			<Command.Group heading={groupName}>
				{#each commands as cmd (cmd.id)}
					<!-- key the item by the UNIQUE command id (two commands can share a
					     human title); keep it searchable by title via `keywords`. -->
					<Command.Item
						value={cmd.id}
						keywords={[cmd.title]}
						onSelect={() => runCommand(cmd.id)}
						class="touch-target"
					>
						<span class="flex-1">{cmd.title}</span>
						{#if cmd.keybinding}
							<Command.Shortcut>
								{#each formatChord(cmd.keybinding) as k (k)}
									<kbd class="font-mono text-xs">{k}</kbd>
								{/each}
							</Command.Shortcut>
						{/if}
					</Command.Item>
				{/each}
			</Command.Group>
		{/each}
	</Command.List>
</Command.Dialog>
