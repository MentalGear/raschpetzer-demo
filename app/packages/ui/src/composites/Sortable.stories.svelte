<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, within, fn, waitFor } from 'storybook/test'
	import Sortable from './Sortable.svelte'

	// Domain-free demo items — the kit knows nothing about any app domain.
	const baseItems = [
		{ id: 1, label: 'Apple' },
		{ id: 2, label: 'Banana' },
		{ id: 3, label: 'Cherry' },
		{ id: 4, label: 'Date' },
		{ id: 5, label: 'Elderberry' },
	]

	type Item = (typeof baseItems)[0]

	const { Story } = defineMeta({
		title: 'Composites/Sortable',
		component: Sortable,
		tags: ['autodocs'],
	})

	// Module-level spy shared by the Keyboard reorder story. Must be cleared in
	// play before each test so counts are accurate across hot-reloads.
	const reorderSpy = fn()
</script>

<!-- Instance script: mutable order state for the Default and KeyboardReorder stories. -->
<script lang="ts">
	let items = $state.raw<Item[]>([...baseItems])
	// Separate reactive items for the keyboard reorder story so the Default story
	// state doesn't bleed across.
	let reorderItems = $state.raw<Item[]>([...baseItems])
</script>

<!-- Per-item snippet: draggable row with grab cursor and drag-handle icon. -->
{#snippet itemRow(it: Item, { index }: { index: number })}
	<div
		class="mb-1 flex cursor-grab items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-card-foreground"
		aria-label={`${it.label}, item ${index + 1}`}
	>
		<span aria-hidden="true" class="text-muted-foreground">⠿</span>
		{it.label}
	</div>
{/snippet}

<!--
  Per-item snippet for disabled state. Uses bg-card + text-card-foreground
  (same as the active item) with reduced opacity on the whole row to convey
  the disabled state — avoids the contrast failure that text-muted-foreground
  on bg-muted triggers (4.45 vs the required 4.5:1).
-->
{#snippet itemRowDisabled(it: Item)}
	<div
		class="mb-1 flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-card-foreground opacity-50"
		aria-disabled="true"
	>
		<span aria-hidden="true">⠿</span>
		{it.label}
	</div>
{/snippet}

<!-- Default reorderable list. -->
<Story name="Default" asChild>
	<Sortable
		{items}
		onReorder={(next) => {
			items = next
		}}
		item={itemRow}
		ariaLabel="Fruit list — drag to reorder"
	/>
</Story>

<!--
  Disabled: items render but are not draggable.
  play: smoke-test that 5 items render; also confirms that attempting a keyboard
  drag sequence does NOT reorder the list (WCAG 2.1.1 disabled guard, #8/#9).
  Captures DOM text order before/after the keyboard sequence and asserts equality.
-->
<Story
	name="Disabled"
	asChild
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Smoke: all 5 items are present.
		const listItems = canvas.getAllByRole('listitem')
		await expect(listItems).toHaveLength(5)

		// Capture order BEFORE attempted drag (by text content).
		const orderBefore = listItems.map((li) => li.textContent?.trim() ?? '')

		// Attempt keyboard drag — dndzone ignores all keys when dragDisabled=true.
		await userEvent.tab()
		await userEvent.keyboard(' ')
		await userEvent.keyboard('{ArrowDown}')
		await userEvent.keyboard(' ')

		// Order must NOT have changed (no reorder when disabled).
		await waitFor(async () => {
			const afterItems = canvas.getAllByRole('listitem')
			await expect(afterItems).toHaveLength(5)
			const orderAfter = afterItems.map((li) => li.textContent?.trim() ?? '')
			await expect(orderAfter).toEqual(orderBefore)
		})
	}}
>
	<Sortable
		items={baseItems}
		disabled
		item={itemRowDisabled}
		ariaLabel="Fruit list (not reorderable)"
	/>
</Story>

<!--
  Keyboard reorder with real order-change assertion (#8/#9).

  Strategy: keyboard drag via svelte-dnd-action's keyboard zone.
    1. Focus the first <li> directly (dndzone sets tabIndex="0" on each item).
    2. Press Space to lift (fires consider, isDragging = true).
    3. Press ArrowDown to move to position 2 and drop (fires finalize → onReorder).

  svelte-dnd-action's keyboard zone registers keydown on each <li> child, so
  focusing the <li> and sending key events to it is the most direct path.
  Arrow keys fire finalize immediately (no release needed) in keyboard mode.

  The spy is module-level so play can inspect calls. onReorder updates both the
  reactive state (so the DOM reflects the new order) and the spy. The test:
    (a) records the first item text before drag,
    (b) focuses item-0 directly and performs Space → ArrowDown,
    (c) asserts the spy was called (onReorder fired), and
    (d) asserts the first DOM item text changed (real order change).
-->
<Story
	name="Keyboard reorder"
	asChild
	play={async ({ canvasElement }) => {
		// Reset spy from any prior run (hot-reload / re-run between stories).
		reorderSpy.mockClear()

		const canvas = within(canvasElement)

		// 1. All 5 items are rendered.
		const listItems = canvas.getAllByRole('listitem')
		await expect(listItems).toHaveLength(5)

		// 2. The list has the correct accessible label.
		const list = canvas.getByRole('list')
		await expect(list).toHaveAttribute('aria-label', 'Keyboard reorder demo')

		// 3. Capture the first item label BEFORE dragging.
		const firstBefore =
			listItems[0].querySelector('[aria-label]')?.getAttribute('aria-label') ??
			listItems[0].textContent?.trim() ??
			''

		// 4. Keyboard drag: focus item-0, Space to lift, ArrowDown to move+drop.
		//    dndzone's keyboard zone registers keydown on each <li>; focusing the
		//    <li> directly (not via Tab) avoids relying on tab-order across stories.
		//    Space fires consider (isDragging = true); ArrowDown fires finalize
		//    (dispatchFinalizeEvent → onReorder).
		const item0 = listItems[0] as HTMLElement
		item0.focus()
		await userEvent.keyboard(' ')
		await userEvent.keyboard('{ArrowDown}')

		// 5. Assert the spy was called (onReorder fired).
		await waitFor(async () => {
			await expect(reorderSpy).toHaveBeenCalled()
		})

		// 6. Assert a real order change: first DOM item must differ from before.
		await waitFor(async () => {
			const afterItems = canvas.getAllByRole('listitem')
			await expect(afterItems).toHaveLength(5)
			const firstAfter =
				afterItems[0].querySelector('[aria-label]')?.getAttribute('aria-label') ??
				afterItems[0].textContent?.trim() ??
				''
			await expect(firstAfter).not.toBe(firstBefore)
		})
	}}
>
	<Sortable
		items={reorderItems}
		onReorder={(next) => {
			reorderItems = next
			reorderSpy(next)
		}}
		item={itemRow}
		ariaLabel="Keyboard reorder demo"
	/>
</Story>
