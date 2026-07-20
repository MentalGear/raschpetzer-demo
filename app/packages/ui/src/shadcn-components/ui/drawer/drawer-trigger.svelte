<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte'
	import { cn } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DrawerPrimitive.TriggerProps = $props()
</script>

<DrawerPrimitive.Trigger
	bind:ref
	data-slot="drawer-trigger"
	class={cn('transition-all', className)}
	{...restProps}
/>
