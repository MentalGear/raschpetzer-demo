<script lang="ts">
	/**
	 * Revision history for an article: a selectable list of revisions (author, date,
	 * summary) with a semantic diff between the selected revision and its predecessor.
	 * Front-end only — revisions come from the mock. Exactly one revision is selected.
	 */
	import type { Article } from '$lib/wikipedia/data/types'
	import { editedLabel } from '$lib/wikipedia/data/types'
	import { REF_NOW } from '$lib/wikipedia/data/mock'
	import { diffBlocks, summarize } from '$lib/wikipedia/diff/blockDiff'
	import { href } from '$lib/paths'
	import { cn } from '@kit/ui/shadcn-utils'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import * as Avatar from '@kit/ui/shadcn-components/ui/avatar'
	import { PathBar, type PathBarSegment } from '@kit/ui'
	import { Check } from '@lucide/svelte'
	import RevisionDiff from './RevisionDiff.svelte'

	let { article }: { article: Article } = $props()

	// Location trail (kit PathBar, same composite photos uses) — replaces the hand-rolled
	// "‹ Back to article" ghost button: the article is a real link back, "Revision history" is
	// the current page.
	const pathSegments = $derived<PathBarSegment[]>([
		{ id: 'article', label: article.title, href: href(`/${article.slug}`) },
		{ id: 'history', label: 'Revision history' },
	])

	// revisions are authored oldest → newest. `selected = -1` means "default to latest";
	// an explicit click sets an index. Deriving the effective index avoids seeding state
	// from a prop and stays correct if the article changes.
	const revs = $derived(article.revisions)
	let selected = $state(-1)
	const effSelected = $derived(
		selected < 0 || selected >= revs.length ? revs.length - 1 : selected,
	)

	const current = $derived(revs[effSelected])
	const prev = $derived(effSelected > 0 ? revs[effSelected - 1] : undefined)
	const entries = $derived(diffBlocks(prev?.blocks ?? [], current?.blocks ?? []))
	const sum = $derived(summarize(entries))
	const initials = (name: string) => name.slice(0, 2).toUpperCase()
	const blocks = (n: number) => (n === 1 ? 'block' : 'blocks')
	const countPhrase = $derived(
		[
			sum.added ? `${sum.added} ${blocks(sum.added)} added` : null,
			sum.removed ? `${sum.removed} ${blocks(sum.removed)} removed` : null,
			sum.changed ? `${sum.changed} ${blocks(sum.changed)} changed` : null,
		]
			.filter(Boolean)
			.join(', ') || 'no block changes',
	)
	// a concise, screen-reader-only summary announced (politely) when the selection changes —
	// scoped to one line, not the whole diff subtree. The author + date + summary make it
	// both informative and always distinct, so two revisions never produce a byte-identical
	// string (which a polite region would not re-announce).
	const liveSummary = $derived(
		prev
			? `Revision by ${current.author}, ${editedLabel(current.ts, REF_NOW)} — ${current.summary}: ${countPhrase}.`
			: `Initial revision — ${current.summary}.`,
	)
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8">
	<PathBar class="mb-4" segments={pathSegments} />
	<h1 class="mb-6 text-2xl font-bold tracking-tight">Revision history</h1>

	{#if revs.length === 0}
		<p class="text-sm text-muted-foreground">No revisions recorded.</p>
	{:else}
		<div class="grid gap-6 md:grid-cols-[16rem_1fr]">
			<!-- revision list (newest first). A labelled list, not a `nav` landmark — selecting a
			     revision swaps the in-page diff panel, it does not navigate. -->
			<ul class="flex flex-col gap-1" aria-label="Revisions">
				{#each revs.slice().reverse() as rev (rev.id)}
					{@const idx = revs.indexOf(rev)}
					<li>
						<button
							type="button"
							aria-current={idx === effSelected ? 'true' : undefined}
							aria-controls="revision-diff-panel"
							onclick={() => (selected = idx)}
							class={cn(
								'flex w-full flex-col gap-1 rounded-md border p-3 text-left transition-colors',
								'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
								idx === effSelected
									? 'border-primary bg-accent/40'
									: 'border-border hover:bg-accent/30',
							)}
						>
							<span class="flex items-center gap-2">
								<Avatar.Root class="size-6" aria-hidden="true">
									<Avatar.Fallback class="text-[0.65rem]"
										>{initials(rev.author)}</Avatar.Fallback
									>
								</Avatar.Root>
								<span
									class={cn(
										'text-sm',
										idx === effSelected ? 'font-semibold' : 'font-medium',
									)}>{rev.author}</span
								>
								{#if idx === effSelected}
									<!-- non-colour cue for the selected revision (WCAG 1.4.1) -->
									<Check class="size-3.5 text-primary" aria-hidden="true" />
								{/if}
								<span class="ml-auto text-xs text-muted-foreground"
									>{editedLabel(rev.ts, REF_NOW)}</span
								>
							</span>
							<span class="text-sm text-muted-foreground">{rev.summary}</span>
						</button>
					</li>
				{/each}
			</ul>

			<!-- diff for the selected revision vs its predecessor -->
			<section id="revision-diff-panel" aria-label="Changes in this revision">
				<!-- one concise, scoped live region (not the whole diff subtree, which would
				     re-announce every entry on each selection). -->
				<p class="sr-only" role="status" aria-live="polite">{liveSummary}</p>
				<div class="mb-3 flex flex-wrap items-center gap-2">
					<h2 class="text-lg font-semibold">{current.summary}</h2>
					{#if prev}
						<!-- glyph is decorative; the sr-only text carries the meaning (aria-label on a
						     role-less Badge span is not reliably announced). -->
						<Badge variant="outline">
							<span aria-hidden="true">+{sum.added}</span>
							<span class="sr-only">{sum.added} {blocks(sum.added)} added</span>
						</Badge>
						<Badge variant="outline">
							<span aria-hidden="true">−{sum.removed}</span>
							<span class="sr-only">{sum.removed} {blocks(sum.removed)} removed</span>
						</Badge>
						<Badge variant="outline">
							<span aria-hidden="true">~{sum.changed}</span>
							<span class="sr-only">{sum.changed} {blocks(sum.changed)} changed</span>
						</Badge>
					{:else}
						<Badge variant="secondary">Initial revision</Badge>
					{/if}
				</div>
				<RevisionDiff {entries} showUnchanged={!prev} />
			</section>
		</div>
	{/if}
</div>
