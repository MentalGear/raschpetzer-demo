<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, screen, fn, waitFor } from 'storybook/test'
	import Image from '@lucide/svelte/icons/image'
	import Star from '@lucide/svelte/icons/star'
	import Heart from '@lucide/svelte/icons/heart'
	import FolderPlus from '@lucide/svelte/icons/folder-plus'
	import Trash2 from '@lucide/svelte/icons/trash-2'
	import ContextMenu from './ContextMenu.svelte'
	import { CommandRegistry, type MenuItem } from './commands'

	// Domain-free demo: the kit knows nothing about photos — these are just ids.
	const onOpen = fn()
	const onFavorite = fn()
	const onDelete = fn()
	const onAlbum = fn()

	const registry = new CommandRegistry().register([
		{ id: 'item.open', run: onOpen },
		{ id: 'item.favorite', run: onFavorite },
		{ id: 'item.addToAlbum', run: onAlbum },
		// Command-level `when` DISABLES (greys out) rather than hides.
		{ id: 'item.delete', run: onDelete, when: (c) => !c.readOnly },
	])

	const items: MenuItem[] = [
		{ id: 'open', label: 'Open', icon: Image, command: 'item.open' },
		{ id: 'fav', label: 'Favorite', icon: Star, command: 'item.favorite', shortcut: '.' },
		{
			id: 'album',
			label: 'Add to Album',
			icon: FolderPlus,
			children: [
				{ id: 'favs', label: 'Favorites', icon: Heart, command: 'item.addToAlbum' },
				{ id: 'recents', label: 'Recents', command: 'item.addToAlbum' },
			],
		},
		{ id: 'sep', separator: true },
		{ id: 'del', label: 'Delete', icon: Trash2, command: 'item.delete' },
	]

	const { Story } = defineMeta({
		title: 'Composites/ContextMenu',
		component: ContextMenu,
		tags: ['autodocs'],
		args: { items, registry },
	})
</script>

{#snippet template(args: {
	items: MenuItem[]
	registry: CommandRegistry
	ctx?: Record<string, unknown>
})}
	<div class="p-10">
		<ContextMenu {...args}>
			{#snippet trigger()}
				<div
					data-testid="cm-trigger"
					class="flex h-32 w-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground select-none"
				>
					Right-click here
				</div>
			{/snippet}
		</ContextMenu>
	</div>
{/snippet}

<!-- All commands enabled. -->
<Story name="Default" {template} />

<!-- ctx.readOnly disables the Delete command (rendered greyed, not hidden). -->
<Story name="Read-only (Delete disabled)" args={{ ctx: { readOnly: true } }} {template} />

<!-- Interaction test (Vitest browser via addon-vitest): right-click opens the
     menu; Delete is disabled under read-only; clicking Open dispatches the
     command. The menu portals to <body>, so query via `screen`. -->
<Story
	name="Opens on right-click"
	args={{ ctx: { readOnly: true } }}
	{template}
	play={async ({ canvasElement }) => {
		onOpen.mockClear()
		const trigger = canvasElement.querySelector('[data-testid="cm-trigger"]')!
		await userEvent.pointer({ target: trigger, keys: '[MouseRight]' })

		const open = await screen.findByRole('menuitem', { name: 'Open' })
		await expect(open).toBeInTheDocument()

		const del = screen.getByRole('menuitem', { name: 'Delete' })
		await expect(del).toHaveAttribute('aria-disabled', 'true')

		await userEvent.click(open)
		await expect(onOpen).toHaveBeenCalledOnce()
	}}
/>

<!-- (a) when-disabled item handler is NOT called (disabled items block pointer
     events — assert spy not called after opening the menu).
     (b) Opening a submenu makes a child item visible.
     (c) Escape closes the menu — tested from root menu focus (no submenu open). -->
<Story
	name="Keyboard and when-guard coverage"
	args={{ ctx: { readOnly: true } }}
	{template}
	play={async ({ canvasElement }) => {
		onDelete.mockClear()
		const trigger = canvasElement.querySelector('[data-testid="cm-trigger"]')!

		// (a) Open menu; confirm Delete is aria-disabled. The command handler must not
		//     have been called at any point (the disabled guard is the unit under test;
		//     clicking a [aria-disabled] item is blocked by the shadcn primitive).
		await userEvent.pointer({ target: trigger, keys: '[MouseRight]' })
		const del = await screen.findByRole('menuitem', { name: 'Delete' })
		await expect(del).toHaveAttribute('aria-disabled', 'true')
		await expect(onDelete).not.toHaveBeenCalled()

		// (b) Open a submenu by hovering its trigger → child item becomes visible.
		const subTrigger = await screen.findByRole('menuitem', { name: 'Add to Album' })
		await userEvent.hover(subTrigger)
		const childItem = await screen.findByRole('menuitem', { name: 'Favorites' })
		await expect(childItem).toBeInTheDocument()

		// (c) Escape closes the menu. The submenu was hover-opened, so keyboard focus is
		//     still at the root level — a root Escape dismisses the whole menu (submenu
		//     included). Bits UI tears down the portaled content asynchronously (animated
		//     close), so await the removal rather than asserting synchronously.
		await userEvent.keyboard('{Escape}')
		await waitFor(() =>
			expect(screen.queryByRole('menuitem', { name: 'Open' })).not.toBeInTheDocument(),
		)
		await waitFor(() =>
			expect(screen.queryByRole('menuitem', { name: 'Favorites' })).not.toBeInTheDocument(),
		)
	}}
/>

<!-- NOTE: the programmatic/controlled path (no trigger; opened via `open` + an (x,y)
     virtual anchor, as PhotoGrid drives it) is intentionally NOT covered by a story.
     bits-ui context menus are contextmenu-event-driven; forcing `open` at mount in the
     isolated story env doesn't position/render the portal reliably. It's covered
     end-to-end instead in tests/photos_library.spec.ts (keyboard-open via Shift+F10 +
     focus-return to the grid on close), which exercises the real event flow. -->
