<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, within, userEvent } from 'storybook/test'
	import Search from '@lucide/svelte/icons/search'
	import Image from '@lucide/svelte/icons/image'
	import Sparkles from '@lucide/svelte/icons/sparkles'
	import Heart from '@lucide/svelte/icons/heart'
	import SidebarNav from './SidebarNav.svelte'
	import type { NavConfig, NavItem } from './commands'
	import * as Sidebar from '@kit/ui/shadcn-components/ui/sidebar'

	// Domain-free demo nav (the kit knows nothing about photos/notes).
	const nav: NavConfig = [
		{ items: [{ id: '/search', href: '/search', label: 'Search', icon: Search }] },
		{
			heading: 'Library',
			items: [
				{ id: '/lib', href: '/lib', label: 'All', icon: Image },
				{ id: '/memories', href: '/memories', label: 'Memories', icon: Sparkles },
				{ id: '/favs', href: '/favs', label: 'Favorites', icon: Heart },
			],
		},
	]
	const isActive = (item: NavItem) => 'href' in item && item.href === '/lib'

	const { Story } = defineMeta({
		title: 'Composites/SidebarNav',
		component: SidebarNav,
		tags: ['autodocs'],
		args: { nav, isActive },
	})
</script>

{#snippet template(args: { nav: NavConfig; isActive: (item: NavItem) => boolean })}
	<Sidebar.Provider style="--sidebar-width: 15rem;">
		<Sidebar.Root collapsible="none">
			<Sidebar.Content>
				<SidebarNav {...args} />
			</Sidebar.Content>
		</Sidebar.Root>
	</Sidebar.Provider>
{/snippet}

<Story name="Default" {template} />

<!-- Interaction test: the sidebar invariant — exactly one active item (the one
     with aria-current="page"). See docs/kit/components/sidebar.md. -->
<Story
	name="Exactly one active item"
	{template}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const current = canvas
			.getAllByRole('link')
			.filter((a) => a.getAttribute('aria-current') === 'page')
		await expect(current).toHaveLength(1)
		await expect(current[0]).toHaveAccessibleName(/All/)
	}}
/>

<!-- (a) isActive returns false for all → no element has aria-current="page".
     (b) Config with an empty group → that group's label is not rendered.
     (c) Inactive items have no aria-current attribute at all (not "false").
     (d) Keyboard: tab to first nav link and assert focus. -->
<Story
	name="No active item + empty group + keyboard"
	args={{
		nav: [
			{ heading: 'Empty group', items: [] },
			{
				heading: 'Library',
				items: [
					{ id: '/lib', href: '/lib', label: 'All', icon: Image },
					{ id: '/favs', href: '/favs', label: 'Favorites', icon: Heart },
				],
			},
		],
		isActive: () => false,
	}}
	{template}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// (a) No element has aria-current="page".
		const allLinks = canvas.getAllByRole('link')
		const currentLinks = allLinks.filter((a) => a.getAttribute('aria-current') === 'page')
		await expect(currentLinks).toHaveLength(0)

		// (b) Empty group: its heading label "Empty group" must not be rendered.
		await expect(canvas.queryByText('Empty group')).not.toBeInTheDocument()

		// (c) Inactive items must not have aria-current at all (not "false").
		for (const link of allLinks) {
			await expect(link).not.toHaveAttribute('aria-current')
		}

		// (d) Keyboard: tab to the first focusable nav link and assert it is focused.
		await userEvent.tab()
		const firstLink = canvas.getAllByRole('link')[0]
		await expect(firstLink).toHaveFocus()
	}}
/>
