import { render } from 'vitest-browser-svelte'
import { expect, test } from 'vitest'
import FilterRows, { type FilterFieldDef, type FilterRow } from './FilterRows.svelte'

// First isolated component test on the (previously unused) vitest-browser-svelte
// harness — validates FilterRows in isolation, mounting only kit + shadcn (no app
// data), which is also the proof that the composite is domain-free.

const fields: FilterFieldDef[] = [
	{
		id: 'type',
		label: 'Type',
		values: [
			{ id: 'photo', label: 'Photos' },
			{ id: 'video', label: 'Videos' },
		],
		valuePlaceholder: 'Any type',
	},
	{ id: 'time', label: 'Time', values: [{ id: 'year', label: 'This year' }] },
	{ id: 'fav', label: 'Favorites' }, // boolean field — no value Select
]
const rows = (...rs: Partial<FilterRow>[]): FilterRow[] =>
	rs.map((r, id) => ({ id, field: '', value: '', ...r }))

test('starts as a single, enabled Add filter button with no rows', async () => {
	const screen = render(FilterRows, { fields })
	await expect.element(screen.getByRole('button', { name: 'Add filter' })).toBeEnabled()
	// Remove buttons carry a per-row aria-label; match them by the stable data attribute.
	expect(screen.container.querySelectorAll('[data-filter-remove]')).toHaveLength(0)
})

test('Add filter appends a row with the field placeholder', async () => {
	const screen = render(FilterRows, { fields })
	await screen.getByRole('button', { name: 'Add filter' }).click()
	await expect.element(screen.getByText('Choose field…')).toBeInTheDocument()
	expect(screen.container.querySelectorAll('[data-filter-remove]')).toHaveLength(1)
})

test('Remove filter deletes its row', async () => {
	const screen = render(FilterRows, { fields, value: rows({ field: 'fav' }) })
	expect(screen.container.querySelectorAll('[data-filter-remove]')).toHaveLength(1)
	// Per-row label now includes the field + row number, e.g. "Remove Favorites filter, row 1".
	await screen.getByRole('button', { name: /^Remove .*filter/ }).click()
	expect(screen.container.querySelectorAll('[data-filter-remove]')).toHaveLength(0)
})

test('boolean field renders no value Select; enum field shows its value label', async () => {
	const bool = render(FilterRows, { fields, value: rows({ field: 'fav' }) })
	await expect.element(bool.getByText('Favorites')).toBeVisible()
	expect(bool.getByText('Any type').elements()).toHaveLength(0)

	const enumRow = render(FilterRows, { fields, value: rows({ field: 'type', value: 'photo' }) })
	await expect.element(enumRow.getByText('Photos')).toBeVisible()
})

test('oneRowPerField disables Add filter once every field is in use', async () => {
	const screen = render(FilterRows, {
		fields,
		oneRowPerField: true,
		value: rows(
			{ field: 'type', value: 'photo' },
			{ field: 'time', value: 'year' },
			{ field: 'fav' },
		),
	})
	await expect.element(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled()
})
