<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui'
	import { cn } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		type = 'button',
		class: className,
		...restProps
	}: DialogPrimitive.TriggerProps = $props()
</script>

<DialogPrimitive.Trigger
	bind:ref
	data-slot="dialog-trigger"
	{type}
	class={cn('transition-all', className)}
	{...restProps}
/>
