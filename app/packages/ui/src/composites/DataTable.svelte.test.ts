import { expect, test } from 'vitest'
import type { FilterRow } from './FilterRows.svelte'
import {
	activeFilterCount,
	buildColumnDefs,
	buildFacetColumnDefs,
	buildSortOptions,
	facetColumnFiltersToRows,
	facetEntries,
	facetFilterFn,
	facetFilterValueToSelected,
	facetFilterValuesEqual,
	facetRowsToFilterValues,
	findDuplicateIds,
	hasActiveColumnFilters,
	hasActiveFilters,
	hasFilterableColumn,
	parseSortValue,
	resultStatusText,
	sortValueFor,
	toggleFacetValue,
	unionSelectedFacetEntries,
	type ColumnSpec,
	type FacetSpec,
} from './DataTable.helpers'

type Note = { id: string; title: string; updatedAt: number; tags: string[]; pinned: boolean }

const columns: ColumnSpec<Note>[] = [
	{ id: 'title', header: 'Title', accessor: (n) => n.title },
	{ id: 'updatedAt', header: 'Updated', accessor: (n) => n.updatedAt },
	{ id: 'pinned', header: 'Pinned', accessor: (n) => n.pinned, sortable: false },
]

const facets: FacetSpec<Note>[] = [{ id: 'tags', label: 'Tags', values: (n) => n.tags }]

test('buildColumnDefs maps id/header/accessor and honors sortable:false', () => {
	const defs = buildColumnDefs(columns)
	expect(defs.map((d) => d.id)).toEqual(['title', 'updatedAt', 'pinned'])
	expect(defs.find((d) => d.id === 'title')?.enableSorting).toBe(true)
	expect(defs.find((d) => d.id === 'pinned')?.enableSorting).toBe(false)
	// accessorFn wraps the consumer's accessor faithfully
	const note: Note = { id: '1', title: 'Hello', updatedAt: 1, tags: [], pinned: false }
	const titleDef = defs.find((d) => d.id === 'title')!
	expect((titleDef.accessorFn as (r: Note) => unknown)(note, 0)).toBe('Hello')
	// display columns never participate in the column-filter facet machinery
	expect(defs.every((d) => d.enableColumnFilter === false)).toBe(true)
})

test('buildColumnDefs honors filterable:false (out of the text filter, default in)', () => {
	const defs = buildColumnDefs([
		{ id: 'title', header: 'Title', accessor: (n: Note) => n.title },
		{
			id: 'updatedAt',
			header: 'Updated',
			accessor: (n: Note) => n.updatedAt,
			filterable: false,
		},
	])
	expect(defs.find((d) => d.id === 'title')?.enableGlobalFilter).toBe(true)
	expect(defs.find((d) => d.id === 'updatedAt')?.enableGlobalFilter).toBe(false)
})

test('buildFacetColumnDefs wires accessorFn, getUniqueValues, and facetFilterFn', () => {
	const defs = buildFacetColumnDefs(facets)
	expect(defs).toHaveLength(1)
	const [tagsDef] = defs
	expect(tagsDef.id).toBe('tags')
	expect(tagsDef.filterFn).toBe(facetFilterFn)
	expect(tagsDef.enableSorting).toBe(false)
	expect(tagsDef.enableGlobalFilter).toBe(false)
	const note: Note = { id: '1', title: 'Hello', updatedAt: 1, tags: ['a', 'b'], pinned: false }
	expect((tagsDef.accessorFn as (r: Note) => unknown)(note, 0)).toEqual(['a', 'b'])
	// getUniqueValues must return the per-row tag array (not a single wrapped value) —
	// this is what makes each tag count individually in getFacetedUniqueValues.
	expect(tagsDef.getUniqueValues?.(note, 0)).toEqual(['a', 'b'])
})

test('buildSortOptions emits an asc + desc option per sortable column, skipping sortable:false', () => {
	const opts = buildSortOptions(columns)
	expect(opts.map((o) => o.key)).toEqual([
		'title:asc',
		'title:desc',
		'updatedAt:asc',
		'updatedAt:desc',
	])
	expect(opts.every((o) => o.columnId !== 'pinned')).toBe(true)
})

test('sortValueFor / parseSortValue round-trip through the sort Select value', () => {
	const opts = buildSortOptions(columns)
	expect(sortValueFor([])).toBe('')
	expect(sortValueFor([{ id: 'title', desc: false }])).toBe('title:asc')
	expect(sortValueFor([{ id: 'updatedAt', desc: true }])).toBe('updatedAt:desc')

	expect(parseSortValue('title:asc', opts)).toEqual([{ id: 'title', desc: false }])
	expect(parseSortValue('updatedAt:desc', opts)).toEqual([{ id: 'updatedAt', desc: true }])
	// unknown/empty value → unsorted
	expect(parseSortValue('', opts)).toEqual([])
	expect(parseSortValue('bogus:asc', opts)).toEqual([])
})

test('facetEntries sorts alphabetically and carries counts through', () => {
	const unique = new Map<string, number>([
		['zebra', 2],
		['apple', 5],
		['mango', 1],
	])
	expect(facetEntries(unique)).toEqual([
		{ value: 'apple', count: 5 },
		{ value: 'mango', count: 1 },
		{ value: 'zebra', count: 2 },
	])
})

test('facetEntries returns [] for an empty map', () => {
	expect(facetEntries(new Map())).toEqual([])
})

test('toggleFacetValue adds, removes, and clears to undefined (not [])', () => {
	expect(toggleFacetValue(undefined, 'a')).toEqual(['a'])
	expect(toggleFacetValue(['a'], 'b')).toEqual(['a', 'b'])
	expect(toggleFacetValue(['a', 'b'], 'a')).toEqual(['b'])
	// removing the last selected value clears the filter entirely
	expect(toggleFacetValue(['a'], 'a')).toBeUndefined()
})

test('hasActiveColumnFilters reflects whether any column filter is present', () => {
	expect(hasActiveColumnFilters([])).toBe(false)
	expect(hasActiveColumnFilters([{ id: 'tags', value: ['a'] }])).toBe(true)
})

test('hasActiveFilters is true for a column/facet filter, a non-blank search, both, or neither', () => {
	expect(hasActiveFilters([], '')).toBe(false)
	expect(hasActiveFilters([], '   ')).toBe(false) // whitespace-only search doesn't count
	expect(hasActiveFilters([{ id: 'tags', value: ['a'] }], '')).toBe(true)
	expect(hasActiveFilters([], 'query')).toBe(true)
	expect(hasActiveFilters([{ id: 'tags', value: ['a'] }], 'query')).toBe(true)
})

test('hasFilterableColumn is true unless every column opts out of the text filter', () => {
	expect(
		hasFilterableColumn([{ id: 'title', header: 'T', accessor: (n: Note) => n.title }]),
	).toBe(true)
	// mixed: one filterable column is enough
	expect(
		hasFilterableColumn([
			{ id: 'updated', header: 'U', accessor: (n: Note) => n.updatedAt, filterable: false },
			{ id: 'title', header: 'T', accessor: (n: Note) => n.title },
		]),
	).toBe(true)
	// all opted out → no text filter → search box should hide
	expect(
		hasFilterableColumn([
			{ id: 'updated', header: 'U', accessor: (n: Note) => n.updatedAt, filterable: false },
		]),
	).toBe(false)
	expect(hasFilterableColumn([])).toBe(false)
})

test('resultStatusText covers empty/all-shown/filtered phrasing, singular vs plural', () => {
	expect(resultStatusText(0, 0)).toBe('No items.')
	expect(resultStatusText(1, 1)).toBe('1 result.')
	expect(resultStatusText(5, 5)).toBe('5 results.')
	expect(resultStatusText(2, 10)).toBe('2 of 10 results.')
	expect(resultStatusText(1, 10)).toBe('1 of 10 results.')
	expect(resultStatusText(2, 1)).toBe('2 of 1 result.') // pluralizes on `total`, not `shown`
})

test('findDuplicateIds returns [] when every id is unique', () => {
	expect(findDuplicateIds(['title', 'updatedAt', 'tags'])).toEqual([])
})

test('findDuplicateIds reports each id that appears more than once, once each', () => {
	expect(findDuplicateIds(['title', 'tags', 'title', 'tags', 'tags'])).toEqual(['title', 'tags'])
})

test('findDuplicateIds catches a column/facet id collision across the combined namespace', () => {
	// A column and a facet sharing the same id is the real-world case this guards
	// against — both are flattened into one id list before checking.
	const columnIds = ['title', 'tags']
	const facetIds = ['tags']
	expect(findDuplicateIds([...columnIds, ...facetIds])).toEqual(['tags'])
})

test('unionSelectedFacetEntries returns the entries unchanged when nothing is selected', () => {
	const entries = [{ value: 'a', count: 2 }]
	expect(unionSelectedFacetEntries(entries, [])).toEqual(entries)
})

test('unionSelectedFacetEntries returns the entries unchanged when every selected value is present', () => {
	const entries = [
		{ value: 'a', count: 2 },
		{ value: 'b', count: 1 },
	]
	expect(unionSelectedFacetEntries(entries, ['a'])).toEqual(entries)
})

test('unionSelectedFacetEntries adds a missing selected value at count 0, keeping alphabetical order', () => {
	const entries = [
		{ value: 'apple', count: 2 },
		{ value: 'zebra', count: 1 },
	]
	expect(unionSelectedFacetEntries(entries, ['apple', 'mango'])).toEqual([
		{ value: 'apple', count: 2 },
		{ value: 'mango', count: 0 },
		{ value: 'zebra', count: 1 },
	])
})

test('facetColumnFiltersToRows expands a plain-array (checkbox UI) filter into "is" rows', () => {
	expect(
		facetColumnFiltersToRows([
			{ id: 'tags', value: ['work', 'ideas'] },
			{ id: 'pinned', value: ['true'] },
		]),
	).toEqual([
		{ id: 0, field: 'tags', operator: 'is', value: 'work' },
		{ id: 1, field: 'tags', operator: 'is', value: 'ideas' },
		{ id: 2, field: 'pinned', operator: 'is', value: 'true' },
	])
})

test('facetColumnFiltersToRows expands an {include, exclude} filter into "is"/"is not" rows', () => {
	expect(
		facetColumnFiltersToRows([{ id: 'color', value: { include: ['blue'], exclude: ['red'] } }]),
	).toEqual([
		{ id: 0, field: 'color', operator: 'is', value: 'blue' },
		{ id: 1, field: 'color', operator: 'is-not', value: 'red' },
	])
})

test('facetColumnFiltersToRows dedupes repeated values within one filter', () => {
	expect(facetColumnFiltersToRows([{ id: 'tags', value: ['work', 'work'] }])).toEqual([
		{ id: 0, field: 'tags', operator: 'is', value: 'work' },
	])
})

test('facetColumnFiltersToRows returns [] for empty/undefined filter values', () => {
	expect(facetColumnFiltersToRows([])).toEqual([])
	expect(facetColumnFiltersToRows([{ id: 'tags', value: undefined }])).toEqual([])
})

test('facetRowsToFilterValues unions multiple "is" rows for the same field into include (OR-within-facet)', () => {
	const rows: FilterRow[] = [
		{ id: 0, field: 'tags', operator: 'is', value: 'work' },
		{ id: 1, field: 'tags', operator: 'is', value: 'ideas' },
		{ id: 2, field: 'pinned', operator: 'is', value: 'true' },
	]
	const result = facetRowsToFilterValues(rows, ['tags', 'pinned', 'color'])
	expect(result.get('tags')).toEqual({ include: ['work', 'ideas'], exclude: [] })
	expect(result.get('pinned')).toEqual({ include: ['true'], exclude: [] })
	expect(result.get('color')).toBeUndefined()
})

test('facetRowsToFilterValues splits "is not" rows into exclude, separate from "is" rows', () => {
	const rows: FilterRow[] = [
		{ id: 0, field: 'color', operator: 'is', value: 'blue' },
		{ id: 1, field: 'color', operator: 'is-not', value: 'red' },
		{ id: 2, field: 'color', operator: 'is-not', value: 'green' },
	]
	const result = facetRowsToFilterValues(rows, ['color'])
	expect(result.get('color')).toEqual({ include: ['blue'], exclude: ['red', 'green'] })
})

test('facetRowsToFilterValues treats a missing/unrecognized operator as "is" (backward compatible)', () => {
	const rows: FilterRow[] = [{ id: 0, field: 'tags', value: 'work' }] // no operator field at all
	expect(facetRowsToFilterValues(rows, ['tags']).get('tags')).toEqual({
		include: ['work'],
		exclude: [],
	})
})

test('facetRowsToFilterValues dedupes repeated values and ignores in-progress (empty) rows', () => {
	const rows: FilterRow[] = [
		{ id: 0, field: 'tags', operator: 'is', value: 'work' },
		{ id: 1, field: 'tags', operator: 'is', value: 'work' }, // duplicate row, same value
		{ id: 2, field: 'color', operator: 'is', value: '' }, // field picked, no value yet
		{ id: 3, field: '', operator: '', value: '' }, // freshly added, nothing picked yet
	]
	const result = facetRowsToFilterValues(rows, ['tags', 'color'])
	expect(result.get('tags')).toEqual({ include: ['work'], exclude: [] })
	expect(result.get('color')).toBeUndefined()
})

test('facetRowsToFilterValues returns undefined (not an empty object) for a facet with zero complete rows', () => {
	expect(facetRowsToFilterValues([], ['tags']).get('tags')).toBeUndefined()
})

test("facetFilterFn matches the checkbox UI's plain-array shape exactly like arrIncludesSome", () => {
	const row = { getValue: () => ['work', 'ideas'] }
	expect(facetFilterFn(row, 'tags', ['work'])).toBe(true)
	expect(facetFilterFn(row, 'tags', ['nope'])).toBe(false)
	expect(facetFilterFn(row, 'tags', [])).toBe(false) // arrIncludesSome: .some() on [] is false
})

test('facetFilterFn requires include match (if any) AND no exclude match', () => {
	const row = { getValue: () => ['blue'] }
	expect(facetFilterFn(row, 'color', { include: [], exclude: [] })).toBe(true) // no constraint
	expect(facetFilterFn(row, 'color', { include: ['blue'], exclude: [] })).toBe(true)
	expect(facetFilterFn(row, 'color', { include: ['green'], exclude: [] })).toBe(false)
	expect(facetFilterFn(row, 'color', { include: [], exclude: ['blue'] })).toBe(false)
	expect(facetFilterFn(row, 'color', { include: [], exclude: ['green'] })).toBe(true)
	// include AND exclude together: matches include, not excluded → true
	expect(facetFilterFn(row, 'color', { include: ['blue'], exclude: ['green'] })).toBe(true)
	// matches include but ALSO excluded → false
	expect(facetFilterFn(row, 'color', { include: ['blue'], exclude: ['blue'] })).toBe(false)
})

test('facetFilterFn.autoRemove matches arrIncludesSome.autoRemove for both shapes', () => {
	expect(facetFilterFn.autoRemove(undefined)).toBe(true)
	expect(facetFilterFn.autoRemove([])).toBe(true) // degenerate: nothing writes this today, guard anyway
	expect(facetFilterFn.autoRemove(['a'])).toBe(false)
	expect(facetFilterFn.autoRemove({ include: [], exclude: [] })).toBe(true) // degenerate, guarded
	expect(facetFilterFn.autoRemove({ include: ['a'], exclude: [] })).toBe(false)
	expect(facetFilterFn.autoRemove({ include: [], exclude: ['a'] })).toBe(false)
})

test('facetColumnFiltersToRows guards against a malformed include/exclude shape (not an array)', () => {
	// A hand-built/malformed columnFilters entry (e.g. a bad deep link) — must not explode
	// into one row per character via new Set('blue').
	expect(
		facetColumnFiltersToRows([
			// @ts-expect-error deliberately malformed input, guarding runtime behavior
			{ id: 'color', value: { include: 'blue', exclude: [] } },
		]),
	).toEqual([])
})

test('facetFilterValueToSelected extracts values from either shape', () => {
	expect(facetFilterValueToSelected(undefined)).toEqual([])
	expect(facetFilterValueToSelected(['a', 'b'])).toEqual(['a', 'b'])
	expect(facetFilterValueToSelected({ include: ['a'], exclude: ['b'] })).toEqual(['a', 'b'])
})

test('facetFilterValuesEqual compares by value set, ignoring order, across both shapes', () => {
	expect(facetFilterValuesEqual(undefined, undefined)).toBe(true)
	expect(facetFilterValuesEqual(undefined, [])).toBe(false)
	expect(facetFilterValuesEqual(['a', 'b'], ['b', 'a'])).toBe(true)
	expect(facetFilterValuesEqual(['a'], ['a', 'b'])).toBe(false)
	expect(
		facetFilterValuesEqual(
			{ include: ['a'], exclude: ['b'] },
			{ include: ['a'], exclude: ['b'] },
		),
	).toBe(true)
	expect(
		facetFilterValuesEqual({ include: ['a'], exclude: [] }, { include: [], exclude: ['a'] }),
	).toBe(false)
	// mismatched shapes never equal, even with the "same" values
	expect(facetFilterValuesEqual(['a'], { include: ['a'], exclude: [] })).toBe(false)
})

test('activeFilterCount counts one per column filter plus at most one for a non-blank search', () => {
	expect(activeFilterCount([], '')).toBe(0)
	expect(activeFilterCount([], '   ')).toBe(0)
	expect(activeFilterCount([{ id: 'tags', value: ['a'] }], '')).toBe(1)
	expect(activeFilterCount([], 'query')).toBe(1)
	expect(
		activeFilterCount(
			[
				{ id: 'tags', value: ['a'] },
				{ id: 'color', value: ['blue'] },
			],
			'query',
		),
	).toBe(3)
})
