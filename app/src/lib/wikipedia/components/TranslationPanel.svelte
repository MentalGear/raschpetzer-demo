<script lang="ts">
	/**
	 * Side-by-side translation review: the `en` source and a translated locale, aligned
	 * block-by-block on their shared stable id (see i18n/align). Each row shows the source
	 * text and its translation; untranslated source blocks are flagged (the reader falls
	 * back to the source), and target-only blocks are shown as additions. Front-end only —
	 * a reading/review aid, not an editor. Status is conveyed by icon + label + border, not
	 * colour alone (WCAG 1.4.1).
	 */
	import type { Article } from '$lib/wikipedia/data/types'
	import { blockText, LOCALE_LABEL } from '$lib/wikipedia/data/types'
	import { alignBlocks, summarizeTranslation } from '$lib/wikipedia/i18n/align'
	import { cn } from '@kit/ui/shadcn-utils'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import { Languages, TriangleAlert, Plus } from '@lucide/svelte'

	let { source, target }: { source: Article; target: Article } = $props()

	const rows = $derived(alignBlocks(source.blocks, target.blocks))
	const sum = $derived(summarizeTranslation(rows))

	const STYLE = {
		translated: { cls: 'border-l-border', icon: Languages, label: 'Translated' },
		untranslated: {
			cls: 'border-l-destructive bg-destructive/5',
			icon: TriangleAlert,
			label: 'Not translated',
		},
		added: { cls: 'border-l-foreground/40 bg-muted/40', icon: Plus, label: 'Target-only' },
	} as const
</script>

<div class="flex flex-col gap-4">
	<!-- coverage + staleness summary -->
	<div class="flex flex-wrap items-center gap-2">
		<Badge variant="outline">
			<span aria-hidden="true">{sum.translated}/{sum.total}</span>
			<span class="sr-only">{sum.translated} of {sum.total} blocks translated</span>
		</Badge>
		{#if sum.untranslated > 0}
			<Badge variant="outline">
				<span aria-hidden="true">{sum.untranslated} untranslated</span>
				<span class="sr-only">{sum.untranslated} blocks untranslated</span>
			</Badge>
		{/if}
		{#if target.i18n?.status === 'machine'}
			<Badge variant="secondary">Machine-generated</Badge>
		{:else if target.i18n?.status === 'stale'}
			<Badge variant="secondary">May be out of date</Badge>
		{/if}
	</div>

	<!-- column headers -->
	<div class="grid gap-3 md:grid-cols-2" aria-hidden="true">
		<p class="text-sm font-semibold text-muted-foreground">
			{LOCALE_LABEL[source.locale]} (source)
		</p>
		<p class="text-sm font-semibold text-muted-foreground">{LOCALE_LABEL[target.locale]}</p>
	</div>

	<ul class="flex flex-col gap-2">
		{#each rows as row (row.id + ':' + row.status)}
			{@const s = STYLE[row.status]}
			{@const Icon = s.icon}
			<li class={cn('rounded-md border border-l-4 p-3', s.cls)}>
				<div class="mb-2 flex items-center gap-2">
					<Icon class="size-4 text-muted-foreground" aria-hidden="true" />
					<Badge variant="outline" class="text-xs">{s.label}</Badge>
					<span class="text-xs text-muted-foreground"
						>{(row.source ?? row.target)?.type}</span
					>
				</div>
				<div class="grid gap-3 md:grid-cols-2">
					<!-- source (en) -->
					<div lang={source.locale}>
						{#if row.source}
							<span class="sr-only">{LOCALE_LABEL[source.locale]}: </span>
							<p class="text-sm text-foreground">{blockText(row.source)}</p>
						{:else}
							<p class="text-sm text-muted-foreground">—</p>
						{/if}
					</div>
					<!-- target (translated locale) -->
					<div lang={target.locale}>
						{#if row.target}
							<span class="sr-only">{LOCALE_LABEL[target.locale]}: </span>
							<p class="text-sm text-foreground">{blockText(row.target)}</p>
						{:else}
							<p class="text-sm text-muted-foreground italic" lang={source.locale}>
								Not translated — the reader falls back to the source.
							</p>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>
</div>
