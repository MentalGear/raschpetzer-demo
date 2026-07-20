<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
	import { cn } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CollapsiblePrimitive.TriggerProps = $props()
</script>

<CollapsiblePrimitive.Trigger
	bind:ref
	data-slot="collapsible-trigger"
	class={cn('transition-all', className)}
	{...restProps}
/>
