<script module lang="ts">
	import type { Page } from '$lib/wikipedia/content/schema'

	/** Title serialized into `Page.title`. A blank/whitespace-only title box normalizes to
	 *  'Untitled' (never '') so a later body edit's `docToPage(prev)` can't throw on an empty
	 *  title and silently drop the edit (B.4 / B.3 point 5). The DOM is left genuinely empty,
	 *  so the CSS `:empty` placeholder still shows; only the serialized value is normalized. */
	export const UNTITLED = 'Untitled'
	export function titleForSave(raw: string): string {
		return raw.trim().length > 0 ? raw : UNTITLED
	}

	/** The "in brief" lead summary — plain text (no marks), same as how it's read here and
	 *  authored in fromArticle.ts — serialized to the single-paragraph `Page.summary` doc
	 *  shape `articleToPage` always produces. Unlike the title, an empty summary is allowed
	 *  to save as an empty paragraph (schema-legal — `content` has no min-length — and
	 *  `pageToArticle`'s `summaryText` just reads it back as `''`; no downstream throw to
	 *  guard against, so no placeholder substitution is needed here). */
	export function summaryDocForSave(raw: string): Page['summary'] {
		return {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: raw.length > 0 ? [{ type: 'text', text: raw }] : [] },
			],
		}
	}
</script>

<script lang="ts">
	/**
	 * The article reading view — and, inline, its editing surface. Reading assembles the
	 * research into one page: constrained measure with a width toggle + text-size control,
	 * a sticky scroll-spy ToC, a lead summary on-ramp, an infobox, the tiered body, a
	 * reference list, backlinks, a language switcher with a staleness signal, and
	 * provenance. Editing swaps the read surface for the single-surface `ArticleEditor`
	 * (B-lite), driven by the REAL `EditSession` + backend flow (stage → consensus gate →
	 * structural merge) via `wikiEdit` — no separate `/edit` page. Reading data comes from
	 * props/store; the edit session loads the canonical `Page` through the backend.
	 */
	import { tick, untrack, onDestroy } from 'svelte'
	import type { Editor } from '@tiptap/core'
	import type { Article } from '$lib/wikipedia/data/types'
	import { articleToc, editedLabel } from '$lib/wikipedia/data/types'
	import { REF_NOW } from '$lib/wikipedia/data/mock'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { memberStore, initials } from '$lib/wikipedia/state/memberStore.svelte'
	import { href } from '$lib/paths'
	import { cn } from '@kit/ui/shadcn-utils'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import { Separator } from '@kit/ui/shadcn-components/ui/separator'
	import * as Avatar from '@kit/ui/shadcn-components/ui/avatar'
	import {
		Check,
		TriangleAlert,
		AArrowUp,
		AArrowDown,
		UnfoldHorizontal,
		Pencil,
		Loader2,
	} from '@lucide/svelte'
	import ArticleTipTapReader from '../content/editor/ArticleTipTapReader.svelte'
	import FloatingEditBar from './FloatingEditBar.svelte'
	import EditActionBar from './EditActionBar.svelte'
	import Figure from './Figure.svelte'
	import TableOfContents from './TableOfContents.svelte'
	import QuickFacts from './QuickFacts.svelte'
	import RelatedArticles from './RelatedArticles.svelte'
	import InfoboxEditDialog from './InfoboxEditDialog.svelte'
	import * as AlertDialog from '@kit/ui/shadcn-components/ui/alert-dialog'
	// ArticleEditor.svelte itself is dynamically imported on first edit, but TipTap/ProseMirror
	// core is NOT part of that lazy chunk — the read surface (ArticleTipTapReader, imported
	// statically above) already loads it eagerly. The read-only-bundle-never-ships-TipTap
	// optimization (PRD §7) is deliberately given up as of the 2026-07-19 direction change (see
	// docs/backlog.md), not an oversight; verified via a real build (2026-07-19) that
	// ArticleEditor.svelte's own lazy chunk is ~3KB gzip, not the ~148KB TipTap chunk.
	import { wikiEdit, DISCARD_PROMPT } from '$lib/wikipedia/content/editStore.svelte'
	import { getBackend } from '$lib/wikipedia/content/backend'
	import { pageToArticle, summaryText } from '$lib/wikipedia/content/pageToArticle'
	import type { InfoboxField } from '$lib/wikipedia/content/schema'

	let { article }: { article: Article } = $props()

	// Bridge this article up to the global sidebar footer's language switcher — see
	// wikiStore.activeArticle's own doc comment. Cleared on unmount (or before the next
	// article's effect sets it, on a client-side navigation between two article pages) so a
	// closed reader never leaves a stale switcher target.
	$effect(() => {
		wikiStore.activeArticle = article
		return () => {
			if (wikiStore.activeArticle === article) wikiStore.activeArticle = null
		}
	})

	const toc = $derived(articleToc(article))
	const backlinks = $derived(wikiStore.backlinksFor(article.slug))
	const otherLocales = $derived(wikiStore.localesFor(article.slug))
	// Simple-Wikipedia-style cross-link (near the title, same weight as History/Translations
	// below): on the canonical article, a forward link to its simple variant if one exists;
	// on the simple variant itself, a reciprocal link back to the canonical article.
	const simpleVariant = $derived(wikiStore.simpleVariantOf(article))
	const canonicalOfSimple = $derived(wikiStore.canonicalOfSimple(article))

	let wide = $state(false)
	// `scale` is a MULTIPLIER (not a Tailwind class key): applied as the `--wiki-scale` CSS custom
	// property on a shared ancestor (below) so it reaches every scale-aware element via normal CSS
	// cascade — the article body, headings (ArticleBody.svelte), Quick Facts, and the ToC
	// (QuickFacts.svelte / TableOfContents.svelte) — via their own `calc(Nrem * var(--wiki-scale,
	// 1))`, not a class swap. A Tailwind text-* class sets an ABSOLUTE rem value a descendant can't
	// proportionally inherit-scale, which is why the previous 3-step `SCALE_CLS` map only ever
	// affected plain body text with no explicit size class of its own (never headings/panel text —
	// exactly the gap this replaces). 5 steps (sm..xxl); sm/base/lg match the original 3 sizes'
	// real Tailwind values (0.875/1/1.125rem) exactly, so the default and existing choices look
	// identical to before.
	const SIZES: { value: 'sm' | 'base' | 'lg' | 'xl' | 'xxl'; label: string; scale: number }[] = [
		{ value: 'sm', label: 'Small text', scale: 0.875 },
		{ value: 'base', label: 'Medium text', scale: 1 },
		{ value: 'lg', label: 'Large text', scale: 1.125 },
		{ value: 'xl', label: 'Extra-large text', scale: 1.25 },
		{ value: 'xxl', label: 'Largest text', scale: 1.375 },
	]
	// Reading preference, persisted across reloads (unlike `wide`, which stays session-only —
	// only the text scale was asked to be remembered). Guarded the same way
	// MediaLightboxFilmstrip.svelte's thumb-size persistence is (localStorage may be
	// unavailable/blocked; fall back to the in-memory default rather than throwing).
	const SCALE_STORAGE_KEY = 'wiki:text-scale'
	function readScale(): (typeof SIZES)[number]['value'] {
		if (typeof localStorage === 'undefined') return 'base'
		const v = localStorage.getItem(SCALE_STORAGE_KEY)
		return SIZES.some((s) => s.value === v) ? (v as (typeof SIZES)[number]['value']) : 'base'
	}
	let scale = $state<(typeof SIZES)[number]['value']>(readScale())
	const scaleMultiplier = $derived(SIZES.find((s) => s.value === scale)?.scale ?? 1)
	function setScale(next: (typeof SIZES)[number]['value']) {
		scale = next
		try {
			localStorage.setItem(SCALE_STORAGE_KEY, next)
		} catch {
			// localStorage may be blocked; the in-memory value still applies this session
		}
	}
	function stepScale(dir: -1 | 1) {
		const next = SIZES[SIZES.findIndex((s) => s.value === scale) + dir]
		if (next) setScale(next.value)
	}

	// ── edit gate (login, not role) ──────────────────────────────────────────────
	// Editing is gated on being LOGGED IN, not on a role: the product requirement is a
	// member-only Edit affordance. ANY logged-in member (ada/bao/cleo) sees Edit and can
	// author; a logged-out reader doesn't. Switching member mid-edit is NOT a capability
	// loss (everyone can edit), so there's no auto-exit — you simply keep editing as the
	// newly-selected member (the actor is re-read only when a fresh session opens). The
	// true editor-vs-reviewer capability model is deferred to the multi-role drive.
	const isLoggedIn = $derived(memberStore.currentMember != null)

	// ── inline edit session (single-surface, backend-driven) ────────────────────
	const isEditing = $derived(wikiEdit.editing && wikiEdit.slug === article.slug)
	const session = $derived(wikiEdit.session)
	const editPhase = $derived(session?.phase ?? 'loading')
	const editPage = $derived(session?.page ?? null)

	// sr-only announcement for the LOADING phase only. The terminal phases (error/notFound)
	// move focus to their heading, which announces itself — a live region there would just
	// double up; the ready phase hands off to the interactive surface + save-state region.
	const editStatus = $derived(isEditing && editPhase === 'loading' ? 'Loading the editor…' : '')
	// Move focus to the heading when the editor lands in a terminal non-ready phase (the
	// Edit button that had focus is gone by then); the ready phase focuses its title field.
	let phaseHeadingEl = $state<HTMLElement | null>(null)
	$effect(() => {
		if (isEditing && (editPhase === 'error' || editPhase === 'notFound'))
			phaseHeadingEl?.focus()
	})

	// The discard confirm serves two flows: closing this article's own draft ('close'),
	// and opening this article while a *different* one has unsaved edits ('switch').
	let confirmOpen = $state(false)
	let confirmKind = $state<'close' | 'switch'>('close')
	// Two Edit buttons exist in the DOM (the mobile/tablet toolbar row + the desktop right-panel
	// copy below) — only one is ever visually shown per viewport (`lg:hidden` / the aside's own
	// `hidden lg:block`), so each needs its own ref; closeEditor() below focuses whichever is
	// actually displayed.
	let editBtn = $state<HTMLElement | null>(null)
	let editBtnDesktop = $state<HTMLElement | null>(null)

	function openEditHere() {
		// Author the change as the CURRENT logged-in member (honest actor wiring — not
		// hardcoded): switching member before Edit changes who authors the staged change.
		// Edit is login-gated, so a member is always present here; fall back to the store's
		// default only as a type-safety belt.
		wikiEdit.open(article.slug, wikiStore.locale, memberStore.currentMember?.id)
	}
	function startEdit() {
		// Defense-in-depth against silently clobbering another article's unsaved draft.
		// (Navigating between articles is already guarded by the layout's `beforeNavigate`;
		// this covers any path that reaches Edit without an intervening navigation.)
		if (wikiEdit.wouldDiscardOther(article.slug)) {
			confirmKind = 'switch'
			confirmOpen = true
			return
		}
		openEditHere()
	}
	function onEdit(next: Page) {
		session?.edit(next)
	}

	// ── infobox (Quick facts) click-to-edit-modal ────────────────────────────────
	// Reading source is `article.infobox` always; editing source is the staged Page's
	// `infobox` (falls back to `article.infobox` only for a session whose Page predates
	// the field — not reachable via `articleToPage` today, see `pageToArticle.ts`).
	const infoboxFields = $derived(
		isEditing ? (editPage?.infobox ?? article.infobox) : article.infobox,
	)
	let infoboxDialogOpen = $state(false)
	function saveInfobox(fields: InfoboxField[]) {
		if (!editPage) return
		onEdit({ ...editPage, infobox: fields })
	}

	// ── in-place editable title (B) ──────────────────────────────────────────────
	// The title lives here (the reader's header), not in ArticleEditor: a contenteditable
	// element styled identically to the read <h1>. It only becomes editable once the session
	// is `ready` (before that there is no `editPage` to seed from — the static <h1> shows).
	// The live editor instance, handed up by ArticleEditor once constructed, so Enter in the
	// title can move focus into the body (B.6). `raw` — an opaque instance we only reassign.
	let editorInstance = $state.raw<Editor | null>(null)

	function seedTitle(node: HTMLElement) {
		// Seed textContent ONCE (untracked → never a reactive re-sync: rewriting a
		// contenteditable's text collapses the caret on every keystroke — B.3 point 4 / B.4).
		// No auto-focus here (previously B.6's "focus the title on entering edit mode", removed
		// 2026-07-20): on a coarse/touch pointer it popped the on-screen keyboard and scrolled the
		// page back to the top, neither asked for by the tap on "Edit" — and desktop shouldn't
		// auto-steal focus into a content field either, for the same reason (surprising the user
		// with an action they didn't take). The user focuses the title themselves when ready.
		node.textContent = untrack(() => editPage?.title ?? '')
	}
	function onTitleInput(e: Event) {
		const el = e.currentTarget as HTMLDivElement
		// B.3 point 3: a stray trailing <br> some browsers leave on select-all+delete defeats
		// the `:empty` placeholder selector — clear it so the DOM is genuinely empty.
		if (el.textContent === '' && el.innerHTML !== '') el.innerHTML = ''
		if (!editPage) return
		// B.4: never let a blank title reach `Page.title` (it would make a later body edit's
		// docToPage throw). Same `onEdit`/`session.edit` call the body uses, normalized title.
		onEdit({ ...editPage, title: titleForSave(el.textContent ?? '') })
	}
	function onTitleKeydown(e: KeyboardEvent) {
		// B.3 point 2 / B.6: a title is single-line — Enter is "done"; move into the body.
		if (e.key === 'Enter') {
			e.preventDefault()
			editorInstance?.commands.focus('start')
		}
	}
	function onTitlePaste(e: ClipboardEvent) {
		// B.3 point 1: flatten pasted newlines to spaces (Page.title is a plain string) and
		// insert as plain text at the caret, preserving native undo — browser-independent.
		e.preventDefault()
		const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\r?\n/g, ' ')
		document.execCommand('insertText', false, text)
	}

	// ── in-place editable lead summary ────────────────────────────────────────────
	// Same contenteditable pattern as the title (seed-once, plain-text, flatten paste) —
	// `Page.summary` is a separate PM doc from the main editable body, so this bypasses
	// ProseMirror entirely too (see `summaryDocForSave` / `EditSession.edit()`'s flexible
	// contract, same as the title and the infobox).
	function seedSummary(node: HTMLElement) {
		node.textContent = untrack(() => summaryText(editPage?.summary, article.summary))
	}
	function onSummaryInput(e: Event) {
		const el = e.currentTarget as HTMLDivElement
		if (el.textContent === '' && el.innerHTML !== '') el.innerHTML = ''
		if (!editPage) return
		onEdit({ ...editPage, summary: summaryDocForSave(el.textContent ?? '') })
	}
	function onSummaryKeydown(e: KeyboardEvent) {
		// A single-line "in brief" sentence, like the title — Enter is "done", not a
		// paragraph break; move into the body (same UX as the title's Enter handling).
		if (e.key === 'Enter') {
			e.preventDefault()
			editorInstance?.commands.focus('start')
		}
	}
	function onSummaryPaste(e: ClipboardEvent) {
		e.preventDefault()
		const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\r?\n/g, ' ')
		document.execCommand('insertText', false, text)
	}

	// Transient publish confirmation (the publish action otherwise just drops back to read view,
	// reading as a silent no-op). Fixed-position + role=status so it's announced without shifting
	// the article. Auto-dismisses.
	let publishedFlash = $state('')
	let flashTimer: ReturnType<typeof setTimeout> | undefined
	onDestroy(() => clearTimeout(flashTimer))

	function publish() {
		// Publish runs the consensus gate + structural merge IN THE BACKEND. But the reader renders
		// the `wikiStore` (mock) Article, not the backend `Page` — so without reconciliation the
		// published change would silently never appear. On success we load the merged Page and
		// overlay `pageToArticle(merged, base)` into wikiStore, so the read view we return to shows
		// exactly what the gate merged. (The article/Page granularity gap is bounded to the demo's
		// single-figure galleries — see pageToArticle.)
		session?.publish(async () => {
			// Overlay only when the reader's article and the edited locale AGREE. On the en-fallback
			// path (viewing a locale with no mock article) `article.locale` is 'en' while
			// `wikiStore.locale` is the missing locale — overlaying then would splice a foreign-locale
			// publish onto the en source. Load + key by the SAME locale (`article.locale`) so they
			// can't disagree.
			let reconciled = false
			if (article.locale === wikiStore.locale) {
				try {
					const merged = await getBackend().loadPage(article.slug, article.locale)
					if (merged) {
						// Stamp publish provenance: the Page doesn't carry `updatedAt`/`contributors`,
						// so without this the reflected article keeps the PRE-edit values and the reader
						// still reads "Edited 3 days ago · 3 contributors" — looking un-edited despite the
						// change being live. REF_NOW is the demo's fixed clock, so this reads "Edited
						// today" deterministically (no Date.now); the publishing member joins contributors.
						const author = memberStore.currentMember?.name
						const reflected = pageToArticle(merged, article)
						wikiStore.applyPublished({
							...reflected,
							updatedAt: REF_NOW,
							contributors:
								author && !reflected.contributors.includes(author)
									? [...reflected.contributors, author]
									: reflected.contributors,
						})
						reconciled = true
					}
				} catch (e) {
					// Best-effort demo wiring; never let it break the return-to-read.
					console.error('publish reconciliation failed', e)
				}
			}
			// Honest confirmation: only claim the reader is live-updated when it actually is.
			publishedFlash = reconciled
				? 'Published — your change is now live.'
				: 'Published. The consensus gate merged your change.'
			clearTimeout(flashTimer)
			flashTimer = setTimeout(() => (publishedFlash = ''), 5000)
			await closeEditor()
		})
	}
	function requestClose() {
		if (session?.dirty) {
			confirmKind = 'close'
			confirmOpen = true
		} else closeEditor()
	}
	function confirmDiscard() {
		confirmOpen = false
		if (confirmKind === 'switch') openEditHere()
		else closeEditor()
	}
	async function closeEditor() {
		wikiEdit.close()
		// ArticleEditor's onDestroy already destroys the TipTap instance on unmount; clear our
		// reference too, so a re-opened session's title (mounted+focused before the new
		// ArticleEditor's onReady fires) can't call a command on the stale, destroyed editor.
		editorInstance = null
		// return focus to the Edit button once it re-appears (WCAG 2.4.3). Focus whichever of the
		// two copies is actually visible for this viewport — `offsetParent` is null for a
		// `display:none` element, so this never tries to focus the hidden one.
		await tick()
		const visibleEditBtn = editBtn?.offsetParent
			? editBtn
			: editBtnDesktop?.offsetParent
				? editBtnDesktop
				: null
		visibleEditBtn?.focus()
	}
</script>

<div
	class="mx-auto flex w-full max-w-6xl gap-8 px-4 py-6 lg:px-8"
	style:--wiki-scale={scaleMultiplier}
>
	<!-- lang is set on the translated content nodes (title/summary/body), not the whole
	     article, so the English chrome (controls, References, infobox…) isn't announced
	     in the article's locale (WCAG 3.1.2 Language of Parts). -->
	<article class={cn('min-w-0 flex-1', !wide && 'mx-auto max-w-[68ch]')}>
		<!-- translation signal for non-source locales (un-gated, static/inert — C.1). Kept ABOVE
		     the consolidated header, matching its original relative order to the title. -->
		{#if article.i18n?.status === 'stale' || article.i18n?.status === 'machine'}
			<div
				class={cn(
					'mb-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-foreground',
					article.i18n.status === 'machine'
						? 'border-primary/30 bg-primary/5'
						: 'border-destructive/30 bg-destructive/5',
				)}
			>
				<TriangleAlert
					class={cn(
						'size-4 shrink-0',
						article.i18n.status === 'machine' ? 'text-primary' : 'text-destructive',
					)}
					aria-hidden="true"
				/>
				{article.i18n.status === 'machine'
					? 'This translation was machine-generated and may need review.'
					: 'This translation may be out of date compared with the English source.'}
			</div>
		{/if}

		<!-- Header — two canonical rows in BOTH modes: (1) top-controls, (2) header/title. It has
		     IDENTICAL height read vs edit (the title swaps <h1>↔contenteditable at the same
		     typography, and the top-slot control flips Edit↔Done) — the status+actions and
		     formatting toolbar that used to grow this header now live in the fixed FloatingEditBar
		     (overlay, no reflow). Plain (non-sticky) in both modes: with no toolbar to pin, the
		     header no longer needs to be sticky, so it matches read mode's original layout — that's
		     the zero-shift core (the article body box below is unchanged read↔edit). -->
		<div class="flex flex-col gap-2">
			<!-- row 1 — top controls: categories · reading controls · language (chrome, print-hidden) -->
			<div class="flex flex-wrap items-center gap-2 print:hidden">
				<div class="flex flex-wrap items-center gap-1.5">
					{#each article.categories as catId (catId)}
						{@const cat = wikiStore.categoryById(catId)}
						{#if cat}
							<a href={href(`/category/${cat.id}`)}>
								<Badge variant="secondary" class="hover:bg-secondary/70"
									>{cat.label}</Badge
								>
							</a>
						{/if}
					{/each}
				</div>
				<!-- lg:hidden — on desktop these three controls (font-size/wide/edit) now live at
			     the top of the right panel aside (below), so a viewer doesn't reach for them in
			     two different places; mobile/tablet has no aside, so this row stays their only
			     home there. Same handlers/state either way — no duplicated logic, just markup. -->
				<div class="ml-auto flex items-center gap-1 lg:hidden">
					<!-- text size (decrease/increase) — reading preference, persisted (readScale/
				     setScale), functional in BOTH modes (also scales the live editor surface —
				     C.1). Two explicit step buttons (not a 3-way option set) per the A/AArrowDown
				     · AArrowUp convention; disabled at the SIZES bounds instead of wrapping. -->
					<Button
						variant="ghost"
						size="icon"
						class="size-8"
						aria-label="Decrease text size"
						disabled={scale === SIZES[0].value}
						onclick={() => stepScale(-1)}
					>
						<AArrowDown />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="size-8"
						aria-label="Increase text size"
						disabled={scale === SIZES[SIZES.length - 1].value}
						onclick={() => stepScale(1)}
					>
						<AArrowUp />
					</Button>
					<!-- width toggle — reading preference, functional in BOTH modes (harmless local
				     `wide` state — C.1). Icon-only; aria-pressed carries state (stable name).
				     `UnfoldHorizontal` (not a generic stretch/arrows icon) reads more clearly as
				     "widen the layout". Hidden below `sm` — on the narrowest phones there's
				     barely any room to widen into, so the toggle has little practical effect and
				     the row-1 controls stay less crowded there. -->
					<Button
						variant={wide ? 'secondary' : 'ghost'}
						size="icon"
						class="hidden size-8 sm:inline-flex"
						aria-label="Wide layout"
						aria-pressed={wide}
						onclick={() => (wide = !wide)}
					>
						<UnfoldHorizontal />
					</Button>
					<!-- edit/done toggle — ONE control in ONE slot that never relocates: reading shows
				     Edit (startEdit); while editing (ready OR loading) the SAME slot flips to Done
				     (requestClose), so the header height is identical read vs edit. The terminal
				     error/notFound phases keep their body-level "Back to article", so no top toggle
				     there. -->
					{#if !isEditing}
						<!-- Edit is login-gated: shown to ANY logged-in member (ada/bao/cleo).
						     A logged-out reader sees no Edit (the top bar's "Log in" is the way back). -->
						{#if isLoggedIn}
							<Button bind:ref={editBtn} size="sm" class="h-8" onclick={startEdit}>
								<Pencil data-icon="inline-start" />
								Edit
							</Button>
						{/if}
					{:else if editPhase === 'ready' || editPhase === 'loading'}
						<Button
							size="sm"
							variant="outline"
							class="h-8"
							onclick={requestClose}
							disabled={session?.busy}>Done</Button
						>
					{/if}
					<!-- language switcher moved to the left sidebar's sticky footer
				     (WikiSidebarFooter.svelte, via wikiStore.activeArticle) — G8. -->
				</div>
			</div>

			<!-- header: renders in BOTH states so the page shell is continuous; only the title
		     element inside swaps — a static <h1> while reading, a contenteditable field once
		     the edit session is ready (B / A.1.1). The rest of the reading chrome below stays
		     gated (Phase 2). -->
			<header>
				{#if isEditing && editPhase === 'ready' && editPage}
					<!-- The document's single real <h1> while editing: the visible title is a
				     contenteditable div (role=textbox), not a heading, so keep an sr-only
				     <h1> as the outline anchor for heading-nav + the Review h2's ancestor (B.5). -->
					<h1 class="sr-only">Editing "{editPage.title}"</h1>
					<div
						contenteditable="plaintext-only"
						role="textbox"
						tabindex="0"
						aria-label="Title"
						aria-multiline="false"
						lang={article.locale}
						data-placeholder="Untitled"
						class={cn(
							'text-3xl font-bold tracking-tight outline-none sm:text-4xl',
							'empty:before:text-muted-foreground/50 empty:before:content-[attr(data-placeholder)]',
							'focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/15',
						)}
						oninput={onTitleInput}
						onkeydown={onTitleKeydown}
						onpaste={onTitlePaste}
						{@attach seedTitle}
					></div>
				{:else if isEditing && editPhase === 'loading'}
					<!-- No editPage to seed the contenteditable field from yet — A.1.1: keep
				     showing the same VISIBLE static <h1> reading uses (not sr-only, not the
				     input) until the session is ready. This IS the document's one heading
				     landmark during loading, so no separate sr-only duplicate is needed here
				     (unlike the ready branch, where the visible title is a non-heading div). -->
					<h1 lang={article.locale} class="text-3xl font-bold tracking-tight sm:text-4xl">
						{article.title}
					</h1>
				{:else if !isEditing}
					<h1 lang={article.locale} class="text-3xl font-bold tracking-tight sm:text-4xl">
						{article.title}
					</h1>
				{/if}
				<p class="mt-1 text-sm text-muted-foreground">
					Edited {editedLabel(article.updatedAt, REF_NOW)} · {article.contributors.length} contributor{article
						.contributors.length === 1
						? ''
						: 's'}
					<span class="print:hidden">
						·
						<a
							href={href(`/${article.slug}/history`)}
							class="text-primary underline decoration-primary/40 underline-offset-2"
							>History</a
						>
						{#if otherLocales.length > 1}
							·
							<a
								href={href(`/${article.slug}/translate`)}
								class="text-primary underline decoration-primary/40 underline-offset-2"
								>Translations</a
							>
						{/if}
						{#if simpleVariant}
							·
							<a
								href={href(`/${simpleVariant.slug}`)}
								class="text-primary underline decoration-primary/40 underline-offset-2"
								>Simple English</a
							>
						{:else if canonicalOfSimple}
							·
							<a
								href={href(`/${canonicalOfSimple.slug}`)}
								class="text-primary underline decoration-primary/40 underline-offset-2"
								>Full article</a
							>
						{/if}
					</span>
				</p>
			</header>
		</div>

		<!-- Reading chrome renders in BOTH modes (visible-but-inert or fully functional while
		     editing, per C.1's disposition table); only the body region swaps read ↔ editor
		     surface, sandwiched by the chrome above/below in the SAME DOM position (A.1/A.2). -->

		<!-- mobile ToC: a disclosure below lg (desktop uses the sticky side rail). Un-gated,
		     functional in both modes — Phase 1's heading-id decoration makes #id anchors
		     resolve during editing (C.3). -->
		{#if toc.length > 0}
			<details class="mt-4 rounded-lg border border-border lg:hidden print:hidden">
				<summary class="cursor-pointer px-4 py-2 text-sm font-medium">Outline</summary>
				<div class="px-4 pb-3">
					<TableOfContents entries={toc} showHeading={false} domKey={isEditing} />
				</div>
			</details>
		{/if}

		{#if article.lead}
			<!-- lead figure — un-gated, inert (sourced from the read-only `article.lead`, not
			     the live doc; no click handler — C.1). Kept mounted WHILE EDITING on purpose: it
			     holds the body region's vertical position so read↔edit stays zero-shift (hiding it
			     shifts everything below up ~400px, breaking the zero-shift invariant + its test).
			     The editable body's first element is this same lead figure (the gallery NodeView) —
			     it renders as an empty, zero-height placeholder there (GalleryNodeView.svelte's
			     `isLead` case) rather than a second interactive box, so this is the only visible
			     copy while editing too. -->
			<div class="mt-4">
				<Figure block={article.lead} />
			</div>
		{/if}

		<!-- lead summary / "in brief" on-ramp — editable while editing (Page.summary), same
		     contenteditable pattern as the title. A labeled, quiet muted box (no left border, no
		     italic) is a deliberately DIFFERENT visual language from Quote (italic + primary-tinted
		     left border) and Callout (colored border + icon) — sharing Quote's exact border-l-4
		     border-primary/40 treatment made the summary read as just another pull-quote. Identical
		     wrapper in both branches (only the inner paragraph swaps contenteditable↔static) so
		     read↔edit stays zero-shift. -->
		<div class="mt-4 rounded-lg bg-muted/30 p-4">
			<p class="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Summary
			</p>
			{#if isEditing && editPhase === 'ready' && editPage}
				<p
					contenteditable="plaintext-only"
					role="textbox"
					tabindex="0"
					aria-label="Summary"
					aria-multiline="false"
					lang={article.locale}
					data-placeholder="Summary"
					class={cn(
						'leading-relaxed text-foreground outline-none',
						'empty:before:text-muted-foreground/50 empty:before:content-[attr(data-placeholder)]',
						'focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/15',
					)}
					style="font-size: calc(1.125rem * var(--wiki-scale, 1))"
					oninput={onSummaryInput}
					onkeydown={onSummaryKeydown}
					onpaste={onSummaryPaste}
					{@attach seedSummary}
				></p>
			{:else}
				<p
					lang={article.locale}
					class="leading-relaxed text-foreground"
					style="font-size: calc(1.125rem * var(--wiki-scale, 1))"
				>
					{article.summary}
				</p>
			{/if}
		</div>

		<!-- infobox (structured facts) — read-only while reading; a click-to-edit affordance
		     while editing opens InfoboxEditDialog, staged through the SAME EditSession.edit()
		     flow as body edits (Page.infobox — see schema.ts). Mobile/tablet only here — desktop
		     gets its own copy in the right-side panel below (`hidden lg:block` there), not floated
		     inside the article text anymore. -->
		{#if infoboxFields && infoboxFields.length > 0}
			<QuickFacts
				variant="mobile"
				fields={infoboxFields}
				editable={isEditing}
				onEditClick={() => (infoboxDialogOpen = true)}
				class="my-5 lg:hidden"
			/>
		{/if}

		{#if isEditing && editPage}
			<!-- same fallback as `infoboxFields` above (editPage.infobox ?? article.infobox), so
			     the dialog never opens empty while the aside/pencil are showing real rows. -->
			<InfoboxEditDialog
				bind:open={infoboxDialogOpen}
				fields={infoboxFields ?? []}
				onsave={saveInfobox}
			/>
		{/if}

		{#if isEditing}
			<!-- editing status: a SMALL sr-only live region (loading phase) — NOT a wrapper
			     around the live editor (which would re-announce every keystroke). The save-state
			     badge + the gate own their own scoped live regions. -->
			<p class="sr-only" role="status" aria-live="polite">{editStatus}</p>
		{/if}

		<!-- body region: the ONE real conditional (A.2) — the live editor surface while editing
		     (with loading/error/notFound occupying this same slot), else the read body. The
		     text-size `scale` (via --wiki-scale, calc()'d here — not a Tailwind class, see SIZES'
		     own doc comment) wraps both so the control applies to the editing surface too. -->
		<div
			lang={article.locale}
			data-testid="article-body-region"
			class={cn(
				'mt-2',
				// Zero-shift: the read body's first block is a `<p class="my-3">` (12px top margin,
				// which collapses THROUGH this wrapper's `mt-2` → the region's box top sits at
				// base+12). The editor surface's first child is a flex container (0 top margin,
				// collapse blocked → base+8). Give the editor's first child the same 12px top so
				// the region's box top is identical read↔edit and clicking Edit causes no jump.
				// Read mode is untouched; a BFC on the wrapper is deliberately NOT used (it would
				// stop the body text wrapping around the floated infobox).
				isEditing && '[&>*:first-child]:mt-3',
			)}
			style="font-size: calc(1rem * var(--wiki-scale, 1))"
		>
			{#if isEditing}
				{#if editPhase === 'loading'}
					<div
						class="flex min-h-[40vh] items-center justify-center text-muted-foreground"
						aria-hidden="true"
					>
						<Loader2 class="size-5 animate-spin" />
					</div>
				{:else if editPhase === 'error'}
					<h1
						bind:this={phaseHeadingEl}
						tabindex="-1"
						class="text-2xl font-semibold outline-none"
					>
						Couldn't open the editor
					</h1>
					<p class="mt-2 text-sm text-muted-foreground">{session?.message}</p>
					<Button class="mt-4" variant="outline" onclick={requestClose}
						>Back to article</Button
					>
				{:else if editPhase === 'notFound'}
					<h1
						bind:this={phaseHeadingEl}
						tabindex="-1"
						class="text-2xl font-semibold outline-none"
					>
						Nothing to edit
					</h1>
					<p class="mt-2 text-sm text-muted-foreground">
						There's no editable page for "{article.slug}" in this locale.
					</p>
					<Button class="mt-4" variant="outline" onclick={requestClose}
						>Back to article</Button
					>
				{:else if editPhase === 'ready' && editPage}
					<!-- dynamic import() is ALWAYS async — at least one microtask before it
					     resolves, even when the module is already cached (spec guarantee, not a
					     network-latency thing; ArticleEditor.svelte's own chunk here is tiny, ~3KB
					     gzip — TipTap/ProseMirror core is already resident, loaded statically by
					     ArticleTipTapReader above). An await block with only `then`/`catch` renders
					     nothing during that gap, so the region briefly collapsed to 0 height
					     (verified live: the jump reported between the summary and the first
					     content), since nothing inside carried the loading spinner's
					     `min-h-[40vh]`. A `pending` snippet matching that spinner exactly keeps the
					     region's height continuous through the gap. -->
					{#await import('../content/editor/ArticleEditor.svelte')}
						<div
							class="flex min-h-[40vh] items-center justify-center text-muted-foreground"
							aria-hidden="true"
						>
							<Loader2 class="size-5 animate-spin" />
						</div>
					{:then EditorMod}
						<EditorMod.default
							page={editPage}
							locale={article.locale}
							onChange={onEdit}
							{toc}
							citations={article.citations}
							onReady={(e) => (editorInstance = e)}
						/>
					{:catch}
						<p
							role="alert"
							class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
						>
							The editor failed to load. Please reload the page and try again.
						</p>
					{/await}
				{/if}
			{:else}
				<ArticleTipTapReader {article} {toc} />
			{/if}
		</div>

		<div class="clear-both"></div>

		<!-- The review + publish-gate workflow (approve-as-{reviewer} + quorum breakdown) moved
		     OUT of the article body into the member-only top-bar Review overlay (ReviewSheet, §D
		     of the floating-edit redesign): the article is content, review is workflow. Publish
		     itself stays on the FloatingEditBar. -->

		<!-- references — un-gated, inert (not clickable-to-edit; citations aren't on the Page
		     schema — C.1). -->
		{#if article.citations.length > 0}
			<section class="mt-10" aria-labelledby="refs-heading">
				<h2 id="refs-heading" class="mb-3 text-xl font-semibold">References</h2>
				<ol class="flex flex-col gap-2 text-sm text-muted-foreground">
					{#each article.citations as c, i (c.id)}
						<!-- no-sticky-chrome scroll offset in both modes now: the header is plain
						     (non-sticky) while editing too, so an inline-citation jump has no growing
						     sticky header to clear (the edit affordances float — A.4 no longer needed). -->
						<li id="ref-{i + 1}" class="flex scroll-mt-24 gap-2">
							<span class="font-medium text-foreground">[{i + 1}]</span>
							<span>
								{#if c.url}
									<a
										href={c.url}
										target="_blank"
										rel="noopener noreferrer"
										class="font-medium text-foreground underline underline-offset-2"
									>
										{c.title}
									</a>
								{:else}
									<span class="font-medium text-foreground">{c.title}</span>
								{/if}{c.authors ? ` — ${c.authors}` : ''}{c.year
									? ` (${c.year})`
									: ''}{c.publisher ? `. ${c.publisher}` : ''}
							</span>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<!-- related articles: shared-outbound-link overlap (@kit/core/graph), excludes anything
		     already shown in the backlinks panel below. Un-gated, functional (real links;
		     discard-guard covers navigation — C.1). -->
		<RelatedArticles slug={article.slug} exclude={backlinks.map((a) => a.slug)} />

		<!-- backlinks: "what links here" — un-gated, functional (real links — C.1) -->
		{#if backlinks.length > 0}
			<section class="mt-8" aria-labelledby="backlinks-heading">
				<Separator class="mb-4" />
				<h2 id="backlinks-heading" class="mb-2 text-sm font-semibold text-foreground">
					What links here
				</h2>
				<ul class="flex flex-wrap gap-2">
					{#each backlinks as a (a.id)}
						<li>
							<a href={href(`/${a.slug}`)}>
								<Badge variant="outline" class="hover:bg-accent">{a.title}</Badge>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- provenance — un-gated, inert (avatars only, no links/handlers — C.1) -->
		<footer class="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
			<span>Contributors:</span>
			<div class="flex -space-x-2">
				{#each article.contributors as name (name)}
					<Avatar.Root class="size-7 border-2 border-background" title={name}>
						<Avatar.Fallback class="text-xs" aria-hidden="true"
							>{initials(name)}</Avatar.Fallback
						>
						<span class="sr-only">{name}</span>
					</Avatar.Root>
				{/each}
			</div>
		</footer>
	</article>

	<!-- right-side panel (desktop): the save/publish action bar while editing, Quick facts, and
	     the sticky scroll-spy ToC — one column, sticky as a unit. Quick facts/ToC are un-gated
	     (render in both modes, ToC functional while editing via Phase 1's heading-id decoration —
	     C.1/C.3); the action bar only while editing (mirrors FloatingEditBar's own gate, which
	     keeps a mobile/tablet-only copy since this panel is desktop-only). -->
	<aside class="hidden w-64 shrink-0 lg:block print:hidden">
		<div class="sticky top-6 flex flex-col gap-4">
			<!-- text size / wide / edit — desktop's copy of the toolbar row's own controls above
			     (`lg:hidden` there); same handlers/state, just relocated so a desktop reader finds
			     them alongside the rest of the panel instead of at the top of the article body. -->
			<div class="flex flex-wrap items-center justify-end gap-1">
				<Button
					variant="ghost"
					size="icon"
					class="size-8"
					aria-label="Decrease text size"
					disabled={scale === SIZES[0].value}
					onclick={() => stepScale(-1)}
				>
					<AArrowDown />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="size-8"
					aria-label="Increase text size"
					disabled={scale === SIZES[SIZES.length - 1].value}
					onclick={() => stepScale(1)}
				>
					<AArrowUp />
				</Button>
				<Button
					variant={wide ? 'secondary' : 'ghost'}
					size="icon"
					class="size-8"
					aria-label="Wide layout"
					aria-pressed={wide}
					onclick={() => (wide = !wide)}
				>
					<UnfoldHorizontal />
				</Button>
				{#if !isEditing}
					{#if isLoggedIn}
						<Button bind:ref={editBtnDesktop} size="sm" class="h-8" onclick={startEdit}>
							<Pencil data-icon="inline-start" />
							Edit
						</Button>
					{/if}
				{:else if editPhase === 'ready' || editPhase === 'loading'}
					<Button
						size="sm"
						variant="outline"
						class="h-8"
						onclick={requestClose}
						disabled={session?.busy}>Done</Button
					>
				{/if}
			</div>
			{#if isEditing && editPhase === 'ready' && editPage && session}
				<EditActionBar
					{session}
					onPublish={publish}
					idPrefix="desktop"
					class="flex flex-wrap items-center gap-2"
				/>
			{/if}
			{#if infoboxFields && infoboxFields.length > 0}
				<QuickFacts
					variant="desktop"
					fields={infoboxFields}
					editable={isEditing}
					onEditClick={() => (infoboxDialogOpen = true)}
				/>
			{/if}
			<TableOfContents entries={toc} domKey={isEditing} />
		</div>
	</aside>
</div>

<!-- floating edit bar (C) — fixed bottom-center overlay carrying the formatting toolbar +
     Save/Publish while editing. It's `position: fixed`, so it reserves no layout space and adds
     no body padding: the article body box stays identical read↔edit (zero-shift). Gated on the
     live editor instance (same as the old header toolbar row); `session`/`editorInstance` narrow
     to non-null inside the guard. -->
{#if isEditing && editPhase === 'ready' && editPage && editorInstance && session}
	<FloatingEditBar editor={editorInstance} {session} onPublish={publish} />
{/if}

<!-- publish confirmation — fixed toast (no article reflow); announced via role=status. -->
{#if publishedFlash}
	<div
		role="status"
		aria-live="polite"
		class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm shadow-lg"
	>
		<Check class="size-4 text-primary" />
		{publishedFlash}
	</div>
{/if}

<!-- discard-confirmation (uses the shadcn AlertDialog primitive directly) -->
<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{DISCARD_PROMPT.title}</AlertDialog.Title>
			<AlertDialog.Description>{DISCARD_PROMPT.body}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Keep editing</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmDiscard}>Discard</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
