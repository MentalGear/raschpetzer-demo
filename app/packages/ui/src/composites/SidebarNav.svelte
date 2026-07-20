<!--
	Config-driven sidebar navigation: renders a `NavConfig` (groups of route/command
	items) as shadcn `Sidebar.Group → Menu → MenuItem → MenuButton`. Place inside a
	`<Sidebar.Content>`; the app keeps its own header/footer chrome (which carry
	domain state — store counts, app switcher). See docs/kit/04 + components/sidebar.md.

	Domain-free: the app supplies `nav` (data) and `isActive` (its route matcher);
	the kit owns the rendering. a11y/markup is inherited from the shadcn Sidebar
	primitive — not re-derived. Empty groups (after any `when` upstream) are dropped.

	Link items render an `<a href>`; command-backed items render a `<button>` that
	dispatches through the command registry (read from context, optional). The whole
	list is wrapped in a labelled `<nav>` landmark (`display:contents`, layout-neutral).
-->
<script lang="ts">
	import type { NavConfig, NavItem } from './commands'
	import { getCommandRegistryOptional } from './commands'
	import * as Sidebar from '@kit/ui/shadcn-components/ui/sidebar'
	import { useSidebar } from '@kit/ui/shadcn-components/ui/sidebar'

	interface Props {
		/** Grouped nav model (typically from an app config file). */
		nav: NavConfig
		/** App-supplied route matcher → drives `isActive` + `aria-current`. */
		isActive?: (item: NavItem) => boolean
		/** Gap utility on each group's menu list. */
		menuClass?: string
		/** Accessible label for the nav landmark (default: 'Navigation'). */
		ariaLabel?: string
	}
	let {
		nav,
		isActive = () => false,
		menuClass = 'gap-0.5',
		ariaLabel = 'Navigation',
	}: Props = $props()

	const registry = getCommandRegistryOptional()
	const sidebar = useSidebar()
</script>

<nav aria-label={ariaLabel} style="display:contents">
	{#each nav as group, i (group.heading ?? i)}
		{#if group.items.length}
			<Sidebar.Group>
				{#if group.heading}<Sidebar.GroupLabel>{group.heading}</Sidebar.GroupLabel>{/if}
				<Sidebar.GroupContent>
					<Sidebar.Menu class={menuClass}>
						{#each group.items as item (item.id)}
							{@const active = isActive(item)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={active} class="touch-target">
									{#snippet child({ props })}
										{#if 'href' in item}
											<a
												href={item.href}
												aria-current={active ? 'page' : undefined}
												{...props}
												onclick={() => sidebar.setOpenMobile(false)}
											>
												{#if item.icon}{@const Icon = item.icon}<Icon
														aria-hidden="true"
													/>{/if}
												<span>{item.label}</span>
											</a>
										{:else}
											<button
												type="button"
												{...props}
												onclick={() => {
													if (item.command)
														registry?.run(item.command, {})
													sidebar.setOpenMobile(false)
												}}
											>
												{#if item.icon}{@const Icon = item.icon}<Icon
														aria-hidden="true"
													/>{/if}
												<span>{item.label}</span>
											</button>
										{/if}
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	{/each}
</nav>
