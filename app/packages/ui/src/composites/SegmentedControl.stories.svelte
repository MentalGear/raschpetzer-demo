<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, within, waitFor } from 'storybook/test'
	import { AArrowUp, LayoutGrid, List, Rows3 } from '@lucide/svelte'
	import SegmentedControl, { type SegmentedOption } from './SegmentedControl.svelte'

	const options: SegmentedOption[] = [
		{ value: 'day', label: 'Days' },
		{ value: 'month', label: 'Months' },
		{ value: 'year', label: 'Years' },
		{ value: 'all', label: 'All Photos' },
	]

	// `icon` level: a leading icon per segment (Button's data-icon convention, sized/spaced
	// for free via the shared toggleVariants base).
	const viewOptions: SegmentedOption[] = [
		{ value: 'grid', label: 'Grid', icon: LayoutGrid },
		{ value: 'list', label: 'List', icon: List },
		{ value: 'rows', label: 'Rows', icon: Rows3 },
	]

	// `item` snippet level: the SAME icon rendered at a different visual scale per option
	// (a leading-icon slot alone can't express "same glyph, different size") — the exact
	// shape a text-size "Aa" stepper needs.
	const sizeOptions: SegmentedOption[] = [
		{ value: 'sm', label: 'Small text' },
		{ value: 'base', label: 'Medium text' },
		{ value: 'lg', label: 'Large text' },
	]
	const SIZE_SCALE: Record<string, string> = { sm: 'scale-75', base: '', lg: 'scale-125' }

	const { Story } = defineMeta({
		title: 'Composites/SegmentedControl',
		component: SegmentedControl,
		tags: ['autodocs'],
	})
</script>

<script lang="ts">
	let value = $state('day')
</script>

<!-- Default: four segments, "Days" selected. -->
<Story name="Default" asChild>
	<SegmentedControl {options} value="day" aria-label="Group photos by time range" />
</Story>

{#snippet controlledTemplate()}
	<SegmentedControl {options} bind:value aria-label="Group photos by time range" />
{/snippet}

<!--
  Interaction test: clicking a segment selects it (single-select, only one
  pressed at a time), and the roving-tabindex group is keyboard-operable —
  ArrowRight moves focus to the next segment (bits-ui ToggleGroup's native
  keyboard nav) from wherever the group is currently focused.

  Keyboard interaction: {ArrowRight} to move focus within the group.
-->
<Story
	name="Selects a segment and is keyboard-navigable"
	template={controlledTemplate}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const days = canvas.getByRole('radio', { name: 'Days' })
		const months = canvas.getByRole('radio', { name: 'Months' })
		await expect(days).toHaveAttribute('aria-checked', 'true')

		// Click selects a different segment (single-select — only one stays pressed)
		// and focuses it, same as any native button click.
		await userEvent.click(months)
		await waitFor(() => expect(months).toHaveAttribute('aria-checked', 'true'))
		await waitFor(() => expect(days).toHaveAttribute('aria-checked', 'false'))
		await expect(months).toHaveFocus()

		// ArrowRight moves focus to the next segment (native ToggleGroup nav) —
		// distinct from selection, which stays on "Months" until activated.
		await userEvent.keyboard('{ArrowRight}')
		const years = canvas.getByRole('radio', { name: 'Years' })
		await waitFor(() => expect(years).toHaveFocus())
		await expect(months).toHaveAttribute('aria-checked', 'true')
	}}
/>

{#snippet iconTemplate()}
	<SegmentedControl options={viewOptions} value="grid" aria-label="View mode" />
{/snippet}

<!-- `icon` level: each segment gets a leading Lucide icon before its label. -->
<Story
	name="Segments with a leading icon"
	template={iconTemplate}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const grid = canvas.getByRole('radio', { name: 'Grid' })
		const list = canvas.getByRole('radio', { name: 'List' })
		await expect(grid).toHaveAttribute('aria-checked', 'true')
		// the icon renders inside the segment (Button's data-icon="inline-start" convention).
		await expect(grid.querySelector('[data-icon="inline-start"]')).toBeTruthy()
		await userEvent.click(list)
		await waitFor(() => expect(list).toHaveAttribute('aria-checked', 'true'))
		await userEvent.keyboard('{ArrowLeft}')
		await waitFor(() => expect(grid).toHaveFocus())
	}}
/>

{#snippet customItemTemplate()}
	<SegmentedControl options={sizeOptions} value="base" aria-label="Text size">
		{#snippet item(opt, { selected })}
			<AArrowUp class={SIZE_SCALE[opt.value]} />
			<span class="sr-only">{opt.label}</span>
			<!-- the sr-only label above is what a screen reader announces; the icon alone
			     conveys the size difference visually — selected state is proven below. -->
			{#if selected}<span class="sr-only">(current)</span>{/if}
		{/snippet}
	</SegmentedControl>
{/snippet}

<!-- `item` snippet level: full custom per-segment render — the SAME icon at three visual
     scales, which neither plain `label` nor a single `icon` field can express. -->
<Story
	name="Fully custom segments (same icon, different scale)"
	template={customItemTemplate}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const small = canvas.getByRole('radio', { name: /Small text/ })
		const large = canvas.getByRole('radio', { name: /Large text/ })
		await expect(canvas.getByRole('radio', { name: /Medium text/ })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		await userEvent.click(large)
		await waitFor(() => expect(large).toHaveAttribute('aria-checked', 'true'))
		await userEvent.keyboard('{ArrowLeft}')
		await userEvent.keyboard('{ArrowLeft}')
		await waitFor(() => expect(small).toHaveFocus())
	}}
/>
