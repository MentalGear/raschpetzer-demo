<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, screen, fn, waitFor } from 'storybook/test'
	import CommandPalette from './CommandPalette.svelte'
	import { CommandRegistry } from './commands'

	// Domain-free demo registry — the kit knows nothing about photos/notes.
	const onGotoLibrary = fn()
	const onToggleTheme = fn()
	const onNewItem = fn()
	const onHelp = fn()

	const registry = new CommandRegistry().register([
		{
			id: 'nav.library',
			run: onGotoLibrary,
			title: 'Go to Library',
			group: 'Navigation',
			keybinding: 'mod+1',
		},
		{
			id: 'view.toggleTheme',
			run: onToggleTheme,
			title: 'Toggle Theme',
			group: 'View',
			keybinding: 'mod+shift+t',
		},
		{
			id: 'item.new',
			run: onNewItem,
			title: 'New Item',
			group: 'Navigation',
		},
		{
			id: 'help.open',
			run: onHelp,
			title: 'Open Help',
			group: 'General',
		},
		// Command without a title — must NOT appear in the palette.
		{
			id: 'internal.debug',
			run: () => {},
		},
		// Command with a `when` that is always false — must NOT appear.
		{
			id: 'disabled.cmd',
			run: () => {},
			title: 'Should Be Hidden',
			when: () => false,
		},
	])

	const { Story } = defineMeta({
		title: 'Composites/CommandPalette',
		component: CommandPalette,
		tags: ['autodocs'],
		args: { registry },
	})
</script>

<!-- Default: palette is closed; click the trigger button to open. -->
<Story name="Default">
	<div class="flex flex-col items-center gap-4 p-10">
		<p class="text-sm text-muted-foreground">Press ⌘K / Ctrl+K to open the command palette.</p>
		<CommandPalette {registry} />
	</div>
</Story>

<!-- Pre-opened palette for visual inspection / docs. -->
<Story name="Open">
	<div class="p-10">
		<CommandPalette {registry} open />
	</div>
</Story>

<!--
  Interaction test: opens the palette via ⌘K (keyboard), asserts grouped commands
  are visible, selects "Go to Library" via Enter, confirms spy fired.

  Keyboard interaction:
    1. ⌘K triggers the onMount keydown listener → palette opens.
    2. {ArrowDown} to move selection from the input to the first item.
    3. {Enter} to run the command.
-->
<Story
	name="Opens via keyboard and runs command"
	play={async () => {
		onGotoLibrary.mockClear()

		// Open the palette via ⌘K shortcut.
		await userEvent.keyboard('{Meta>}k{/Meta}')

		// Wait for the palette dialog to appear.
		const input = await screen.findByPlaceholderText('Search commands…')
		await expect(input).toBeInTheDocument()

		// Titled commands must be visible; untitled / disabled must NOT appear.
		// Use findByText — the Command.Item accessible-name is handled by Bits.
		await expect(await screen.findByText('Go to Library')).toBeInTheDocument()
		await expect(screen.getByText('Toggle Theme')).toBeInTheDocument()
		await expect(screen.queryByText('Should Be Hidden')).not.toBeInTheDocument()

		// Type to filter to exactly one result, then ArrowDown + Enter to run it.
		// This avoids relying on which item is first in an unfiltered list.
		await userEvent.keyboard('Library')
		const filteredItem = await screen.findByText('Go to Library')

		// Wait for bits-ui auto-selection to settle before navigating (same
		// afterTick timing issue fixed in the "highlights" story below).
		await waitFor(() => {
			expect(filteredItem.closest('[data-slot="command-item"]')).toHaveAttribute(
				'data-selected',
			)
		})

		// ArrowDown keeps selection on the only visible item; Enter runs it.
		await userEvent.keyboard('{ArrowDown}')
		await userEvent.keyboard('{Enter}')

		// The command spy must have been called exactly once.
		await waitFor(() => expect(onGotoLibrary).toHaveBeenCalledOnce())

		// The palette must close after running a command.
		await waitFor(() =>
			expect(screen.queryByPlaceholderText('Search commands…')).not.toBeInTheDocument(),
		)
	}}
/>

<!--
  Keyboard nav highlights the active item. Regression guard for the bug where
  the selected item had no visible highlight: bits-ui marks the active item with
  `data-selected` (empty attr) and the kit styles it `bg-accent` — `bg-muted`
  was invisible in this app's dark theme where --muted === --popover. Here we
  assert the filtered item gets data-selected (via bits-ui auto-selection after
  filtering), and that ArrowDown keeps the selection on the only visible result.
-->
<Story
	name="Keyboard navigation highlights the active item"
	play={async () => {
		await userEvent.keyboard('{Meta>}k{/Meta}')
		await screen.findByPlaceholderText('Search commands…')

		// Filter to a single deterministic result.
		await userEvent.keyboard('Library')
		const item = await screen.findByText('Go to Library')

		// bits-ui auto-selects the first visible item after filtering (via
		// afterTick + scheduleUpdate). Wait for that to land before we navigate,
		// so the ArrowDown assertion below is timing-stable.
		await waitFor(() => {
			const row = item.closest('[data-slot="command-item"]')
			expect(row).not.toBeNull()
			expect(row).toHaveAttribute('data-selected')
		})

		// With only one visible result, ArrowDown must keep the selection there.
		await userEvent.keyboard('{ArrowDown}')

		// The command item must still carry data-selected after the keypress.
		await waitFor(() => {
			const row = item.closest('[data-slot="command-item"]')
			expect(row).not.toBeNull()
			expect(row).toHaveAttribute('data-selected')
		})

		await userEvent.keyboard('{Escape}')
		await waitFor(() =>
			expect(screen.queryByPlaceholderText('Search commands…')).not.toBeInTheDocument(),
		)
	}}
/>

<!--
  Keyboard: Escape closes the palette without running any command.
-->
<Story
	name="Escape closes without running"
	play={async () => {
		onGotoLibrary.mockClear()

		// Open.
		await userEvent.keyboard('{Meta>}k{/Meta}')
		await screen.findByPlaceholderText('Search commands…')

		// Escape should close.
		await userEvent.keyboard('{Escape}')

		await waitFor(() =>
			expect(screen.queryByPlaceholderText('Search commands…')).not.toBeInTheDocument(),
		)

		// No command should have fired.
		await expect(onGotoLibrary).not.toHaveBeenCalled()
	}}
/>
