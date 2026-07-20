<script lang="ts">
	/**
	 * The article's structured "Quick facts" box (`article.infobox`). Two variants share this
	 * one component (row rendering + the edit pencil) but differ in HOW they collapse, since
	 * the two contexts need different treatments:
	 *  - `mobile` — rendered in-flow inside the article (below `lg`); starts collapsed to the
	 *    first few rows with a simple text "Show all N facts" toggle (Wikipedia's own mobile
	 *    skin does the same, so an infobox can't push the whole lead below the fold on a phone).
	 *  - `desktop` — rendered in the right-side panel above the ToC (ArticleReader.svelte),
	 *    capped to a fixed max-height (25vh) with a bottom fade + an animated "Show more" expand,
	 *    rather than a hard row-count cut — the box can be arbitrarily tall (many facts) without
	 *    dominating the sidebar column. The CAP itself is a plain inline `style` value set at
	 *    render time (not something an effect computes), so it applies correctly even if the
	 *    `$effect` below hasn't run yet / JS is slow to hydrate — only the ANIMATED expand-to-
	 *    measured-height needs JS; without it "Show more" simply has no effect (never a broken/
	 *    uncapped box).
	 */
	import type { InfoboxField } from '$lib/wikipedia/content/schema'
	import { cn } from '@kit/ui/shadcn-utils'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Pencil } from '@lucide/svelte'

	interface Props {
		fields: InfoboxField[]
		/** shows the edit pencil + wires it to `onEditClick` (isEditing, in ArticleReader terms). */
		editable: boolean
		onEditClick: () => void
		variant: 'mobile' | 'desktop'
		class?: string
	}
	let { fields, editable, onEditClick, variant, class: className }: Props = $props()

	// ── mobile: fixed row-count preview + text toggle (unchanged from the original behavior) ──
	const MOBILE_PREVIEW_COUNT = 3
	let mobileExpanded = $state(false)

	// ── desktop: max-height cap + bottom fade + animated "Show more" ──────────────────────────
	// Measure the box's natural (scrollHeight) vs currently-visible (clientHeight) height via
	// ResizeObserver (not a one-time read — the box can change height as fonts load / the window
	// resizes / an edit changes the field count). `overflowing` is only RE-DERIVED while
	// collapsed: once expanded, `clientHeight` catches up to `scrollHeight` (nothing's clipped
	// anymore), so re-deriving it live would spuriously flip the "Show more" affordance off mid-
	// expansion — freeze it at its last collapsed-state reading instead, matching what the user
	// actually needs (whether to offer "Show less").
	let bodyEl = $state<HTMLElement | null>(null)
	let naturalHeight = $state(0)
	let overflowing = $state(false)
	let desktopExpanded = $state(false)
	$effect(() => {
		const el = bodyEl
		if (!el) return
		const ro = new ResizeObserver(() => {
			naturalHeight = el.scrollHeight
			if (!desktopExpanded) overflowing = el.scrollHeight > el.clientHeight + 1
		})
		ro.observe(el)
		return () => ro.disconnect()
	})
</script>

{#snippet rows(visibleCount: number | null)}
	<!-- font-size via calc(), not the Tailwind text-sm class it replaces: responds to the reader's
	     chosen text scale (ArticleReader.svelte's --wiki-scale custom property) — a Tailwind class
	     sets an absolute rem value a descendant can't proportionally inherit-scale. Matches
	     text-sm's real value (0.875rem) at the default scale (1). The "Quick facts" label/Edit/
	     Show-more affordances stay at their fixed utility sizes on purpose — chrome, not the
	     reading content the scale preference is for. -->
	<dl class="flex flex-col gap-3" style="font-size: calc(0.875rem * var(--wiki-scale, 1))">
		<!-- Keyed by position, not `field.label`: an infobox describing more than one entity on
		     one page (e.g. a companion two-shaft article) can otherwise repeat a label like
		     "Role", which crashed with a real Svelte each_key_duplicate error once already.
		     Fields are positionally stable here (no reorder/filter animation relies on label
		     identity), so index-keying loses nothing and removes the whole bug class instead of
		     relying on every caller remembering to disambiguate labels by hand. -->
		{#each fields as field, idx (idx)}
			<div
				class={cn(
					'flex justify-between gap-3',
					visibleCount != null && idx >= visibleCount && 'hidden',
				)}
			>
				<dt class="text-muted-foreground">{field.label}</dt>
				<!-- 0.9em, not a fixed size: stays proportional to the `dl`'s own scale-aware
				     calc() above (so --wiki-scale keeps working), just a touch smaller than the
				     label — labels read as the box's structure, values as the data inside it. -->
				<dd class="text-right font-medium" style="font-size: 0.9em">{field.value}</dd>
			</div>
		{/each}
	</dl>
{/snippet}

{#snippet header()}
	<div class="mb-2 flex items-center justify-between gap-2">
		<p class="text-base font-semibold text-foreground">Quick facts</p>
		{#if editable}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="size-6"
				aria-label="Edit quick facts"
				onclick={onEditClick}
			>
				<Pencil class="size-3.5" />
			</Button>
		{/if}
	</div>
{/snippet}

{#if variant === 'mobile'}
	<aside
		class={cn('rounded-lg border border-border bg-muted/30 p-4', className)}
		aria-label="Quick facts"
	>
		{@render header()}
		{@render rows(mobileExpanded ? null : MOBILE_PREVIEW_COUNT)}
		{#if fields.length > MOBILE_PREVIEW_COUNT}
			<button
				type="button"
				class="mt-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
				aria-expanded={mobileExpanded}
				onclick={() => (mobileExpanded = !mobileExpanded)}
			>
				{mobileExpanded ? 'Show fewer facts' : `Show all ${fields.length} facts`}
			</button>
		{/if}
	</aside>
{:else}
	<aside
		class={cn('rounded-lg border border-border bg-card p-4', className)}
		aria-label="Quick facts"
	>
		{@render header()}
		<div class="relative">
			<div
				bind:this={bodyEl}
				style={desktopExpanded ? `max-height: ${naturalHeight}px` : 'max-height: 25vh'}
				class="overflow-hidden transition-[max-height] duration-500 ease-in-out"
			>
				{@render rows(null)}
			</div>
			{#if !desktopExpanded && overflowing}
				<div
					aria-hidden="true"
					class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent"
				></div>
			{/if}
		</div>
		{#if overflowing}
			<button
				type="button"
				class="mt-1.5 block text-xs font-medium text-primary underline-offset-2 hover:underline"
				aria-expanded={desktopExpanded}
				onclick={() => (desktopExpanded = !desktopExpanded)}
			>
				{desktopExpanded ? 'Show less' : 'Show more'}
			</button>
		{/if}
	</aside>
{/if}
