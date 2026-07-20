<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, within, screen, waitFor } from 'storybook/test'
	import DataTable, { type ColumnSpec, type FacetSpec } from './DataTable.svelte'
	import * as Collapsible from '@kit/ui/shadcn-components/ui/collapsible'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'

	// Domain-free demo data — a small note-like list. The kit knows nothing about
	// "notes"; this shape only proves out the seam (Notes/Wikipedia are the real
	// consumers per docs/research/datatable-libs-2026-07.md).
	type Item = { id: string; title: string; updated: string; tags: string[] }

	const items: Item[] = [
		{ id: '1', title: 'Sourdough starter notes', updated: '2026-07-01', tags: ['Recipes'] },
		{ id: '2', title: 'Q3 roadmap draft', updated: '2026-06-20', tags: ['Work'] },
		{ id: '3', title: 'Trip to Lisbon', updated: '2026-05-15', tags: ['Travel', 'Personal'] },
		{ id: '4', title: '1:1 talking points', updated: '2026-06-28', tags: ['Work'] },
		{ id: '5', title: 'Weekend hike log', updated: '2026-06-02', tags: ['Personal', 'Travel'] },
		{ id: '6', title: 'Banana bread (v2)', updated: '2026-04-11', tags: ['Recipes'] },
		{ id: '7', title: 'Book club picks', updated: '2026-03-30', tags: ['Personal'] },
		{ id: '8', title: 'Budget review', updated: '2026-06-30', tags: ['Work'] },
	]

	const columns: ColumnSpec<Item>[] = [
		{ id: 'title', header: 'Title', accessor: (i) => i.title },
		{ id: 'updated', header: 'Updated', accessor: (i) => i.updated },
	]
	// Two facets (tags + multiTag) so an interaction test can assert AND-across-facets
	// narrowing, not just OR-within a single facet.
	const facets: FacetSpec<Item>[] = [
		{ id: 'tags', label: 'Tags', values: (i) => i.tags },
		{
			id: 'multiTag',
			label: 'Multiple tags',
			values: (i) => [i.tags.length > 1 ? 'Yes' : 'No'],
		},
	]

	// Every column opts out of the text filter → the search box would be a dead no-op, so
	// the composite hides it while facets still work (facets-only usage).
	const facetsOnlyColumns: ColumnSpec<Item>[] = [
		{ id: 'title', header: 'Title', accessor: (i) => i.title, filterable: false },
	]

	// A bigger, richer domain-free dataset for the "full power" demo below: 3 sortable
	// columns (not just 2) and 3 simultaneous facets (not just 2), so the story actually
	// exercises multi-column sort + multi-facet AND-across-facets at once, not just each
	// feature in isolation like the smaller `items` set above.
	type FullItem = {
		id: string
		title: string
		created: string
		updated: string
		tags: string[]
		color: 'slate' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'orange'
		pinned: boolean
	}

	const fullItems: FullItem[] = [
		{
			id: '1',
			title: 'Sourdough starter notes',
			created: '2026-01-05',
			updated: '2026-07-01',
			tags: ['Recipes'],
			color: 'orange',
			pinned: true,
		},
		{
			id: '2',
			title: 'Q3 roadmap draft',
			created: '2026-04-01',
			updated: '2026-06-20',
			tags: ['Work'],
			color: 'blue',
			pinned: true,
		},
		{
			id: '3',
			title: 'Trip to Lisbon',
			created: '2026-02-10',
			updated: '2026-05-15',
			tags: ['Travel', 'Personal'],
			color: 'green',
			pinned: false,
		},
		{
			id: '4',
			title: '1:1 talking points',
			created: '2026-06-01',
			updated: '2026-06-28',
			tags: ['Work'],
			color: 'blue',
			pinned: false,
		},
		{
			id: '5',
			title: 'Weekend hike log',
			created: '2026-05-20',
			updated: '2026-06-02',
			tags: ['Personal', 'Travel'],
			color: 'green',
			pinned: false,
		},
		{
			id: '6',
			title: 'Banana bread (v2)',
			created: '2026-03-01',
			updated: '2026-04-11',
			tags: ['Recipes'],
			color: 'orange',
			pinned: false,
		},
		{
			id: '7',
			title: 'Book club picks',
			created: '2026-01-15',
			updated: '2026-03-30',
			tags: ['Personal'],
			color: 'purple',
			pinned: false,
		},
		{
			id: '8',
			title: 'Budget review',
			created: '2026-06-15',
			updated: '2026-06-30',
			tags: ['Work', 'Finance'],
			color: 'blue',
			pinned: true,
		},
		{
			id: '9',
			title: 'Garden plan',
			created: '2026-02-20',
			updated: '2026-03-05',
			tags: ['Personal'],
			color: 'green',
			pinned: false,
		},
		{
			id: '10',
			title: 'Interview prep',
			created: '2026-05-01',
			updated: '2026-05-10',
			tags: ['Work'],
			color: 'slate',
			pinned: false,
		},
		{
			id: '11',
			title: 'Reading list',
			created: '2026-01-01',
			updated: '2026-02-14',
			tags: ['Personal', 'Reading'],
			color: 'purple',
			pinned: false,
		},
		{
			id: '12',
			title: 'Recipe: Ramen',
			created: '2026-04-10',
			updated: '2026-04-20',
			tags: ['Recipes'],
			color: 'orange',
			pinned: false,
		},
		{
			id: '13',
			title: 'Standup notes',
			created: '2026-06-05',
			updated: '2026-06-25',
			tags: ['Work'],
			color: 'blue',
			pinned: false,
		},
		{
			id: '14',
			title: 'Birthday gift ideas',
			created: '2026-03-15',
			updated: '2026-03-20',
			tags: ['Personal'],
			color: 'pink',
			pinned: false,
		},
		{
			id: '15',
			title: 'Year-end goals',
			created: '2026-01-02',
			updated: '2026-01-10',
			tags: ['Work', 'Personal'],
			color: 'yellow',
			pinned: true,
		},
		{
			id: '16',
			title: 'Packing checklist',
			created: '2026-05-25',
			updated: '2026-06-01',
			tags: ['Travel'],
			color: 'green',
			pinned: false,
		},
		{
			id: '17',
			title: 'Finance Q2 summary',
			created: '2026-04-05',
			updated: '2026-04-30',
			tags: ['Finance'],
			color: 'slate',
			pinned: false,
		},
		{
			id: '18',
			title: 'Workout plan',
			created: '2026-02-01',
			updated: '2026-06-10',
			tags: ['Health'],
			color: 'pink',
			pinned: false,
		},
		{
			id: '19',
			title: 'Meeting agenda',
			created: '2026-06-20',
			updated: '2026-06-27',
			tags: ['Work'],
			color: 'blue',
			pinned: false,
		},
		{
			id: '20',
			title: 'Grocery list',
			created: '2026-06-29',
			updated: '2026-06-29',
			tags: ['Recipes', 'Personal'],
			color: 'orange',
			pinned: false,
		},
		{
			id: '21',
			title: 'Project ideas',
			created: '2026-01-20',
			updated: '2026-02-01',
			tags: ['Work', 'Ideas'],
			color: 'yellow',
			pinned: false,
		},
		{
			id: '22',
			title: 'Health checkup notes',
			created: '2026-03-10',
			updated: '2026-03-12',
			tags: ['Health'],
			color: 'pink',
			pinned: false,
		},
		{
			id: '23',
			title: 'Travel packing v2',
			created: '2026-06-10',
			updated: '2026-06-15',
			tags: ['Travel'],
			color: 'green',
			pinned: false,
		},
		{
			id: '24',
			title: 'Dinner recipe ideas',
			created: '2026-05-05',
			updated: '2026-05-06',
			tags: ['Recipes'],
			color: 'orange',
			pinned: false,
		},
		{
			// Deliberately blue + NOT "Work" — without this, every blue item happens to
			// also be tagged "Work", so faceting to blue then adding "Work" wouldn't
			// actually narrow anything (a real gap an earlier draft of this story had).
			id: '25',
			title: 'Weekend plans',
			created: '2026-06-25',
			updated: '2026-06-26',
			tags: ['Personal'],
			color: 'blue',
			pinned: false,
		},
	]

	const fullColumns: ColumnSpec<FullItem>[] = [
		{ id: 'title', header: 'Title', accessor: (i) => i.title },
		{ id: 'created', header: 'Created', accessor: (i) => i.created, filterable: false },
		{ id: 'updated', header: 'Updated', accessor: (i) => i.updated, filterable: false },
	]

	const fullFacets: FacetSpec<FullItem>[] = [
		{ id: 'tags', label: 'Tags', values: (i) => i.tags },
		{ id: 'color', label: 'Color', values: (i) => [i.color] },
		{ id: 'pinned', label: 'Pinned', values: (i) => [i.pinned ? 'Pinned' : 'Unpinned'] },
	]

	// Fixed demo-only swatch, not a theme token — same intentional exception as the Notes
	// app's own `COLOR_DOT` (an item's color is its own fixed attribute, not UI chrome).
	const FULL_ITEM_COLOR_DOT: Record<FullItem['color'], string> = {
		slate: '#64748b',
		yellow: '#eab308',
		green: '#22c55e',
		blue: '#3b82f6',
		purple: '#a855f7',
		pink: '#ec4899',
		orange: '#f97316',
	}

	const { Story } = defineMeta({
		title: 'Composites/DataTable',
		component: DataTable,
		tags: ['autodocs'],
		args: { items, columns, facets },
	})
</script>

<!-- Consumer-supplied per-row markup — a plain card, bring-your-own-data. -->
{#snippet row(item: Item)}
	<div class="flex items-center justify-between rounded-md border border-border p-3">
		<div>
			<p class="font-medium">{item.title}</p>
			<p class="text-sm text-muted-foreground">{item.tags.join(', ')}</p>
		</div>
		<span class="text-sm text-muted-foreground">{item.updated}</span>
	</div>
{/snippet}

<!-- Full demo: search + sort + facets + rows. -->
<Story name="Default" asChild>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- No items at all — the Empty primitive, "no items yet" copy. -->
<Story name="Empty (no items)" asChild>
	<DataTable items={[]} {columns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- Facets pre-selected via the bindable columnFilters — shows the Empty "no matches"
     copy varies once a filter is active, AND that the pre-filtered count + status text
     are correct from first render (not just after a later interaction). -->
<Story
	name="Preselected facet filter"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// Recipes -> "Sourdough starter notes" + "Banana bread (v2)".
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2))
		expect(canvas.getByText('Sourdough starter notes')).toBeInTheDocument()
		expect(canvas.getByText('Banana bread (v2)')).toBeInTheDocument()
		expect(canvas.getByRole('status')).toHaveTextContent('2 of 8 results')
		// The OR-within-facet count hint renders under the "Tags" facet (it has a
		// selected value) — getByText also implicitly asserts it appears only ONCE,
		// i.e. not under the unselected "Multiple tags" facet.
		expect(
			canvas.getByText('Counts show results if you also select that value.'),
		).toBeInTheDocument()
	}}
>
	<DataTable
		{items}
		{columns}
		{facets}
		{row}
		ariaLabel="Notes"
		columnFilters={[{ id: 'tags', value: ['Recipes'] }]}
	/>
</Story>

<!-- Interaction test (rule 10): typing into the search box narrows the list, and the
     sr-only live-region status text reflects the new count. Keyboard interaction:
     userEvent.keyboard types the query (no pointer-only path). -->
<Story
	name="Search narrows the list"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// All 8 rows render initially.
		expect(canvas.getAllByRole('listitem')).toHaveLength(8)

		const search = canvas.getByRole('textbox', { name: 'Search…' })
		await userEvent.click(search)
		await userEvent.keyboard('sourdough')

		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(1))
		expect(canvas.getByText('Sourdough starter notes')).toBeInTheDocument()
		expect(canvas.getByRole('status')).toHaveTextContent('1 of 8 result')
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- Interaction test: selecting a facet value filters via arrIncludesSome (OR within
     the facet — selecting a second value in the same facet only ADDS matches back), AND
     that selecting a value in a DIFFERENT facet narrows further (AND across facets).
     Keyboard interaction: Tab focuses the checkbox before toggling it. -->
<Story
	name="Facet checkbox filters (OR within, AND across)"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const search = canvas.getByRole('textbox', { name: 'Search…' })

		// Tab from the search input toward the facet checkboxes, then activate one
		// with the keyboard (Space) rather than a click.
		search.focus()
		await userEvent.tab()
		const recipesBox = canvas.getByRole('checkbox', { name: /Recipes/ })
		recipesBox.focus()
		await userEvent.keyboard(' ')

		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2))
		expect(canvas.getByText('Sourdough starter notes')).toBeInTheDocument()
		expect(canvas.getByText('Banana bread (v2)')).toBeInTheDocument()

		// Selecting a second value in the SAME facet is OR — it ADDS matches, not
		// narrows further.
		const travelBox = canvas.getByRole('checkbox', { name: /Travel/ })
		await userEvent.click(travelBox)
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(4))

		// Reset to just "Personal" (tags facet) — 3 matches: Trip to Lisbon, Weekend
		// hike log, Book club picks.
		await userEvent.click(travelBox)
		const recipesBoxAgain = canvas.getByRole('checkbox', { name: /Recipes/ })
		await userEvent.click(recipesBoxAgain)
		const personalBox = canvas.getByRole('checkbox', { name: /Personal/ })
		await userEvent.click(personalBox)
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(3))

		// Now select "Yes" in the DIFFERENT "Multiple tags" facet — AND across facets
		// narrows the 3 Personal notes down to the 2 that also have >1 tag.
		const multiTagYesBox = canvas.getByRole('checkbox', { name: /^Yes/ })
		await userEvent.click(multiTagYesBox)
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2))
		expect(canvas.getByText('Trip to Lisbon')).toBeInTheDocument()
		expect(canvas.getByText('Weekend hike log')).toBeInTheDocument()
		expect(canvas.queryByText('Book club picks')).not.toBeInTheDocument()
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- Interaction test: a text filter AND a facet filter combine (AND), landing on a
     narrower result set than either filter alone. Text "b" alone matches 4 titles
     ("Trip to Lisbon", "Banana bread (v2)", "Book club picks", "Budget review"); the
     "Work" tag alone matches 3 ("Q3 roadmap draft", "1:1 talking points", "Budget
     review"); combined they narrow to the single item both conditions share. -->
<Story
	name="Text filter + facet filter combine"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const search = canvas.getByRole('textbox', { name: 'Search…' })
		await userEvent.click(search)
		await userEvent.keyboard('b')
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(4))

		const workBox = canvas.getByRole('checkbox', { name: /Work/ })
		await userEvent.click(workBox)

		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(1))
		expect(canvas.getByText('Budget review')).toBeInTheDocument()
		expect(canvas.getByRole('status')).toHaveTextContent('1 of 8 result')
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- Interaction test: the "Clear filters" control is absent with no active filter/search,
     appears once a facet or the search box is used, and clicking it restores the full row
     count AND empties the search input in one action. -->
<Story
	name="Clear filters appears, clears facet + search"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// No filter active yet — the control isn't rendered at all.
		expect(canvas.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()

		const search = canvas.getByRole('textbox', { name: 'Search…' })
		await userEvent.click(search)
		await userEvent.keyboard('b')
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(4))

		// Typing alone is enough to surface it.
		const clearButton = await canvas.findByRole('button', { name: 'Clear filters' })

		const workBox = canvas.getByRole('checkbox', { name: /Work/ })
		await userEvent.click(workBox)
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(1))

		await userEvent.click(clearButton)

		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(8))
		expect(canvas.getByRole('textbox', { name: 'Search…' })).toHaveValue('')
		expect(canvas.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- Interaction test: driving the sort Select changes the rendered row order. Starts
     unsorted (insertion order — "Sourdough starter notes" first); switching to
     "Updated — ascending" puts the earliest-dated item ("Book club picks",
     2026-03-30) first. -->
<Story
	name="Sort changes row order"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const firstRowTitle = () => canvas.getAllByRole('listitem')[0].textContent ?? ''

		expect(firstRowTitle()).toContain('Sourdough starter notes')

		await userEvent.click(canvas.getByRole('button', { name: 'Sort by' }))
		await userEvent.click(await screen.findByRole('option', { name: 'Updated — ascending' }))

		await waitFor(() => expect(firstRowTitle()).toContain('Book club picks'))
		// bits-ui's body-scroll-lock sets `document.body.style.pointerEvents = 'none'` while
		// the Select is open and only restores it ~24ms after the last lock clears (see
		// `body-scroll-lock.svelte.js`), so wait for that restore before opening it again —
		// otherwise the trigger can still compute `pointer-events: none` (inherited from
		// body) and the next click throws.
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))

		// "Unsorted" is a real, selectable item (not a display-only dead end) — picking it
		// resets `sorting` and the trigger shows "Unsorted" again, reverting to insertion order.
		await userEvent.click(canvas.getByRole('button', { name: 'Sort by' }))
		await userEvent.click(await screen.findByRole('option', { name: 'Unsorted' }))

		await waitFor(() => expect(firstRowTitle()).toContain('Sourdough starter notes'))
		expect(canvas.getByRole('button', { name: 'Sort by' })).toHaveTextContent('Unsorted')
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- Facets-only (no filterable column): the search box is hidden, facets still render. -->
<Story
	name="Facets-only (no search box)"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// no text-filterable column → no search textbox at all…
		expect(canvas.queryByRole('textbox')).toBeNull()
		// …but the facet checkboxes still render and the rows show.
		expect(canvas.getAllByRole('checkbox').length).toBeGreaterThan(0)
		expect(canvas.getAllByRole('listitem')).toHaveLength(8)
	}}
>
	<DataTable {items} columns={facetsOnlyColumns} {facets} {row} ariaLabel="Notes" />
</Story>

<!-- Consumer-supplied per-row markup for the "full power" demo — a card with a color dot,
     a pinned marker, tags, and both dates, showing the composite renders arbitrary
     per-item content regardless of how many columns/facets drive it. -->
{#snippet fullRow(item: FullItem)}
	<div class="flex items-center justify-between gap-3 rounded-md border border-border p-3">
		<div class="flex min-w-0 items-center gap-2">
			<span
				class="size-2.5 shrink-0 rounded-full"
				style="background:{FULL_ITEM_COLOR_DOT[item.color]}"
				aria-hidden="true"
			></span>
			<div class="min-w-0">
				<p class="truncate font-medium">
					{item.title}{#if item.pinned}<span class="text-muted-foreground">
							· pinned</span
						>{/if}
				</p>
				<p class="truncate text-sm text-muted-foreground">{item.tags.join(', ')}</p>
			</div>
		</div>
		<span class="shrink-0 text-sm text-muted-foreground">{item.updated}</span>
	</div>
{/snippet}

<!-- "Full power" demo (do this first, per project convention, before wiring a real app
     page): a bigger dataset, 3 sortable columns, and 3 simultaneous facets (tags + color +
     pinned) narrowing together, proving multi-column sort and multi-facet AND-across-facets
     compose correctly at once — not just each feature demonstrated in isolation like the
     smaller stories above. This is the shape the Notes app's /table route (full DataTable
     power demonstration) is built from. -->
<Story
	name="Full power — many columns, many facets, larger dataset"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		expect(canvas.getAllByRole('listitem')).toHaveLength(fullItems.length)

		// Facet the "Color" group to "blue" — every blue item, across any tag.
		const blueCount = fullItems.filter((i) => i.color === 'blue').length
		const blueBox = canvas.getByRole('checkbox', { name: /^blue/ })
		await userEvent.click(blueBox)
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(blueCount))

		// AND across facets: also require the "Work" tag — narrows further.
		const blueWorkCount = fullItems.filter(
			(i) => i.color === 'blue' && i.tags.includes('Work'),
		).length
		const workBox = canvas.getByRole('checkbox', { name: /^Work/ })
		await userEvent.click(workBox)
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(blueWorkCount))

		// A third, simultaneous facet (Pinned) narrows again — 3 facets active at once.
		const bluePinnedWorkCount = fullItems.filter(
			(i) => i.color === 'blue' && i.tags.includes('Work') && i.pinned,
		).length
		const pinnedBox = canvas.getByRole('checkbox', { name: /^Pinned/ })
		await userEvent.click(pinnedBox)
		await waitFor(() =>
			expect(canvas.getAllByRole('listitem')).toHaveLength(bluePinnedWorkCount),
		)

		// Sort the (now narrow) result set by a THIRD column ("Created") — proving sort
		// isn't limited to the 2-column case the smaller stories above exercise.
		await userEvent.click(canvas.getByRole('button', { name: 'Sort by' }))
		await userEvent.click(await screen.findByRole('option', { name: 'Created — ascending' }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))

		const expectedFirst = fullItems
			.filter((i) => i.color === 'blue' && i.tags.includes('Work') && i.pinned)
			.sort((a, b) => a.created.localeCompare(b.created))[0]
		await waitFor(() =>
			expect(canvas.getAllByRole('listitem')[0].textContent ?? '').toContain(
				expectedFirst.title,
			),
		)

		// Clearing filters restores the full, unfiltered count.
		await userEvent.click(await canvas.findByRole('button', { name: 'Clear filters' }))
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(fullItems.length))
	}}
>
	<DataTable
		items={fullItems}
		columns={fullColumns}
		facets={fullFacets}
		row={fullRow}
		ariaLabel="Items"
		searchPlaceholder="Search by title…"
	/>
</Story>

<!-- `toolbarInPopover`: the identical toolbar+facets markup, relocated into a Popover behind
     a "Filters" button — proves (a) the trigger shows a live active-filter-count Badge, (b)
     filtering/searching from inside the popover still narrows the row list rendered OUTSIDE
     it, and (c) the row list stays narrowed after the popover closes (state, not just the
     popover's own local UI, is what changed). -->
<Story
	name="Toolbar in a popover"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const body = within(canvasElement.ownerDocument.body)

		// No badge before any filter is active.
		const trigger = canvas.getByRole('button', { name: 'Filters' })
		expect(within(trigger).queryByText(/^\d+$/)).not.toBeInTheDocument()
		expect(canvas.getAllByRole('listitem')).toHaveLength(8)

		await userEvent.click(trigger)
		const recipesBox = await body.findByRole('checkbox', { name: /Recipes/ })
		await userEvent.click(recipesBox)

		// Filtering from inside the popover narrows the row list rendered outside it.
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2))
		expect(canvas.getByText('Sourdough starter notes')).toBeInTheDocument()
		expect(canvas.getByText('Banana bread (v2)')).toBeInTheDocument()

		// The trigger now shows an active-filter-count badge.
		await waitFor(() => expect(within(trigger).getByText('1')).toBeInTheDocument())

		// Closing the popover (Escape) doesn't reset the filter — it's DataTable's own bound
		// state, not popover-local UI state.
		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(body.queryByRole('checkbox', { name: /Recipes/ })).toBeNull())
		expect(canvas.getAllByRole('listitem')).toHaveLength(2)

		// Focus returns to the trigger on close, same as this codebase's Dialog/Sheet.
		await waitFor(() => expect(trigger).toHaveFocus())
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" toolbarInPopover />
</Story>

<!-- `facetStyle="rows"` + `toolbarInCollapsible`: facets expressed as `FilterRows`
     "[field] is [value]" rows instead of checkbox groups, tucked into an inline
     `Collapsible` (not a floating `Popover`) above the row list — proves (a) the
     Collapsible starts closed and its content isn't in the DOM until opened, (b) adding a
     row for one facet narrows the row list rendered OUTSIDE the collapsible, (c) a SECOND
     row on a DIFFERENT facet ANDs with the first (not replaces it), and (d) "Clear filters"
     empties the row list itself, not just the underlying column filters. -->
<Story
	name="Facets as filter rows, in a collapsible"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Collapsed by default — the toolbar/facet rows aren't in the DOM until opened.
		const trigger = canvas.getByRole('button', { name: 'Filters' })
		expect(canvas.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument()
		expect(canvas.getAllByRole('listitem')).toHaveLength(8)

		await userEvent.click(trigger)
		await canvas.findByRole('button', { name: 'Add filter' })
		// A Collapsible is a disclosure, not an overlay — focus stays on the trigger that
		// was just clicked (unlike a Popover/Dialog, which may move focus into its content).
		expect(trigger).toHaveFocus()

		// Row 1: "Tags is Personal" — narrows the row list rendered outside the collapsible.
		// Each Select close waits out its `pointer-events: none` body-lock artifact (same
		// one the "Full power" story below already documents) before the next click.
		await userEvent.click(canvas.getByRole('button', { name: 'Add filter' }))
		await userEvent.click(canvas.getByRole('button', { name: /Filter field, row 1/ }))
		await userEvent.click(await screen.findByRole('option', { name: 'Tags' }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))
		await userEvent.click(canvas.getByRole('button', { name: /Tags value, row 1/ }))
		await userEvent.click(await screen.findByRole('option', { name: /^Personal/ }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))

		const personalCount = items.filter((i) => i.tags.includes('Personal')).length
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(personalCount))
		await waitFor(() => expect(within(trigger).getByText('1')).toBeInTheDocument())

		// Row 2, a DIFFERENT facet ("Multiple tags is Yes") — ANDs with row 1, narrowing further.
		await userEvent.click(canvas.getByRole('button', { name: 'Add filter' }))
		await userEvent.click(canvas.getByRole('button', { name: /Filter field, row 2/ }))
		await userEvent.click(await screen.findByRole('option', { name: 'Multiple tags' }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))
		await userEvent.click(canvas.getByRole('button', { name: /Multiple tags value, row 2/ }))
		await userEvent.click(await screen.findByRole('option', { name: /^Yes/ }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))

		const personalMultiCount = items.filter(
			(i) => i.tags.includes('Personal') && i.tags.length > 1,
		).length
		expect(personalMultiCount).toBeLessThan(personalCount) // the AND actually narrows
		await waitFor(() =>
			expect(canvas.getAllByRole('listitem')).toHaveLength(personalMultiCount),
		)
		await waitFor(() => expect(within(trigger).getByText('2')).toBeInTheDocument())

		// "Clear filters" empties the row list itself (not just the column filters it drove).
		await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(items.length))
		expect(canvas.queryByRole('button', { name: /Filter field, row/ })).not.toBeInTheDocument()
	}}
>
	<DataTable
		{items}
		{columns}
		{facets}
		{row}
		ariaLabel="Notes"
		facetStyle="rows"
		toolbarInCollapsible
	/>
</Story>

<!-- `facetStyle="rows"` operator ("is"/"is not"): proves a row's operator Select can flip a
     facet from inclusion to exclusion — same field, same value, opposite semantics — and
     that the change is actually picked up (the row doesn't stay stuck on whatever operator
     it started with). -->
<Story
	name="Facet row operator: is / is not"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		await userEvent.click(canvas.getByRole('button', { name: 'Add filter' }))
		await userEvent.click(canvas.getByRole('button', { name: /Filter field, row 1/ }))
		await userEvent.click(await screen.findByRole('option', { name: 'Tags' }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))
		await userEvent.click(canvas.getByRole('button', { name: /Tags value, row 1/ }))
		await userEvent.click(await screen.findByRole('option', { name: /^Personal/ }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))

		// Default operator is "is" — narrows TO the tagged items.
		const personalCount = items.filter((i) => i.tags.includes('Personal')).length
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(personalCount))

		// Flipping the operator to "is not" (same field, same value) excludes them instead.
		await userEvent.click(canvas.getByRole('button', { name: /Tags operator, row 1/ }))
		await userEvent.click(await screen.findByRole('option', { name: 'is not' }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))

		await waitFor(() =>
			expect(canvas.getAllByRole('listitem')).toHaveLength(items.length - personalCount),
		)
		const nonPersonalTitle = items.find((i) => !i.tags.includes('Personal'))!.title
		expect(canvas.getByText(nonPersonalTitle)).toBeInTheDocument()
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" facetStyle="rows" />
</Story>

<!-- `facetStyle="rows"` + a pre-populated `columnFilters` (e.g. a deep link) — proves
     `facetColumnFiltersToRows` correctly seeds FilterRows' row list AT MOUNT from the
     incoming filter (not just from rows added interactively afterward), and that the seed
     is a real, editable row (not just a filtered result set with no visible control to
     explain or undo it). -->
<Story
	name="Facets as rows, preseeded from columnFilters"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// Recipes -> "Sourdough starter notes" + "Banana bread (v2)" (same preselected
		// filter as the checkbox-style "Preselected facet filter" story above, but seeded
		// into a FilterRows row instead of a checked checkbox).
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2))
		expect(canvas.getByText('Sourdough starter notes')).toBeInTheDocument()
		expect(canvas.getByText('Banana bread (v2)')).toBeInTheDocument()

		const operatorTrigger = canvas.getByRole('button', { name: /Tags operator, row 1/ })
		expect(within(operatorTrigger).getByText('is')).toBeInTheDocument()
		expect(canvas.getByRole('button', { name: /Tags value, row 1/ })).toBeInTheDocument()

		// Removing the seeded row restores the full list.
		await userEvent.click(canvas.getByRole('button', { name: /Remove Tags filter, row 1/ }))
		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(items.length))
	}}
>
	<DataTable
		{items}
		{columns}
		{facets}
		{row}
		ariaLabel="Notes"
		facetStyle="rows"
		columnFilters={[{ id: 'tags', value: ['Recipes'] }]}
	/>
</Story>

<!-- `toolbarWrapper`: a consumer can take over the toolbar's ENTIRE placement — trigger AND
     content — by wrapping it in their OWN Collapsible, instead of relocating into one
     DataTable itself owns (toolbarInPopover/toolbarInCollapsible). Proves (a) DataTable calls
     the consumer's snippet with a working `toolbar` snippet + a live `activeFilterCount`
     (not a static/stale value), (b) the consumer's OWN Collapsible correctly shows/hides that
     content, and (c) a marker the consumer renders in the SAME snippet, after the panel,
     lands between the panel and the row list — the exact seam the Notes /table page relies
     on to put its column-header row there (see docs/kit/components/notes-table.md). -->
<Story
	name="toolbarWrapper: consumer owns the whole toolbar's placement"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Collapsed by default; DataTable's OWN built-in trigger/Collapsible/Popover never
		// render at all — toolbarWrapper takes over entirely.
		const trigger = canvas.getByRole('button', { name: 'Filters' })
		expect(canvas.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument()
		expect(canvas.getAllByRole('listitem')).toHaveLength(8)

		// The consumer-rendered marker (after the panel, in the SAME snippet) sits between
		// the trigger and the row list — proving the seam a page-owned header row relies on.
		expect(canvas.getByText('Consumer-owned marker')).toBeInTheDocument()

		await userEvent.click(trigger)
		await canvas.findByRole('button', { name: 'Add filter' })

		// The `toolbar` snippet handed to the consumer IS DataTable's real toolbar — adding a
		// facet row here narrows the row list rendered OUTSIDE this snippet entirely.
		await userEvent.click(canvas.getByRole('button', { name: 'Add filter' }))
		await userEvent.click(canvas.getByRole('button', { name: /Filter field, row 1/ }))
		await userEvent.click(await screen.findByRole('option', { name: 'Tags' }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))
		await userEvent.click(canvas.getByRole('button', { name: /Tags value, row 1/ }))
		await userEvent.click(await screen.findByRole('option', { name: /^Recipes/ }))
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'))

		await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2))
		// activeFilterCount handed to the consumer's snippet is genuinely live, not static.
		await waitFor(() => expect(within(trigger).getByText('1')).toBeInTheDocument())
	}}
>
	<DataTable {items} {columns} {facets} {row} ariaLabel="Notes" facetStyle="rows">
		{#snippet toolbarWrapper({ toolbar, activeFilterCount })}
			<Collapsible.Root class="flex flex-col gap-2">
				<Collapsible.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm">
							Filters
							{#if activeFilterCount > 0}
								<Badge variant="secondary">{activeFilterCount}</Badge>
							{/if}
						</Button>
					{/snippet}
				</Collapsible.Trigger>
				<Collapsible.Content>
					{@render toolbar()}
				</Collapsible.Content>
			</Collapsible.Root>
			<p>Consumer-owned marker</p>
		{/snippet}
	</DataTable>
</Story>
