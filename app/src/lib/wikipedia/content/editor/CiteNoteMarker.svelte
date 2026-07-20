<script lang="ts">
	/**
	 * The numbered `[n]` hover/tap marker for a citation or footnote/sidenote — mounted as a
	 * ProseMirror widget decoration right after a `cite`/`note`-marked run (`citeNoteMarkerDecoration`,
	 * `extensions.ts`). Content and markup are a direct port of `InlineRuns.svelte`'s own
	 * citation/note treatment (the pre-2026-07-19 read renderer) — same classes, same aria-labels,
	 * same HoverCard content shape — so this is visual/behavioral parity, not a redesign. One mounted
	 * instance per occurrence (matches `HeadingAnchor`'s own per-heading widget-mount pattern); safe
	 * here for BOTH the read-only and the editable instance because the decoration that mounts this
	 * explicitly unmounts every previous instance before each rebuild (see its own doc comment).
	 */
	import * as HoverCard from '@kit/ui/shadcn-components/ui/hover-card'
	import type { Citation } from '$lib/wikipedia/data/types'

	let {
		kind,
		number,
		citation,
		noteText,
		isFirst,
	}: {
		kind: 'cite' | 'note'
		number: number
		/** required when `kind === 'cite'`. */
		citation?: Citation
		/** required when `kind === 'note'`. */
		noteText?: string
		/** only the first occurrence of a (possibly repeated) citation number gets the
		 *  `cite-ref-N` id the References list's backlink jumps to — see extensions.ts's
		 *  `citeFirstSeen` tracking for why. */
		isFirst?: boolean
	} = $props()
</script>

{#if kind === 'cite' && citation}
	<HoverCard.Root>
		<HoverCard.Trigger
			id={isFirst ? `cite-ref-${number}` : undefined}
			href={`#ref-${number}`}
			class="align-super text-xs font-medium text-primary no-underline hover:underline"
			aria-label={`Jump to reference ${number}`}>[{number}]</HoverCard.Trigger
		>
		<HoverCard.Content class="w-80">
			<p class="text-sm leading-relaxed">
				<span class="font-medium">{citation.title}</span>{citation.authors
					? ` — ${citation.authors}`
					: ''}{citation.year ? ` (${citation.year})` : ''}{citation.publisher
					? `. ${citation.publisher}`
					: ''}
			</p>
		</HoverCard.Content>
	</HoverCard.Root>
{:else if kind === 'note' && noteText}
	<HoverCard.Root>
		<HoverCard.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					type="button"
					class="align-super text-xs font-medium text-primary no-underline hover:underline"
					aria-label={`Footnote ${number}`}>[{number}]</button
				>
			{/snippet}
		</HoverCard.Trigger>
		<HoverCard.Content class="w-72">
			<p class="text-sm leading-relaxed text-muted-foreground">
				{noteText}
			</p>
		</HoverCard.Content>
	</HoverCard.Root>
{/if}
