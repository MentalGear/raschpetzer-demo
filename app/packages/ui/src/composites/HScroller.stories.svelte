<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, waitFor } from 'storybook/test'
	import HScroller from './HScroller.svelte'

	// Domain-free demo content — the scroller is bring-your-own-content, so a
	// story only needs a fixed-width strip of chips wider than its container.
	const ITEM_W = 90
	const GAP = 8
	const COUNT = 14
	const STRIDE = ITEM_W + GAP
	const CONTENT_WIDTH = COUNT * STRIDE
	const items = Array.from({ length: COUNT }, (_, i) => i)

	const { Story } = defineMeta({
		title: 'Composites/HScroller',
		component: HScroller,
		tags: ['autodocs'],
		parameters: {
			// The demo chip colours are arbitrary synthetic data, not part of the
			// composite's own chrome — exclude them from the axe contrast scan the
			// same way VirtualGrid's story excludes its demo `.tile` fills.
			a11y: { context: { exclude: [['.demo-chip']] } },
		},
	})
</script>

<!-- Instance script: local mount-toggle state for the scrollKey-persistence story. -->
<script lang="ts">
	let scrollKeyMounted = $state(true)
</script>

{#snippet chips()}
	<div style="display:flex; gap:{GAP}px; padding:0.5rem; width:{CONTENT_WIDTH}px;">
		{#each items as i (i)}
			<button
				type="button"
				class="demo-chip"
				style="flex:0 0 {ITEM_W}px; height:64px; border-radius:8px; border:1px solid var(--border); background:hsl({(i *
					47) %
					360} 70% 55%); color:#fff; font-weight:600;"
			>
				{i}
			</button>
		{/each}
	</div>
{/snippet}

<!--
  ariaHidden controls only HScroller's OWN chrome (arrows) — content is
  bring-your-own, so a consumer using ariaHidden must independently keep its
  own interactive children out of the accessibility tree too (tabindex="-1" +
  suppressed focus-on-click), exactly like the Lightbox filmstrip's real
  thumb buttons do. This demo mirrors that contract instead of reusing `chips`.
-->
{#snippet chipsNonFocusable()}
	<div style="display:flex; gap:{GAP}px; padding:0.5rem; width:{CONTENT_WIDTH}px;">
		{#each items as i (i)}
			<button
				type="button"
				class="demo-chip"
				tabindex="-1"
				onmousedown={(e) => e.preventDefault()}
				style="flex:0 0 {ITEM_W}px; height:64px; border-radius:8px; border:1px solid var(--border); background:hsl({(i *
					47) %
					360} 70% 55%); color:#fff; font-weight:600;"
			>
				{i}
			</button>
		{/each}
	</div>
{/snippet}

<!-- Default: fades + arrows appear only where there's off-screen content. -->
<Story name="Default" asChild>
	<div style="max-width:420px;">
		<HScroller content={chips} contentWidth={CONTENT_WIDTH} ariaLabel="Demo strip" />
	</div>
</Story>

<!-- Chrome-less: no fades/arrows — plain scroll track (e.g. a minimal chip strip). -->
<Story name="No arrows / no fade" asChild>
	<div style="max-width:420px;">
		<HScroller
			content={chips}
			contentWidth={CONTENT_WIDTH}
			arrows={false}
			edgeFade={false}
			ariaLabel="Demo strip, chrome-less"
		/>
	</div>
</Story>

<!-- Pointer-only chrome: aria-hidden root, no focusable controls — the filmstrip's mode. -->
<Story name="Pointer-only (ariaHidden)" asChild>
	<div style="max-width:420px;">
		<HScroller content={chipsNonFocusable} contentWidth={CONTENT_WIDTH} ariaHidden />
	</div>
</Story>

<!--
  Keyboard + a11y interaction test (rule 10):
  - Focuses the scroll track directly and asserts it's the active element.
  - Sends ArrowRight and asserts scrollLeft increased (keyboard paging).
  - Scrolls to the end and asserts the right arrow disappears (auto-hide at
    the ends — the same visibility rule the fades follow).
-->
<Story
	name="Keyboard paging"
	asChild
	play={async ({ canvasElement }) => {
		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		await expect(track).not.toBeNull()
		if (!track) return

		track.focus()
		await expect(document.activeElement).toBe(track)

		const before = track.scrollLeft
		await userEvent.keyboard('{ArrowRight}')
		await waitFor(async () => {
			await expect(track.scrollLeft).toBeGreaterThan(before)
		})

		track.scrollLeft = track.scrollWidth
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.hs-arrow.next')).toBeNull()
		})
	}}
>
	<div style="max-width:420px;">
		<HScroller content={chips} contentWidth={CONTENT_WIDTH} ariaLabel="Keyboard paging demo" />
	</div>
</Story>

<!--
  Regression test: a text input nested inside the track must keep its OWN ArrowLeft/
  ArrowRight caret-movement semantics — the track's keyboard-paging handler must not
  hijack a keystroke aimed at the input just because it bubbles through the track (found
  in expert review: the wikipedia app's gallery editor nests text inputs directly in the
  content it hands HScroller).
  - Focuses a text input inside the track (not the track itself).
  - Types text, moves the caret to the start with Home, then presses ArrowRight and
    asserts the caret actually advanced (selectionStart 0 → 1) — if the track's handler
    had intercepted the key, the caret would stay at 0 and this would fail.
  - Confirms the track's OWN scrollLeft did NOT change from that keystroke (it shouldn't
    page just because a descendant input happened to handle an arrow key).
-->
<Story
	name="Arrow keys inside a nested input are not hijacked"
	asChild
	play={async ({ canvasElement }) => {
		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		const input = canvasElement.querySelector<HTMLInputElement>('.demo-input')
		await expect(track).not.toBeNull()
		await expect(input).not.toBeNull()
		if (!track || !input) return

		input.focus()
		await expect(document.activeElement).toBe(input)
		await userEvent.type(input, 'hello')
		input.setSelectionRange(0, 0)

		const scrollBefore = track.scrollLeft
		await userEvent.keyboard('{ArrowRight}')
		await waitFor(async () => {
			await expect(input.selectionStart).toBe(1)
		})
		await expect(track.scrollLeft).toBe(scrollBefore)
	}}
>
	<div style="max-width:420px;">
		<HScroller ariaLabel="Nested-input demo">
			{#snippet content()}
				<div style="display:flex; gap:{GAP}px; padding:0.5rem; width:{CONTENT_WIDTH}px;">
					<input
						class="demo-input"
						aria-label="Demo text field"
						style="flex:0 0 160px; height:40px;"
					/>
					{#each items as i (i)}
						<button
							type="button"
							class="demo-chip"
							style="flex:0 0 {ITEM_W}px; height:64px; border-radius:8px; border:1px solid var(--border); background:hsl({(i *
								47) %
								360} 70% 55%); color:#fff; font-weight:600;"
						>
							{i}
						</button>
					{/each}
				</div>
			{/snippet}
		</HScroller>
	</div>
</Story>

<!-- Mouse arrow-click paging (distinct code path from keyboard paging above: the
     arrow's onclick handler, not onTrackKeydown). -->
<Story
	name="Arrow click paging"
	asChild
	play={async ({ canvasElement }) => {
		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		const rightArrow = canvasElement.querySelector<HTMLElement>('.hs-arrow.next')
		await expect(track).not.toBeNull()
		await expect(rightArrow).not.toBeNull()
		if (!track || !rightArrow) return

		const before = track.scrollLeft
		rightArrow.click()
		await waitFor(async () => {
			await expect(track.scrollLeft).toBeGreaterThan(before)
		})
	}}
>
	<div style="max-width:420px;">
		<HScroller content={chips} contentWidth={CONTENT_WIDTH} ariaLabel="Arrow click demo" />
	</div>
</Story>

<!-- Wheel forwarding: a vertical-only wheel over the track redirects to horizontal
     scroll (onTrackWheel) — the path a plain (non-trackpad) wheel mouse relies on. -->
<Story
	name="Wheel forwarding"
	asChild
	play={async ({ canvasElement }) => {
		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		await expect(track).not.toBeNull()
		if (!track) return

		const before = track.scrollLeft
		track.dispatchEvent(
			new WheelEvent('wheel', { deltaY: 120, deltaX: 0, bubbles: true, cancelable: true }),
		)
		await waitFor(async () => {
			await expect(track.scrollLeft).toBeGreaterThan(before)
		})
	}}
>
	<div style="max-width:420px;">
		<HScroller content={chips} contentWidth={CONTENT_WIDTH} ariaLabel="Wheel forwarding demo" />
	</div>
</Story>

<!-- contentWidth omitted: HScroller must fall back to measuring trackEl.scrollWidth
     itself — proven here by canRight (and therefore the right arrow) still coming
     out correctly without the prop. -->
<Story
	name="Measured width fallback (no contentWidth)"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.hs-arrow.next')).not.toBeNull()
		})
	}}
>
	<div style="max-width:420px;">
		<HScroller content={chips} ariaLabel="No contentWidth demo" />
	</div>
</Story>

{#snippet emptyContent()}
	<div style="padding:0.5rem;">(nothing to scroll)</div>
{/snippet}

<!-- Empty content: canLeft/canRight must both come out false (0-width content),
     so no arrows/fades render — this is the actual shape the "recent searches"
     backlog consumer starts from before any history exists. -->
<Story
	name="Empty content"
	asChild
	play={async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('.hs-arrow')).toBeNull()
		await expect(canvasElement.querySelector('.hs-fade.show')).toBeNull()
	}}
>
	<div style="max-width:420px;">
		<HScroller content={emptyContent} contentWidth={0} ariaLabel="Empty demo" />
	</div>
</Story>

<!-- scrollKey persistence: scroll, unmount, remount — scrollLeft must be restored
     from the shared scrollMemory store, not reset to 0. -->
<Story
	name="scrollKey persistence"
	asChild
	play={async ({ canvasElement }) => {
		let track = canvasElement.querySelector<HTMLElement>('.hs-track')
		await expect(track).not.toBeNull()
		if (!track) return
		track.scrollLeft = 200
		// setting scrollLeft doesn't synchronously fire the native 'scroll' event
		// onscroll={readScroll} listens for — dispatch it explicitly so setScroll()
		// has actually persisted the value before we unmount (else the click below
		// can race ahead of the persist and the remount assertion sees a stale/empty
		// store entry, not a real restore-logic failure).
		track.dispatchEvent(new Event('scroll'))
		await expect(track.scrollLeft).toBeGreaterThan(150)

		const toggle = canvasElement.querySelector<HTMLButtonElement>(
			'[data-testid="scrollkey-toggle"]',
		)
		await expect(toggle).not.toBeNull()
		if (!toggle) return

		toggle.click() // unmount
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.hs-track')).toBeNull()
		})

		toggle.click() // remount
		await waitFor(async () => {
			track = canvasElement.querySelector<HTMLElement>('.hs-track')
			await expect(track).not.toBeNull()
			await expect(track!.scrollLeft).toBeGreaterThan(150)
		})
	}}
>
	<div style="max-width:420px;">
		<button
			type="button"
			data-testid="scrollkey-toggle"
			onclick={() => (scrollKeyMounted = !scrollKeyMounted)}
		>
			toggle mount
		</button>
		{#if scrollKeyMounted}
			<HScroller
				content={chips}
				contentWidth={CONTENT_WIDTH}
				scrollKey="hscroller-story:demo"
				ariaLabel="scrollKey demo"
			/>
		{/if}
	</div>
</Story>

<!--
  Regression test for two real bugs an independent review panel caught, both in
  default (non-ariaHidden) mode:
  1. A keyboard-focused paging arrow used to unmount ITSELF once scrolling
     reached the end (canRight flips false), which per the HTML spec drops
     focus to <body> — losing the keyboard user's place, and inside a
     focus-trapped dialog, potentially letting native Tab escape the trap.
     Fixed by keeping a focused arrow mounted until it naturally loses focus.
  2. The first fix's own CSS (`opacity:0` on the now-inactive arrow) ALSO hid
     its :focus-visible outline — DOM focus was preserved but became
     INVISIBLE, itself a WCAG 2.4.7 failure. Fixed by restoring visibility +
     interactivity specifically on :focus-visible.
  This test asserts focus lands on (not merely "not <body>") AND is visibly
  indicated on the specific arrow — either regressing fails it.
-->
<Story
	name="Focus preserved at scroll end"
	asChild
	play={async ({ canvasElement }) => {
		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		await expect(track).not.toBeNull()
		if (!track) return

		// jump to just short of the end so a single Enter reaches it
		track.scrollLeft = track.scrollWidth - track.clientWidth - 40
		let rightArrow: HTMLElement | null = null
		await waitFor(async () => {
			rightArrow = canvasElement.querySelector<HTMLElement>('.hs-arrow.next')
			await expect(rightArrow).not.toBeNull()
		})
		rightArrow!.focus()
		await expect(document.activeElement).toBe(rightArrow)

		await userEvent.keyboard('{Enter}')
		await waitFor(async () => {
			// bug 1: focus silently falling to <body>
			await expect(document.activeElement).toBe(rightArrow)
		})

		// Wait for the arrow to actually REACH its inactive state (the smooth-scroll
		// animation hasn't necessarily settled the instant Enter is pressed) — an
		// earlier version of this test checked opacity immediately after Enter and
		// passed even with the CSS fix below deliberately disabled, because at that
		// point the arrow was often still in its normal, always-opaque active state
		// and the assertion never actually exercised the regressed state. Waiting
		// for the class itself, not a scrollLeft threshold, ties the wait directly
		// to the state under test.
		await waitFor(async () => {
			await expect(rightArrow!.classList.contains('kit-nav-arrow-inactive')).toBe(true)
		})
		// bug 2: focus preserved but invisible (opacity:0 hiding the focus ring) —
		// check both that the element isn't transparent AND that the outline itself
		// is actually rendered (opacity alone wouldn't catch e.g. an errant
		// `outline: none` on the :focus-visible override).
		await expect(getComputedStyle(rightArrow!).opacity).not.toBe('0')
		await expect(getComputedStyle(rightArrow!).outlineStyle).toBe('solid')

		// cleanup path: moving focus away naturally must unmount the
		// now-inactive arrow again (the mount guard's OTHER half — `rightFocused`
		// must correctly flip back to false on blur).
		track!.focus()
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.hs-arrow.next')).toBeNull()
		})
	}}
>
	<div style="max-width:420px;">
		<HScroller content={chips} contentWidth={CONTENT_WIDTH} ariaLabel="Focus regression demo" />
	</div>
</Story>

<!-- Symmetric left-arrow/ArrowLeft coverage — same code paths as the two
     stories above (Keyboard paging, Focus preserved at scroll end) but
     structurally distinct branches (leftFocused vs rightFocused, canLeft vs
     canRight), so a one-sided fix to only the right side wouldn't be caught
     without this. -->
<Story
	name="Focus preserved at scroll start (left arrow)"
	asChild
	play={async ({ canvasElement }) => {
		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		await expect(track).not.toBeNull()
		if (!track) return

		// start scrolled near (not at) the left edge so a single Enter reaches it
		track.scrollLeft = 40
		track.dispatchEvent(new Event('scroll'))
		let leftArrow: HTMLElement | null = null
		await waitFor(async () => {
			leftArrow = canvasElement.querySelector<HTMLElement>('.hs-arrow.prev')
			await expect(leftArrow).not.toBeNull()
		})
		leftArrow!.focus()
		await expect(document.activeElement).toBe(leftArrow)

		await userEvent.keyboard('{Enter}')
		await waitFor(async () => {
			await expect(document.activeElement).toBe(leftArrow)
		})
		// see the right-arrow story above for why this waits on the class itself
		await waitFor(async () => {
			await expect(leftArrow!.classList.contains('kit-nav-arrow-inactive')).toBe(true)
		})
		await expect(getComputedStyle(leftArrow!).opacity).not.toBe('0')
		await expect(getComputedStyle(leftArrow!).outlineStyle).toBe('solid')
	}}
>
	<div style="max-width:420px;">
		<HScroller
			content={chips}
			contentWidth={CONTENT_WIDTH}
			ariaLabel="Left focus regression demo"
		/>
	</div>
</Story>

<!-- Wheel-over-arrow forwarding (fwdWheel) — distinct code path from
     "Wheel forwarding" above, which dispatches on the track itself
     (onTrackWheel). The overlaid arrow is a wheel dead zone without this. -->
<Story
	name="Wheel over arrow forwards to track"
	asChild
	play={async ({ canvasElement }) => {
		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		const rightArrow = canvasElement.querySelector<HTMLElement>('.hs-arrow.next')
		await expect(track).not.toBeNull()
		await expect(rightArrow).not.toBeNull()
		if (!track || !rightArrow) return

		const before = track.scrollLeft
		rightArrow.dispatchEvent(
			new WheelEvent('wheel', { deltaY: 60, deltaX: 0, bubbles: true, cancelable: true }),
		)
		await waitFor(async () => {
			await expect(track.scrollLeft).toBeGreaterThan(before)
		})
	}}
>
	<div style="max-width:420px;">
		<HScroller content={chips} contentWidth={CONTENT_WIDTH} ariaLabel="Wheel-over-arrow demo" />
	</div>
</Story>

<!-- ariaHidden contract (rule 9 deviation, documented in hscroller.md): root is
     aria-hidden, arrows are non-focusable and don't move focus on click, and
     no keyboard handler is attached — this is the filmstrip's actual mode in
     production, and was the only story with zero play() coverage. -->
<Story
	name="ariaHidden contract"
	asChild
	play={async ({ canvasElement }) => {
		const wrap = canvasElement.querySelector<HTMLElement>('.hs-wrap')
		await expect(wrap).not.toBeNull()
		await expect(wrap!.getAttribute('aria-hidden')).toBe('true')

		const track = canvasElement.querySelector<HTMLElement>('.hs-track')
		await expect(track).not.toBeNull()
		await expect(track!.getAttribute('tabindex')).toBe('-1')

		const rightArrow = canvasElement.querySelector<HTMLElement>('.hs-arrow.next')
		await expect(rightArrow).not.toBeNull()
		await expect(rightArrow!.getAttribute('tabindex')).toBe('-1')

		// a click still scrolls (pointer-only enhancement)...
		const before = track!.scrollLeft
		rightArrow!.click()
		await waitFor(async () => {
			await expect(track!.scrollLeft).toBeGreaterThan(before)
		})
		// ...but never moves focus into the hidden subtree (axe aria-hidden-focus).
		await expect(document.activeElement).not.toBe(rightArrow)
		await expect(document.activeElement).not.toBe(track)
	}}
>
	<div style="max-width:420px;">
		<HScroller content={chipsNonFocusable} contentWidth={CONTENT_WIDTH} ariaHidden />
	</div>
</Story>
