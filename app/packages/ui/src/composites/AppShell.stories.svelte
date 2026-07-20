<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, within, userEvent } from 'storybook/test'
	import Image from '@lucide/svelte/icons/image'
	import Heart from '@lucide/svelte/icons/heart'
	import AppShell from './AppShell.svelte'
	import StatFooter from './StatFooter.svelte'
	import type { NavConfig, NavItem } from './commands'

	// Domain-free demo nav (the kit knows nothing about photos/notes).
	const nav: NavConfig = [
		{
			heading: 'Library',
			items: [
				{ id: '/lib', href: '/lib', label: 'All', icon: Image },
				{ id: '/favs', href: '/favs', label: 'Favorites', icon: Heart },
			],
		},
	]
	const isActive = (item: NavItem) => 'href' in item && item.href === '/lib'

	const { Story } = defineMeta({
		title: 'Composites/AppShell',
		component: AppShell,
		tags: ['autodocs'],
		args: { title: 'Demo', nav, isActive },
	})
</script>

{#snippet template(args: { title: string; nav: NavConfig; isActive: (item: NavItem) => boolean })}
	<AppShell {...args}>
		{#snippet footer()}
			<StatFooter count={1234} noun="items" genMs={5} />
		{/snippet}
		<!-- Sidebar.Inset already renders the page's <main> landmark; the app's page
		     content goes inside it as plain content (a second <main> would duplicate). -->
		<div class="p-4">Page content</div>
	</AppShell>
{/snippet}

<Story name="Default" {template} />

<!-- Interaction test: the shell renders the app title in the header, the footer
     snippet (StatFooter) in the footer, exactly one active nav item, and is
     keyboard-operable (Tab reaches the header theme toggle). See
     docs/kit/components/app-shell.md. -->
<Story
	name="Title, nav, footer + keyboard"
	{template}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		// App title appears twice: the (always-mounted) sidebar header, and the
		// mobile-only top bar — the latter carries app identity on phone viewports,
		// where the Sheet-drawer header is unmounted until opened.
		await expect(canvas.getAllByText('Demo')).toHaveLength(2)
		// Footer snippet (StatFooter) rendered in the footer.
		await expect(canvas.getByText(/1,234 items/)).toBeInTheDocument()
		// Sidebar invariant — exactly one active item (aria-current="page").
		const current = canvas
			.getAllByRole('link')
			.filter((a) => a.getAttribute('aria-current') === 'page')
		await expect(current).toHaveLength(1)
		// The mobile-only Sidebar.Trigger carries a real accessible name (a11y
		// review finding — it's the only way to reach the nav on a phone viewport).
		// `hidden: true` because it's `md:hidden` and this story renders at the
		// default (desktop-width) Storybook canvas, where it's CSS-hidden — the
		// assertion is about its accessible-name correctness, not visibility here.
		await expect(
			canvas.getByRole('button', { name: 'Toggle Sidebar', hidden: true }),
		).toBeInTheDocument()
		// Keyboard: the first Tab lands on the header theme select's trigger.
		await userEvent.tab()
		await expect(canvas.getByRole('button', { name: 'Theme' })).toHaveFocus()
	}}
/>
