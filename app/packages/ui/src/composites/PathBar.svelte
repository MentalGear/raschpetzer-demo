<!--
	PathBar composite — a breadcrumb-style path trail shared by page headers
	(e.g. "‹ Albums" back-links) and the search overlay's scope control.

	## Composition
	- Built on the shadcn-svelte `Breadcrumb` primitives (`@kit/ui/shadcn-components/
	  ui/breadcrumb`), previously vendored but unused.
	- Domain-free and fully controlled: the caller supplies an ordered list of
	  segments; this composite only renders the trail.

	## Responsive collapse (`collapsible`, default on for trails of 3+ segments)
	When the trail is too WIDE for its container, the middle segments collapse into a
	single "…" `DropdownMenu` (first › … › current), progressively — only as many as
	needed are hidden, and the segments nearest the current page (the most useful
	context) are kept. This is true content-fit collapse, not a fixed breakpoint: CSS
	container queries can only respond to the container's SIZE, not to whether the
	content overflows, so a `ResizeObserver` measures actual overflow (`scrollWidth >
	clientWidth`) and converges to the tightest fit. SSR renders the full trail; the
	collapse activates after mount, and only ever HIDES (never grows) so there's no
	layout jump. A trail of ≤2 segments has no middle to collapse, so it renders
	exactly as before (wrapping, no nowrap/measure layer) — existing callers unchanged.

	## Accessibility
	- Rendered inside the primitive's `<nav aria-label="breadcrumb">` landmark.
	- Per the WAI-ARIA breadcrumb pattern, the LAST segment is always the current,
	  non-interactive location (`aria-current="page"`, inherited from
	  `Breadcrumb.Page`) — every earlier segment is a real link (`href`, a native
	  `<a>`) or an action (`onSelect`, a real `<button>`, so it's keyboard-operable
	  and in the tab order — never a bare non-href anchor).
	- The collapsed "…" is a labelled `<button>` ("Show N hidden path segments") that
	  opens a menu of the hidden segments (each a real link/action), so the whole
	  trail stays keyboard- and screen-reader-reachable.
-->
<script lang="ts">
	import { tick } from 'svelte'
	import * as Breadcrumb from '@kit/ui/shadcn-components/ui/breadcrumb'
	import * as DropdownMenu from '@kit/ui/shadcn-components/ui/dropdown-menu'

	export interface PathBarSegment {
		/** Stable key (also used as the keyed-each id). */
		id: string
		label: string
		/** Renders this segment as a link. Ignored on the last segment. */
		href?: string
		/** Renders this segment as a button that runs this instead of navigating
		 *  (e.g. re-scoping a search). Ignored on the last segment. */
		onSelect?: () => void
	}

	interface Props {
		/** Ordered path segments; the last one is the current location. */
		segments: PathBarSegment[]
		/** Merged onto the breadcrumb nav root (rule 13). */
		class?: string
		/** Collapse the middle into a "…" menu when the trail doesn't fit its width.
		 *  Only ever engages for 3+ segments; a shorter trail always renders in full. */
		collapsible?: boolean
	}
	let { segments, class: className, collapsible = true }: Props = $props()

	const n = $derived(segments.length)
	// Collapsing needs a first, a last, and at least one middle segment to hide.
	const canCollapse = $derived(collapsible && n >= 3)

	// The <ol> we measure for overflow (only when collapsing — it's the nowrap layer).
	// `null` (not undefined) so `bind:ref` matches the primitive's bindable-ref null fallback.
	let list = $state<HTMLElement | null>(null)
	// How many MIDDLE segments are folded into the "…" menu (from the FRONT of the
	// middle, so the segments nearest the current page stay visible). 0 = none.
	let hidden = $state(0)

	const first = $derived(segments[0])
	const last = $derived(segments[n - 1])
	const middle = $derived(segments.slice(1, Math.max(1, n - 1)))
	// Clamp so a stale `hidden` (e.g. after segments shrink) never over-collapses.
	const hiddenCount = $derived(canCollapse ? Math.min(hidden, middle.length) : 0)
	const foldedSegments = $derived(middle.slice(0, hiddenCount))
	const tailSegments = $derived(middle.slice(hiddenCount))

	// ── overflow fitting (true content-fit, not a breakpoint) ─────────────────────
	// A monotonic token so a resize mid-reflow aborts the stale pass (no thrash).
	let reflowToken = 0
	async function reflow() {
		const my = ++reflowToken
		const el = list
		if (!canCollapse || !el) {
			if (hidden !== 0) hidden = 0
			return
		}
		const overflows = () => el.scrollWidth > el.clientWidth + 1
		await tick()
		if (my !== reflowToken) return
		// Collapse one more middle segment while the trail overflows.
		while (overflows() && hidden < middle.length) {
			hidden++
			await tick()
			if (my !== reflowToken) return
		}
		// Then re-expand while there's room (container grew) — show one more, revert
		// if it no longer fits. Converges to the tightest fit without oscillating.
		while (hidden > 0) {
			hidden--
			await tick()
			if (my !== reflowToken) return
			if (overflows()) {
				hidden++
				await tick()
				break
			}
		}
	}

	// Re-fit on container resize (coalesced to one pass per frame).
	$effect(() => {
		const el = list
		if (!el) return
		let raf = 0
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(raf)
			raf = requestAnimationFrame(reflow)
		})
		ro.observe(el)
		return () => {
			cancelAnimationFrame(raf)
			ro.disconnect()
		}
	})

	// Re-fit when the segments (content) change — the observer won't fire for that.
	$effect(() => {
		const _segs = segments // read tracks content changes ( `_`-prefixed: intentionally unused)
		const raf = requestAnimationFrame(reflow)
		return () => cancelAnimationFrame(raf)
	})
</script>

<Breadcrumb.Root class={className}>
	<!-- When collapsing, the list must NOT wrap and must clip, so overflow is real and
	     measurable; a non-collapsing (≤2-segment) trail keeps the default wrapping list. -->
	<Breadcrumb.List
		bind:ref={list}
		class={canCollapse
			? 'min-w-0 flex-nowrap overflow-hidden whitespace-nowrap [&>li]:shrink-0'
			: undefined}
	>
		{#if canCollapse && hiddenCount > 0}
			<!-- first -->
			<Breadcrumb.Item>
				{#if first.href}
					<Breadcrumb.Link href={first.href}>{first.label}</Breadcrumb.Link>
				{:else if first.onSelect}
					<Breadcrumb.Link>
						{#snippet child({ props })}
							<button
								type="button"
								class={props.class}
								data-slot={props['data-slot']}
								onclick={first.onSelect}>{first.label}</button
							>
						{/snippet}
					</Breadcrumb.Link>
				{:else}
					<span class="text-muted-foreground">{first.label}</span>
				{/if}
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<!-- … menu of the folded middle segments -->
			<Breadcrumb.Item>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="flex size-5 items-center justify-center hover:text-foreground"
						aria-label={`Show ${foldedSegments.length} hidden path segment${
							foldedSegments.length === 1 ? '' : 's'
						}`}
					>
						<Breadcrumb.Ellipsis />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start">
						{#each foldedSegments as seg (seg.id)}
							{#if seg.href}
								<DropdownMenu.Item>
									{#snippet child({ props })}
										<a href={seg.href} {...props}>{seg.label}</a>
									{/snippet}
								</DropdownMenu.Item>
							{:else if seg.onSelect}
								<DropdownMenu.Item onSelect={seg.onSelect}
									>{seg.label}</DropdownMenu.Item
								>
							{:else}
								<DropdownMenu.Item disabled>{seg.label}</DropdownMenu.Item>
							{/if}
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<!-- kept tail middle + last -->
			{#each tailSegments as seg (seg.id)}
				<Breadcrumb.Item>
					{#if seg.href}
						<Breadcrumb.Link href={seg.href}>{seg.label}</Breadcrumb.Link>
					{:else if seg.onSelect}
						<Breadcrumb.Link>
							{#snippet child({ props })}
								<button
									type="button"
									class={props.class}
									data-slot={props['data-slot']}
									onclick={seg.onSelect}>{seg.label}</button
								>
							{/snippet}
						</Breadcrumb.Link>
					{:else}
						<span class="text-muted-foreground">{seg.label}</span>
					{/if}
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
			{/each}
			<Breadcrumb.Item>
				<Breadcrumb.Page>{last.label}</Breadcrumb.Page>
			</Breadcrumb.Item>
		{:else}
			<!-- full trail (no collapse needed / not collapsible) -->
			{#each segments as seg, i (seg.id)}
				{@const isLast = i === n - 1}
				<Breadcrumb.Item>
					{#if isLast}
						<Breadcrumb.Page>{seg.label}</Breadcrumb.Page>
					{:else if seg.href}
						<Breadcrumb.Link href={seg.href}>{seg.label}</Breadcrumb.Link>
					{:else if seg.onSelect}
						<Breadcrumb.Link>
							{#snippet child({ props })}
								<!-- Explicit pick, not a spread: `props` is typed for an <a>
								     (anchor-specific event handler types) and doesn't assign
								     onto a <button> — only `class`/`data-slot` carry real styling. -->
								<button
									type="button"
									class={props.class}
									data-slot={props['data-slot']}
									onclick={seg.onSelect}>{seg.label}</button
								>
							{/snippet}
						</Breadcrumb.Link>
					{:else}
						<Breadcrumb.Link>
							{#snippet child({ props })}
								<span class={props.class} data-slot={props['data-slot']}
									>{seg.label}</span
								>
							{/snippet}
						</Breadcrumb.Link>
					{/if}
				</Breadcrumb.Item>
				{#if !isLast}
					<Breadcrumb.Separator />
				{/if}
			{/each}
		{/if}
	</Breadcrumb.List>
</Breadcrumb.Root>
