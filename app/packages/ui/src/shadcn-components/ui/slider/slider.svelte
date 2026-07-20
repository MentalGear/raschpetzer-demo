<script lang="ts">
	import { Slider as SliderPrimitive } from 'bits-ui'
	import { cn, type WithoutChildrenOrChild } from '@kit/ui/shadcn-utils.js'

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = 'horizontal',
		class: className,
		// ARIA naming/value belongs on the `role="slider"` THUMB, not the Root
		// (which is a `role="group"`). bits-ui only names the thumb if we forward
		// these to <Thumb>, so pull them out of restProps and pass them down.
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledby,
		'aria-valuetext': ariaValueText,
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props()
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	data-slot="slider"
	{orientation}
	class={cn(
		'relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col',
		className,
	)}
	{...restProps}
>
	{#snippet children({ thumbItems })}
		<span
			data-slot="slider-track"
			data-orientation={orientation}
			class={cn(
				'relative grow overflow-hidden rounded-full bg-muted bg-muted data-horizontal:h-1 data-horizontal:w-full data-horizontal:w-full data-vertical:h-full data-vertical:h-full data-vertical:w-1',
			)}
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class={cn(
					'absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full',
				)}
			/>
		</span>
		{#each thumbItems as thumb (thumb.index)}
			<!-- NOTE: the forwarded aria-label/valuetext name EVERY thumb the same — correct
			     for a single-thumb slider (our only use). A range (2-thumb) slider must give
			     each thumb a distinct name (e.g. "Minimum"/"Maximum") instead. -->
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				index={thumb.index}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				aria-valuetext={ariaValueText}
				class="relative block size-3 shrink-0 rounded-full border border-ring bg-background ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50 pointer-coarse:after:-inset-4"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>
