<!--
	DataTable composite — a faceted, sortable LIST view (v1) powered by the headless
	`@tanstack/table-core` engine via the shadcn-svelte `data-table` helper
	(`createSvelteTable`). See docs/research/datatable-libs-2026-07.md for the engine choice and
	docs/kit/components/data-table.md for the full contract.

	## Composition
	- Engine: `createSvelteTable` (shadcn-svelte `data-table` recipe) wired with
	  `getCoreRowModel` + `getSortedRowModel` + `getFilteredRowModel` + `getFacetedRowModel`
	  + `getFacetedUniqueValues`. Two kinds of TanStack columns are built from the
	  domain-free specs the consumer supplies: **display columns** (`columns` prop — drive
	  the sort Select + the built-in text filter) and **facet columns** (`facets` prop —
	  never rendered, exist purely so the faceted row model can compute live per-value
	  counts and `arrIncludesSome` can filter on them). Pure column-building logic lives in
	  `./DataTable.helpers.ts` (unit-tested there).
	- Toolbar: a labelled `InputGroup` text filter (TanStack's built-in global filter),
	  rendered only when at least one `columns` entry is `filterable` (otherwise it'd be a
	  dead no-op) + a `Select`-based single-column sort control (labelled, not header
	  buttons — no `aria-sort` needed per the composite contract's a11y note) whose first
	  item is a real, selectable "Unsorted" option that resets `sorting` to `[]`.
	- Facet bar: **two interchangeable UIs over the identical filter semantics** (OR within a
	  facet, AND across facets — never re-derived per style, both drive the same
	  `column.setFilterValue`/`columnFilters`):
	  - `facetStyle: 'checkboxes'` (default): one labelled `<fieldset>` per facet, each a
	    `Checkbox` + `Label` per live-counted value. Originally the only style — see the
	    2026-07 header note below for why `FilterRows` wasn't used for this shape.
	  - `facetStyle: 'rows'`: every facet's checkboxes are replaced by ONE `FilterRows`
	    instance (`[field Select] [value Select] [remove]` + "Add filter"), each facet
	    becoming a `FilterFieldDef` whose `values` are that facet's live-counted entries
	    (`"Blue (145)"`). `FilterRows` owns row identity/add/remove (`bind:value`); its
	    `onValueChange` groups rows by field (`facetRowsToFilterValues`, in
	    `DataTable.helpers.ts`) and writes each facet's resulting value array through
	    `column.setFilterValue` — the exact same call the checkbox UI's `toggleFacet` makes,
	    so nothing about the underlying filtering changes, only the input UI. Multiple rows
	    for the same field union their values (OR-within-facet), matching the checkbox UI's
	    multi-select. Added 2026-07-18 alongside `toolbarInCollapsible` below, per direct
	    feedback that the filter bar should be expressible as `FilterRows`-style
	    field-is-value rows — see `docs/kit/components/notes-table.md`.
	  - **2026-07 note on why `FilterRows` wasn't simply forced onto the checkbox shape
	    instead of adding a second style:** a facet needs **OR within the group, AND across
	    groups** with a running count next to each value; `FilterRows` is a
	    single-Select-per-row AND-filter-row *builder* with no multi-select/OR-within-group
	    shape of its own — reusing it as a 1:1 checkbox replacement would mean re-deriving a
	    checkbox group on top of it anyway. `facetStyle: 'rows'` instead leans into what
	    `FilterRows` actually IS (an add-a-row builder) and gets OR-within-a-facet from
	    *multiple rows targeting the same field*, which is a legitimate, different UI for the
	    identical semantics — not a forced fit.
	- Rows: the consumer's `row` snippet, one per `table.getRowModel().rows`, in a plain
	  `<ul role="list">`/`<li>` list — `role="list"` restores the implicit list semantics
	  Tailwind v4 preflight's `list-style: none` strips (mirrors `Sortable.svelte`).
	- Empty state: the stock shadcn `Empty` primitive.
	- Toolbar also renders a "Clear filters" `Button` whenever a column/facet filter or the
	  text filter is active — clears both in one action (and, under `facetStyle: 'rows'`,
	  also empties the `FilterRows` row list).
	- Toolbar visibility — three mutually exclusive modes (inline is the default; set at
	  most one of the other two, `toolbarInCollapsible` wins if both are set):
	  - `toolbarInPopover` (default `false`): renders the SAME toolbar + facets markup above
	    inside a `Popover` (trigger: a "Filters" `Button` with a `Badge` showing the active-
	    filter count) instead of inline. No facet/sort/filter logic is duplicated or
	    reimplemented for this — it's the identical block, just relocated.
	  - `toolbarInCollapsible` (default `false`): the same relocation, but into a
	    `Collapsible` rendered INLINE above the row list (not a floating overlay) — the
	    "Filters" trigger + Badge stay in the document flow, and the toolbar expands/
	    collapses in place. Added 2026-07-18 alongside `facetStyle: 'rows'` above.
	  - `toolbarWrapper` (a `Snippet<[{ toolbar: Snippet; activeFilterCount: number }]>`):
	    lets a consumer own the ENTIRE toolbar's placement — trigger AND expanded content,
	    not just the trigger — by wrapping it in their OWN `Collapsible`/`Popover`/whatever,
	    positioned wherever they need (e.g. above their own column-header row, a spot
	    DataTable's built-in trigger+row-list can never reach, since they're one atomic
	    render with no seam for a consumer's own markup to sit between them). When supplied,
	    `toolbarWrapper` takes over ENTIRELY — `toolbarInPopover`/`toolbarInCollapsible` are
	    ignored. `DataTable` calls `{@render toolbarWrapper({ toolbar: toolbarBody,
	    activeFilterCount })}` — `toolbar` is the EXACT SAME snippet the inline/popover/
	    collapsible modes render (nothing reimplemented), and `activeFilterCount` is handed
	    over already computed so a consumer's own Badge can never drift from DataTable's own
	    count (no separate formula to keep in sync). An EARLIER version of this seam
	    (`filtersOpen`/`hideToolbarTrigger`, letting a consumer reposition only the trigger
	    button while the panel still opened wherever DataTable's built-in Collapsible sat)
	    turned out to be insufficient — repositioning just the trigger while the panel stays
	    behind is confusing, and the hand-rolled external trigger it required had no way to
	    set `aria-controls` on itself (DataTable's own `Collapsible.Content` has no exposed,
	    referenceable id) — `toolbarWrapper` replaces it: the consumer's own snippet uses the
	    REAL `Collapsible.Trigger`/`Collapsible.Content` (or `Popover.*`) primitives directly,
	    which wire `aria-controls`/`aria-expanded` correctly for free, same as DataTable's own
	    built-in trigger does. Added 2026-07-18 for the Notes `/table` page (see
	    `docs/kit/components/notes-table.md`), which needed its whole "Filters" affordance —
	    trigger AND panel — positioned above its own column-header row.

	## Accessibility
	- Text filter: a labelled `InputGroup.Input` (`aria-label`).
	- Sort: a labelled `Select` (`aria-label` on the trigger) — no `aria-sort` (that only
	  applies to header-button sort controls, not used in list mode).
	- Facets: each group is a `<fieldset>`/`<legend>` of `Checkbox` + `Label` pairs —
	  labelled, keyboard-operable (native checkbox + label semantics, inherited from Bits UI). When a
	  facet has ≥1 selected value, a subtle `<p class="text-xs text-muted-foreground">` hint renders
	  under the `<legend>` explaining the OR-within-facet count semantics (a sibling value's count is
	  "what you'd get if you also selected it", not a live-narrowing count) — v1.1 follow-up, see
	  `docs/backlog.md` → "DataTable v1.1 follow-ups".
	- Live region: a `role="status" aria-live="polite"` sr-only line announces the visible/
	  total result count on every change (same pattern as `SearchOverlay`).
	- Empty state via `Empty`; decorative icons are `aria-hidden`.
	- No JS-driven animation here — `prefers-reduced-motion` is N/A for this composite.

	## Theming
	Semantic shadcn tokens only (rule 8) — no raw colors, no manual `dark:` overrides.

	## SSR
	No browser-API access at script top level (rule 14) — safe to import under SSR.
-->
<script lang="ts" module>
	// Re-exported as fresh type ALIASES (not `export type { X } from '...'`) — the latter
	// trips eslint-plugin-svelte's `no-import-assign` on a <script module> block re-exporting
	// an imported type-only binding (reproduced in isolation; a plain .ts file with the same
	// `export type { X } from 'y'` is fine, so this is svelte-module-block-specific).
	import type {
		ColumnSpec as _ColumnSpec,
		FacetSpec as _FacetSpec,
		SortOption as _SortOption,
		FacetEntry as _FacetEntry,
	} from './DataTable.helpers'
	export type ColumnSpec<T> = _ColumnSpec<T>
	export type FacetSpec<T> = _FacetSpec<T>
	export type SortOption = _SortOption
	export type FacetEntry = _FacetEntry
</script>

<script lang="ts" generics="T">
	import { cn } from '@kit/ui/shadcn-utils'
	import { createSvelteTable } from '@kit/ui/shadcn-components/ui/data-table'
	import {
		getCoreRowModel,
		getSortedRowModel,
		getFilteredRowModel,
		getFacetedRowModel,
		getFacetedUniqueValues,
		type SortingState,
		type ColumnFiltersState,
	} from '@tanstack/table-core'
	import * as Select from '@kit/ui/shadcn-components/ui/select'
	import * as InputGroup from '@kit/ui/shadcn-components/ui/input-group'
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import * as Popover from '@kit/ui/shadcn-components/ui/popover'
	import * as Collapsible from '@kit/ui/shadcn-components/ui/collapsible'
	import { Checkbox } from '@kit/ui/shadcn-components/ui/checkbox'
	import { Label } from '@kit/ui/shadcn-components/ui/label'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import { Search, Inbox, ArrowUpDown, X, SlidersHorizontal, ChevronDown } from '@lucide/svelte'
	import type { Snippet } from 'svelte'
	import FilterRows, {
		type FilterFieldDef,
		type FilterOperatorDef,
		type FilterRow,
	} from './FilterRows.svelte'
	import {
		activeFilterCount as computeActiveFilterCount,
		buildColumnDefs,
		buildFacetColumnDefs,
		buildSortOptions,
		FACET_EXCLUDE_OPERATOR,
		facetColumnFiltersToRows,
		facetEntries,
		facetFilterValueToSelected,
		facetFilterValuesEqual,
		facetRowsToFilterValues,
		findDuplicateIds,
		hasActiveFilters,
		hasFilterableColumn,
		parseSortValue,
		resultStatusText,
		sortValueFor,
		toggleFacetValue,
		unionSelectedFacetEntries,
		type FacetFilterValue,
	} from './DataTable.helpers'
	// ColumnSpec/FacetSpec are already in scope from the `module` block above (module-level
	// bindings are visible to the instance script) — importing them again here as well as
	// there trips eslint's `no-import-assign` on the module block's `export type { ... }`.

	interface Props {
		/** The full (unfiltered) data set. Treat as large/read-only upstream (`$state.raw`) —
		 *  this composite only reads it, never mutates it. */
		items: T[]
		/** Display/sort/text-filter columns (drives the sort Select + the built-in text
		 *  search across these columns' values). */
		columns: ColumnSpec<T>[]
		/** Facet groups rendered per `facetStyle`, with live unique-value counts. Selecting
		 *  values is OR within a facet, AND across facets, regardless of style. */
		facets?: FacetSpec<T>[]
		/** Facet UI: labelled checkbox groups (`'checkboxes'`, default) or a single
		 *  `FilterRows` "field is value" row builder (`'rows'`) — see the composite's own
		 *  header comment for the full rationale. Purely additive; existing consumers
		 *  (default `'checkboxes'`) are unaffected. */
		facetStyle?: 'checkboxes' | 'rows'
		/** Per-row markup — REQUIRED in list mode (v1). Receives the original row data. */
		row: Snippet<[T]>

		/** Current sort (bindable); mirrored by `onSortingChange`. Defaults to unsorted. */
		sorting?: SortingState
		onSortingChange?: (sorting: SortingState) => void
		/** Current column (facet) filters (bindable); mirrored by `onColumnFiltersChange`. */
		columnFilters?: ColumnFiltersState
		onColumnFiltersChange?: (filters: ColumnFiltersState) => void
		/** Global text-filter query (bindable); mirrored by `onGlobalFilterChange`. */
		globalFilter?: string
		onGlobalFilterChange?: (value: string) => void

		/** Stable row key; falls back to the row's index when omitted. */
		getRowId?: (row: T) => string

		/** Render the toolbar (search + sort + facets + Clear-filters) inside a `Popover`
		 *  (a "Filters" button with an active-filter-count `Badge`) instead of inline above
		 *  the row list. Default `false` — fully additive, existing consumers unaffected. */
		toolbarInPopover?: boolean
		/** Render the toolbar inside an inline `Collapsible` (same "Filters" trigger + Badge
		 *  as `toolbarInPopover`, but expands in place above the row list instead of floating)
		 *  rather than a `Popover`. Default `false` — fully additive. If both this and
		 *  `toolbarInPopover` are set, this one wins. */
		toolbarInCollapsible?: boolean
		/** Take over the toolbar's ENTIRE placement (trigger AND expanded content) — the
		 *  consumer's snippet receives `{ toolbar, activeFilterCount }` and decides how/
		 *  where to render both (e.g. wrapped in the consumer's OWN `Collapsible`/`Popover`,
		 *  positioned anywhere in the consumer's own layout). `toolbar` is the identical
		 *  snippet the inline/popover/collapsible modes render — nothing reimplemented.
		 *  When supplied, takes over ENTIRELY: `toolbarInPopover`/`toolbarInCollapsible` are
		 *  ignored. See the composite's own header comment for the full contract + why this
		 *  replaced an earlier, less capable `filtersOpen`/`hideToolbarTrigger` seam. */
		toolbarWrapper?: Snippet<[{ toolbar: Snippet; activeFilterCount: number }]>
		/** Accessible label for the row list. */
		ariaLabel?: string
		/** Text-filter input placeholder / aria-label. */
		searchPlaceholder?: string
		/** Empty-state copy overrides (defaults vary on whether a filter is active). */
		emptyTitle?: string
		emptyDescription?: string
		/** Extra class(es) merged onto the root element via `cn()` (rule 13). */
		class?: string
	}

	let {
		items,
		columns,
		facets = [],
		facetStyle = 'checkboxes',
		row,
		sorting = $bindable([]),
		onSortingChange,
		columnFilters = $bindable([]),
		onColumnFiltersChange,
		globalFilter = $bindable(''),
		onGlobalFilterChange,
		getRowId,
		toolbarInPopover = false,
		toolbarInCollapsible = false,
		toolbarWrapper,
		ariaLabel = 'Results',
		searchPlaceholder = 'Search…',
		emptyTitle,
		emptyDescription,
		class: className,
	}: Props = $props()

	// Stable per-instance id prefix so two DataTable instances on the same page never
	// collide on facet checkbox ids (SSR-safe — no DOM/browser API involved).
	const uid = $props.id()

	const sortOptions = $derived(buildSortOptions(columns))

	// Sentinel Select value for the real, selectable "Unsorted" item — distinct from any
	// `${columnId}:asc|desc` sort-option key, so `parseSortValue` (which returns `[]` for any
	// non-matching value) naturally resets `sorting` to `[]` without a special case.
	const UNSORTED_SORT_VALUE = '__unsorted__'

	// Whether at least one display column stays in the text filter — if none do, the search
	// box would be a dead no-op (nothing it types into ever changes the result set), so it's
	// only rendered when there's something for it to search. Facets-only usage still works.
	const searchable = $derived(hasFilterableColumn(columns))

	// Computed ONCE per `columns`/`facets` change (not on every access) so the array
	// reference is stable across unrelated re-renders (typing in search, toggling a
	// facet, sorting). `@tanstack/table-core` uses reference equality to decide whether
	// to rebuild internal memoized state (e.g. `getFacetedUniqueValues`); a `get columns()`
	// that allocated a fresh array + fresh ColumnDef objects every access defeated that
	// memoization and rebuilt facet counts on every keystroke.
	const columnDefs = $derived([...buildColumnDefs(columns), ...buildFacetColumnDefs(facets)])

	// Dev-time only: column ids and facet ids share one namespace (both become TanStack
	// column ids on the same table) and must be unique across the combined set, or one
	// silently shadows the other's column/filter/facet state. Never hard-throws (a
	// collision shouldn't crash a production build) — just a clear console.error.
	$effect(() => {
		if (!import.meta.env.DEV) return
		const dupes = findDuplicateIds([...columns.map((c) => c.id), ...facets.map((f) => f.id)])
		if (dupes.length) {
			console.error(
				`[DataTable] column and facet ids share one namespace and must be unique — ` +
					`duplicate id(s): ${dupes.join(', ')}`,
			)
		}
	})

	const table = createSvelteTable({
		get data() {
			return items
		},
		get columns() {
			return columnDefs
		},
		state: {
			get sorting() {
				return sorting
			},
			get columnFilters() {
				return columnFilters
			},
			get globalFilter() {
				return globalFilter
			},
		},
		// Sort and global-filter are driven directly by the toolbar handlers below
		// (`handleSortChange` / the search input's `oninput`), which assign the bindable
		// props and call the consumer callbacks themselves — they never go through the
		// table API (`table.setSorting`/`table.setGlobalFilter`), so these two `on*Change`
		// options would never fire. Only `columnFilters` changes via the table API
		// (`column.setFilterValue` in `toggleFacet`), so its handler is the one still wired.
		onColumnFiltersChange: (updater) => {
			columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater
			onColumnFiltersChange?.(columnFilters)
		},
		get getRowId() {
			return getRowId
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	})

	const rows = $derived(table.getRowModel().rows)

	// Dev-time only: v1 has no virtualization (see docs/kit/components/data-table.md,
	// "Virtualization (v2)") -- every visible row becomes a real `<li>` in the DOM. The
	// doc's own measured ceiling is ~1,500 non-virtualized rows before render cost becomes
	// noticeable (~884ms avg to render 1500 `<li>`s in a prod build); this just warns once
	// a real consumer crosses that documented ceiling so a regression (or a second, larger
	// consumer) doesn't silently get slow -- never hard-throws, production is unaffected.
	const VIRTUALIZATION_CEILING = 1500
	$effect(() => {
		if (!import.meta.env.DEV) return
		if (rows.length <= VIRTUALIZATION_CEILING) return
		console.warn(
			`[DataTable] rendering ${rows.length} rows without virtualization -- past the ` +
				`documented ~${VIRTUALIZATION_CEILING}-row ceiling (docs/kit/components/data-table.md). ` +
				'Consider trimming the list upstream or waiting for the v2 virtualized-row seam.',
		)
	})

	const hasFilter = $derived(hasActiveFilters(columnFilters, globalFilter))
	// For the "Filters" trigger's Badge — a plain count, not just the boolean `hasFilter`
	// above (a facet-filter group counts as 1 regardless of how many values are selected
	// within it; the global text filter counts as at most 1). Uses the exported
	// `activeFilterCount` helper (not an inline formula) so a consumer rendering its OWN
	// external trigger (`hideToolbarTrigger`) computes the identical number.
	const activeFilterCount = $derived(computeActiveFilterCount(columnFilters, globalFilter))
	const statusText = $derived(resultStatusText(rows.length, items.length))
	const resolvedEmptyTitle = $derived(emptyTitle ?? (hasFilter ? 'No matches' : 'No items'))
	const resolvedEmptyDescription = $derived(
		emptyDescription ??
			(hasFilter ? 'Try adjusting your search or filters.' : 'There is nothing here yet.'),
	)

	// Falls back to the sentinel when unsorted so the "Unsorted" item itself shows as
	// selected in the Select (not just via the trigger's fallback display text).
	const sortValue = $derived(sorting.length ? sortValueFor(sorting) : UNSORTED_SORT_VALUE)
	function handleSortChange(value: string) {
		// `parseSortValue` returns `[]` for any value that doesn't match a real sort option —
		// including the "Unsorted" sentinel — so picking it clears `sorting` with no special case.
		sorting = parseSortValue(value, sortOptions)
		onSortingChange?.(sorting)
	}

	function toggleFacet(facetId: string, value: string) {
		const column = table.getColumn(facetId)
		if (!column) return
		const current = column.getFilterValue() as string[] | undefined
		column.setFilterValue(toggleFacetValue(current, value))
	}

	// `facetStyle: 'rows'` only: the operators FilterRows shows between the field and value
	// Selects ("Color [is/is not] Blue"). `FACET_EXCLUDE_OPERATOR` is the one id
	// `facetRowsToFilterValues`/`facetColumnFiltersToRows` treat as exclusion; any other
	// (including this "is") is inclusion.
	const FACET_OPERATORS: FilterOperatorDef[] = [
		{ id: 'is', label: 'is' },
		{ id: FACET_EXCLUDE_OPERATOR, label: 'is not' },
	]

	// `facetStyle: 'rows'` only: `FilterRows`' own row list — genuine local state (not
	// derived from `columnFilters` on every render) because an in-progress row (field
	// picked, no value yet) has no representation in `columnFilters` at all; deriving it
	// fresh each render would make an incomplete row vanish the instant it's added. Seeded
	// once from any pre-populated `columnFilters` at mount (e.g. a deep link); after that,
	// `FilterRows` owns row identity/order (`bind:value`) and this only flows OUT to
	// `columnFilters` via `handleFacetRowsChange`, never back in — see the composite's
	// header comment for the full rationale. **`facetStyle` itself is fixed for the
	// component's lifetime** (like `getRowId`) — this seed runs once, at the ORIGINAL
	// mount, regardless of which style was active then; flipping `facetStyle` from
	// `'checkboxes'` to `'rows'` later would not retroactively reseed `facetRows` from
	// whatever `columnFilters` holds at that point. No current consumer does this.
	let facetRows = $state<FilterRow[]>(facetColumnFiltersToRows(columnFilters))

	// Each facet as a `FilterFieldDef`, its `values` the same live-counted entries the
	// checkbox UI renders (mirrors that branch's `column`/`selectedValues`/`entries`
	// derivation exactly) — just reshaped into `{id, label, shortLabel}` pairs for the value
	// Select (`shortLabel` drops the "(count)" suffix once a value is selected — the count
	// stays visible in the open dropdown's option list). Gated on `facetStyle === 'rows'`
	// (a plain `[]` otherwise) so the checkbox-style branch never pays for this recompute.
	const facetFieldDefs = $derived(
		facetStyle === 'rows'
			? facets.map((facet): FilterFieldDef => {
					const column = table.getColumn(facet.id)
					const selectedValues = facetFilterValueToSelected(
						column?.getFilterValue() as FacetFilterValue | undefined,
					)
					const rawEntries = column ? facetEntries(column.getFacetedUniqueValues()) : []
					const entries = unionSelectedFacetEntries(rawEntries, selectedValues)
					return {
						id: facet.id,
						label: facet.label,
						values: entries.map((e) => ({
							id: e.value,
							label: `${e.value} (${e.count})`,
							shortLabel: e.value,
						})),
					}
				})
			: [],
	)

	function handleFacetRowsChange(rows: FilterRow[]) {
		const byFacet = facetRowsToFilterValues(
			rows,
			facets.map((f) => f.id),
		)
		for (const [id, next] of byFacet) {
			const column = table.getColumn(id)
			if (!column) continue
			// Only write facets whose computed value actually changed — `byFacet` covers
			// EVERY facet on every row mutation (add/remove/field/operator/value change to
			// any one row), so without this check a single edit would call
			// `setFilterValue`/fire `onColumnFiltersChange` once per facet, not once for the
			// facet actually touched.
			const current = column.getFilterValue() as FacetFilterValue | undefined
			if (facetFilterValuesEqual(current, next)) continue
			column.setFilterValue(next)
		}
	}

	function clearFilters() {
		columnFilters = []
		onColumnFiltersChange?.(columnFilters)
		globalFilter = ''
		onGlobalFilterChange?.(globalFilter)
		facetRows = []
	}
</script>

<div class={cn('flex flex-col gap-4', className)}>
	{#snippet toolbarBody()}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			{#if searchable}
				<InputGroup.Root class="sm:max-w-xs">
					<InputGroup.Addon>
						<Search aria-hidden="true" />
					</InputGroup.Addon>
					<InputGroup.Input
						value={globalFilter}
						placeholder={searchPlaceholder}
						aria-label={searchPlaceholder}
						oninput={(e) => {
							globalFilter = (e.currentTarget as HTMLInputElement).value
							onGlobalFilterChange?.(globalFilter)
						}}
					/>
				</InputGroup.Root>
			{/if}

			{#if sortOptions.length}
				<div class="flex items-center gap-2">
					<ArrowUpDown aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
					<Select.Root type="single" value={sortValue} onValueChange={handleSortChange}>
						<Select.Trigger class="w-56" aria-label="Sort by">
							{sortOptions.find((o) => o.key === sortValue)?.label ?? 'Unsorted'}
						</Select.Trigger>
						<Select.Content aria-label="Sort options">
							<Select.Group>
								<Select.Item value={UNSORTED_SORT_VALUE} label="Unsorted" />
								{#each sortOptions as opt (opt.key)}
									<Select.Item value={opt.key} label={opt.label} />
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			{#if hasFilter}
				<Button variant="ghost" size="sm" onclick={clearFilters}>
					<X aria-hidden="true" />
					Clear filters
				</Button>
			{/if}
		</div>

		{#if facets.length}
			{#if facetStyle === 'rows'}
				<FilterRows
					fields={facetFieldDefs}
					operators={FACET_OPERATORS}
					bind:value={facetRows}
					onValueChange={handleFacetRowsChange}
					fieldPlaceholder="Filter by…"
					addLabel="Add filter"
				/>
			{:else}
				<div class="flex flex-wrap gap-x-8 gap-y-3">
					{#each facets as facet (facet.id)}
						{@const column = table.getColumn(facet.id)}
						{@const selectedValues =
							(column?.getFilterValue() as string[] | undefined) ?? []}
						{@const rawEntries = column
							? facetEntries(column.getFacetedUniqueValues())
							: []}
						{@const entries = unionSelectedFacetEntries(rawEntries, selectedValues)}
						{#if entries.length}
							<fieldset class="flex min-w-40 flex-col gap-1.5">
								<legend class="mb-1 text-sm font-medium">{facet.label}</legend>
								{#if selectedValues.length}
									<p class="text-xs text-muted-foreground">
										Counts show results if you also select that value.
									</p>
								{/if}
								{#each entries as entry, i (entry.value)}
									{@const checkboxId = `${uid}-${facet.id}-${i}`}
									<div class="flex items-center gap-2">
										<Checkbox
											id={checkboxId}
											checked={selectedValues.includes(entry.value)}
											onCheckedChange={() =>
												toggleFacet(facet.id, entry.value)}
										/>
										<Label for={checkboxId} class="font-normal">
											{entry.value}
											<span class="text-muted-foreground"
												>({entry.count})</span
											>
										</Label>
									</div>
								{/each}
							</fieldset>
						{/if}
					{/each}
				</div>
			{/if}
		{/if}
	{/snippet}

	{#snippet toolbarTrigger()}
		<SlidersHorizontal aria-hidden="true" />
		Filters
		{#if activeFilterCount > 0}
			<Badge variant="secondary">{activeFilterCount}</Badge>
		{/if}
	{/snippet}

	{#if toolbarWrapper}
		{@render toolbarWrapper({ toolbar: toolbarBody, activeFilterCount })}
	{:else if toolbarInCollapsible}
		<Collapsible.Root class="flex flex-col gap-3">
			<Collapsible.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="group w-fit self-start">
						{@render toolbarTrigger()}
						<ChevronDown
							class="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
							aria-hidden="true"
						/>
					</Button>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				{@render toolbarBody()}
			</Collapsible.Content>
		</Collapsible.Root>
	{:else if toolbarInPopover}
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="self-start">
						{@render toolbarTrigger()}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="max-h-[min(28rem,70vh)] w-80 overflow-y-auto" align="start">
				<Popover.Title class="sr-only">Filters</Popover.Title>
				{@render toolbarBody()}
			</Popover.Content>
		</Popover.Root>
	{:else}
		{@render toolbarBody()}
	{/if}

	<p class="sr-only" role="status" aria-live="polite">{statusText}</p>

	{#if rows.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<Inbox aria-hidden="true" />
				</Empty.Media>
				<Empty.Title>{resolvedEmptyTitle}</Empty.Title>
				<Empty.Description>{resolvedEmptyDescription}</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<!-- role="list" — explicit because Tailwind v4 preflight resets `list-style: none`,
		     which strips the implicit list role; mirrors Sortable.svelte's <ul>. -->
		<ul class="flex flex-col gap-2" role="list" aria-label={ariaLabel}>
			{#each rows as tableRow (tableRow.id)}
				<li>{@render row(tableRow.original)}</li>
			{/each}
		</ul>
	{/if}
</div>
