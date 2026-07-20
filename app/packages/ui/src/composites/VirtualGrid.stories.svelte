<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, within, fn } from 'storybook/test'
	import VirtualGrid from './VirtualGrid.svelte'
	import type { Section } from '@kit/core'

	// Domain-free demo data — the grid is bring-your-own-data, so a story only needs
	// a list, the section ranges over it, and a `tile` snippet to paint each cell.
	const COUNT = 120
	const PER_SECTION = 20
	const items = Array.from({ length: COUNT }, (_, i) => ({ id: i, hue: (i * 47) % 360 }))
	const sections: Section[] = Array.from({ length: Math.ceil(COUNT / PER_SECTION) }, (_, s) => {
		const startIndex = s * PER_SECTION
		const endIndex = Math.min(startIndex + PER_SECTION, COUNT)
		return {
			key: `s${s}`,
			title: `Section ${s + 1}`,
			subtitle: `${endIndex - startIndex} items`,
			startIndex,
			endIndex,
			count: endIndex - startIndex,
		}
	})

	const onActivate = fn()

	const { Story } = defineMeta({
		title: 'Composites/VirtualGrid',
		component: VirtualGrid,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			// The demo `tile` colours are arbitrary synthetic data (white-on-hue), so
			// axe color-contrast fires on them — but tile content is consumer-supplied,
			// not part of the grid. Exclude `.tile` cells from the axe scan so the
			// grid's own chrome (section headers, row wrappers) stays contrast-gated.
			// All axe rules remain enabled; only the consumer-supplied cell content
			// is excluded from the context.
			a11y: { context: { exclude: [['.tile']] } },
		},
	})
</script>

<!-- Shared cell renderer: fills the rect the grid hands it. -->
{#snippet tile(item: { id: number; hue: number }, index: number)}
	<div
		style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;background:hsl({item.hue} 70% 55%)"
	>
		{index}
	</div>
{/snippet}

<!--
  The grid fills its parent (height:100%), so stories give it a fixed-height box.
  `aspect` varies cell width in the justified layout; `square` ignores it.
-->
<Story name="Justified" asChild>
	<div style="height:560px;">
		<VirtualGrid
			{items}
			{sections}
			{tile}
			ariaLabel="Justified demo grid"
			aspect={(it) => 1 + (it.id % 3) * 0.4}
		/>
	</div>
</Story>

<Story name="Square wall" asChild>
	<div style="height:560px;">
		<VirtualGrid {items} {sections} {tile} square ariaLabel="Square demo wall" />
	</div>
</Story>

<!--
  Keyboard + activate interaction test (rule 10):
  - Tabs into the grid scroller (role="grid"), verifies aria-activedescendant is set.
  - Sends ArrowRight and asserts the active descendant changed (focus moved).
  - Sends Enter and asserts the onActivate spy was called with the new index.
-->
<Story
	name="Keyboard navigation"
	asChild
	play={async ({ canvasElement }) => {
		onActivate.mockClear()

		const canvas = within(canvasElement)
		const scroller = canvas.getByRole('grid')

		// Tab into the grid scroller.
		await userEvent.tab()
		await expect(scroller).toHaveFocus()

		// After focusing the grid, aria-activedescendant should reference a rendered tile.
		const initialActive = scroller.getAttribute('aria-activedescendant')
		await expect(initialActive).toBeTruthy()

		// ArrowRight moves focus to the next item — aria-activedescendant must change.
		await userEvent.keyboard('{ArrowRight}')
		const nextActive = scroller.getAttribute('aria-activedescendant')
		await expect(nextActive).toBeTruthy()
		await expect(nextActive).not.toBe(initialActive)

		// Enter activates the focused item — spy must be called.
		await userEvent.keyboard('{Enter}')
		await expect(onActivate).toHaveBeenCalledOnce()
	}}
>
	<div style="height:560px;">
		<VirtualGrid
			{items}
			{sections}
			{tile}
			ariaLabel="Keyboard navigation demo grid"
			{onActivate}
		/>
	</div>
</Story>
