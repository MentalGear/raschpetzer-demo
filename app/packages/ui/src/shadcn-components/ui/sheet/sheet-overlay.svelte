<script lang="ts">
	import { Dialog as SheetPrimitive } from 'bits-ui'
	import { cn } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SheetPrimitive.OverlayProps = $props()
</script>

<!-- LOCAL DEVIATION (see docs/kit/guide/07-shadcn-upstream-sync.md → Local deviations):
     stock is `bg-black/50`, no blur. Matches the dialog scrim. Re-apply on upstream re-add. -->
<SheetPrimitive.Overlay
	bind:ref
	data-slot="sheet-overlay"
	class={cn(
		'fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs',
		className,
	)}
	{...restProps}
/>
