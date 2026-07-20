<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, within, userEvent, waitFor } from 'storybook/test'
	import PathBar, { type PathBarSegment } from './PathBar.svelte'

	const { Story } = defineMeta({
		title: 'Composites/PathBar',
		component: PathBar,
		tags: ['autodocs'],
	})
</script>

<script lang="ts">
	// A small "scope" demo: clicking/activating an earlier segment re-scopes
	// (mirrors the search-overlay scope-control use case); the last segment is
	// always the current, non-interactive location.
	let scope = $state<'all' | 'vacations'>('vacations')
	const segments = $derived<PathBarSegment[]>(
		scope === 'all'
			? [{ id: 'all', label: 'All' }]
			: [
					{ id: 'all', label: 'All', onSelect: () => (scope = 'all') },
					{ id: 'vacations', label: 'Vacations' },
				],
	)

	// A deep trail (with long labels) to demonstrate the responsive collapse.
	const deepSegments: PathBarSegment[] = [
		{ id: 'home', label: 'All Articles', href: '#' },
		{ id: 'sci', label: 'Science & Technology', href: '#' },
		{ id: 'phys', label: 'Physics & Chemistry', href: '#' },
		{ id: 'thermo', label: 'Thermodynamics', href: '#' },
		{ id: 'law', label: 'The Second Law of Thermodynamics' },
	]
</script>

{#snippet template()}
	<div>
		<PathBar {segments} />
		<p>Scope: {scope}</p>
	</div>
{/snippet}

<Story name="Default" {template} />

<!-- Interaction test: the last segment is the non-interactive current location
     (aria-current="page", not a link/button); an earlier segment is a real,
     keyboard-operable control (Tab + Enter) whose action actually re-scopes. -->
<Story
	name="Selecting an earlier segment runs its action by keyboard"
	{template}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const current = canvas.getByText('Vacations')
		await expect(current).toHaveAttribute('aria-current', 'page')
		await expect(canvas.getByText('Scope: vacations')).toBeInTheDocument()

		const all = canvas.getByRole('button', { name: 'All' })
		all.focus()
		await expect(all).toHaveFocus()
		await userEvent.keyboard('{Enter}')
		await waitFor(() => expect(canvas.getByText('Scope: all')).toBeInTheDocument())

		// Re-scoped to "All" — now the sole, current segment (no earlier link/button).
		await expect(canvas.getByText('All')).toHaveAttribute('aria-current', 'page')
	}}
/>

<!-- Responsive collapse: in a narrow container the middle segments fold into a "…"
     dropdown (measured, true content-fit), keeping the first + current. -->
{#snippet collapsing()}
	<div class="max-w-sm rounded-md border border-border p-3">
		<PathBar segments={deepSegments} />
	</div>
	<p class="mt-2 text-xs text-muted-foreground">
		Narrow container → the middle collapses into a “…” menu.
	</p>
{/snippet}

<Story name="Collapses to fit a narrow container" template={collapsing} />

<Story
	name="Collapse folds the middle into a keyboard-reachable menu"
	template={collapsing}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// the middle collapses → a labelled "…" menu button appears
		const trigger = await waitFor(() =>
			canvas.getByRole('button', { name: /hidden path segment/ }),
		)
		// first + current stay visible in the trail
		await expect(canvas.getByText('All Articles')).toBeInTheDocument()
		await expect(canvas.getByText('The Second Law of Thermodynamics')).toBeInTheDocument()
		// opening the "…" reveals the folded segments as a real menu
		await userEvent.click(trigger)
		await waitFor(() => expect(within(document.body).getByRole('menu')).toBeInTheDocument())
	}}
/>
