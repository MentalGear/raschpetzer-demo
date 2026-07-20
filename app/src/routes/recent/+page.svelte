<script lang="ts">
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import { editedLabel } from '$lib/wikipedia/data/types'
	import { REF_NOW } from '$lib/wikipedia/data/mock'

	const recent = $derived([...wikiStore.sourceArticles].sort((a, b) => b.updatedAt - a.updatedAt))
</script>

<svelte:head><title>Recently edited — Wikipedia</title></svelte:head>

<div class="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
	<h1 class="mb-6 text-2xl font-bold tracking-tight">Recently edited</h1>
	<ul class="flex flex-col divide-y divide-border">
		{#each recent as article (article.id)}
			<li>
				<a
					href={href(`/${article.slug}`)}
					class="flex items-baseline justify-between gap-4 py-3 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<span class="font-medium">{article.title}</span>
					<span class="shrink-0 text-sm text-muted-foreground">
						{editedLabel(article.updatedAt, REF_NOW)}
					</span>
				</a>
			</li>
		{/each}
	</ul>
</div>
