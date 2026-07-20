<script lang="ts">
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import ArticleCard from '$lib/wikipedia/components/ArticleCard.svelte'
	import * as InputGroup from '@kit/ui/shadcn-components/ui/input-group'
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import { Search } from '@lucide/svelte'

	let q = $state('')
	const results = $derived(q.trim() ? wikiStore.search(q) : [])
	// one persistent live region reports both counts and empties (a live region inserted
	// already-populated is unreliable across screen readers).
	const announce = $derived(
		q.trim()
			? results.length === 0
				? `No results for "${q}"`
				: `${results.length} results`
			: '',
	)
</script>

<svelte:head><title>Search — Raschpëtzer</title></svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
	<h1 class="mb-4 text-2xl font-bold tracking-tight">Search articles</h1>

	<InputGroup.Root class="mb-6 max-w-xl">
		<InputGroup.Addon>
			<Search />
		</InputGroup.Addon>
		<InputGroup.Input
			bind:value={q}
			placeholder="Search by title, summary, or category…"
			aria-label="Search articles"
		/>
	</InputGroup.Root>

	<!-- persistent live region (visually hidden) -->
	<p role="status" aria-live="polite" class="sr-only">{announce}</p>

	{#if q.trim() && results.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>No results</Empty.Title>
				<Empty.Description>Nothing matched "{q}". Try a different term.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else if results.length > 0}
		<p class="mb-4 text-sm text-muted-foreground">
			{results.length} result{results.length === 1 ? '' : 's'}
		</p>
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each results as article (article.id)}
				<li><ArticleCard {article} /></li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-muted-foreground">
			Start typing to search {wikiStore.count} articles.
		</p>
	{/if}
</div>
