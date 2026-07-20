<script lang="ts">
	/**
	 * A figure. The mock corpus ships no real images, so by default this draws a themed
	 * placeholder from `tone` using only semantic tokens (`alt` shown as a stand-in). A
	 * block carrying `src` (real content vendored from a source repo) renders that image
	 * instead — `tone` still backs it as the decode-loading background.
	 */
	import type { FigureBlock } from '$lib/wikipedia/data/types'
	import { cn } from '@kit/ui/shadcn-utils'
	import { toneClassForTone } from './figureVisual'

	let { block, class: className }: { block: FigureBlock; class?: string } = $props()

	const ratio = $derived(block.ratio ?? 16 / 9)
</script>

<figure class={cn('flex flex-col gap-2', className)}>
	{#if block.src}
		<img
			src={block.src}
			srcset={block.srcset}
			sizes={block.sizes}
			alt={block.alt}
			loading="lazy"
			class={cn('rounded-lg bg-gradient-to-br object-cover', toneClassForTone(block.tone))}
			style="aspect-ratio: {ratio}"
		/>
	{:else}
		<div
			class={cn(
				'flex items-center justify-center rounded-lg bg-gradient-to-br p-4 text-center',
				toneClassForTone(block.tone),
			)}
			style="aspect-ratio: {ratio}"
		>
			<span class="text-sm text-foreground">{block.alt}</span>
		</div>
	{/if}
	{#if block.caption}
		<!-- font-size via calc(), not the Tailwind text-sm class it replaces: this is reading
		     content (describes the figure), so it responds to the reader's chosen text scale
		     like body text/headings/Quick Facts do — see ArticleReader.svelte's --wiki-scale. -->
		<figcaption
			class="text-muted-foreground"
			style="font-size: calc(0.875rem * var(--wiki-scale, 1))"
		>
			{block.caption}{#if block.credit}
				· <span class="italic">{block.credit}</span>{/if}
		</figcaption>
	{/if}
</figure>
