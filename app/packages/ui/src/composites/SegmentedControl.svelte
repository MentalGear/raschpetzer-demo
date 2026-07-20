<!--
	SegmentedControl composite — a single-select, always-visible linear group of
	options ("segments"), for switching a view mode or scope directly (e.g. the
	Photos library's Days/Months/Years/All grouping switch, or a search scope
	toggle) — as opposed to a breadcrumb/drill-down control.

	## Composition
	- Built on shadcn-svelte `ToggleGroup` (Bits UI, single-select mode) — `role="radio"`
	  items in a `role="group"`, NOT `Tabs`. This control drives EXTERNAL state (what a
	  grid/search elsewhere shows) — it doesn't own content panels of its own. bits-ui's
	  `Tabs` computes `aria-controls` from a registered `Tabs.Content` for each value;
	  with no `Tabs.Content` anywhere (there's nothing to show — this composite doesn't
	  render panels), that `aria-controls` stays permanently unset, leaving the WAI-ARIA
	  tabs pattern's tab/tabpanel pairing half-fulfilled. `ToggleGroup`'s radio-group
	  semantics carry no such expectation — a `role="radio"` set never implies a
	  controlled panel, so there's no unfulfilled contract either way.
	- No hover lift — hover has no `transform`, only the selected state (background +
	  shadow + font-weight, see Theming below) moves the needle visually. A gentle
	  press-down is kept as tactile click feedback, via the kit-wide
	  `[data-slot='toggle-group-item']:active` rule in `@kit/tokens` (`theme.css`) —
	  not a local class here (promoted so every `ToggleGroup.Item`/`Button`/`Toggle`
	  consumer gets it for free, not just this composite).
	- Visual style matches the original hand-rolled pill (pre-`Tabs`, pre-`ToggleGroup`
	  iteration): a `bg-secondary` rounded track with padding, individually-rounded
	  borderless segments with a small gap between them — not `ToggleGroup`'s default
	  "joined strip" look (shared borders, `spacing={0}`). Achieved with a fixed
	  `spacing` + `variant="default"` (no per-item border) baked in, not exposed as a
	  prop — this composite's whole reason to exist is looking like a segmented
	  control, not a joined toggle strip.

	## Accessibility
	- `role="radio"`/`role="group"`, roving tabindex, and keyboard nav (arrow keys move
	  focus, Enter/Space activates the focused segment) are inherited from bits-ui
	  `ToggleGroup` — not re-derived (rule 9).
	- `aria-label` is required (rule: named interactive regions need an accessible name).
	- No JS-driven animation (the press-down feedback is pure CSS `transform`/
	  `transition`), so `prefers-reduced-motion` is N/A for this composite.
	- RTL: layout is a plain flex row from `ToggleGroup`, no JS pixel offsets. RTL: OK.

	## Theming
	Semantic tokens only (rule 8). The selected segment gets a strong default look
	baked into every item — `bg-segment-selected` + `shadow-[...]` + `font-semibold` —
	not just `ToggleGroup.Item`'s own `data-[state=on]:bg-muted` (too close in value to
	the `bg-secondary` track to read as selected — confirmed live via computed
	background color: nearly indistinguishable without the focus ring), and NOT
	`bg-background` either: `--background` is the lightest token in the light palette
	(reads as elevated) but the darkest/base token in the dark palette (reads as
	recessed) — an app-level `itemClass` override was the only way to get correct dark
	elevation until `--color-segment-selected` was promoted into the `@kit/tokens`
	contract (see `theme.css`) as this component's own baked-in default, consistent in
	both themes without any per-consumer override. `itemClass` remains an *additive*
	override on top of this default for anything beyond color (e.g. Photos' dev-only
	accent A/B), not the only source of visual distinction.

	## Per-item content
	Three levels, each optional and additive over the last (all backward-compatible —
	a plain `{value,label}` option renders exactly as before):
	1. **Text only** (default) — just `opt.label`.
	2. **`icon`** — a leading Lucide icon component before the label, using Button's own
	   `data-icon="inline-start"` convention (the shared `toggleVariants` base this
	   composite sits on already carries that selector's spacing/sizing rules, so icons
	   size and space correctly with zero extra CSS here).
	3. **`item` snippet** — full custom per-segment content (e.g. the SAME icon at a
	   different visual scale per option, or anything neither `label` nor `icon` can
	   express), overriding the default label/icon render entirely for every segment.
	   Takes over accessible naming too: with `item` supplied, give each `SegmentedOption`
	   an `aria-label`-worthy `label` anyway (it's still what a screen reader announces
	   unless the snippet's own markup sets its own accessible name) — the snippet only
	   replaces the VISUAL content, not the option's identity.
-->
<script lang="ts" module>
	import type { LucideIcon } from '@lucide/svelte'

	export interface SegmentedOption {
		value: string
		label: string
		/** Optional leading icon (Lucide icon component — the kit's icon contract, see
		 *  `composites/commands.ts`). Ignored when the root `item` snippet is supplied. */
		icon?: LucideIcon
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte'
	import * as ToggleGroup from '@kit/ui/shadcn-components/ui/toggle-group'
	import { cn } from '@kit/ui/shadcn-utils'

	interface Props {
		/** The available segments, in display order. */
		options: SegmentedOption[]
		/** Current selection. `$bindable`; also mirrored by `onValueChange` (rule 11). */
		value?: string
		/** Fired when the selection changes (rule 11, paired with the `value` bindable). */
		onValueChange?: (value: string) => void
		/** Forwarded to every `ToggleGroup.Item`. */
		size?: 'default' | 'sm' | 'lg'
		/** Accessible name for the group (required — no visible label is implied). */
		'aria-label': string
		/** Optional per-item class override, e.g. a custom selected-segment color —
		 *  called with (value, selected) for every option. */
		itemClass?: (value: string, selected: boolean) => string
		/** Extra classes merged onto the root (rule 13). */
		class?: string
		/** Full custom per-segment content, overriding the default icon+label render for
		 *  EVERY option (see "Per-item content" above). Receives the option and whether
		 *  it's currently selected. */
		item?: Snippet<[SegmentedOption, { selected: boolean }]>
	}
	let {
		options,
		value = $bindable(''),
		onValueChange,
		size = 'sm',
		'aria-label': ariaLabel,
		itemClass,
		class: className,
		item,
	}: Props = $props()

	// ToggleGroup.Root (bits-ui, single-select) deselects on re-clicking the active
	// segment, flipping its own internal `value` to "". We always want exactly one
	// segment active (data-driven, never none), so that deselect must be rejected —
	// but rejecting it by simply not updating `value` isn't enough: since `value` is
	// passed down as a plain prop (not `bind:value`), an unchanged value never
	// re-syncs down to the child, leaving its internal state stuck at "" (segment
	// looks unselected) while our own `value` is still correct. Binding through a
	// local variable forces the resync on every click, including deselect attempts.
	let internalValue = $derived(value)
</script>

<ToggleGroup.Root
	type="single"
	{size}
	variant="default"
	spacing={2}
	bind:value={internalValue}
	onValueChange={(v) => {
		if (!v) {
			internalValue = value
			return
		}
		value = v
		onValueChange?.(v)
	}}
	aria-label={ariaLabel}
	class={cn('rounded-lg bg-secondary p-0.5', className)}
>
	{#each options as opt (opt.value)}
		{@const selected = value === opt.value}
		<ToggleGroup.Item
			value={opt.value}
			class={cn(
				'touch-target',
				'data-[state=on]:bg-segment-selected data-[state=on]:font-semibold data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
				itemClass?.(opt.value, selected),
			)}
		>
			{#if item}
				{@render item(opt, { selected })}
			{:else if opt.icon}
				{@const Icon = opt.icon}
				<Icon data-icon="inline-start" />
				{opt.label}
			{:else}
				{opt.label}
			{/if}
		</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>
