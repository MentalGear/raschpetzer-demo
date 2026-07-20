<script lang="ts">
	/** The shared sidebar footer stat (`<count> <noun> · gen <ms> ms`). Keeps the
	 *  `.lib-stat` hook + format identical across apps (relied on by e2e). */
	import { cn } from '@kit/ui/shadcn-utils'

	interface Props {
		count: number
		/** plural noun for the count, e.g. 'items' / 'notes' */
		noun: string
		/** Optional layout/generation time in ms. Omit for apps with no such metric
		 *  (e.g. a static content app) — the `· gen … ms` segment is then dropped
		 *  rather than showing a meaningless `gen 0 ms`. */
		genMs?: number
		/** merged onto the stat's root (rule 13) */
		class?: string
	}
	let { count, noun, genMs, class: className }: Props = $props()

	// Compose in the script (not nested template `{#if}` in text) so prettier can't
	// inject whitespace that changes the rendered stat / VRT baselines. The `· gen …
	// ms` segment appears only when a `genMs` is provided (omit it for apps with no
	// such metric, instead of showing a meaningless `gen 0 ms`).
	const label = $derived(
		count
			? `${count.toLocaleString()} ${noun}${genMs != null ? ` · gen ${genMs.toFixed(0)} ms` : ''}`
			: '',
	)
</script>

<!-- keep the `.lib-stat` node always present (empty until loaded) — matches the
     original layouts and stays VRT-stable; only the text is gated on `count`. -->
<div class={cn('lib-stat px-2 py-1 text-xs text-muted-foreground tabular-nums', className)}>
	{label}
</div>
