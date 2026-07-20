<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, screen, fn, waitFor } from 'storybook/test'
	import SearchOverlay, { type SearchScopeOption } from './SearchOverlay.svelte'
	import type { FilterFieldDef } from './FilterRows.svelte'

	// Domain-free demo data — the kit knows nothing about photos/notes.
	type Item = { id: number; label: string; hue: number }
	const items: Item[] = Array.from({ length: 40 }, (_, i) => ({
		id: i,
		label: `Result ${i + 1}`,
		hue: (i * 37) % 360,
	}))
	const fields: FilterFieldDef[] = [
		{
			id: 'type',
			label: 'Type',
			values: [
				{ id: 'a', label: 'Type A' },
				{ id: 'b', label: 'Type B' },
			],
		},
		{ id: 'fav', label: 'Favorites' },
	]
	const suggestions = ['sunsets', 'beach', 'family']

	const onQuery = fn()
	const onOpenChange = fn()
	const onClose = fn()
	const onShowAll = fn()
	const scope: SearchScopeOption[] = [
		{ value: 'all', label: 'All' },
		{ value: 'recent', label: 'Recent' },
	]

	const { Story } = defineMeta({
		title: 'Composites/SearchOverlay',
		component: SearchOverlay,
		tags: ['autodocs'],
	})
</script>

<script lang="ts">
	let scopeValue = $state('all')
</script>

<!-- Open with results. -->
<Story name="Open with results" asChild>
	<SearchOverlay open query="result" {items} {fields} totalCount={1234} {onShowAll}>
		{#snippet tile(item: Item)}
			<div
				class="flex h-full w-full items-center justify-center text-xs text-white"
				style:background="hsl({item.hue} 45% 55%)"
			>
				{item.label}
			</div>
		{/snippet}
	</SearchOverlay>
</Story>

<!-- Empty query → suggestion chips. -->
<Story name="Empty shows suggestions" asChild>
	<SearchOverlay open query="" items={[]} {fields} {suggestions} {onQuery}>
		{#snippet tile(item: Item)}
			<div>{item.label}</div>
		{/snippet}
	</SearchOverlay>
</Story>

<!--
  Interaction test: the overlay is open; typing fires onQuery, and Escape closes
  the dialog (focus-trap + Esc inherited from the Dialog primitive).

  Keyboard interaction: {Escape} to dismiss.
-->
<Story
	name="Types a query and closes on Escape"
	asChild
	play={async () => {
		onQuery.mockClear()
		onClose.mockClear()

		const input = await screen.findByRole('textbox', { name: 'Search' })
		await expect(input).toBeInTheDocument()

		// Typing fires onQuery per keystroke. Use keyboard (not userEvent.type,
		// which asserts the value stuck — the input is controlled and reverts
		// because this story doesn't feed `query` back).
		input.focus()
		await userEvent.keyboard('a')
		await waitFor(() => expect(onQuery).toHaveBeenCalled())

		// Escape closes the dialog (Bits focus-trap dialog) and fires onClose.
		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(onClose).toHaveBeenCalled())
		await waitFor(() =>
			expect(screen.queryByRole('textbox', { name: 'Search' })).not.toBeInTheDocument(),
		)
	}}
>
	<SearchOverlay open query="result" {items} {fields} {onQuery} {onOpenChange} {onClose}>
		{#snippet tile(item: Item)}
			<div
				class="flex h-full w-full items-center justify-center text-xs text-white"
				style:background="hsl({item.hue} 45% 55%)"
			>
				{item.label}
			</div>
		{/snippet}
	</SearchOverlay>
</Story>

{#snippet scopeTemplate()}
	<SearchOverlay open query="" {items} {fields} {scope} bind:scopeValue>
		{#snippet tile(item: Item)}
			<div>{item.label}</div>
		{/snippet}
	</SearchOverlay>
{/snippet}

<!--
  Interaction test: an always-visible, linear scope toggle ("All | Recent")
  renders above the search input — not conditional, not a breadcrumb — and
  the toggle is keyboard-operable end to end.

  Keyboard interaction: Tab focuses the roving-tabindex group on "All"
  (the pressed item), ArrowRight moves focus to "Recent" — this is the
  bits-ui ToggleGroup's real keyboard nav (arrow keys move focus across a
  role="radio" roving group; Enter/Space then activates). We select via
  click rather than {Enter}/{space} here: @testing-library/user-event
  unconditionally synthesizes a native button "click" for Enter (keypress)
  and Space (keyup) regardless of the app's own keydown preventDefault
  (see behavior/keypress.js, behavior/keyup.js) — since bits-ui's
  ToggleGroupItem *also* toggles on keydown Enter/Space, that produces a
  toggle-on-then-toggle-off double-fire under this harness specifically,
  not a real browser. Same click-to-finalize pattern as
  ThemeToggle.stories.svelte's keyboard test.
-->
<Story
	name="Scope toggle is always visible and switches by keyboard"
	template={scopeTemplate}
	play={async () => {
		// Dialog.Content renders in a portal outside canvasElement — use the
		// global `screen`, same as the other stories in this file.
		const all = await screen.findByRole('radio', { name: 'All' })
		const recent = screen.getByRole('radio', { name: 'Recent' })
		await waitFor(() => expect(all).toHaveAttribute('aria-checked', 'true'))

		all.focus()
		await expect(all).toHaveFocus()
		await userEvent.keyboard('{ArrowRight}')
		await waitFor(() => expect(recent).toHaveFocus())

		await userEvent.click(recent)
		await waitFor(() => expect(recent).toHaveAttribute('aria-checked', 'true'))
		await waitFor(() => expect(all).toHaveAttribute('aria-checked', 'false'))
	}}
/>
