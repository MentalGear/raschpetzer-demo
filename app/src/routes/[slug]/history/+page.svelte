<script lang="ts">
	import { page } from '$app/state'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import RevisionHistory from '$lib/wikipedia/components/RevisionHistory.svelte'
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { FileQuestion } from '@lucide/svelte'

	const slug = $derived(page.params.slug ?? '')
	// history is tracked on the source (en) article.
	const article = $derived(wikiStore.bySlug(slug, 'en'))
</script>

<svelte:head
	><title>History: {article ? article.title : 'Not found'} — Wikipedia</title></svelte:head
>

{#if article}
	{#key article.slug}
		<RevisionHistory {article} />
	{/key}
{:else}
	<div class="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<FileQuestion />
				</Empty.Media>
				<Empty.Title>Article not found</Empty.Title>
				<Empty.Description>There's no article at "{slug}".</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href={href('/')} variant="outline">Browse all articles</Button>
			</Empty.Content>
		</Empty.Root>
	</div>
{/if}
