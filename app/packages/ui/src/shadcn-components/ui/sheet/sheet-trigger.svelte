<script lang="ts">
	import { Dialog as SheetPrimitive } from 'bits-ui'
	import { cn } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SheetPrimitive.TriggerProps = $props()
</script>

<SheetPrimitive.Trigger
	bind:ref
	data-slot="sheet-trigger"
	class={cn('transition-all', className)}
	{...restProps}
/>
