/**
 * Wikipedia sidebar navigation — declarative config (docs/kit/04).
 *
 * A function because the Categories group is derived from live store data; the static
 * part is plain config. The `<SidebarNav>` kit composite renders the result.
 * `id === href` (stable key + the value the layout's route matcher compares). Search is
 * the first item (cross-cutting sidebar best practice).
 */
import type { NavConfig } from '@kit/ui'
import { Search, BookOpen, LayoutGrid, Shuffle, History, Tag, Image } from '@lucide/svelte'
import type { Category } from '../data/types'

export function wikiNav(categories: Category[]): NavConfig {
	return [
		{
			items: [
				{
					id: '/search',
					href: '/search',
					label: 'Search',
					icon: Search,
				},
			],
		},
		{
			heading: 'Browse',
			items: [
				{ id: '/', href: '/', label: 'All Articles', icon: BookOpen },
				{
					id: '/categories',
					href: '/categories',
					label: 'Categories',
					icon: LayoutGrid,
				},
				{
					id: '/recent',
					href: '/recent',
					label: 'Recently edited',
					icon: History,
				},
				{
					id: '/media',
					href: '/media',
					label: 'Media',
					icon: Image,
				},
				// command item (no href): dispatched via the command registry.
				{ id: 'app.random', label: 'Random article', icon: Shuffle, command: 'app.random' },
			],
		},
		{
			heading: 'Categories',
			items: categories.map((c) => {
				const href = `/category/${c.id}`
				return { id: href, href, label: c.label, icon: Tag }
			}),
		},
	]
}
