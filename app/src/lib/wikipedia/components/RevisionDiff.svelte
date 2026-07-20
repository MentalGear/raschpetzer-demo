<script lang="ts">
	/**
	 * Renders a block-level (semantic) change-set — added / removed / changed blocks —
	 * NOT a raw line diff (the research's "reviewable change-sets, not line diffs").
	 * Status is conveyed by icon + label + border, not colour alone (WCAG 1.4.1).
	 */
	import type { DiffEntry } from '$lib/wikipedia/diff/blockDiff'
	import { blockText } from '$lib/wikipedia/data/types'
	import { cn } from '@kit/ui/shadcn-utils'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import { Plus, Minus, PencilLine, Equal } from '@lucide/svelte'

	let { entries, showUnchanged = false }: { entries: DiffEntry[]; showUnchanged?: boolean } =
		$props()

	const visible = $derived(
		showUnchanged ? entries : entries.filter((e) => e.status !== 'unchanged'),
	)

	const STYLE = {
		added: { cls: 'border-l-primary bg-primary/5', icon: Plus, label: 'Added' },
		removed: { cls: 'border-l-destructive bg-destructive/5', icon: Minus, label: 'Removed' },
		changed: { cls: 'border-l-foreground/40 bg-muted/40', icon: PencilLine, label: 'Changed' },
		unchanged: { cls: 'border-l-border', icon: Equal, label: 'Unchanged' },
	} as const
</script>

{#if visible.length === 0}
	<p class="text-sm text-muted-foreground">No changes in this revision.</p>
{:else}
	<ul class="flex flex-col gap-2">
		{#each visible as entry (entry.block.id + ':' + entry.status)}
			{@const s = STYLE[entry.status]}
			{@const Icon = s.icon}
			<li class={cn('rounded-md border border-l-4 p-3', s.cls)}>
				<div class="mb-1 flex items-center gap-2">
					<Icon class="size-4 text-muted-foreground" aria-hidden="true" />
					<Badge variant="outline" class="text-xs">{s.label}</Badge>
					<span class="text-xs text-muted-foreground">{entry.block.type}</span>
				</div>
				{#if entry.status === 'changed' && entry.prev}
					{@const before = blockText(entry.prev)}
					{@const after = blockText(entry.block)}
					{#if before === after}
						<!-- structural-only edit (mark/link/level/table row): text is identical, so
						     surface the change explicitly instead of two identical lines. -->
						<p class="text-sm text-foreground">{after}</p>
						<p class="text-xs text-muted-foreground">
							Formatting, links, or structure changed.
						</p>
					{:else}
						<p class="text-sm text-foreground line-through">
							<span class="sr-only">Before: </span>{before}
						</p>
						<p class="text-sm text-foreground">
							<span class="sr-only">After: </span>{after}
						</p>
					{/if}
				{:else}
					<p
						class={cn(
							'text-sm text-foreground',
							entry.status === 'removed' && 'line-through',
						)}
					>
						{blockText(entry.block)}
					</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
