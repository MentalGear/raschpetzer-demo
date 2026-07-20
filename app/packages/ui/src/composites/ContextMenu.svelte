<!--
	Config-driven context menu: right-click a `trigger` to open a menu built from a
	declarative `MenuItem[]` (see docs/kit/04). Behavior is dispatched through the
	command registry — items reference command ids, never inline handlers — so the
	same config also feeds toolbars/palette/keybindings.

	Domain-free: knows how to render a menu and run a command id, never which
	commands exist. a11y/keyboard nav is inherited from the shadcn/Bits UI
	primitive — not re-derived here.

	`when` semantics (docs/kit/04 §12): item-level `when` HIDES (filtered by
	`resolveMenu`); a command's `when` DISABLES (rendered greyed). Separators are
	tidied (no leading/trailing/adjacent) by `resolveMenu`.

	**Controlled/programmatic mode:** when `trigger` is omitted, the menu is driven
	externally via `bind:open` + `x`/`y` viewport coordinates. The content is
	anchored to a virtual element (Bits `customAnchor` / Measurable interface) at
	those coordinates — no DOM trigger element is mounted. This mode enables a single
	hoisted menu opened by mouse right-click OR keyboard (WCAG 2.1.1).
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte'
	import type { CommandCtx } from '@kit/core'
	import { resolveMenu, isSeparator, isSubmenu } from '@kit/core'
	import { getCommandRegistryOptional, type CommandRegistry } from './commands'
	import type { MenuItem, Icon } from './commands'
	import * as CM from '@kit/ui/shadcn-components/ui/context-menu'

	interface Props {
		/** Declarative menu model (typically from an app config file). */
		items: MenuItem[]
		/** Runtime context passed to `when` predicates and command handlers. */
		ctx?: CommandCtx
		/** Registry to dispatch through. Defaults to the one in Svelte context. */
		registry?: CommandRegistry
		/**
		 * The right-clickable content (trigger mode).
		 * When omitted, the menu is in controlled/programmatic mode: bind `open`,
		 * `x`, and `y` to drive it from outside (no trigger element is rendered).
		 */
		trigger?: Snippet
		/** Extra classes for the menu surface. */
		contentClass?: string
		/**
		 * Extra classes applied to the trigger wrapper element.
		 * Use `triggerClass="contents"` (Tailwind) or pass a custom class with
		 * `display:contents` to make the trigger wrapper layout-transparent —
		 * required when the trigger must fill an existing container exactly
		 * (e.g. a VirtualGrid tile button).
		 */
		triggerClass?: string
		/**
		 * Inline style applied to the trigger wrapper element.
		 * Pass `"display:contents"` to make the wrapper layout-transparent when
		 * the trigger must fill an existing container exactly (e.g. a VirtualGrid
		 * tile button). Takes effect even when Tailwind has not scanned the usage
		 * site for the equivalent `contents` utility class.
		 */
		triggerStyle?: string
		/**
		 * Controlled open state (programmatic mode).
		 * Bind this to open/close the menu from outside (requires no `trigger`
		 * snippet). When the Bits primitive closes (Esc / click-outside), it writes
		 * `false` back through this binding.
		 */
		open?: boolean
		/**
		 * Called when the menu open state changes (controlled/programmatic mode).
		 * Mirrors the `open` binding for unidirectional consumers (rule 11).
		 */
		onOpenChange?: (open: boolean) => void
		/**
		 * Viewport X coordinate (px) for the virtual anchor in programmatic mode.
		 * The menu content will be positioned relative to this point.
		 */
		x?: number
		/**
		 * Viewport Y coordinate (px) for the virtual anchor in programmatic mode.
		 * The menu content will be positioned relative to this point.
		 */
		y?: number
	}
	let {
		items,
		ctx = {},
		registry: registryProp,
		trigger,
		contentClass,
		triggerClass,
		triggerStyle,
		open = $bindable(false),
		onOpenChange,
		x = 0,
		y = 0,
	}: Props = $props()

	// Notify unidirectional consumers on open-state CHANGES only — skip the initial
	// mount call (open hasn't "changed" yet), so observers don't get a phantom event.
	let prevOpen = untrack(() => open)
	$effect(() => {
		if (open === prevOpen) return
		prevOpen = open
		onOpenChange?.(open)
	})

	// getContext must run during init; read it once (non-throwing) so a `registry`
	// prop (stories/tests) can stand in without a provider. The prop stays
	// reactive via `$derived`; we only fall back to context, then error if neither.
	const contextRegistry = getCommandRegistryOptional()
	const registry = $derived.by((): CommandRegistry => {
		const r = registryProp ?? contextRegistry
		if (!r)
			throw new Error(
				'[ContextMenu] no CommandRegistry — pass `registry` or set one in context.',
			)
		return r
	})

	const resolved = $derived(resolveMenu(items, ctx))

	// Programmatic mode: build a Measurable virtual element at (x, y) so Bits'
	// floating-ui layer positions the content at the pointer/keyboard coordinates.
	// The DOMRect is 0×0 at the target point — Bits positions the menu relative to
	// it exactly as it would for a right-click on a real trigger.
	const virtualAnchor = $derived.by(() => ({
		getBoundingClientRect(): DOMRect {
			return new DOMRect(x, y, 0, 0)
		},
	}))
</script>

{#if trigger}
	<!-- Trigger mode: wraps content with a right-clickable element. -->
	<CM.Root>
		<CM.Trigger class={triggerClass} style={triggerStyle}>{@render trigger()}</CM.Trigger>
		<CM.Content class={contentClass}>
			{@render menu(resolved)}
		</CM.Content>
	</CM.Root>
{:else}
	<!-- Programmatic/controlled mode: no trigger element; menu opens via bind:open
	     anchored to the virtual element at (x, y). The CM.Trigger is a zero-size
	     visually-hidden element required by Bits for context registration only;
	     the actual position comes from customAnchor on CM.Content. -->
	<CM.Root bind:open>
		<CM.Trigger style="display:none" aria-hidden="true"></CM.Trigger>
		<CM.Content class={contentClass} customAnchor={virtualAnchor}>
			{@render menu(resolved)}
		</CM.Content>
	</CM.Root>
{/if}

{#snippet menu(list: MenuItem[])}
	{#each list as item (item.id)}
		{#if isSeparator(item)}
			<CM.Separator />
		{:else if isSubmenu(item)}
			<CM.Sub>
				<CM.SubTrigger class="touch-target"
					>{@render label(item.icon, item.label)}</CM.SubTrigger
				>
				<CM.SubContent>{@render menu(item.children)}</CM.SubContent>
			</CM.Sub>
		{:else}
			<CM.Item
				disabled={!registry.isEnabled(item.command, ctx)}
				onSelect={() => registry.run(item.command, ctx)}
				class="touch-target"
			>
				{@render label(item.icon, item.label)}
				{#if item.shortcut}<CM.Shortcut><kbd>{item.shortcut}</kbd></CM.Shortcut>{/if}
			</CM.Item>
		{/if}
	{/each}
{/snippet}

{#snippet label(icon: Icon | undefined, text: string)}
	{#if icon}
		<!-- Alias required: Svelte cannot use an arbitrary expression directly as a component tag. -->
		{@const IconComponent = icon}
		<IconComponent aria-hidden="true" />
	{/if}
	<span>{text}</span>
{/snippet}
