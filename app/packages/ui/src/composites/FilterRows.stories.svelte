<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, within, screen, waitFor } from 'storybook/test'
	import FilterRows, { type FilterFieldDef, type FilterRow } from './FilterRows.svelte'

	// Domain-free demo fields: a value-field, a boolean field (no `values`), and
	// another value-field — the kit knows nothing about photos/notes/etc.
	const fields: FilterFieldDef[] = [
		{
			id: 'type',
			label: 'Media type',
			values: [
				{ id: 'photo', label: 'Photos' },
				{ id: 'video', label: 'Videos' },
			],
		},
		{ id: 'fav', label: 'Favorites' },
		{
			id: 'year',
			label: 'Year',
			valuePlaceholder: 'Any year',
			values: [
				{ id: '2024', label: '2024' },
				{ id: '2023', label: '2023' },
				{ id: '2022', label: '2022' },
			],
		},
	]
	const preset: FilterRow[] = [
		{ id: 0, field: 'type', value: 'photo' },
		{ id: 1, field: 'year', value: '2024' },
	]

	const { Story } = defineMeta({
		title: 'Composites/FilterRows',
		component: FilterRows,
		tags: ['autodocs'],
		args: { fields },
		argTypes: {
			oneRowPerField: { control: 'boolean' },
			addLabel: { control: 'text' },
		},
	})
</script>

<!-- No rows yet — just the "Add filter" affordance. -->
<Story name="Empty" />

<!-- Pre-populated value model. -->
<Story name="With rows" args={{ value: preset }} />

<!-- One row per field: once every field is used, "Add filter" disables. -->
<Story name="One row per field" args={{ value: preset, oneRowPerField: true }} />

<!-- Interaction test (runs as a Vitest browser test via addon-vitest): clicking
     "Add filter" appends an empty row whose field Select shows the placeholder. -->
<Story
	name="Add a filter"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'Add filter' }))
		await expect(canvas.getByText('Choose field…')).toBeInTheDocument()
	}}
/>

<!-- Keyboard coverage: tab to "Add filter" and press Enter — same row-add result. -->
<Story
	name="Add a filter via keyboard"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// Tab until the "Add filter" button is focused.
		const addBtn = canvas.getByRole('button', { name: 'Add filter' })
		addBtn.focus()
		await expect(addBtn).toHaveFocus()
		// Activate via keyboard Enter — should append a row.
		await userEvent.keyboard('{Enter}')
		await expect(canvas.getByText('Choose field…')).toBeInTheDocument()
	}}
/>

<!-- Invariant: changing a row's FIELD resets its VALUE (a stale value from the old
     field would apply the wrong predicate). Row 0 starts Media type = Photos; switch
     it to Year and assert the value fell back to the "Any year" placeholder. -->
<Story
	name="Changing a field resets its value"
	args={{ value: preset }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// Per-row labels now carry the field + row number ("Type value, row 1",
		// "Filter field, row 1"), so match by the stable suffix.
		const valueTriggers = () => canvas.getAllByRole('button', { name: /value, row \d/ })
		// row 0's value trigger starts on "Photos".
		await expect(valueTriggers()[0]).toHaveTextContent('Photos')
		// open row 0's field select and switch to "Year" (options portal to <body>).
		await userEvent.click(canvas.getAllByRole('button', { name: /Filter field, row \d/ })[0])
		await userEvent.click(await screen.findByRole('option', { name: 'Year' }))
		// the value reset — row 0's value trigger now shows the "Any year" placeholder.
		await waitFor(() => expect(valueTriggers()[0]).toHaveTextContent('Any year'))
		await expect(valueTriggers()[0]).not.toHaveTextContent('Photos')
	}}
/>
