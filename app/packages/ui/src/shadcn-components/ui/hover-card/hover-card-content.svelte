<script lang="ts">
	import { LinkPreview as HoverCardPrimitive } from 'bits-ui'
	import { cn, type WithoutChildrenOrChild } from '@kit/ui/shadcn-utils.js'
	import HoverCardPortal from './hover-card-portal.svelte'
	import type { ComponentProps } from 'svelte'

	let {
		ref = $bindable(null),
		class: className,
		align = 'center',
		sideOffset = 4,
		portalProps,
		...restProps
	}: HoverCardPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof HoverCardPortal>>
	} = $props()
</script>

<HoverCardPortal {...portalProps}>
	<HoverCardPrimitive.Content
		bind:ref
		data-slot="hover-card-content"
		{align}
		{sideOffset}
		class={cn(
			// Enter: fade in while translating up (`slide-in-from-bottom-2`, an 8px rise —
			// matches the `-2` step every other overlay primitive in this kit already uses:
			// tooltip/popover/dropdown-menu/context-menu content all slide 8px. Originally
			// shipped at `-1`/4px, deliberately subtler than the kit norm — user feedback found
			// that too subtle to read as a real animation, so this now matches the rest of the
			// kit instead of standing out as its own smaller step; no `zoom-in`, a scale change
			// still reads as busier than a plain rise+fade at this size. Exit is the literal
			// reverse (`slide-out-to-bottom` + fade-out), not just the reverse CSS transition —
			// bits-ui applies enter/exit as distinct keyframe sets via its `data-state` attribute
			// (`"open"`/`"closed"`), so each direction needs its own explicit utility —
			// `data-[state=open]:`/`data-[state=closed]:`, NOT the bare `data-open:`/`data-closed:`
			// (bits-ui never sets a literal `data-open`/`data-closed` attribute, so that variant
			// silently never matches — this component shipped with that bug from the CLI-added
			// template and the animation never actually ran). Fixed direction (not
			// `data-[side=X]`-conditional like the previous per-side slide) — this is a single,
			// consistent "hover cue" motion regardless of which side the card lands on.
			'z-50 w-64 origin-(--transform-origin) rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2',
			className,
		)}
		{...restProps}
	/>
</HoverCardPortal>
