<script lang="ts">
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import * as Card from '@kit/ui/shadcn-components/ui/card'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
</script>

<svelte:head><title>Categories — Raschpëtzer Wiki</title></svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
	<h1 class="mb-6 text-2xl font-bold tracking-tight">Categories</h1>
	<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each wikiStore.categories as cat (cat.id)}
			{@const count = wikiStore.inCategory(cat.id).length}
			<li>
				<a
					href={href(`/category/${cat.id}`)}
					class="group block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<Card.Root
						class="h-full gap-2 transition-shadow group-hover:border-primary group-hover:shadow-md"
					>
						<Card.Header>
							<Card.Title class="flex items-center justify-between gap-2 text-lg">
								{cat.label}
								<Badge variant="secondary">{count}</Badge>
							</Card.Title>
							<Card.Description>{cat.description}</Card.Description>
						</Card.Header>
					</Card.Root>
				</a>
			</li>
		{/each}
	</ul>
</div>
