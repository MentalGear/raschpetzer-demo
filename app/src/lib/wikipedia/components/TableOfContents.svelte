<script lang="ts">
	/**
	 * Sticky "on this page" table of contents with scroll-spy. Highlights exactly one
	 * active section as the reader scrolls (invariant: one active at a time), via an
	 * IntersectionObserver over the heading anchors. Client-only (the app is SSR-off).
	 * Candidate for promotion to @kit/ui once the shape settles (confirmation-gated).
	 */
	import { tick, untrack } from 'svelte'
	import type { TocEntry } from '$lib/wikipedia/data/types'
	import { cn } from '@kit/ui/shadcn-utils'

	interface Props {
		entries: TocEntry[]
		showHeading?: boolean
		/** Bump/change this whenever the underlying heading DOM elements may have been replaced —
		 *  e.g. a read↔edit toggle that swaps which component tree renders the headings (ArticleBody
		 *  vs the ProseMirror editor). The scroll-spy observer only re-queries `document.getElementById`
		 *  when its OWN reactive deps change (`entries`), which does NOT change on that toggle (it's
		 *  derived from the read-only Article, unaffected by editing) — so without this, the observer
		 *  silently keeps watching now-detached elements from before the swap and scroll-spy stops
		 *  updating. Optional; omit if the caller's heading DOM is stable for the component's lifetime. */
		domKey?: unknown
	}
	let { entries, showHeading = true, domKey }: Props = $props()

	let activeId = $state<string>('')
	// Wall-clock deadline (Date.now()-comparable) until which the scroll-spy observer's
	// updates are ignored — set by `jumpTo` on click. A programmatic smooth-scroll passes
	// MULTIPLE headings through the observer's "upper third" zone while it's still in
	// flight (nearby headings can be simultaneously in-zone), so without this the
	// observer's mid-animation callbacks can overwrite the just-clicked target with a
	// DIFFERENT, merely-nearby heading before the scroll settles — reported live: clicking
	// a ToC entry could leave the wrong entry highlighted. `jumpTo`'s own direct `activeId
	// = id` assignment is the authoritative answer for a click; this just stops the
	// observer from racing it until the animation is done.
	let suppressObserverUntil = 0

	$effect(() => {
		// Tracked dependency only to force a re-run (and thus a fresh DOM query + observer
		// rebuild) whenever the caller signals the heading elements may have changed — see
		// `domKey`'s own doc comment above.
		void domKey

		// Reconcile the active id against the current entries FIRST (before the DOM guard),
		// so a locale switch that swaps the heading set always leaves exactly one active
		// even if the new heading elements aren't in the DOM yet. untrack so reading/writing
		// activeId here doesn't make it an effect dependency (the observer writes activeId on
		// scroll → would otherwise rebuild the observer on every change).
		untrack(() => {
			if (!entries.some((e) => e.id === activeId)) activeId = entries[0]?.id ?? ''
		})

		const els = entries
			.map((e) => document.getElementById(e.id))
			.filter((el): el is HTMLElement => el !== null)
		if (els.length === 0) return

		const observer = new IntersectionObserver(
			(records) => {
				if (Date.now() < suppressObserverUntil) return
				const onscreen = records
					.filter((r) => r.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
				if (onscreen[0]) activeId = onscreen[0].target.id
			},
			// activate a heading once it reaches the upper third of the viewport.
			{ rootMargin: '0px 0px -66% 0px', threshold: 0 },
		)
		for (const el of els) observer.observe(el)
		return () => observer.disconnect()
	})

	// A ToC entry can point at an h3/h4 nested inside a mobile-collapsed h2 section — under
	// the live-editor-as-reader architecture (2026-07-19), a section's members are FLAT
	// siblings each individually carrying `class="hidden"` while collapsed
	// (`mobileSectionCollapseDecoration`, extensions.ts), not one wrapped container the way
	// `ArticleBody.svelte`'s old `Collapsible`-based version had it — so there's no ancestor
	// chain to walk, only the target element itself (if it's a hidden member) and its
	// section's own h2 trigger. Expand before scrolling (matches Wikipedia's own mobile ToC,
	// which auto-expands the target section on jump). A no-op on desktop, where sections
	// start open (never carry `hidden`), and a no-op for a target that isn't collapsed.
	function expandCollapsedAncestors(el: HTMLElement) {
		if (!el.classList.contains('hidden')) return
		for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) {
			if (sib.tagName === 'H2') {
				// `[data-slot="mobile-section-trigger"]`, not a bare `button[aria-expanded]` —
				// HeadingAnchor's own copy-link button ALSO carries `aria-expanded` (bits-ui's
				// HoverCard sets it), and can also be `aria-expanded="false"` (closed), so an
				// attribute-only selector risks clicking the wrong button.
				sib.querySelector<HTMLElement>('[data-slot="mobile-section-trigger"]')?.click()
				return
			}
		}
	}

	// Smooth-scroll to the target heading on click (`scroll-mt-*` on headings already
	// clears the sticky header — see ArticleBody.svelte). Falls back to the browser's
	// default instant jump when the user prefers reduced motion.
	async function jumpTo(event: MouseEvent, id: string) {
		const el = document.getElementById(id)
		if (!el) return
		event.preventDefault()
		expandCollapsedAncestors(el)
		await tick()
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
		history.pushState(null, '', `#${id}`)
		activeId = id
		// See `suppressObserverUntil`'s own comment above — covers a typical smooth-scroll
		// duration with margin; harmless if the scroll actually settles sooner (the observer
		// just resumes agreeing with the already-correct activeId).
		suppressObserverUntil = Date.now() + 700
		flashHeading(el)
	}

	// Briefly highlight the target heading itself (app.css's `wiki-toc-highlight` keyframes) —
	// a quick, non-color-only cue that a click actually landed, distinct from the ToC's own
	// active-link re-styling above. Restart-safe: clicking a DIFFERENT entry while a previous
	// flash is still animating removes+re-triggers via a forced reflow (the standard "remove,
	// reflow, re-add" trick for restarting a CSS animation); the OS reduced-motion setting
	// already collapses the animation to near-instant (app.css's global rule), so no separate
	// JS gate is needed here.
	function flashHeading(el: HTMLElement) {
		el.classList.remove('wiki-toc-highlight')
		void el.offsetWidth // force reflow so re-adding the class restarts the animation
		el.classList.add('wiki-toc-highlight')
		el.addEventListener('animationend', () => el.classList.remove('wiki-toc-highlight'), {
			once: true,
		})
	}
</script>

{#if entries.length > 0}
	<!-- font-size via calc(), not the Tailwind text-sm class it replaces: responds to the reader's
	     chosen text scale (ArticleReader.svelte's --wiki-scale custom property, set on a shared
	     ancestor) — matches text-sm's real value (0.875rem) at the default scale (1). -->
	<nav aria-label="Outline" style="font-size: calc(0.875rem * var(--wiki-scale, 1))">
		{#if showHeading}
			<p class="mb-2 font-medium text-foreground">Outline</p>
		{/if}
		<ul class="flex flex-col gap-0.5">
			{#each entries as e (e.id)}
				<li>
					<a
						href={`#${e.id}`}
						onclick={(event) => jumpTo(event, e.id)}
						class={cn(
							'-ml-px block border-l-2 py-1 pl-3 text-muted-foreground transition-colors hover:text-foreground',
							e.level === 3 && 'pl-6',
							e.level === 4 && 'pl-9',
							activeId === e.id
								? 'border-primary font-medium text-foreground'
								: 'border-border',
						)}
						aria-current={activeId === e.id ? 'location' : undefined}>{e.text}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
