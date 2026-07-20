<script lang="ts">
	import { page } from '$app/state'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { href } from '$lib/paths'
	import ArticleReader from '$lib/wikipedia/components/ArticleReader.svelte'
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { FileQuestion } from '@lucide/svelte'

	const slug = $derived(page.params.slug ?? '')
	const article = $derived(wikiStore.bySlug(slug, wikiStore.locale))
</script>

<svelte:head>
	<title>{article ? article.title : 'Not found'} — Raschpëtzer Wiki</title>
</svelte:head>

{#if article}
	<!-- re-key per slug so reading controls / scroll-spy reset between articles;
	     a locale switch keeps the instance and updates content in place. -->
	{#key article.slug}
		<ArticleReader {article} />
	{/key}
{:else}
	<div class="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<FileQuestion />
				</Empty.Media>
				<Empty.Title>Article not found</Empty.Title>
				<Empty.Description>
					There's no article at "{slug}" yet.
				</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href={href('/')} variant="outline">Browse all articles</Button>
			</Empty.Content>
		</Empty.Root>
	</div>
{/if}
