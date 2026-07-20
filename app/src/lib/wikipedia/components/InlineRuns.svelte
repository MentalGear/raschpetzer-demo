<script lang="ts">
	/**
	 * Renders an article's inline content: marked text runs with bold/italic/code,
	 * internal links (hover-preview cards from the entity graph; "red link" styling when
	 * the target article doesn't exist), scheme-guarded external links, citation markers
	 * (a focusable/navigable anchor to the reference, with a hover preview), and
	 * footnote/sidenote markers numbered at the article level via `noteOffset`. Sidenotes
	 * share the exact same `HoverCard`-based numbered-marker treatment as citations
	 * (formerly a separate `Sidenote.svelte` + `Popover`, since removed — the two were
	 * functionally identical hover/tap-reveal interactions, just over different content:
	 * a `Citation` object by reference vs. self-contained aside text). The reader and
	 * editor share this renderer.
	 *
	 * Both marker types are deliberately NOT given a `touch-target` (44px) bump despite
	 * measuring smaller (docs/backlog.md "Mobile & responsive"): WCAG 2.5.8 explicitly
	 * exempts inline targets "in a sentence or block of text" from the minimum target
	 * size — forcing a 44px hit box on a superscript marker mid-paragraph would visually
	 * break the reading flow and risks swallowing taps meant for the line above/below in
	 * dense text. Both are exclusively rendered inline within running text (paragraphs,
	 * list items, blockquotes, note/warning bodies), never as standalone controls, so the
	 * exemption applies everywhere they're used.
	 */
	import type { Citation, Inline } from '$lib/wikipedia/data/types'
	import { wikiStore, articleExists } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import { cn } from '@kit/ui/shadcn-utils'
	import * as HoverCard from '@kit/ui/shadcn-components/ui/hover-card'
	import { isSafeHref } from '$lib/wikipedia/content/safeUrl'

	let {
		runs,
		citations = [],
		noteOffset = 0,
	}: { runs: Inline; citations?: Citation[]; noteOffset?: number } = $props()

	const citeNumber = (id: string) => citations.findIndex((c) => c.id === id) + 1
	const citeOf = (id: string) => citations.find((c) => c.id === id)

	// Article-level footnote numbers, derived (never mutated during render): the Nth
	// note-bearing run in this block maps to noteOffset + N.
	const noteNumbers = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local index map recomputed wholesale from `runs`; read-only
		const map = new Map<number, number>()
		let n = noteOffset
		runs.forEach((run, i) => {
			if (run.marks?.note) map.set(i, ++n)
		})
		return map
	})

	// `isSafeHref` parses with the real URL algorithm rather than a hand-rolled prefix regex —
	// see safeUrl.ts's own doc comment for why (a regex here was bypassable via a backslash,
	// e.g. "/\evil.com", which the WHATWG URL spec resolves off-origin — found by expert review).
	const safeHref = (url: string) => (isSafeHref(url) ? url : '#')
</script>

{#each runs as run, i (i)}
	{@const m = run.marks}
	{#if m?.link?.kind === 'internal'}
		{@const entity = wikiStore.entityBySlug(m.link.slug)}
		{@const exists = articleExists(m.link.slug)}
		<HoverCard.Root>
			<HoverCard.Trigger
				href={href(`/${m.link.slug}`)}
				title={exists ? undefined : 'This article does not exist yet'}
				class={cn(
					// persistent underline so links aren't distinguished by colour alone (WCAG 1.4.1);
					// red-links (missing target) get a dotted underline — a non-colour cue.
					'underline decoration-1 underline-offset-2',
					exists
						? 'text-primary decoration-primary/40'
						: 'text-destructive decoration-dotted',
					m.bold && 'font-semibold',
					m.italic && 'italic',
				)}>{run.text}</HoverCard.Trigger
			>
			{#if entity}
				<HoverCard.Content class="w-72">
					<div class="flex flex-col gap-1">
						<span class="text-sm font-semibold">{entity.title}</span>
						<span class="text-sm text-muted-foreground">{entity.blurb}</span>
						{#if !exists}
							<span class="text-xs text-destructive"
								>This article doesn't exist yet.</span
							>
						{/if}
					</div>
				</HoverCard.Content>
			{/if}
		</HoverCard.Root>
	{:else if m?.link?.kind === 'external'}
		<a
			href={safeHref(m.link.href)}
			target="_blank"
			rel="noreferrer noopener"
			class="text-primary underline decoration-primary/40 decoration-1 underline-offset-2"
			>{run.text}</a
		>
	{:else}
		<span
			class={cn(
				m?.bold && 'font-semibold',
				m?.italic && 'italic',
				m?.code && 'rounded bg-muted px-1 font-mono text-[0.9em]',
			)}>{run.text}</span
		>
	{/if}{#if m?.cite}{@const c = citeOf(m.cite)}{@const n = citeNumber(
			m.cite,
		)}{#if c}<HoverCard.Root
				><HoverCard.Trigger
					href={`#ref-${n}`}
					class="align-super text-xs font-medium text-primary no-underline hover:underline"
					aria-label={`Jump to reference ${n}`}>[{n}]</HoverCard.Trigger
				><HoverCard.Content class="w-80"
					><p class="text-sm leading-relaxed">
						<span class="font-medium">{c.title}</span>{c.authors
							? ` — ${c.authors}`
							: ''}{c.year ? ` (${c.year})` : ''}{c.publisher
							? `. ${c.publisher}`
							: ''}
					</p></HoverCard.Content
				></HoverCard.Root
			>{/if}{/if}{#if m?.note}{@const n = noteNumbers.get(i) ?? 0}<HoverCard.Root
			><HoverCard.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="align-super text-xs font-medium text-primary no-underline hover:underline"
						aria-label={`Footnote ${n}`}>[{n}]</button
					>
				{/snippet}
			</HoverCard.Trigger><HoverCard.Content class="w-72"
				><p class="text-sm leading-relaxed text-muted-foreground">
					{m.note}
				</p></HoverCard.Content
			></HoverCard.Root
		>{/if}
{/each}
