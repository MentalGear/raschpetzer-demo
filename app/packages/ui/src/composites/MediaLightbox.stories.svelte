<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, waitFor } from 'storybook/test'
	import MediaLightbox from './MediaLightbox.svelte'
	import type { MediaLightboxSlideContext } from './MediaLightbox.svelte'

	// Domain-free demo content — the viewer is bring-your-own-media, so a story
	// only needs plain colored slides, not a real image format.
	interface DemoSlide {
		id: number
		color: string
	}
	const demoSlides: DemoSlide[] = Array.from({ length: 4 }, (_, i) => ({
		id: i,
		color: `hsl(${(i * 63) % 360} 70% 55%)`,
	}))

	const { Story } = defineMeta({
		title: 'Composites/MediaLightbox',
		component: MediaLightbox,
		tags: ['autodocs'],
		parameters: {
			// Demo slide fills are arbitrary synthetic color blocks, not the
			// composite's own chrome — same exclusion idiom VirtualGrid/HScroller use
			// for their own demo tiles/chips.
			a11y: { context: { exclude: [['.demo-slide']] } },
		},
	})
</script>

<script lang="ts">
	let navIndex = $state(0)
	let navOpen = $state(true)

	let navArrowIndex = $state(0)
	let navArrowOpen = $state(true)

	let zoomIndex = $state(0)
	let zoomOpen = $state(true)

	let infoIndex = $state(0)
	let infoOpen = $state(true)

	let focusIndex = $state(0)
	let focusOpen = $state(true)

	let flyFallbackIndex = $state(0)
	let flyFallbackOpen = $state(true)

	let flyNoRectIndex = $state(0)
	let flyNoRectOpen = $state(true)

	let loadingIndex = $state(0)
	let loadingOpen = $state(true)
	let loadingLoading = $state(true)

	let loadingFlyIndex = $state(0)
	let loadingFlyOpen = $state(true)

	let crossFadeIndex = $state(0)
	let crossFadeOpen = $state(true)

	let richIndex = $state(0)
	let richOpen = $state(true)
</script>

<!-- A real (if tiny) <img> — unlike the plain-div `slide` snippet below, the
     fly-fallback story needs `img.naturalWidth` to actually resolve so it
     specifically exercises the `flyRect`-never-resolves path, not the
     separate "no <img> at all" one `waitForImageReady` also falls back on. -->
{#snippet flySlide(_item: DemoSlide, ctx: MediaLightboxSlideContext)}
	<img
		src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'/%3E"
		alt=""
		style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain;"
		class:media-lightbox-loading={ctx.loading}
		style:transform={ctx.transform}
	/>
{/snippet}

{#snippet crossFadeSlide(_item: DemoSlide, ctx: MediaLightboxSlideContext)}
	<!-- Mimics Photos' `Lightbox.svelte` slide snippet: two `<img>`s coexist at
	     once (a manual cross-fade), one already-sharp "outgoing" image plus the
	     "current" one that applies `class:media-lightbox-loading` off `ctx.loading`. Exists
	     to regression-guard the fix for a real BLOCKER (caught by an
	     independent-expert-review panel): an earlier version blurred via a
	     blanket `.stage :global(img)` selector, which blurred BOTH images
	     whenever `loading` was true — including the outgoing one, which had
	     nothing to do with the new item's load state. -->
	<img
		data-testid="outgoing-img"
		src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'/%3E"
		alt=""
		style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain;"
	/>
	<img
		data-testid="current-img"
		src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'/%3E"
		alt=""
		style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain;"
		class:media-lightbox-loading={ctx.loading}
		style:transform={ctx.transform}
	/>
{/snippet}

{#snippet slide(item: DemoSlide, ctx: MediaLightboxSlideContext)}
	<div
		class="demo-slide"
		data-testid="demo-slide"
		style="position:absolute; inset:0; background:{item.color};"
		style:transform={ctx.transform}
	>
		Slide {item.id + 1}
	</div>
{/snippet}

{#snippet info(item: DemoSlide)}
	<aside
		data-testid="demo-info"
		style="position:absolute; right:0; top:3.4rem; bottom:3.4rem; width:220px; background:rgba(20,20,22,0.95); padding:1rem; color:#fff;"
	>
		Info for slide {item.id + 1}
	</aside>
{/snippet}

{#snippet headerActions()}
	<button class="icon" data-testid="demo-favorite" aria-label="Favorite">♥</button>
{/snippet}

{#snippet filmstrip()}
	<div
		data-testid="demo-filmstrip"
		style="display:flex; gap:4px; padding:0.5rem 1rem; background:rgba(8,8,9,0.97);"
	>
		{#each demoSlides as s (s.id)}
			<button
				style="width:36px; height:36px; border:0; border-radius:4px; background:{s.color};"
				aria-label={`Slide ${s.id + 1}`}
				onclick={() => (richIndex = s.id)}
			></button>
		{/each}
	</div>
{/snippet}

<!-- Minimal usage: items + slide snippet + onIndex/onClose. -->
<Story name="Default" asChild>
	<MediaLightbox
		items={demoSlides}
		index={navIndex}
		open={navOpen}
		alt={`Demo slide ${navIndex + 1} of ${demoSlides.length}`}
		title="Demo viewer"
		onClose={() => (navOpen = false)}
		onIndex={(i) => (navIndex = i)}
		{slide}
	/>
	{#if !navOpen}
		<button onclick={() => (navOpen = true)}>Reopen</button>
	{/if}
</Story>

<!-- Keyboard nav (rule 10): ArrowRight advances the controlled index (reflected
     in the polite live region), Escape closes (the interactive chrome unmounts
     immediately even though the close animation itself keeps playing). -->
<Story
	name="Keyboard navigate and close"
	asChild
	play={async ({ canvasElement }) => {
		const overlay = canvasElement.querySelector<HTMLElement>('.overlay')
		await expect(overlay).not.toBeNull()

		// autofocus lands on the dialog container itself once the viewer opens
		// (not an actionable button — see MediaLightbox.svelte's own comment on
		// why, 2026-07-19)
		await waitFor(async () => {
			await expect(document.activeElement?.classList.contains('overlay')).toBe(true)
		})

		const liveRegion = canvasElement.querySelector('.sr-live')
		await expect(liveRegion?.textContent).toContain('1 of')

		await userEvent.keyboard('{ArrowRight}')
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.sr-live')?.textContent).toContain('2 of')
		})

		await userEvent.keyboard('{Escape}')
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.overlay')).toBeNull()
		})
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={navIndex}
		open={navOpen}
		alt={`Demo slide ${navIndex + 1} of ${demoSlides.length}`}
		onClose={() => (navOpen = false)}
		onIndex={(i) => (navIndex = i)}
		closeAnimation="fade"
		{slide}
	/>
</Story>

<!-- NavArrow click paging (rule 10): the shared prev/next NavArrow sub-component
     is absent at each boundary ({#if index > 0}/{#if index < items.length - 1}
     fully unmount it, rather than the disabled-but-focusable pattern HScroller
     uses for ITS OWN boundary arrows), clicking `.media-lightbox-nav.next` advances the
     controlled index, and a keyboard Escape still closes afterward — covering
     the DOM shape (`kit-nav-arrow`, `prev`/`next`, `media-lightbox-nav`) NavArrow actually
     renders, which nothing else in this file exercises directly (ArrowRight/
     ArrowLeft above only exercise the window-level keydown handler, never the
     button/NavArrow itself). -->
<Story
	name="Nav arrow click paging"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.overlay')).not.toBeNull()
		})

		// first slide: no prev arrow, next arrow present
		await expect(canvasElement.querySelector('.media-lightbox-nav.prev')).toBeNull()
		const next = canvasElement.querySelector<HTMLButtonElement>('.media-lightbox-nav.next')
		await expect(next).not.toBeNull()

		await userEvent.click(next!)
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.sr-live')?.textContent).toContain('2 of')
		})
		// no longer the first slide: prev arrow now present too
		await expect(canvasElement.querySelector('.media-lightbox-nav.prev')).not.toBeNull()

		// advance to the last slide: next arrow disappears at the boundary
		for (let i = 0; i < demoSlides.length - 2; i++) {
			await userEvent.click(
				canvasElement.querySelector<HTMLButtonElement>('.media-lightbox-nav.next')!,
			)
		}
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.media-lightbox-nav.next')).toBeNull()
		})

		await userEvent.keyboard('{Escape}')
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.overlay')).toBeNull()
		})
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={navArrowIndex}
		open={navArrowOpen}
		alt={`Demo slide ${navArrowIndex + 1} of ${demoSlides.length}`}
		onClose={() => (navArrowOpen = false)}
		onIndex={(i) => (navArrowIndex = i)}
		openAnimation="fade"
		closeAnimation="fade"
		{slide}
	/>
</Story>

<!-- Keyboard zoom controls: '+' zooms in (assertive live region announces it and
     the zoom badge appears), '0' resets. -->
<Story
	name="Zoom keyboard controls"
	asChild
	play={async ({ canvasElement }) => {
		const overlay = canvasElement.querySelector<HTMLElement>('.overlay')
		await expect(overlay).not.toBeNull()
		await waitFor(async () => {
			await expect(document.activeElement?.classList.contains('overlay')).toBe(true)
		})

		await expect(canvasElement.querySelector('.zoom-badge')).toBeNull()

		await userEvent.keyboard('{+}')
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.zoom-badge')).not.toBeNull()
		})
		const assertiveRegion = canvasElement.querySelector('[aria-live="assertive"]')
		await expect(assertiveRegion?.textContent).toContain('Zoomed')

		await userEvent.keyboard('0')
		await waitFor(async () => {
			await expect(canvasElement.querySelector('.zoom-badge')).toBeNull()
		})
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={zoomIndex}
		open={zoomOpen}
		alt={`Demo slide ${zoomIndex + 1} of ${demoSlides.length}`}
		onClose={() => (zoomOpen = false)}
		onIndex={(i) => (zoomIndex = i)}
		closeAnimation="fade"
		{slide}
	/>
</Story>

<!-- Optional info panel: the 'i' key and info button only appear/act when an
     `info` snippet is supplied — omit it and the affordance is fully absent. -->
<Story
	name="Info panel"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			await expect(document.activeElement?.classList.contains('overlay')).toBe(true)
		})
		await expect(canvasElement.querySelector('[data-testid="demo-info"]')).toBeNull()

		await userEvent.keyboard('i')
		await waitFor(async () => {
			await expect(canvasElement.querySelector('[data-testid="demo-info"]')).not.toBeNull()
		})
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={infoIndex}
		open={infoOpen}
		alt={`Demo slide ${infoIndex + 1} of ${demoSlides.length}`}
		onClose={() => (infoOpen = false)}
		onIndex={(i) => (infoIndex = i)}
		closeAnimation="fade"
		{slide}
		{info}
	/>
</Story>

<!-- Focus mode (rule 10 + docs/kit/components/media-lightbox.md's "Focus mode"): the
     header icon toggles fading the header/filmstrip chrome so the stage fills the
     screen undistracted. Esc's FIRST stage exits focus mode without closing the
     viewer — only a second Esc (or backdrop/close-button) does that. -->
<Story
	name="Focus mode"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			await expect(document.activeElement?.classList.contains('overlay')).toBe(true)
		})

		const header = canvasElement.querySelector<HTMLElement>('header')
		await expect(header).not.toBeNull()
		// The header stays hidden until the open animation itself has settled
		// (`chromeReady`, see media-lightbox.md's "Open animation" — this story's
		// default 'scale' open takes `STAGE_SCALE_MS`, 240ms), so poll rather than
		// asserting immediately.
		await waitFor(async () => {
			await expect(getComputedStyle(header!).visibility).toBe('visible')
		})

		const focusButton = canvasElement.querySelector<HTMLButtonElement>(
			'[aria-label="Focus mode"]',
		)
		await expect(focusButton).not.toBeNull()
		await expect(focusButton).toHaveAttribute('aria-pressed', 'false')

		await userEvent.click(focusButton!)
		await waitFor(async () => {
			await expect(getComputedStyle(header!).visibility).toBe('hidden')
		})
		await expect(focusButton).toHaveAttribute('aria-pressed', 'true')

		// Esc's first stage exits focus mode — the viewer itself stays open.
		await userEvent.keyboard('{Escape}')
		await waitFor(async () => {
			await expect(getComputedStyle(header!).visibility).toBe('visible')
		})
		await expect(canvasElement.querySelector('.overlay')).not.toBeNull()
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={focusIndex}
		open={focusOpen}
		alt={`Demo slide ${focusIndex + 1} of ${demoSlides.length}`}
		onClose={() => (focusOpen = false)}
		onIndex={(i) => (focusIndex = i)}
		closeAnimation="fade"
		{slide}
	/>
</Story>

<!-- Open animation fallback (docs/kit/components/media-lightbox.md's "Open
     animation"): `openAnimation="fly"` with a `flyRect` that never resolves
     falls back to the SAME scale-in look `openAnimation="scale"` uses —
     literally the same CSS class (`.stage.stage-scale-reveal`), not a
     separate copy — instead of leaving `.stage` invisible forever or popping
     it in with no animation at all. Fires after RECT_TIMEOUT_MS (500ms) —
     the `waitFor` below is given a longer timeout to comfortably clear that. -->
<Story
	name="Fly falls back to scale when flyRect never resolves"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			await expect(document.activeElement?.classList.contains('overlay')).toBe(true)
		})
		await waitFor(
			async () => {
				const stage = canvasElement.querySelector('.stage')
				await expect(stage?.classList.contains('stage-scale-reveal')).toBe(true)
			},
			{ timeout: 2000 },
		)
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={flyFallbackIndex}
		open={flyFallbackOpen}
		alt={`Demo slide ${flyFallbackIndex + 1} of ${demoSlides.length}`}
		onClose={() => (flyFallbackOpen = false)}
		onIndex={(i) => (flyFallbackIndex = i)}
		closeAnimation="fade"
		openAnimation="fly"
		flyRect={() => new Promise(() => {})}
		slide={flySlide}
	/>
</Story>

<!-- Same fallback look, different (and SYNCHRONOUS) trigger: `openAnimation="fly"`
     with NO `flyRect` at all is known to have nothing to fly from at mount
     time, so it falls back to `.stage.stage-scale-reveal` immediately, not
     after any timeout — a distinct code path from the async one above (this
     one, unlike that one, regressed once already: an earlier refactor made
     `stageIntro` stop distinguishing it, and it silently popped in with zero
     animation until this story caught it). -->
<Story
	name="Fly with no flyRect at all falls back to scale immediately"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			await expect(document.activeElement?.classList.contains('overlay')).toBe(true)
		})
		const stage = canvasElement.querySelector('.stage')
		await expect(stage?.classList.contains('stage-scale-reveal')).toBe(true)
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={flyNoRectIndex}
		open={flyNoRectOpen}
		alt={`Demo slide ${flyNoRectIndex + 1} of ${demoSlides.length}`}
		onClose={() => (flyNoRectOpen = false)}
		onIndex={(i) => (flyNoRectIndex = i)}
		closeAnimation="fade"
		openAnimation="fly"
		{slide}
	/>
</Story>

<!-- `loading` (docs/kit/components/media-lightbox.md's "Open animation" /
     progressive blur-up): the composite owns WHEN to blur — a consumer just
     flips this prop, and the composite mirrors it as `ctx.loading` for the
     `slide` snippet to apply (here, `flySlide` sets `class:media-lightbox-loading`).
     The consumer never separately coordinates an `onOpenSettled` callback to
     avoid deblurring mid-animation (an earlier version needed that; it's
     gone, see `loading`'s own doc comment for why). Starts `loading=true`
     (blurred), a button flips it false (deblurs, with the CSS filter
     transition already on `.stage :global(img)`'s base rule). Reuses
     `flySlide` (a real `<img>`) rather than `slide` (a plain colored div
     with no `<img>` at all) since this story needs one to check
     `getComputedStyle(...).filter` against. -->
<Story
	name="loading prop blurs and deblurs the stage image"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			const img = canvasElement.querySelector<HTMLElement>('.stage img') as HTMLElement
			await expect(img).not.toBeNull()
			await expect(getComputedStyle(img).filter).toContain('blur')
		})
		const button = canvasElement.querySelector<HTMLButtonElement>(
			'[data-testid="finish-loading"]',
		)
		await userEvent.click(button!)
		// A longer timeout than `waitFor`'s 1000ms default: `loading` flipping false
		// doesn't deblur immediately — `heldLoading` (script) holds the blur for a
		// MINIMUM `MIN_LOADING_HOLD_MS` (aliased to `DEBLUR_MS`, 500ms) from when it
		// first became true, so the deblur transition always gets a genuine window to
		// animate instead of popping on/off too fast to see (reported live,
		// 2026-07-19: "can't we wait for it?"). Worst case here is hold (500ms) +
		// the deblur fade itself (500ms) ≈ 1000ms before the filter genuinely
		// settles to unblurred — right at `waitFor`'s own default timeout, so it
		// needs real headroom rather than tightening the assertion.
		await waitFor(
			async () => {
				const img = canvasElement.querySelector<HTMLElement>('.stage img') as HTMLElement
				await expect(getComputedStyle(img).filter).not.toContain('blur')
			},
			{ timeout: 2000 },
		)
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={loadingIndex}
		open={loadingOpen}
		alt={`Demo slide ${loadingIndex + 1} of ${demoSlides.length}`}
		onClose={() => (loadingOpen = false)}
		onIndex={(i) => (loadingIndex = i)}
		closeAnimation="fade"
		loading={loadingLoading}
		slide={flySlide}
	/>
	<button
		data-testid="finish-loading"
		onclick={() => (loadingLoading = false)}
		disabled={!loadingLoading}
	>
		Finish loading
	</button>
</Story>

<!-- The 'fly' open animation's clone (`.opening-fly-clip`) is unconditionally
     blurred for its ENTIRE flight, regardless of `loading` — it only ever
     shows the placeholder (see "always the placeholder on open" in
     media-lightbox.md), so there's no "is the real content ready" question
     to ask for it. This is the capability that made the old `onOpenSettled`
     coordination unnecessary: the only thing visible during the fly is this
     permanently-blurred clone, so `.stage`'s own real img (invisible
     throughout, see `stage-fly-pending`) can safely just reflect `loading`
     directly once revealed, with no risk of a premature sharp pop. -->
<Story
	name="opening-fly clone is always blurred while flying"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			const clone = canvasElement.querySelector<HTMLElement>('.opening-fly-clip')
			await expect(clone).not.toBeNull()
			await expect(getComputedStyle(clone!).filter).toContain('blur')
		})
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={loadingFlyIndex}
		open={loadingFlyOpen}
		alt={`Demo slide ${loadingFlyIndex + 1} of ${demoSlides.length}`}
		onClose={() => (loadingFlyOpen = false)}
		onIndex={(i) => (loadingFlyIndex = i)}
		closeAnimation="fade"
		openAnimation="fly"
		flyRect={() => ({ left: 20, top: 20, width: 40, height: 30 })}
		loading={false}
		slide={flySlide}
	/>
</Story>

<!-- `loading` is scoped to whichever element the `slide` snippet applies
     `class:media-lightbox-loading` to (via `ctx.loading`) — not every `<img>` under
     `.stage`. `crossFadeSlide` renders two `<img>`s at once (mimicking
     Photos' real cross-fade): only the one carrying `class:media-lightbox-loading`
     should ever blur. Regression guard for the BLOCKER described above
     `crossFadeSlide`'s own definition. -->
<Story
	name="loading only blurs the slide-scoped image, not every img under stage"
	asChild
	play={async ({ canvasElement }) => {
		await waitFor(async () => {
			const current = canvasElement.querySelector<HTMLElement>(
				'[data-testid="current-img"]',
			) as HTMLElement
			const outgoing = canvasElement.querySelector<HTMLElement>(
				'[data-testid="outgoing-img"]',
			) as HTMLElement
			await expect(current).not.toBeNull()
			await expect(outgoing).not.toBeNull()
			await expect(getComputedStyle(current).filter).toContain('blur')
			await expect(getComputedStyle(outgoing).filter).not.toContain('blur')
		})
	}}
>
	<MediaLightbox
		items={demoSlides}
		index={crossFadeIndex}
		open={crossFadeOpen}
		alt={`Demo slide ${crossFadeIndex + 1} of ${demoSlides.length}`}
		onClose={() => (crossFadeOpen = false)}
		onIndex={(i) => (crossFadeIndex = i)}
		closeAnimation="fade"
		loading={true}
		slide={crossFadeSlide}
	/>
</Story>

<!-- Full composition: headerActions (extra button) + filmstrip snippet, showing
     the seams a domain wrapper (e.g. Photos' Lightbox) hangs its own chrome off. -->
<Story name="With headerActions and filmstrip" asChild>
	<MediaLightbox
		items={demoSlides}
		index={richIndex}
		open={richOpen}
		alt={`Demo slide ${richIndex + 1} of ${demoSlides.length}`}
		title="Rich demo"
		onClose={() => (richOpen = false)}
		onIndex={(i) => (richIndex = i)}
		closeAnimation="fade"
		{slide}
		{info}
		{headerActions}
		{filmstrip}
	/>
</Story>
