<script lang="ts">
	import { cn, type WithElementRef } from '@kit/ui/shadcn-utils.js'
	import type { HTMLAttributes } from 'svelte/elements'
	import { useSidebar } from './context.svelte.js'

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props()

	const sidebar = useSidebar()
</script>

<main
	bind:this={ref}
	data-slot="sidebar-inset"
	class={cn(
		'relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
		className,
	)}
	{...restProps}
	inert={sidebar.isMobile && sidebar.openMobile}
>
	{@render children?.()}
</main>
