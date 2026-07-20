<script lang="ts">
	import { page } from '$app/state'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import ArticleCard from '$lib/wikipedia/components/ArticleCard.svelte'
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { PathBar } from '@kit/ui'

	const id = $derived(page.params.id ?? '')
	const category = $derived(wikiStore.categoryById(id))
	const articles = $derived(wikiStore.inCategory(id))
</script>

<svelte:head><title>{category ? category.label : 'Category'} — Raschpëtzer Wiki</title></svelte:head
>

<div class="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
	{#if category}
		<header class="mb-6">
			<PathBar
				class="mb-2"
				segments={[
					{ id: 'categories', label: 'All Categories', href: href('/categories') },
					{ id: 'current', label: category.label },
				]}
			/>
			<h1 class="text-2xl font-bold tracking-tight">{category.label}</h1>
			<p class="mt-1 text-muted-foreground">{category.description}</p>
		</header>
		{#if articles.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Title>No articles yet</Empty.Title>
					<Empty.Description>This category doesn't have any articles.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each articles as article (article.id)}
					<li><ArticleCard {article} /></li>
				{/each}
			</ul>
		{/if}
	{:else}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>Category not found</Empty.Title>
			</Empty.Header>
			<Empty.Content>
				<Button href={href('/categories')} variant="outline">All categories</Button>
			</Empty.Content>
		</Empty.Root>
	{/if}
</div>
