<script lang="ts">
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import ArticleCard from '$lib/wikipedia/components/ArticleCard.svelte'
</script>

<svelte:head><title>All Articles — Wikipedia</title></svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
	<header class="mb-6">
		<h1 class="text-2xl font-bold tracking-tight">All Articles</h1>
		<p class="text-sm text-muted-foreground">{wikiStore.count} articles</p>
	</header>
	<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each wikiStore.sourceArticles as article (article.id)}
			<li><ArticleCard {article} /></li>
		{/each}
	</ul>
</div>
