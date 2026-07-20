import type { ColumnDef, ColumnFiltersState, Row, SortingState } from '@tanstack/table-core'
import type { FilterRow } from './FilterRows.svelte'

/** The "is not" `FilterRows` operator id `facetRowsToFilterValues` treats as exclusion —
 *  anything else (including no operator, or `'is'`) is inclusion. Exported so `DataTable`
 *  wires the SAME id into the `operators` prop it passes to `FilterRows`. */
export const FACET_EXCLUDE_OPERATOR = 'is-not'

/**
 * Pure helpers for the `DataTable` composite — building TanStack `ColumnDef`s from the
 * kit's domain-free column/facet specs, encoding/decoding the single-column sort Select's
 * value, deriving facet checkbox entries from a faceted-unique-values map, and the
 * result-count status text. Extracted from `DataTable.svelte` so they're unit-testable
 * without mounting a component (per `agent-operating-principles` — test real logic
 * test-first).
 */

/** One column the consumer wants sortable/filterable-by-text in the toolbar. */
export type ColumnSpec<T> = {
	id: string
	header: string
	accessor: (row: T) => unknown
	/** @default true */
	sortable?: boolean
	/** Include this column in the toolbar text (global) filter. @default true.
	 *  Set `false` for columns whose raw value shouldn't be text-searched (e.g. a numeric
	 *  timestamp, which would otherwise let digit substrings match) while staying sortable. */
	filterable?: boolean
}

/** One facet group: a label + a value-of function returning the (possibly multi-value)
 *  tag(s) a row belongs to for this facet. Selecting facet values is OR within the facet,
 *  AND across facets (via `facetFilterFn`'s include/exclude semantics below). */
export type FacetSpec<T> = {
	id: string
	label: string
	values: (row: T) => string[]
}

/** A facet column's stored filter value — either the checkbox UI's plain OR-within-facet
 *  array (`toggleFacetValue`'s output, unchanged since before `facetStyle: 'rows'` existed),
 *  or the rows-with-operators UI's richer include/exclude split (`facetRowsToFilterValues`'s
 *  output) — a row's value must match at least one `include` entry (if any) and none of the
 *  `exclude` entries. `facetFilterFn` below accepts both shapes for backward compatibility. */
export type FacetFilterValue = string[] | { include: string[]; exclude: string[] }

/** One entry in the single-column sort Select (`<columnId>:asc` / `<columnId>:desc`). */
export type SortOption = {
	key: string
	columnId: string
	desc: boolean
	label: string
}

/** A facet checkbox row: the raw value + its live count from the faceted row model. */
export type FacetEntry = { value: string; count: number }

/** Build the TanStack column defs for the consumer's display/sort/text-filter columns. */
export function buildColumnDefs<T>(columns: ColumnSpec<T>[]): ColumnDef<T, unknown>[] {
	return columns.map((c) => ({
		id: c.id,
		header: c.header,
		accessorFn: (row: T) => c.accessor(row),
		enableSorting: c.sortable !== false,
		enableColumnFilter: false,
		// explicit (not the TanStack `typeof value` default) so a consumer opts a column
		// out of the text filter by intent, not by coincidence of its value's type.
		enableGlobalFilter: c.filterable !== false,
	}))
}

/**
 * Build the TanStack column defs backing the facet bar. These columns are never
 * rendered (list mode renders rows via the `row` snippet) — they exist purely so
 * `getFacetedRowModel`/`getFacetedUniqueValues` can compute live per-value counts and
 * `facetFilterFn` can filter on them (OR within a facet, AND across facets via the
 * table's normal all-active-filters-must-pass column filtering).
 */
export function buildFacetColumnDefs<T>(facets: FacetSpec<T>[]): ColumnDef<T, unknown>[] {
	return facets.map((f) => ({
		id: f.id,
		header: f.label,
		accessorFn: (row: T) => f.values(row),
		// Default getUniqueValues wraps the accessor's return value in a single-element
		// array (treating it as one opaque value) — wrong for a multi-value tag array,
		// where each tag must count as its own unique value. Overriding it re-supplies
		// the same per-row tag array so each tag is counted individually.
		getUniqueValues: (row: T) => f.values(row),
		filterFn: facetFilterFn,
		enableSorting: false,
		enableGlobalFilter: false,
	}))
}

/**
 * The facet columns' `filterFn`. Was the built-in `'arrIncludesSome'` preset (plain
 * OR-within-facet array) until `facetStyle: 'rows'` needed exclusion ("Color is not Blue")
 * too — a single TanStack column has exactly one `filterFn`, so both facet-UI styles must
 * share this one function, distinguished by the filter VALUE's shape:
 * - a plain `string[]` (the checkbox UI's `toggleFacetValue` output, UNCHANGED) — matches
 *   `@tanstack/table-core`'s own `arrIncludesSome` PREDICATE byte-for-byte
 *   (`some(v => row.includes(v))`), so the checkbox UI's per-row matching is provably
 *   identical to before this function existed.
 * - an `{ include, exclude }` object (the rows-with-operators UI's `facetRowsToFilterValues`
 *   output) — the row's tags must intersect `include` (if non-empty) AND not intersect
 *   `exclude` (if non-empty).
 * Not registered as a named `BuiltInFilterFn` — passed as a direct function reference in
 * `filterFn` above, which `FilterFnOption` supports without registration. Carries its own
 * `.autoRemove` (see below) — TanStack reads that as a SEPARATE static property from the
 * predicate, so replicating only the predicate body isn't the whole `arrIncludesSome` parity
 * story; both matter for `column.setFilterValue`'s auto-clear behavior.
 */
export function facetFilterFn<T>(
	row: Pick<Row<T>, 'getValue'>,
	columnId: string,
	filterValue: FacetFilterValue,
): boolean {
	const rowValues = (row.getValue(columnId) as string[] | undefined) ?? []
	if (Array.isArray(filterValue)) {
		return filterValue.some((v) => rowValues.includes(v))
	}
	const { include, exclude } = filterValue
	const includeOk = include.length === 0 || include.some((v) => rowValues.includes(v))
	const excludeOk = exclude.length === 0 || !exclude.some((v) => rowValues.includes(v))
	return includeOk && excludeOk
}

/** Mirrors `arrIncludesSome.autoRemove` (`@tanstack/table-core`'s own preset, which strips a
 *  facet's entry from `columnFilters` entirely once its value is falsy OR an empty array) —
 *  a bare function reference has no such property by default, so without this, TanStack's
 *  `shouldAutoRemoveFilter` only catches `undefined`, not an explicit `[]` or
 *  `{include:[],exclude:[]}`. No current call site in this codebase ever produces either
 *  degenerate value (`toggleFacetValue`/`facetRowsToFilterValues` always emit `undefined`
 *  once empty), but a consumer-supplied initial `columnFilters` (e.g. a malformed deep link)
 *  could — this closes that gap defensively rather than relying on "nothing does that today". */
facetFilterFn.autoRemove = (value: FacetFilterValue | undefined) => {
	if (value === undefined) return true
	if (Array.isArray(value)) return value.length === 0
	return value.include.length === 0 && value.exclude.length === 0
}

/** Extract the flat list of values a `FacetFilterValue` currently has selected, regardless
 *  of shape — used to keep a selected value visible in the facet UI (checkbox or row) even
 *  once its live count drops to 0 (`unionSelectedFacetEntries`). */
export function facetFilterValueToSelected(value: FacetFilterValue | undefined): string[] {
	if (!value) return []
	if (Array.isArray(value)) return value
	return [...value.include, ...value.exclude]
}

/** Whether two `FacetFilterValue`s are equivalent (same shape, same value sets regardless
 *  of order) — used to skip a redundant `column.setFilterValue` call (and the
 *  `onColumnFiltersChange` firing it triggers) when a row mutation didn't actually change
 *  that facet's resulting filter. */
export function facetFilterValuesEqual(
	a: FacetFilterValue | undefined,
	b: FacetFilterValue | undefined,
): boolean {
	if (a === undefined || b === undefined) return a === b
	if (Array.isArray(a) !== Array.isArray(b)) return false
	if (Array.isArray(a) && Array.isArray(b)) return sameStringSet(a, b)
	const ao = a as { include: string[]; exclude: string[] }
	const bo = b as { include: string[]; exclude: string[] }
	return sameStringSet(ao.include, bo.include) && sameStringSet(ao.exclude, bo.exclude)
}

function sameStringSet(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false
	const setB = new Set(b)
	return a.every((v) => setB.has(v))
}

/** Build the flat list of sort options (one per direction per sortable column) for the
 *  toolbar's single Select-based sort control. */
export function buildSortOptions<T>(columns: ColumnSpec<T>[]): SortOption[] {
	return columns
		.filter((c) => c.sortable !== false)
		.flatMap((c) => [
			{ key: `${c.id}:asc`, columnId: c.id, desc: false, label: `${c.header} — ascending` },
			{ key: `${c.id}:desc`, columnId: c.id, desc: true, label: `${c.header} — descending` },
		])
}

/** Encode the current (single-column) `SortingState` into the sort Select's value. */
export function sortValueFor(sorting: SortingState): string {
	const s = sorting[0]
	if (!s) return ''
	return `${s.id}:${s.desc ? 'desc' : 'asc'}`
}

/** Decode a sort Select value back into a `SortingState` (empty when no option matches,
 *  e.g. the initial unsorted state). */
export function parseSortValue(value: string, options: SortOption[]): SortingState {
	const option = options.find((o) => o.key === value)
	return option ? [{ id: option.columnId, desc: option.desc }] : []
}

/** Turn a facet's faceted-unique-values map into sorted, countable checkbox entries. */
export function facetEntries(unique: Map<string, number>): FacetEntry[] {
	return [...unique.entries()]
		.map(([value, count]) => ({ value, count }))
		.sort((a, b) => a.value.localeCompare(b.value))
}

/** Toggle one value in a facet's selection (OR-within-facet column filter value).
 *  Returns `undefined` (not `[]`) once the last value is removed, so the column filter
 *  is cleared rather than left as an active-but-empty filter. */
export function toggleFacetValue(
	current: string[] | undefined,
	value: string,
): string[] | undefined {
	const set = new Set(current ?? [])
	if (set.has(value)) set.delete(value)
	else set.add(value)
	return set.size ? [...set] : undefined
}

/** Whether any facet/column filter is currently active. Kept as its own building block
 *  (used by `hasActiveFilters` + unit-tested directly) — the component uses `hasActiveFilters`. */
export function hasActiveColumnFilters(columnFilters: ColumnFiltersState): boolean {
	return columnFilters.length > 0
}

/** Whether at least one display column stays in the text (global) filter. When false the
 *  search box is a dead no-op (nothing typed ever changes the result set), so the composite
 *  hides it — facets-only usage still works. */
export function hasFilterableColumn<T>(columns: ColumnSpec<T>[]): boolean {
	return columns.some((c) => c.filterable !== false)
}

/** Whether any filter — column/facet OR the free-text search — is currently active. Drives
 *  both the empty-state copy and whether the toolbar's "Clear filters" control renders. */
export function hasActiveFilters(columnFilters: ColumnFiltersState, globalFilter: string): boolean {
	return hasActiveColumnFilters(columnFilters) || globalFilter.trim().length > 0
}

/** Count of active filters for the "Filters" trigger's Badge — a facet/column filter
 *  counts as 1 regardless of how many values are selected within it; the global text
 *  filter counts as at most 1. Exported (not just inlined in `DataTable.svelte`) so a
 *  consumer rendering its OWN external trigger (`hideToolbarTrigger`, see data-table.md)
 *  can show the identical count without re-deriving the formula. */
export function activeFilterCount(columnFilters: ColumnFiltersState, globalFilter: string): number {
	return columnFilters.length + (globalFilter.trim() ? 1 : 0)
}

/**
 * Union a facet's live faceted-unique-value entries with any currently-selected values
 * that dropped out of the map entirely (count 0 — e.g. another facet's filter narrowed
 * the row model to nothing with this value). Without this, a checkbox the user already
 * checked can silently vanish from the DOM once its count hits zero, which both looks
 * like a bug and strands the (still-active) filter with no visible control to undo it.
 * Keeps alphabetical order.
 */
export function unionSelectedFacetEntries(
	entries: FacetEntry[],
	selectedValues: string[],
): FacetEntry[] {
	if (!selectedValues.length) return entries
	const present = new Set(entries.map((e) => e.value))
	const missing = selectedValues
		.filter((v) => !present.has(v))
		.map((value) => ({ value, count: 0 }))
	if (!missing.length) return entries
	return [...entries, ...missing].sort((a, b) => a.value.localeCompare(b.value))
}

/**
 * Seed `FilterRows`' row model from the current per-facet `ColumnFiltersState` — one row
 * per (facet id, value) pair (deduped), ids assigned by array position. Handles both
 * `FacetFilterValue` shapes: a plain array seeds all-"is" rows; an `{include, exclude}`
 * object seeds "is" rows for `include` and "is not" rows for `exclude`. Used only once, at
 * mount, when a facet's UI is `FilterRows`-based (`facetStyle: 'rows'`) and the consumer
 * arrives with a pre-populated `columnFilters` (e.g. a deep link); after mount, `FilterRows`
 * (not this) owns row identity/order for any further add/remove. Guards `include`/`exclude`
 * with `Array.isArray` (not a bare cast) — a malformed consumer-supplied `columnFilters`
 * entry (e.g. `{include: 'blue', exclude: []}`, a string instead of an array) is skipped
 * rather than silently exploding into one row per CHARACTER (`new Set('blue')`).
 */
export function facetColumnFiltersToRows(columnFilters: ColumnFiltersState): FilterRow[] {
	let id = 0
	const rows: FilterRow[] = []
	for (const cf of columnFilters) {
		const value = cf.value as FacetFilterValue | undefined
		if (!value) continue
		const include = Array.isArray(value) ? value : value.include
		const exclude = Array.isArray(value) ? [] : value.exclude
		if (Array.isArray(include)) {
			for (const v of new Set(include))
				rows.push({ id: id++, field: cf.id, operator: 'is', value: v })
		}
		if (Array.isArray(exclude)) {
			for (const v of new Set(exclude)) {
				rows.push({ id: id++, field: cf.id, operator: FACET_EXCLUDE_OPERATOR, value: v })
			}
		}
	}
	return rows
}

/**
 * Group `FilterRows`' row model (field + operator + value triples) into per-facet-id
 * `FacetFilterValue`s — the "rows" facet UI's equivalent of the checkbox UI's
 * `toggleFacetValue`, preserving the same OR-within-facet semantics for `include` (multiple
 * rows targeting the same field with the SAME operator union their values). A row with
 * operator `FACET_EXCLUDE_OPERATOR` ("is not") contributes to `exclude` instead; any other
 * operator (including none, for a row added before `operators` existed) contributes to
 * `include`. Rows with an empty `field`/`value` (in-progress, not yet a complete filter) are
 * ignored. A facet with no complete rows maps to `undefined` (not an empty object),
 * mirroring `toggleFacetValue`'s convention so an empty filter doesn't linger as an
 * active-but-empty column filter.
 */
export function facetRowsToFilterValues(
	rows: FilterRow[],
	facetIds: string[],
): Map<string, FacetFilterValue | undefined> {
	const result = new Map<string, FacetFilterValue | undefined>()
	for (const id of facetIds) {
		const complete = rows.filter((r) => r.field === id && r.value)
		if (!complete.length) {
			result.set(id, undefined)
			continue
		}
		const include = [
			...new Set(
				complete.filter((r) => r.operator !== FACET_EXCLUDE_OPERATOR).map((r) => r.value),
			),
		]
		const exclude = [
			...new Set(
				complete.filter((r) => r.operator === FACET_EXCLUDE_OPERATOR).map((r) => r.value),
			),
		]
		result.set(id, { include, exclude })
	}
	return result
}

/**
 * Find duplicate ids across the combined column + facet id namespace (they share one
 * namespace — both become TanStack column ids on the same table). Returns the distinct
 * set of ids that appear more than once, so the caller can report a clear dev-time error.
 */
export function findDuplicateIds(ids: string[]): string[] {
	const seen = new Set<string>()
	const dupes = new Set<string>()
	for (const id of ids) {
		if (seen.has(id)) dupes.add(id)
		seen.add(id)
	}
	return [...dupes]
}

/** Live-region status text announcing the visible/total result count. */
export function resultStatusText(shown: number, total: number): string {
	if (total === 0) return 'No items.'
	if (shown === total) return `${shown} ${shown === 1 ? 'result' : 'results'}.`
	return `${shown} of ${total} ${total === 1 ? 'result' : 'results'}.`
}
