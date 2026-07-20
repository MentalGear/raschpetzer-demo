<script lang="ts">
	/**
	 * Media-specific wrapper over the generic VirtualGrid (mirrors photos' PhotoGrid /
	 * notes' NoteGrid): supplies MediaItem data + a placeholder-gradient tile matching
	 * `Figure.svelte`'s reader treatment (no external images — front-end only, no
	 * network). All virtualization, sticky day headers, scrubber, and keyboard a11y
	 * come from the domain-free `@kit/ui` grid.
	 */
	import { VirtualGrid, type RevealItemOptions } from '@kit/ui'
	import type { Section } from '@kit/core'
	import { cn } from '@kit/ui/shadcn-utils'
	import type { MediaItem } from '../data/media'
	import { toneClassForTone, isRealImageSrc } from './figureVisual'

	interface Props {
		items: MediaItem[]
		sections: Section[]
		scrollKey?: string
		onOpen?: (index: number) => void
	}
	let { items, sections, scrollKey, onOpen }: Props = $props()

	function label(m: MediaItem) {
		return `${m.alt}, from ${m.articleTitle}`
	}
	const aspectOf = (m: MediaItem) => m.ratio ?? 16 / 9

	// Forwards to VirtualGrid's own `revealItem` (mirrors Photos' PhotoGrid.svelte's
	// `reveal`) — the parent page's `flyRect` uses this + the tile's `id="tile-<i>"`
	// (set by VirtualGrid itself) to resolve the fly-in/out animation's origin rect.
	let grid = $state<{ revealItem: (i: number, opts?: RevealItemOptions) => void }>()
	export function reveal(i: number, opts?: RevealItemOptions) {
		grid?.revealItem(i, opts)
	}
</script>

<VirtualGrid
	bind:this={grid}
	{items}
	{sections}
	targetRowHeight={180}
	gap={3}
	aspect={aspectOf}
	itemLabel={label}
	ariaLabel="Media, {items.length} items"
	{scrollKey}
	onActivate={onOpen}
>
	{#snippet tile(m: MediaItem)}
		{#if isRealImageSrc(m.src)}
			<img
				src={m.src}
				srcset={m.srcset}
				sizes="180px"
				alt=""
				loading="lazy"
				class={cn('h-full w-full object-cover', toneClassForTone(m.tone))}
			/>
		{:else}
			<div
				class={cn(
					'flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br p-2 text-center',
					toneClassForTone(m.tone),
				)}
			>
				<span class="line-clamp-3 text-xs text-foreground">{m.alt}</span>
			</div>
		{/if}
	{/snippet}
</VirtualGrid>
