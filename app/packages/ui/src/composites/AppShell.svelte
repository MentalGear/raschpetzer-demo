<script lang="ts">
	/**
	 * Shared sidebar shell for the demo apps — the scaffold that was copy-pasted in
	 * each app's `+layout.svelte`: Sidebar Provider → Root → Header(title + theme
	 * toggle) → Content(nav) → Footer → Inset(page). Each app passes only its own
	 * data (title, nav, active-matcher, footer snippet); app-specific concerns
	 * (command registry, palette, store loading, live regions) stay in the app's
	 * layout around this shell.
	 */
	import type { Snippet } from 'svelte'
	import * as Sidebar from '@kit/ui/shadcn-components/ui/sidebar'
	import { cn } from '@kit/ui/shadcn-utils'
	import SidebarNav from './SidebarNav.svelte'
	import type { NavConfig, NavItem } from './commands'
	import ThemeToggle from './ThemeToggle.svelte'

	interface Props {
		/** app title shown in the sidebar header */
		title: string
		nav: NavConfig
		isActive?: (item: NavItem) => boolean
		/** optional footer content (e.g. the item-count / gen-ms line) */
		footer?: Snippet
		children: Snippet
		/** merged onto the shell's root (rule 13) */
		class?: string
	}
	let { title, nav, isActive = () => false, footer, children, class: className }: Props = $props()
</script>

<Sidebar.Provider
	class={cn('h-svh', className)}
	style="--sidebar-width: 15rem;"
	bind:open={() => true, () => {}}
>
	<!-- open is pinned to always-true above: desktop stays permanently docked (no Trigger shown
	     there) and immune to the Provider's built-in Ctrl/Cmd+B toggle shortcut, which would
	     otherwise slide the whole sidebar off-screen with no visible way back. `openMobile` is a
	     separate piece of state (unaffected by this), so the phone-viewport Sheet drawer below
	     still opens/closes normally via the Trigger. -->
	<!-- print:hidden here only hides the shadcn Sidebar's visible container (its `class` prop
	     forwards to that one element, not the sibling `[data-slot=sidebar-gap]` div that reserves
	     the layout width) — the scoped :global rule below hides the gap too, so print doesn't
	     leave a blank sidebar-width gutter. collapsible="offcanvas": on phone viewports this
	     becomes the Sheet drawer the shadcn Sidebar already implements, opened via the Trigger
	     below. -->
	<Sidebar.Root collapsible="offcanvas" class="print:hidden">
		<Sidebar.Header>
			<div class="flex items-center justify-between pl-1">
				<span class="text-lg font-bold">{title}</span>
				<ThemeToggle />
			</div>
		</Sidebar.Header>

		<Sidebar.Content>
			<SidebarNav {nav} {isActive} />
		</Sidebar.Content>

		<Sidebar.Footer>
			{@render footer?.()}
		</Sidebar.Footer>
	</Sidebar.Root>

	<Sidebar.Inset class="h-svh overflow-hidden">
		<!-- Mobile-only bar: the sidebar is a closed-by-default Sheet on phone viewports, so this
		     is the only way to open it there (desktop keeps it permanently docked, no trigger shown).
		     Also carries the app title — otherwise app identity is entirely absent from the DOM on
		     mobile until the drawer is opened (it normally only lives in Sidebar.Header, which is
		     unmounted while the Sheet is closed). -->
		<div class="flex items-center gap-2 border-b p-2 md:hidden print:hidden">
			<Sidebar.Trigger class="touch-target" />
			<span class="text-sm font-semibold">{title}</span>
		</div>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>

<style>
	/* Print:hidden on Sidebar.Root (above) only hides its visible container — the shadcn Sidebar
	   reserves the layout width via a separate sibling `[data-slot=sidebar-gap]` div that never
	   receives that class. :global is required since that element is rendered by the imported
	   Sidebar component, outside this file's own markup — but that also makes this rule genuinely
	   page-global (not scoped to just this AppShell instance), unlike Svelte's usual per-component
	   scoping. Harmless today (exactly one Sidebar.Root ever mounts per page); revisit if that
	   ever stops being true (e.g. a future nested-sidebar composition). */
	@media print {
		:global([data-slot='sidebar-gap']) {
			display: none;
		}
	}
</style>
