<script lang="ts">
	/**
	 * The single-surface (B-lite) page editor: ONE TipTap document for the whole page,
	 * styled as the reader (page typography), the way a Notion block editor works — one
	 * cursor, prose and blocks flowing together. Replaces the rejected "one editor per
	 * text_block" `PageEditor`/`TextBlockEditor`. See
	 * `docs/research/2026-07-16-wiki-editor-granularity-decision.md` (B-lite).
	 *
	 * Content flows one-way IN (seeded once from `pageToDoc(page)`; TipTap owns the doc
	 * after mount, so a parent re-render never resets the cursor) and, on every edit,
	 * emits a fresh `Page` derived by the PURE save-time `docToPage` (`pageDoc.ts`) — which
	 * splits the doc back into `text_block`/`gallery_block` elements at element boundaries,
	 * keeping element ids stable. Title is a separate field (folded in here).
	 *
	 * Galleries/tables/math are read-only atoms (media + structured editing backlogged),
	 * so block insertion offers the editable blocks only (headings, lists, quote, callout);
	 * slash-insert ("/") mirrors the same set (`slashMenu.ts`).
	 */
	import { onMount, onDestroy } from 'svelte'
	import { Editor } from '@tiptap/core'
	import { cn } from '@kit/ui/shadcn-utils'
	import {
		pageDocExtensions,
		headingIdDecoration,
		linkExistenceDecoration,
		citeNoteMarkerDecoration,
	} from './extensions'
	import { pageToDoc, docToPage } from './pageDoc'
	import { slashMenu, type SlashState, type SlashCommand } from './slashMenu'
	import type { Page, ProseMirrorDoc } from '../schema'
	import type { Citation } from '$lib/wikipedia/data/types'
	import { articleExists } from '$lib/wikipedia/state/wikiStore.svelte'
	import LinkHoverPreview from './LinkHoverPreview.svelte'

	let {
		page,
		onChange,
		/** article locale — applied as `lang` on the body (WCAG 3.1.2), matching the
		 *  reader's language-of-parts marking. */
		locale = 'en',
		/** ToC entries (frozen to the last save), zipped by position against the doc's
		 *  PUBLIC headings to keep `#id` anchor scrolling working while editing (A.4).
		 *  Title lives in the reader now; it is NOT this component's concern. */
		toc = [],
		/** The article's citation list — NOT part of `Page`/the editable doc (citations are
		 *  article-level metadata, referenced by id from a `cite` mark, not stored inline); passed
		 *  straight from `ArticleReader.svelte`'s `article.citations` so `citeNoteMarkerDecoration`
		 *  below can number/render the same `[n]` hover markers reading gets. */
		citations = [],
		/** Hand the live TipTap `Editor` to the parent once constructed — the reader's
		 *  title Enter-key uses it to move focus into the body (B.6), and the extracted
		 *  `EditorToolbar` (row 4 of the reader's sticky header, D6) runs against it. */
		onReady,
	}: {
		page: Page
		onChange: (page: Page) => void
		locale?: string
		toc?: readonly { id: string }[]
		citations?: readonly Citation[]
		onReady?: (editor: Editor) => void
	} = $props()

	let element = $state<HTMLDivElement>()
	let editor: Editor | undefined
	/** set if the editor couldn't be constructed (e.g. schema-invalid stored content). */
	let initError = $state(false)

	// ── slash menu (caret-anchored) — state driven by the plugin, rendered below ──
	let slash = $state<SlashState>({ open: false, query: '', items: [], index: 0, rect: null })
	/** sr-only announcement of the slash menu's open/count/active option (the spec-safe
	 *  channel — `aria-haspopup`/`aria-expanded` aren't valid on `role="textbox"`). */
	let slashAnnounce = $state('')

	/** Keep the editable textbox's autocomplete ARIA + the live announcement in sync with the
	 *  slash menu: `aria-controls`/`aria-activedescendant` (both valid on textbox) point at the
	 *  listbox + highlighted option; `#slash-status` speaks the open/count/selection. */
	function syncSlashAria(s: SlashState) {
		const dom = editor?.view.dom
		if (!dom) return
		if (s.open) dom.setAttribute('aria-controls', 'slash-menu')
		else dom.removeAttribute('aria-controls')
		const opt = s.open ? s.items[s.index] : undefined
		if (opt) dom.setAttribute('aria-activedescendant', `slash-opt-${opt.id}`)
		else dom.removeAttribute('aria-activedescendant')
		// keep the highlighted option scrolled into view (list can exceed its max height).
		if (opt)
			document.getElementById(`slash-opt-${opt.id}`)?.scrollIntoView({ block: 'nearest' })
		slashAnnounce = !s.open
			? ''
			: s.items.length === 0
				? 'No matching blocks'
				: `${s.items.length} block${s.items.length === 1 ? '' : 's'}${opt ? `, ${opt.title} selected` : ''}`
	}

	function emitChange() {
		if (!editor) return
		try {
			onChange(docToPage(editor.getJSON() as ProseMirrorDoc, page))
		} catch (e) {
			// A transient schema-invalid doc (should not happen — the editor enforces the
			// schema and LinkDialog guards hrefs) is skipped rather than propagated; the next
			// valid keystroke re-syncs. Log so a real regression (e.g. a docToPage bug) isn't
			// swallowed silently.
			console.error('docToPage failed; edit not propagated', e)
		}
	}

	onMount(() => {
		try {
			editor = new Editor({
				element,
				extensions: [
					...pageDocExtensions(),
					slashMenu((s) => {
						slash = s
						syncSlashAria(s)
					}),
					headingIdDecoration(() => toc),
					linkExistenceDecoration(articleExists),
					citeNoteMarkerDecoration(() => citations),
				],
				content: pageToDoc(page),
				editorProps: {
					attributes: {
						class: 'focus:outline-none',
						'aria-label': 'Article editor',
						'aria-multiline': 'true',
						// A multiline rich-text surface stays `role="textbox"` (it is not a combobox).
						// `aria-autocomplete="list"` + `aria-activedescendant`/`aria-controls` (all
						// SUPPORTED on textbox) advertise the slash list; the open/count is also spoken
						// via the `#slash-status` live region (aria-haspopup/expanded are NOT valid on
						// textbox, so they're deliberately omitted). See a11y review round-2.
						'aria-autocomplete': 'list',
					},
				},
				onUpdate: () => emitChange(),
			})
			onReady?.(editor)
		} catch (e) {
			// Schema-invalid stored content would otherwise throw uncaught during mount and
			// leave a blank surface; surface a recoverable error state instead.
			console.error('Failed to open the editor', e)
			initError = true
		}
	})
	onDestroy(() => editor?.destroy())

	// ── slash menu interaction (mouse) — keyboard is handled in the plugin ────────
	function runSlash(cmd: SlashCommand) {
		if (editor) cmd.run(editor)
	}
</script>

<div class="flex flex-col gap-4">
	{#if initError}
		<p
			role="alert"
			class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
		>
			The editor couldn't open this page's content. Please reload and try again.
		</p>
	{/if}

	<!-- sr-only announcement of the slash menu (open/count/active) — the spec-safe channel
	     for a role="textbox" surface (which can't carry aria-haspopup/expanded). -->
	<span id="slash-status" class="sr-only" role="status" aria-live="polite">{slashAnnounce}</span>

	<!-- The single editing surface, styled as the reader body (page typography). The
	     `.tiptap-body` prose classes mirror ArticleBody so read == edit. The formatting toolbar
	     lives in the reader's consolidated sticky header now (EditorToolbar, row 4); this surface
	     only carries the mount point + the slash-menu popover. A generous `scroll-mt-*` on headings
	     keeps ToC anchor-scrolling clear of that (up-to-four-row) sticky header while editing (A.4).
	     -->
	<div class="relative">
		<div
			bind:this={element}
			lang={locale}
			class={cn(
				'tiptap-body min-h-[40vh] max-w-none leading-7',
				// Kept in sync with ArticleTipTapReader.svelte's identical rule — see its
				// comment for why /25 (dialed back from /40, reported "unreadable" live).
				'[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/25 [&_a]:underline-offset-2',
				'[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-lg [&_blockquote]:italic',
				'[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-40 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight',
				'[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-40 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight',
				'[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:scroll-mt-40 [&_h4]:text-lg [&_h4]:font-semibold',
				'[&_li]:my-1 [&_li]:pl-1 [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc',
				'[&_p]:my-3',
			)}
		></div>

		{#if element}
			<LinkHoverPreview root={element} />
		{/if}

		<!-- Slash menu: a caret-anchored listbox. The editor stays the focused textbox
		     (combobox pattern); arrow/enter/escape are handled in the plugin. Rendered
		     only while open; positioned from the caret rect the plugin reports. -->
		{#if slash.open && slash.rect}
			<ul
				id="slash-menu"
				role="listbox"
				aria-label="Insert block"
				class="fixed z-50 max-h-64 w-56 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
				style={`left:${slash.rect.left}px; top:${slash.rect.bottom + 4}px;`}
			>
				{#each slash.items as cmd, i (cmd.id)}
					<li
						id={`slash-opt-${cmd.id}`}
						role="option"
						aria-selected={i === slash.index}
						class={cn(
							'flex cursor-pointer flex-col rounded-sm px-2 py-1.5 text-sm',
							i === slash.index
								? 'bg-accent text-accent-foreground'
								: 'text-foreground',
						)}
						onmousedown={(e) => {
							e.preventDefault()
							runSlash(cmd)
						}}
					>
						<span class="font-medium">{cmd.title}</span>
						<span class="text-xs text-muted-foreground">{cmd.hint}</span>
					</li>
				{/each}
				{#if slash.items.length === 0}
					<li
						id="slash-opt-empty"
						role="option"
						aria-selected="false"
						aria-disabled="true"
						class="px-2 py-1.5 text-sm text-muted-foreground"
					>
						No matching blocks
					</li>
				{/if}
			</ul>
		{/if}
	</div>
</div>

<style>
	/* Redlink treatment for internal links whose target doesn't exist — mirrors the reader's
	   `InlineRuns.svelte` (dotted red vs. solid blue, WCAG 1.4.1 non-colour cue, matching
	   thickness/offset). Added by the `linkExistenceDecoration` ProseMirror plugin
	   (extensions.ts). Two selectors: as of the TipTap/ProseMirror version this app pins, the
	   decoration's wrapping span renders INSIDE the `link` mark's own `<a>` (verified live), so
	   `.editor-link-redlink` alone suffices today — the second, `a`-descendant selector is a
	   defensive hedge in case that internal DOM-building order ever changes, not a currently
	   reachable case. `.tiptap-body` raises specificity above the blanket `[&_a]:text-primary`
	   rule above it either way. */
	:global(.tiptap-body .editor-link-redlink),
	:global(.tiptap-body .editor-link-redlink a) {
		color: var(--destructive);
		text-decoration-line: underline;
		text-decoration-style: dotted;
		text-decoration-color: var(--destructive);
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
	}
</style>
