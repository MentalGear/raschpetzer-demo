<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, within, userEvent, waitFor, screen } from 'storybook/test'
	import { ModeWatcher } from 'mode-watcher'
	import ThemeToggle from './ThemeToggle.svelte'

	const { Story } = defineMeta({
		title: 'Composites/ThemeToggle',
		component: ThemeToggle,
		tags: ['autodocs'],
	})
</script>

<!-- ModeWatcher is what applies the theme (the `.dark` class on <html>) from the
     mode-watcher store; without it mounted, toggleMode() would update the store but
     nothing observable would change — so the interaction test below mounts it too. -->
{#snippet template()}
	<ModeWatcher />
	<ThemeToggle />
{/snippet}

<Story name="Default" {template} />

<!-- Interaction test: a Select with three options (Light/Dark/System); opening it
     by keyboard and choosing an option actually applies the theme — proving the
     select is wired, not just present. See docs/kit/components/app-shell.md.
     Select.Content renders in a portal (outside canvasElement), so option lookups
     use the global `screen`, not the scoped `canvas`. -->
<Story
	name="Selecting an option flips the theme by keyboard"
	{template}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const trigger = canvas.getByRole('button', { name: 'Theme' })
		await expect(trigger).toBeInTheDocument()
		await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')

		// Tab focuses the trigger; Enter opens the listbox (keyboard-operable).
		await userEvent.tab()
		await expect(trigger).toHaveFocus()
		await userEvent.keyboard('{Enter}')

		const darkOption = await screen.findByRole('option', { name: 'Dark' })
		await userEvent.click(darkOption)

		// The select actually changed the theme: the `.dark` class on <html>
		// (applied by ModeWatcher) reflects the selection, and the trigger now
		// shows the chosen option.
		await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
		await waitFor(() => expect(trigger).toHaveTextContent('Dark'))

		// Reopen by keyboard (Enter) and pick Light back — confirms the trigger
		// stays keyboard-operable across repeated selections, not just the first.
		await userEvent.keyboard('{Enter}')
		const lightOption = await screen.findByRole('option', { name: 'Light' })
		await userEvent.click(lightOption)
		await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false))
		await waitFor(() => expect(trigger).toHaveTextContent('Light'))
	}}
/>
