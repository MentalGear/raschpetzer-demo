<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, within, userEvent } from 'storybook/test'
	import StatFooter from './StatFooter.svelte'

	const { Story } = defineMeta({
		title: 'Composites/StatFooter',
		component: StatFooter,
		tags: ['autodocs'],
		args: { count: 1234, noun: 'items', genMs: 5 },
	})
</script>

<Story name="Default" args={{ count: 1234, noun: 'items', genMs: 5 }} />

<!-- Empty until loaded: the `.lib-stat` node is always present (VRT-stable) but its
     text is gated on `count`, so a count of 0 renders an empty stat. -->
<Story name="Empty (count 0)" args={{ count: 0, noun: 'items', genMs: 0 }} />

<!-- Count-only: `genMs` omitted → the `· gen … ms` segment is dropped (for apps with
     no generation-time metric, e.g. a static content app). -->
<Story name="No gen stat" args={{ count: 42, noun: 'articles' }} />

<!-- Interaction test: the stat formats `<count> <noun> · gen <ms> ms` with a
     thousands separator and rounded ms, and the `.lib-stat` hook node is always
     present. The stat is non-interactive — a Tab moves focus off it (no controls
     inside). See docs/kit/components/app-shell.md. -->
<Story
	name="Formats count + gen ms"
	args={{ count: 1234, noun: 'items', genMs: 5 }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// Thousands separator + rounded ms.
		await expect(canvas.getByText(/1,234 items · gen 5 ms/)).toBeInTheDocument()
		// The `.lib-stat` hook node is always present (e2e + VRT rely on it).
		await expect(canvasElement.querySelector('.lib-stat')).toBeTruthy()
		// Keyboard: nothing focusable inside the stat — tab lands nowhere interactive.
		await userEvent.tab()
		await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
	}}
/>
