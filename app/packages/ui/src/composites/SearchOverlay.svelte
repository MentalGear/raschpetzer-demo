<!--
	SearchOverlay composite — a modal search surface that overlays the current view:
	a query input + dynamic filter rows (FilterRows) + a virtualized result grid
	(VirtualGrid) + optional suggestion chips and a "Show all" affordance.

	Domain-free and fully controlled: the caller owns the query, the filter fields,
	the (already-filtered) result `items`, and every navigation. This composite only
	renders the overlay and forwards events — it never searches or fetches.

	## Composition
	- Shell: shadcn-svelte `Dialog` (Bits UI) → focus trap, Esc-to-close, and
	  focus-return to the trigger are INHERITED, not re-derived (contract rule 9).
	- Scope: an optional, always-visible `SegmentedControl` (e.g. "All | Recent"),
	  labelled "Scope", above the search input when the caller passes `scope` — a
	  linear, single-select toggle (not a breadcrumb), so the user always sees
	  where a search is happening and can change it directly.
	- Input: `InputGroup` with a search icon; fires `onQuery` per keystroke (the
	  caller debounces + derives `items`).
	- Filters: the `FilterRows` composite, bound to `rows`.
	- Results: `VirtualGrid` over a single trivial section built from `items`; the
	  per-tile markup is the caller's `tile` snippet (bring-your-own-data).

	## Accessibility
	- Focus trap + return-focus on close come from the Dialog primitive (Bits).
	- The dialog has an accessible title (`ariaLabel`, visually hidden) + description.
	- The search input is labelled; the clear button + icon are labelled/hidden.
	- No JS-driven animation here (the Dialog uses Bits/shadcn CSS transitions), so
	  `prefers-reduced-motion` is N/A for this composite.
	- RTL: layout uses fl/grid + logical spacing; no JS pixel offsets. RTL: OK.

	## Theming
	Semantic tokens only (rule 8); theme-aware (light/dark) — NOT always-dark like the
	Lightbox. The content uses `bg-background/95 backdrop-blur-xl`.
-->
<script lang="ts" module>
	export interface SearchScopeOption {
		value: string
		label: string
	}
</script>

<script lang="ts" generics="T">
	import { cn } from '@kit/ui/shadcn-utils'
	import * as Dialog from '@kit/ui/shadcn-components/ui/dialog'
	import * as InputGroup from '@kit/ui/shadcn-components/ui/input-group'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Search, X } from '@lucide/svelte'
	import { untrack, type Snippet } from 'svelte'
	import type { Section } from '@kit/core'
	import FilterRows, { type FilterFieldDef, type FilterRow } from './FilterRows.svelte'
	import VirtualGrid from './VirtualGrid.svelte'
	import SegmentedControl from './SegmentedControl.svelte'

	interface Props {
		/** Whether the overlay is open. `$bindable`; also mirrored by `onOpenChange` (rule 11). */
		open?: boolean
		/** Fired when the open state changes (rule 11, paired with the `open` bindable). */
		onOpenChange?: (open: boolean) => void
		/** Fired specifically when the overlay requests to close (Esc / backdrop / close button). */
		onClose?: () => void

		/** Current query text (controlled by the caller). */
		query?: string
		/** Fired on every keystroke in the search input — the caller debounces + filters. */
		onQuery?: (query: string) => void
		/** Placeholder for the search input. */
		placeholder?: string

		/** Optional, always-visible scope options (e.g. "All | Recent" or
		 *  "All | <collection>") rendered as a labelled `SegmentedControl` above the
		 *  search input, so the caller always knows where a search is happening and
		 *  can adjust it. Omit for a plain, unscoped search. */
		scope?: SearchScopeOption[]
		/** Current scope value. `$bindable`; also mirrored by `onScopeChange` (rule 11). */
		scopeValue?: string
		/** Fired when the scope selection changes (rule 11, paired with `scopeValue`). */
		onScopeChange?: (value: string) => void
		/** Forwarded to the scope `SegmentedControl`'s own `itemClass` — pass the same
		 *  function used by any other `SegmentedControl` in the app (e.g. a grouping
		 *  switch) so the selected-segment style matches across the app instead of
		 *  silently falling back to the primitive's plain default. */
		scopeItemClass?: (value: string, selected: boolean) => string

		/** The caller-filtered result set. */
		items: T[]
		/** Per-tile markup for a result (forwarded to VirtualGrid). */
		tile: Snippet<[T, number, { width: number; height: number }]>
		/** Accessible label for a single result cell (forwarded to VirtualGrid). */
		itemLabel?: (item: T, index: number) => string
		/** Uniform tile aspect ratio (w/h); results render as a square-ish wall by default. */
		aspect?: number
		/** VirtualGrid target row height. */
		targetRowHeight?: number
		/** Fired when a result is activated (Enter/click) — index into `items`. */
		onActivate?: (index: number) => void

		/** Filter field definitions (from the app layer). */
		fields?: FilterFieldDef[]
		/** Current filter rows. `$bindable`; also mirrored by `onRowsChange`. */
		rows?: FilterRow[]
		/** Fired after every filter-row mutation (paired with the `rows` bindable). */
		onRowsChange?: (rows: FilterRow[]) => void

		/** Suggestion chips shown when there's no query and no active filter. */
		suggestions?: string[]
		/** Total available results (for the "Show all" label). */
		totalCount?: number
		/** Fired when "Show all" is pressed — the caller navigates to the full results page. */
		onShowAll?: () => void

		/** Accessible dialog title (visually hidden). */
		ariaLabel?: string
		/** Extra classes merged onto the dialog content (rule 13). */
		class?: string
	}

	let {
		open = $bindable(false),
		onOpenChange,
		onClose,
		query = '',
		onQuery,
		placeholder = 'Search…',
		scope,
		scopeValue = $bindable(''),
		onScopeChange,
		scopeItemClass,
		items,
		tile,
		itemLabel,
		aspect = 1,
		targetRowHeight = 140,
		onActivate,
		fields = [],
		rows = $bindable([]),
		onRowsChange,
		suggestions = [],
		totalCount,
		onShowAll,
		ariaLabel = 'Search',
		class: className,
	}: Props = $props()

	// Notify one-way consumers on open-state CHANGES only — skip the initial mount
	// call (open hasn't "changed" yet), so observers don't get a phantom event.
	let prevOpen = untrack(() => open)
	$effect(() => {
		if (open === prevOpen) return
		prevOpen = open
		onOpenChange?.(open)
	})

	const hasFilter = $derived(rows.some((r) => r.field))
	const isEmpty = $derived(!query && !hasFilter)
	// A single trivial section over the result set — `Section` is the domain-free
	// @kit/core shape; VirtualGrid ignores section titles here (empty title).
	const sections = $derived<Section[]>(
		items.length
			? [
					{
						key: 'results',
						title: '',
						startIndex: 0,
						endIndex: items.length,
						count: items.length,
					},
				]
			: [],
	)
	// Stable aspect accessor so VirtualGrid's layout model doesn't rebuild needlessly.
	const aspectOf = () => aspect

	function requestClose() {
		onClose?.()
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && requestClose()}>
	<Dialog.Content
		class={cn(
			'flex max-h-[85vh] w-[min(92vw,720px)] flex-col gap-3 overflow-hidden bg-background/95 p-4 backdrop-blur-xl sm:max-w-[720px]',
			className,
		)}
	>
		<Dialog.Header class="sr-only">
			<Dialog.Title>{ariaLabel}</Dialog.Title>
			<Dialog.Description
				>Search and filter, then open a result or show all.</Dialog.Description
			>
		</Dialog.Header>

		{#if scope?.length}
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-muted-foreground">Scope</span>
				<SegmentedControl
					options={scope}
					value={scopeValue}
					onValueChange={(v) => {
						scopeValue = v
						onScopeChange?.(v)
					}}
					itemClass={scopeItemClass}
					aria-label="Search scope"
				/>
			</div>
		{/if}

		<form role="search" onsubmit={(e) => e.preventDefault()}>
			<InputGroup.Root>
				<InputGroup.Addon>
					<Search aria-hidden="true" />
				</InputGroup.Addon>
				<InputGroup.Input
					value={query}
					{placeholder}
					aria-label={ariaLabel}
					oninput={(e) => onQuery?.((e.currentTarget as HTMLInputElement).value)}
				/>
				{#if query}
					<InputGroup.Addon align="inline-end">
						<InputGroup.Button
							size="icon-xs"
							aria-label="Clear search"
							onclick={() => onQuery?.('')}
						>
							<X aria-hidden="true" />
						</InputGroup.Button>
					</InputGroup.Addon>
				{/if}
			</InputGroup.Root>
		</form>

		{#if fields.length}
			<FilterRows bind:value={rows} onValueChange={onRowsChange} {fields} oneRowPerField />
		{/if}

		{#if isEmpty && suggestions.length}
			<div class="p-2 text-muted-foreground">
				<p class="text-sm">Try searching for:</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each suggestions as s (s)}
						<Button
							variant="outline"
							size="sm"
							class="touch-target rounded-full"
							onclick={() => onQuery?.(s)}
						>
							{s}
						</Button>
					{/each}
				</div>
			</div>
		{:else if items.length === 0}
			<p class="p-6 text-center text-muted-foreground" role="status" aria-live="polite">
				No results{query ? ` for “${query}”` : ''}.
			</p>
		{:else}
			<!-- Definite height (not flex-1): the dialog content is only `max-h` (no fixed
			     height), so a `flex-1 min-h-0` child collapses to ~0 and the virtualized
			     grid — which needs a measured viewport — renders its absolutely-positioned
			     tiles OUTSIDE the content box, over the overlay (unclickable, escaping the
			     card). A bounded definite height gives VirtualGrid a real viewport. -->
			<div class="relative h-[min(60vh,460px)] overflow-hidden">
				<VirtualGrid
					{items}
					{sections}
					{tile}
					{targetRowHeight}
					aspect={aspectOf}
					{itemLabel}
					ariaLabel="Search results, {items.length} items"
					{onActivate}
				/>
			</div>
			{#if onShowAll}
				<div class="flex justify-end">
					<Button variant="ghost" size="sm" onclick={onShowAll}>
						Show all{totalCount != null ? ` ${totalCount.toLocaleString()}` : ''} results
					</Button>
				</div>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
