<script lang="ts" generics="T">
	/**
	 * Generic, domain-free drag-to-reorder composite. Wraps `svelte-dnd-action`
	 * (`use:dndzone`) with Svelte's `animate:flip` for smooth FLIP animations and
	 * built-in keyboard reordering + screen-reader a11y.
	 *
	 * The composite owns the dndzone wiring and item animation; the consumer
	 * supplies the data and handles persistence via `onReorder` (bring-your-own-
	 * persistence — keeps the kit domain-free).
	 *
	 * Domain-free: no `$lib`, `$app`, or `@kit/tokens` imports.
	 *
	 * a11y: keyboard drag + live-region announcements are inherited from
	 * svelte-dnd-action (Space/Enter to lift, Arrow keys to move, Space/Enter or
	 * Escape to drop). Do not re-derive ARIA here.
	 *
	 * SSR: client-side-only by nature (dndzone uses pointer/keyboard events).
	 * Safe to import on the server — all browser API access is inside event
	 * handlers / the action itself (rule 14 compliant).
	 *
	 * prefers-reduced-motion: honored automatically — the FLIP duration snaps to 0
	 * when the OS "reduce motion" setting is on (reactive to live toggles), so the
	 * composite is correct on its own. `flipMs` (default 150 ms) controls only the
	 * no-preference case; pass `flipMs={0}` to disable animation everywhere.
	 */
	import { flip } from 'svelte/animate'
	import { dndzone, type DndEvent } from 'svelte-dnd-action'
	import { cn } from '@kit/ui/shadcn-utils'
	import { prefersReducedMotion } from '../reducedMotion.svelte'
	import { untrack, onDestroy, type Snippet } from 'svelte'

	/** Each internal item must carry a stable `id` for dndzone keying. */
	type WithId = { id: string | number }

	interface Props<T> {
		/** The ordered items to render. Plain prop (not bindable); new order is
		 *  emitted via `onReorder`. */
		items: T[]
		/** How to extract a stable id from each item.
		 *  - A `keyof T` string picks that property (must be `string | number`).
		 *  - A function returns the id value directly.
		 *  Defaults to `'id'`. */
		key?: keyof T | ((item: T) => string | number)
		/** Called with the new ordered array after the user drops an item. The
		 *  app/consumer writes this to its store/config to persist the order. */
		onReorder?: (next: T[]) => void
		/** When true, dragging is disabled (items are rendered but not draggable). */
		disabled?: boolean
		/** FLIP animation duration in ms. Pass `0` to disable. Default: 150. */
		flipMs?: number
		/** Extra class(es) merged onto the root `<ul>` element via `cn()`. */
		class?: string
		/**
		 * Accessible label for the reorderable list.
		 *
		 * **Multi-instance caveat:** the default `'Reorderable list'` is shared by
		 * every Sortable on the page. If two or more Sortable lists appear at the
		 * same time (e.g. two reorderable panels), pass a unique `ariaLabel` to
		 * each so screen readers can distinguish them (e.g. "Albums", "Tracks").
		 */
		ariaLabel?: string
		/** Per-item renderer. Receives the item and its current index. */
		item: Snippet<[T, { index: number }]>
	}

	let {
		items,
		key = 'id' as keyof T,
		onReorder,
		disabled = false,
		flipMs = 150,
		class: className,
		ariaLabel = 'Reorderable list',
		item: itemSnippet,
	}: Props<T> = $props()

	// FLIP duration, honoring the OS reduced-motion preference by default (snap to 0)
	// so the composite is correct standalone — not reliant on the consuming app's
	// global CSS reset. `flipMs` still controls the animated (no-preference) case.
	// `prefersReducedMotion` reads matchMedia SSR-safely (guarded + reactive to toggles).
	const effectiveFlip = $derived(prefersReducedMotion() ? 0 : flipMs)

	// ── stable id extraction ────────────────────────────────────────────────────
	function extractId(it: T): string | number {
		if (typeof key === 'function') return key(it)
		const val = (it as Record<string, unknown>)[key as string]
		if (typeof val !== 'string' && typeof val !== 'number') {
			throw new Error(
				`[Sortable] key "${String(key)}" on item did not return a string or number (got ${typeof val}). ` +
					'Pass a `key` function or ensure the property is a string | number.',
			)
		}
		return val
	}

	// ── internal state: a copy with stable dndzone `id` attached ───────────────
	// dndzone requires each item in its list to have an `id` property. We map
	// the consumer's items to objects that guarantee this, using extractId().
	type DndItem = WithId & { __item: T }

	function toDndItems(src: T[]): DndItem[] {
		return src.map((it) => ({ id: extractId(it), __item: it }))
	}

	// Mutable shadow of the `items` prop, needed so dndzone can optimistically
	// update the list position during drag (before `onReorder` fires and the
	// parent re-renders). We use $state.raw because we always reassign the full
	// array (never mutate individual elements) — avoiding the deep-proxy overhead.
	//
	// The $effect is the intentional escape hatch here: we are syncing Svelte
	// prop state into a third-party imperative action (dndzone). During an active
	// drag, `handleConsider` overwrites `local` with dndzone's optimistic order;
	// `handleFinalize` then calls `onReorder` so the parent can persist.
	// Seed from `items` at init (NOT `[]`) so the list renders on the server too —
	// `toDndItems` is pure/DOM-free, so this is SSR-safe and avoids an empty first paint.
	// `untrack` marks the read as an intentional one-time seed (the $effect below owns
	// subsequent syncs) — silences the state_referenced_locally warning.
	let local = $state.raw<DndItem[]>(untrack(() => toDndItems(items)))

	// True while a drag is in flight (between the first `consider` and `finalize`).
	// Guards the prop→local sync so a parent updating `items` mid-drag can't
	// overwrite dndzone's optimistic order and teleport the dragged item.
	let dragging = $state(false)
	// True during the FLIP settle window right after a drop: `finalize` clears `dragging`
	// immediately, but the drop's `animate:flip` is still running, so keep suppressing the
	// prop→local sync until it settles — otherwise a parent `items` update mid-animation
	// overwrites `local` and cuts the transition. (No settle window under reduced motion:
	// effectiveFlip is 0.)
	let settling = $state(false)
	let settleTimer: ReturnType<typeof setTimeout> | undefined
	// Plain (non-reactive) ref of the last synced `items` so a parent re-render
	// that passes the SAME array reference doesn't re-wrap and re-run FLIP. Seeded
	// to the initial `items` so the mount effect below doesn't re-wrap needlessly.
	let lastSynced: T[] | undefined = untrack(() => items)

	$effect(() => {
		if (dragging || settling) return
		if (items === lastSynced) return
		lastSynced = items
		local = toDndItems(items)
	})

	// ── dndzone event handlers ──────────────────────────────────────────────────
	function handleConsider(e: CustomEvent<DndEvent<DndItem>>) {
		// Update local for live FLIP animation during drag.
		dragging = true
		local = e.detail.items
	}

	function handleFinalize(e: CustomEvent<DndEvent<DndItem>>) {
		local = e.detail.items
		dragging = false
		// Emit the new order (unwrap __item back to T).
		onReorder?.(local.map((d) => d.__item))
		// Keep the prop→local sync suppressed until the drop's FLIP animation settles (see
		// `settling`), so a parent `items` update in that window can't cut the transition.
		clearTimeout(settleTimer)
		if (effectiveFlip > 0) {
			settling = true
			settleTimer = setTimeout(() => (settling = false), effectiveFlip)
		}
	}

	onDestroy(() => clearTimeout(settleTimer))

	// ── a11y: instructions + announcements are owned by svelte-dnd-action ────────
	// With the default `autoAriaDisabled: false`, dndzone injects BOTH the up-front
	// grab/drop instructions (prepended to <body>, wired via aria-describedby it sets
	// on the zone) AND an aria-live region for drag-state announcements ("Lifted item
	// X … Dropped at position Y"). We must NOT set our own aria-describedby — dndzone
	// overwrites it in its action effect, so a hand-rolled instructions span would be
	// dead (never referenced). Let the maintained library own the full ARIA protocol.
</script>

<!--
  role="list" — explicit because some resets (CSS `list-style: none`) strip the
  implicit list role; restoring it keeps screen readers correct.
  aria-label — names the region so screen readers announce the list purpose.
  Instructions + drag-state announcements + aria-describedby are injected/managed by
  svelte-dnd-action (see the note above) — do not add our own here (it'd be overwritten).
-->
<ul
	role="list"
	aria-label={ariaLabel}
	class={cn('flex flex-col', className)}
	use:dndzone={{ items: local, flipDurationMs: effectiveFlip, dragDisabled: disabled }}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each local as dndItem, index (dndItem.id)}
		<li animate:flip={{ duration: effectiveFlip }}>
			{@render itemSnippet(dndItem.__item, { index })}
		</li>
	{/each}
</ul>
