<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
	import { cn } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: AlertDialogPrimitive.TriggerProps = $props()
</script>

<AlertDialogPrimitive.Trigger
	bind:ref
	data-slot="alert-dialog-trigger"
	class={cn('transition-all', className)}
	{...restProps}
/>
