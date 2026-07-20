<script lang="ts">
	/**
	 * "Copy link to this section" affordance shown beside a content heading. Hidden until
	 * hover/keyboard-focus on pointer-capable devices (the parent heading sets `group`);
	 * always faintly visible on touch, since there's no hover gesture to reveal it there.
	 * Copies the deep link (`<page>#<id>`) to the clipboard, updates the URL hash to match,
	 * and confirms via a controlled `HoverCard` — the same primitive InlineRuns.svelte uses
	 * for link/citation/note previews — that briefly overrides the normal hover hint
	 * ("Copy link") with "Copied to clipboard". Using HoverCard (not the separate Tooltip
	 * primitive) means every hover-reveal affordance in the reader shares one visual
	 * language and one enter/exit animation (see hover-card-content.svelte).
	 */
	import * as HoverCard from '@kit/ui/shadcn-components/ui/hover-card'
	import { cn } from '@kit/ui/shadcn-utils'
	import { Link } from '@lucide/svelte'

	let { id, label, class: className }: { id: string; label: string; class?: string } = $props()

	let open = $state(false)
	let copied = $state(false)
	let closeTimer: ReturnType<typeof setTimeout> | undefined

	async function copyLink() {
		const url = `${location.origin}${location.pathname}#${id}`
		try {
			await navigator.clipboard.writeText(url)
		} catch {
			// Clipboard permission denied/unavailable — the URL hash below still updates, so the
			// link is still shareable straight from the address bar.
		}
		history.replaceState(null, '', `#${id}`)
		copied = true
		open = true
		clearTimeout(closeTimer)
		closeTimer = setTimeout(() => {
			open = false
			copied = false
		}, 1500)
	}
</script>

<HoverCard.Root bind:open>
	<HoverCard.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				onclick={copyLink}
				aria-label={`Copy link to "${label}" section`}
				class={cn(
					'heading-anchor-btn rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring',
					className,
				)}
			>
				<Link class="size-3.5" aria-hidden="true" />
			</button>
		{/snippet}
	</HoverCard.Trigger>
	<HoverCard.Content class="w-auto px-2.5 py-1.5 text-xs"
		>{copied ? 'Copied to clipboard' : 'Copy link'}</HoverCard.Content
	>
</HoverCard.Root>

<style>
	/* No hover gesture on touch to reveal the button — keep it faintly visible there instead
	   of permanently hidden (opacity-0 has no way to be discovered otherwise). */
	@media (hover: none) {
		.heading-anchor-btn {
			opacity: 0.6;
		}
	}
</style>
