<script lang="ts">
	import { page } from '$app/state'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import type { Locale } from '$lib/wikipedia/data/types'
	import { LOCALE_LABEL } from '$lib/wikipedia/data/types'
	import { href } from '$lib/paths'
	import TranslationPanel from '$lib/wikipedia/components/TranslationPanel.svelte'
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { PathBar, SegmentedControl, type SegmentedOption } from '@kit/ui'
	import { Languages, FileQuestion } from '@lucide/svelte'

	const slug = $derived(page.params.slug ?? '')
	// translations are aligned against the en source.
	const source = $derived(wikiStore.bySlug(slug, 'en'))
	const targetLocales = $derived(wikiStore.localesFor(slug).filter((l) => l !== 'en'))

	let picked = $state<Locale | null>(null)
	const active = $derived<Locale | undefined>(
		picked && targetLocales.some((l) => l === picked) ? picked : targetLocales[0],
	)
	const target = $derived(active ? wikiStore.bySlug(slug, active) : undefined)
</script>

<svelte:head
	><title>Translations: {source ? source.title : 'Not found'} — Raschpëtzer Wiki</title
	></svelte:head
>

{#if source}
	<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8">
		<PathBar
			class="mb-4"
			segments={[
				{ id: 'article', label: source.title, href: href(`/${slug}`) },
				{ id: 'translations', label: 'Translations' },
			]}
		/>
		<h1 class="mb-6 text-2xl font-bold tracking-tight">Translations</h1>

		{#if targetLocales.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Languages /></Empty.Media>
					<Empty.Title>No translations yet</Empty.Title>
					<Empty.Description>This article is only available in English.</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
		{:else}
			{#if targetLocales.length > 1}
				{@const localeOptions = targetLocales.map<SegmentedOption>((loc) => ({
					value: loc,
					label: LOCALE_LABEL[loc],
				}))}
				<!-- target-locale selector (only when more than one translation exists) —
				     an option set of 2-7 choices uses SegmentedControl, not a Button loop. -->
				<SegmentedControl
					class="mb-4"
					options={localeOptions}
					value={active}
					onValueChange={(v) => (picked = v as Locale)}
					aria-label="Translation language"
				/>
			{/if}
			{#if target}
				{#key target.slug + ':' + target.locale}
					<TranslationPanel {source} {target} />
				{/key}
			{/if}
		{/if}
	</div>
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
