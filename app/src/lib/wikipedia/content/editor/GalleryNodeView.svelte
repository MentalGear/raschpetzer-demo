<script lang="ts">
	/**
	 * Unified gallery render for BOTH reading and editing (2026-07-19 direction change — see
	 * `docs/backlog.md`'s "Read mode as a live, inactive TipTap Editor" entry). The inline
	 * render is ALWAYS the rich read-mode slider — ported from the retired `GalleryReader.svelte`,
	 * same `HScroller`+`MediaLightbox` shape — identical whether the containing `Editor` is
	 * read-only (`ArticleTipTapReader.svelte`) or editable (`ArticleEditor.svelte`). While
	 * editable, a hover-revealed pencil icon overlay (deliberately NOT an always-visible button —
	 * avoids a layout shift in the flow, per explicit direction) opens a modal `Dialog` with the
	 * alt/caption/credit + add placeholder editing UI that used to be this NodeView's own inline
	 * render — moved into the dialog wholesale, its internal logic unchanged, not rebuilt.
	 * Reorder AND remove moved back OUT of the modal (2026-07-19, later round) onto an ALWAYS-
	 * visible left arrow / remove / right arrow row SPREAD across the top of each inline card
	 * itself (own floating chrome per button, not grouped into one tight pill — three adjacent
	 * `touch-target`-bumped 44px hit areas would overlap under a real touch, defeating the point
	 * of bumping them) — deliberately not hover-revealed like the pencil icon, since these need to
	 * be discoverable without a hover gesture (touch included). Both are spatial/whole-item
	 * operations on the gallery you're already looking at, not a per-item metadata edit like
	 * alt/caption/credit, so neither belongs behind a modal the way that editing does. Remove
	 * (destructive, no undo) routes through a shared `AlertDialog` confirm regardless of which of
	 * the two entry points — the inline toolbar, or the modal, which keeps its own remove button
	 * too for whoever's already in there editing captions — triggered it.
	 *
	 * `editable` is read ONCE at construction (`galleryNodeView.svelte.ts`), not tracked live:
	 * this app mounts a SEPARATE `Editor` instance for reading vs. editing (`ArticleTipTapReader`
	 * vs. `ArticleEditor`), so `editable` is fixed for a given instance's whole lifetime — no
	 * reactive re-evaluation needed (unlike a hypothetical single instance toggling `editable`).
	 *
	 * The LEAD gallery (doc position 0) is unchanged from before: still a genuinely empty,
	 * zero-height placeholder in BOTH modes — the reader already shows it via a separate inert
	 * `Figure` above the summary (`ArticleReader.svelte`), so a second box for the same image
	 * would be a visible duplicate (read mode) or a duplicate-with-nothing-to-do (edit mode,
	 * lead-figure editing deferred, ADR-001).
	 */
	import { tick } from 'svelte'
	import { SvelteSet } from 'svelte/reactivity'
	import { Input } from '@kit/ui/shadcn-components/ui/input'
	import { Label } from '@kit/ui/shadcn-components/ui/label'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import * as Dialog from '@kit/ui/shadcn-components/ui/dialog'
	import * as AlertDialog from '@kit/ui/shadcn-components/ui/alert-dialog'
	import { HScroller, MediaLightbox } from '@kit/ui'
	import type { MediaLightboxSlideContext } from '@kit/ui'
	import { ArrowLeft, ArrowRight, Trash2, Plus, Pencil } from '@lucide/svelte'
	import { cn } from '@kit/ui/shadcn-utils'
	import {
		toneClass,
		toneIndex,
		GALLERY_CARD_WIDTH,
		GALLERY_CARD_MAX_HEIGHT,
	} from '../../components/figureVisual'
	import { galleryPlaceholderSrc } from '../../components/galleryPlaceholder'
	import { normalizeGalleryItem, newPlaceholderItem, moveGalleryItem } from './galleryItems'
	import type { GalleryItem } from '../schema'

	/** The reactive bridge from the ProseMirror NodeView (see galleryNodeView.svelte.ts). */
	interface Controller {
		readonly uid: string
		readonly items: GalleryItem[]
		readonly isLead: boolean
		readonly editable: boolean
		onItems: (next: GalleryItem[]) => void
	}
	let { controller }: { controller: Controller } = $props()

	const items = $derived(controller.items)
	const isLead = $derived(controller.isLead)
	// `$derived`, not a plain `const controller.editable` read, purely to satisfy Svelte's
	// stale-reference lint — the VALUE is genuinely fixed for this instance's lifetime either
	// way (see file header), `controller` itself never gets a new reference post-mount.
	const editable = $derived(controller.editable)
	const uid = $derived(controller.uid)

	// ── read-mode-shaped slider (both modes) — ported from the retired GalleryReader.svelte ──
	type LightboxItem = {
		id: string
		alt: string
		caption?: string
		aspect: number
		tone: number
	}
	const lightboxItems: LightboxItem[] = $derived(
		items.map((it) => ({
			id: it.id,
			alt: it.alt,
			caption: it.caption,
			aspect: it.width && it.height ? it.width / it.height : 16 / 9,
			tone: toneIndex(it.id),
		})),
	)
	let lightboxOpen = $state(false)
	let lightboxIndex = $state(0)
	function openLightboxAt(i: number) {
		lightboxIndex = i
		lightboxOpen = true
	}

	// MediaLightbox takes a single reactive `alt`/`title` for the CURRENT item (not a
	// per-item callback) — recompute off `lightboxIndex`, same pattern Photos' own
	// Lightbox.svelte and the retired GalleryReader.svelte both use.
	const currentLightboxItem = $derived(lightboxItems[lightboxIndex])
	const lightboxAlt = $derived(
		currentLightboxItem
			? `Image ${lightboxIndex + 1} of ${lightboxItems.length}: ${currentLightboxItem.alt}`
			: '',
	)
	const lightboxTitle = $derived(currentLightboxItem?.caption ?? currentLightboxItem?.alt ?? '')

	// ── edit modal (editable instances only) ──────────────────────────────────────────────
	let dialogOpen = $state(false)

	// Root element — focus targeting after remove/add queries within it (see focusFkey). The
	// dialog's own content, NOT the inline slider wrapper below (a completely different, portaled
	// part of the DOM the dialog's content doesn't live in).
	let root = $state<HTMLElement | null>(null)
	// The inline card group's own root — focus targeting for the inline toolbar (`move`/
	// `removeItem`, below), which lives in the ProseMirror-rendered DOM directly, not the dialog.
	// A SEPARATE scope from `root`: both surfaces use the same `data-fkey` naming
	// (`left-${id}`/`right-${id}`/`rm-${id}`), so scoping each query to its own container is what
	// keeps a click in one from ever focusing an element in the other.
	let inlineRoot = $state<HTMLElement | null>(null)

	// Screen-reader announcement for the discrete actions (reorder/add/remove). Local $state on
	// the persistent component instance — survives the NodeView's `update()` (which only swaps
	// `controller.items`), so the message isn't clobbered by a re-render.
	let announced = $state('')

	// Items whose alt was cleared and rejected (see setField). Drives aria-invalid + the error text.
	const invalidAlt = new SvelteSet<string>()

	function dispatch(next: GalleryItem[]) {
		controller.onItems(next)
	}

	function setField(id: string, key: 'alt' | 'caption' | 'source', raw: string) {
		const value = raw.trim()
		if (key === 'alt' && !value) {
			invalidAlt.add(id)
			announced = 'Alt text is required for accessibility.'
			return
		}
		if (key === 'alt') invalidAlt.delete(id)
		dispatch(
			items.map((it) => (it.id === id ? normalizeGalleryItem({ ...it, [key]: value }) : it)),
		)
	}

	async function focusFkey(scope: HTMLElement | null, key: string, fallbackKey?: string) {
		await tick()
		const q = (k: string) => scope?.querySelector<HTMLElement>(`[data-fkey="${k}"]`)
		const el = q(key)
		if (el && !(el as HTMLButtonElement).disabled) {
			el.focus()
			return
		}
		if (fallbackKey) q(fallbackKey)?.focus()
	}

	// Reordering lives on the INLINE cards now (always-visible left/right arrows), not the modal
	// — see the file's own doc comment. Always scoped to `inlineRoot`.
	async function move(id: string, dir: -1 | 1) {
		const next = moveGalleryItem(items, id, dir)
		if (next === items) return
		const j = next.findIndex((i) => i.id === id)
		dispatch(next)
		announced = `Moved image to position ${j + 1} of ${next.length}.`
		const same = dir === -1 ? 'left' : 'right'
		const other = dir === -1 ? 'right' : 'left'
		await focusFkey(inlineRoot, `${same}-${id}`, `${other}-${id}`)
	}

	async function addItem() {
		const item = newPlaceholderItem(`gallery-item-${crypto.randomUUID()}`)
		const total = items.length + 1
		dispatch([...items, item])
		announced = `Added a placeholder image. ${total} total.`
		await focusFkey(root, `alt-${item.id}`)
	}

	// Remove is reachable from BOTH the inline toolbar and the modal now (2026-07-19, later
	// round) — same `rm-${id}` fkey naming in both places, so (like `move`) this takes an
	// explicit scope + a scope-appropriate fallback: the modal falls back to its "Add image"
	// button; the inline toolbar has no such button, so it falls back to the gallery's own
	// "Edit gallery" pencil icon (`edit-gallery`) — the nearest still-meaningful focus target
	// once a card's own neighbors are gone too (removing the gallery's last item).
	async function removeItem(scope: HTMLElement | null, id: string, fallback: string) {
		const idx = items.findIndex((i) => i.id === id)
		const removed = items[idx]
		const next = items.filter((it) => it.id !== id)
		invalidAlt.delete(id)
		dispatch(next)
		announced = `Removed ${removed?.alt ?? 'an image'}. ${next.length} remaining.`
		const focusTo = next[idx] ?? next[idx - 1]
		await focusFkey(scope, focusTo ? `rm-${focusTo.id}` : fallback, fallback)
	}

	// Removing an image is destructive (no undo) and, since the inline toolbar puts it one tap
	// away — not buried behind opening the modal first — a stray tap now deletes real content
	// with no chance to back out. Both remove entry points (inline toolbar + modal) route through
	// this shared confirm instead of calling `removeItem` directly; the modal's own remove was
	// ALSO unconfirmed before this, so this closes that gap too, not just the new inline one.
	let pendingRemove = $state<{ scope: HTMLElement | null; id: string; fallback: string } | null>(
		null,
	)
	const pendingRemoveItem = $derived(
		pendingRemove ? (items.find((it) => it.id === pendingRemove!.id) ?? null) : null,
	)
	function requestRemove(scope: HTMLElement | null, id: string, fallback: string) {
		pendingRemove = { scope, id, fallback }
	}
	function confirmRemove() {
		if (!pendingRemove) return
		const { scope, id, fallback } = pendingRemove
		pendingRemove = null
		void removeItem(scope, id, fallback)
	}

	// Same focus/key-stealing guards as before — see the ORIGINAL file's (pre-2026-07-19) doc
	// comment for the full explanation; unchanged, only re-homed into the dialog's markup.
	function guardStripFocus(e: MouseEvent) {
		const target = e.target as HTMLElement | null
		if (!target?.closest('input, button, a, textarea, select')) {
			e.preventDefault()
		}
	}
	function guardFieldArrowKeys(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
		if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) {
			e.stopPropagation()
		}
	}
</script>

{#if isLead}
	<div data-gallery-editor data-gallery-lead hidden></div>
{:else}
	<div
		bind:this={inlineRoot}
		data-gallery-editor
		role="group"
		aria-label={`Gallery, ${items.length} image${items.length === 1 ? '' : 's'}`}
		class="group/gallery relative my-5"
	>
		<HScroller ariaLabel={`Gallery, ${items.length} image${items.length === 1 ? '' : 's'}`}>
			{#snippet content()}
				<div class="flex gap-4">
					{#each items as it, i (it.id)}
						{@const ratio = it.width && it.height ? it.width / it.height : 16 / 9}
						{@const hasCaption = Boolean(it.caption || it.source)}
						{@const captionId = `${uid}-figcaption-${it.id}`}
						<figure
							class="flex flex-col gap-2"
							style="flex: 1 1 {GALLERY_CARD_WIDTH}px; min-width: {GALLERY_CARD_WIDTH}px"
						>
							<!-- `relative` scoped to JUST the image (not the whole figure, which also
							     includes the caption below) — the arrows overlay positions itself
							     relative to THIS box, not the figure's total height including the
							     caption. The size constraints (aspect-ratio, the height cap, the
							     width-derived-from-the-cap formula — see GALLERY_CARD_MAX_HEIGHT's own
							     doc comment) live HERE, not on the button inside: this box is the
							     `position: relative` anchor the arrows overlay below positions
							     against (`inset-x-0`), so it has to be exactly the visible image's own
							     bounds — a portrait item capped narrower than the card would otherwise
							     leave the overlay spanning the full (uncapped) card width, stranding
							     the arrows off to the side of the actually-visible image. `mx-auto`
							     centers it within the figure once it's narrower than the card. -->
							<div
								class="relative mx-auto"
								style="aspect-ratio: {ratio}; max-height: {GALLERY_CARD_MAX_HEIGHT}; width: min(100%, calc({GALLERY_CARD_MAX_HEIGHT} * {ratio}))"
							>
								<button
									type="button"
									class={cn(
										'flex size-full items-center justify-center rounded-lg bg-gradient-to-br p-4 text-center',
										toneClass(it.id),
									)}
									aria-label={editable
										? `Edit image ${i + 1} of ${items.length}: ${it.alt}`
										: `Open image ${i + 1} of ${items.length}: ${it.alt}`}
									aria-describedby={hasCaption ? captionId : undefined}
									onclick={(e) => {
										// Editable: clicking ANY image opens the edit modal (not the
										// lightbox) — editing intent, not viewing intent, while editing.
										// Focus that item's alt field once the dialog's content mounts,
										// so the click target is where the click actually lands.
										if (editable) {
											dialogOpen = true
											void focusFkey(root, `alt-${it.id}`)
											return
										}
										// Safari doesn't focus a plain <button> on click the way Chromium/
										// Firefox do — explicit focus so MediaLightbox's `returnFocus`
										// reliably restores focus here on close (mirrors GalleryReader.svelte).
										e.currentTarget.focus()
										openLightboxAt(i)
									}}
								>
									<span class="text-sm text-foreground">{it.alt}</span>
								</button>
								{#if editable}
									<!-- ALWAYS-visible left arrow / remove / right arrow across the top of
									     the image (not hover-revealed — reorder/remove need to be
									     discoverable without a hover gesture, touch included) — SPREAD
									     across the card's width (`justify-between`, own floating chrome
									     per button), not grouped into one tight pill: three adjacent
									     `touch-target`-bumped (44px) hit areas packed a couple px apart
									     would overlap each other under a real coarse-pointer touch,
									     defeating the whole point of bumping the target size — verified by
									     the numbers (256px card ÷ 3 buttons via justify-between leaves
									     real separation between each; a tight pill's ~2px gaps do not).
									     Absolutely positioned overlay, same no-layout-shift treatment as
									     the gallery's own pencil icon below — adds no flow height
									     regardless of opacity. Each button styled after `HScroller`'s own
									     nav arrows (`bg-popover`/`ring-border`/`shadow-sm`) so this reads
									     as the same floating-arrow-control language as paging elsewhere in
									     the kit. Remove goes through `requestRemove` (a confirm step, not
									     immediate deletion — no undo, and this is now one tap away instead
									     of behind opening the modal first). The middle of the image stays
									     click-through to the edit-modal button underneath
									     (`pointer-events-none` on the wrapper, restored per-button). -->
									<div
										class="pointer-events-none absolute inset-x-0 top-1.5 flex justify-between px-1.5"
									>
										<Button
											variant="ghost"
											size="icon"
											class="pointer-events-auto size-7 touch-target rounded-full bg-popover text-popover-foreground shadow-sm ring-1 ring-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
											data-fkey={`left-${it.id}`}
											disabled={i === 0}
											aria-label={`Move image ${i + 1} left`}
											onclick={() => move(it.id, -1)}
										>
											<ArrowLeft class="size-4" aria-hidden="true" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="pointer-events-auto size-7 touch-target rounded-full bg-popover text-muted-foreground shadow-sm ring-1 ring-border hover:text-destructive! focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
											data-fkey={`rm-${it.id}`}
											aria-label={`Remove image ${i + 1}: ${it.alt}`}
											onclick={() =>
												requestRemove(inlineRoot, it.id, 'edit-gallery')}
										>
											<Trash2 class="size-4" aria-hidden="true" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="pointer-events-auto size-7 touch-target rounded-full bg-popover text-popover-foreground shadow-sm ring-1 ring-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
											data-fkey={`right-${it.id}`}
											disabled={i === items.length - 1}
											aria-label={`Move image ${i + 1} right`}
											onclick={() => move(it.id, 1)}
										>
											<ArrowRight class="size-4" aria-hidden="true" />
										</Button>
									</div>
								{/if}
							</div>
							{#if hasCaption}
								<figcaption
									id={captionId}
									class="text-muted-foreground"
									style="font-size: calc(0.875rem * var(--wiki-scale, 1))"
								>
									{it.caption}{#if it.source}
										{it.caption ? ' · ' : ''}<span class="italic"
											>{it.source}</span
										>{/if}
								</figcaption>
							{/if}
						</figure>
					{/each}
				</div>
			{/snippet}
		</HScroller>

		{#if editable}
			<!-- Hover-revealed only — not an always-visible button — so it never shifts the
			     gallery's layout (explicit direction, 2026-07-19). Faintly visible on touch
			     (no hover gesture there), same pattern as HeadingAnchor's own button. -->
			<button
				type="button"
				data-fkey="edit-gallery"
				onclick={() => (dialogOpen = true)}
				aria-label="Edit gallery"
				class={cn(
					'absolute top-2 right-2 rounded-md bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover/gallery:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring',
				)}
			>
				<Pencil class="size-4" aria-hidden="true" />
			</button>
		{/if}
	</div>

	{#snippet slide(item: LightboxItem, ctx: MediaLightboxSlideContext)}
		<!-- `data-testid="lightbox-img"` + a real `alt` on the `<img>` itself (not `alt=""`) —
		     matches Photos' own Lightbox.svelte's slide convention, both are consumer-level test
		     hooks/a11y text MediaLightbox itself has no way to supply (it doesn't own this
		     markup). No progressive loading here (a synchronous SVG placeholder generator has no
		     network latency to hide behind a blur-up), so `loading` is never set. `absolute
		     inset-0` (matching Photos' own `.img-stack` rule) — without it this wrapper collapses
		     to zero size, since its only child is the absolutely-positioned `<img>` MediaLightbox's
		     own `.stage :global(img)` CSS gives out-of-flow sizing (caught live: the div existed
		     in the DOM but Playwright's `toBeVisible()` read it as hidden). -->
		<div data-testid="lightbox-img" class="absolute inset-0">
			<img
				src={galleryPlaceholderSrc(item.tone, 1600, item.aspect)}
				alt={lightboxAlt}
				draggable="false"
				style:transform={ctx.transform}
			/>
		</div>
	{/snippet}

	<!-- Never `{#if lightboxOpen}`-gate this: MediaLightbox manages its own mount/unmount so its
	     close animation and `returnFocus` can run (its own "always mount" invariant). -->
	<MediaLightbox
		items={lightboxItems}
		index={lightboxIndex}
		open={lightboxOpen}
		alt={lightboxAlt}
		title={lightboxTitle}
		prevLabel="Previous image"
		nextLabel="Next image"
		onClose={() => (lightboxOpen = false)}
		onIndex={(i) => (lightboxIndex = i)}
		{slide}
	/>

	{#if editable}
		<Dialog.Root bind:open={dialogOpen}>
			<Dialog.Content class="sm:max-w-3xl">
				<Dialog.Header>
					<Dialog.Title>Edit gallery</Dialog.Title>
					<Dialog.Description
						>Edit captions and add placeholder images (reorder or remove images from the
						gallery itself). Real media upload isn't available yet.</Dialog.Description
					>
				</Dialog.Header>

				<!-- role="group": a group of gallery-editing controls (matches the pre-2026-07-19
				     inline version's own role on this same guarded wrapper). guardStripFocus/
				     guardFieldArrowKeys are unchanged from before — see their own doc comments;
				     both are defensive event-suppression guards, not real interactive semantics
				     for this div itself, which is why `role="group"` (non-interactive) is still
				     the semantically correct role despite carrying these two listeners.
				     bind:this={root}: focusFkey's querySelector scope — MUST be this div, not the
				     outer slider wrapper above (which sits in a completely different, non-portal
				     part of the DOM from this Dialog's content). -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					bind:this={root}
					role="group"
					aria-label="Gallery images"
					onkeydowncapture={guardFieldArrowKeys}
					onmousedown={guardStripFocus}
					class="max-h-[60vh] overflow-y-auto"
				>
					<p class="sr-only" role="status">{announced}</p>

					<HScroller
						ariaLabel={`Editing gallery, ${items.length} image${items.length === 1 ? '' : 's'}`}
					>
						{#snippet content()}
							<div class="flex gap-4 p-1">
								{#each items as it, i (it.id)}
									{@const altId = `${uid}-alt-${it.id}`}
									{@const capId = `${uid}-cap-${it.id}`}
									{@const credId = `${uid}-cred-${it.id}`}
									{@const errId = `${uid}-alterr-${it.id}`}
									{@const altInvalid = invalidAlt.has(it.id)}
									<div
										role="group"
										aria-label={`Image ${i + 1}`}
										class="flex flex-col gap-3 rounded-md border border-border bg-background p-3"
										style="flex: 1 1 {GALLERY_CARD_WIDTH}px; min-width: {GALLERY_CARD_WIDTH}px"
									>
										<div
											class={`flex min-h-24 w-full items-center justify-center rounded-lg bg-gradient-to-br p-3 text-center ${toneClass(it.id)}`}
										>
											<span class="text-sm text-foreground">{it.alt}</span>
										</div>

										<div class="flex flex-col gap-2">
											<div class="flex flex-col gap-1">
												<Label for={altId} class="text-xs"
													>Alt text (required)</Label
												>
												<Input
													id={altId}
													data-fkey={`alt-${it.id}`}
													value={it.alt}
													aria-required="true"
													aria-invalid={altInvalid}
													aria-describedby={altInvalid
														? errId
														: undefined}
													onchange={(e) =>
														setField(
															it.id,
															'alt',
															e.currentTarget.value,
														)}
												/>
												{#if altInvalid}
													<p id={errId} class="text-xs text-destructive">
														Alt text is required for accessibility.
													</p>
												{/if}
											</div>
											<div class="flex flex-col gap-1">
												<Label for={capId} class="text-xs">Caption</Label>
												<Input
													id={capId}
													value={it.caption ?? ''}
													onchange={(e) =>
														setField(
															it.id,
															'caption',
															e.currentTarget.value,
														)}
												/>
											</div>
											<div class="flex flex-col gap-1">
												<Label for={credId} class="text-xs">Credit</Label>
												<Input
													id={credId}
													value={it.source ?? ''}
													onchange={(e) =>
														setField(
															it.id,
															'source',
															e.currentTarget.value,
														)}
												/>
											</div>
										</div>

										<div class="flex justify-end">
											<Button
												variant="ghost"
												size="icon"
												class="size-8 text-muted-foreground hover:text-destructive"
												data-fkey={`rm-${it.id}`}
												aria-label={`Remove image ${i + 1}: ${it.alt}`}
												onclick={() => requestRemove(root, it.id, 'add')}
											>
												<Trash2 />
											</Button>
										</div>
									</div>
								{/each}

								<Button
									variant="outline"
									data-fkey="add"
									onclick={addItem}
									style="flex: 1 1 {GALLERY_CARD_WIDTH}px; min-width: {GALLERY_CARD_WIDTH}px"
									class="h-auto min-h-24 flex-col gap-2 border-dashed text-muted-foreground"
								>
									<Plus data-icon="inline-start" />
									Add image
								</Button>
							</div>
						{/snippet}
					</HScroller>
				</div>

				<div class="flex justify-end">
					<Button type="button" onclick={() => (dialogOpen = false)}>Done</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Shared remove confirmation — see `requestRemove`'s own doc comment: destructive, no undo,
	     one tap away from either entry point (inline toolbar or the modal). `AlertDialog`, not
	     `Dialog` (matches this app's other destructive-confirm, `ArticleReader.svelte`'s discard
	     guard) — the semantically correct primitive for "confirm before an irreversible action". -->
	{#if editable}
		<AlertDialog.Root
			open={pendingRemove !== null}
			onOpenChange={(o) => !o && (pendingRemove = null)}
		>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Remove this image?</AlertDialog.Title>
					<AlertDialog.Description>
						{pendingRemoveItem?.alt ?? 'This image'} will be removed from the gallery. This
						can't be undone.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Keep image</AlertDialog.Cancel>
					<AlertDialog.Action onclick={confirmRemove}>Remove</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	{/if}
{/if}
