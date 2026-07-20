<script lang="ts">
	/**
	 * A SINGLE shared hover/focus preview for every internal link inside the live editor
	 * (`root` — the TipTap mount div), reader or editable. Content/visuals are a direct port of
	 * `InlineRuns.svelte`'s internal-link `HoverCard` (title + blurb + "doesn't exist yet"), but
	 * the trigger here is a real `<a>` the `link` mark itself renders (ProseMirror-owned DOM a
	 * mark's `renderHTML` can't wrap in a mounted Svelte component the way a NodeView/widget can)
	 * — so this listens for hover/focus bubbling from `root` instead of rendering its own
	 * `HoverCard.Trigger` per link, and positions ONE popover via bits-ui's `customAnchor`
	 * (an arbitrary element ref, not tied to a literal `Trigger` child — see
	 * `node_modules/bits-ui/dist/bits/utilities/floating-layer/types.d.ts`). One shared instance
	 * per editor, not one per link: this app's articles only carry a handful of links, but the
	 * point of sharing is the fixed cost (one popover, one listener pair) regardless of article
	 * size, rather than a widget-mounted `HoverCard` per link the way citations/notes get.
	 *
	 * Hand-rolls open/close delay (matching bits-ui's own 700ms/300ms `LinkPreview` defaults)
	 * because that timing logic lives on bits-ui's `Trigger`/`Root` internals, unreachable without
	 * a real mounted `Trigger` — Escape-to-close and click-outside-to-close still come for free
	 * from `HoverCard.Content`'s own dismissible/escape layers, which don't depend on a `Trigger`
	 * existing. `onpointerenter`/`onpointerleave` on `HoverCard.Content` itself cancel/reschedule
	 * the close so moving the pointer from the link onto the popover (e.g. to read a long blurb)
	 * doesn't immediately dismiss it — bits-ui's own `SafePolygon` can't do this for us since it
	 * keys off `Root`'s `triggerNode`, which stays null with no `Trigger` mounted.
	 */
	import * as HoverCard from '@kit/ui/shadcn-components/ui/hover-card'
	import { wikiStore, articleExists } from '$lib/wikipedia/state/wikiStore.svelte'
	import { slugFromInternalHref } from '../linkHref'

	const OPEN_DELAY = 700
	const CLOSE_DELAY = 300

	let { root }: { root: HTMLElement } = $props()

	let open = $state(false)
	let anchorEl = $state<HTMLElement | null>(null)
	let slug = $state<string | null>(null)
	const entity = $derived(slug ? wikiStore.entityBySlug(slug) : undefined)
	const exists = $derived(slug ? articleExists(slug) : true)

	let openTimer: ReturnType<typeof setTimeout> | undefined
	let closeTimer: ReturnType<typeof setTimeout> | undefined

	function internalLinkFrom(target: EventTarget | null) {
		const el = (target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
		if (!el) return null
		const s = slugFromInternalHref(el.getAttribute('href') ?? '')
		// No popover at all for a slug with no entity record — matches InlineRuns.svelte, which
		// never rendered a `HoverCard.Content` in that case either; opening a blank shared card
		// would be a real (not just cosmetic) regression from that.
		return s && wikiStore.entityBySlug(s) ? { el, slug: s } : null
	}

	function scheduleOpen(el: HTMLElement, targetSlug: string) {
		clearTimeout(closeTimer)
		clearTimeout(openTimer)
		openTimer = setTimeout(() => {
			anchorEl = el
			slug = targetSlug
			open = true
		}, OPEN_DELAY)
	}
	function scheduleClose() {
		clearTimeout(openTimer)
		clearTimeout(closeTimer)
		closeTimer = setTimeout(() => (open = false), CLOSE_DELAY)
	}
	function cancelClose() {
		clearTimeout(closeTimer)
	}

	function attachHover(node: HTMLElement) {
		function onOver(e: MouseEvent) {
			const hit = internalLinkFrom(e.target)
			if (hit) scheduleOpen(hit.el, hit.slug)
		}
		function onOut(e: MouseEvent) {
			const hit = internalLinkFrom(e.target)
			// only schedule a close for a genuine leave of the trigger — not a move between two
			// nested nodes (e.g. bold text) inside the same `<a>`.
			if (hit && !hit.el.contains(e.relatedTarget as Node)) scheduleClose()
		}
		function onFocusIn(e: FocusEvent) {
			const hit = internalLinkFrom(e.target)
			if (hit) scheduleOpen(hit.el, hit.slug)
		}
		function onFocusOut(e: FocusEvent) {
			if (internalLinkFrom(e.target)) scheduleClose()
		}
		node.addEventListener('mouseover', onOver)
		node.addEventListener('mouseout', onOut)
		node.addEventListener('focusin', onFocusIn)
		node.addEventListener('focusout', onFocusOut)
		return () => {
			node.removeEventListener('mouseover', onOver)
			node.removeEventListener('mouseout', onOut)
			node.removeEventListener('focusin', onFocusIn)
			node.removeEventListener('focusout', onFocusOut)
			clearTimeout(openTimer)
			clearTimeout(closeTimer)
		}
	}

	$effect(() => attachHover(root))
</script>

<HoverCard.Root bind:open>
	<HoverCard.Content
		customAnchor={anchorEl}
		class="w-72"
		onpointerenter={cancelClose}
		onpointerleave={scheduleClose}
	>
		{#if entity}
			<div class="flex flex-col gap-1">
				<span class="text-sm font-semibold">{entity.title}</span>
				<span class="text-sm text-muted-foreground">{entity.blurb}</span>
				{#if !exists}
					<span class="text-xs text-destructive">This article doesn't exist yet.</span>
				{/if}
			</div>
		{/if}
	</HoverCard.Content>
</HoverCard.Root>
