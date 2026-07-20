<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui'
	import { cn } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.OverlayProps = $props()
</script>

<!-- LOCAL DEVIATION (see docs/kit/guide/07-shadcn-upstream-sync.md → Local deviations):
     stock is `bg-black/50`, no blur, no isolate. We use a lighter, backdrop-blurred scrim
     for the in-context overlays. Re-apply this on any upstream re-add. -->
<DialogPrimitive.Overlay
	bind:ref
	data-slot="dialog-overlay"
	class={cn(
		'fixed inset-0 isolate z-50 bg-black/10 duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 supports-backdrop-filter:backdrop-blur-xs',
		className,
	)}
	{...restProps}
/>
