<script lang="ts">
	/**
	 * The reader's read-only counterpart of `ArticleEditor.svelte` — mounts the SAME TipTap
	 * `Editor` (`pageDocExtensions()`), `editable: false`, instead of `ArticleBody.svelte`'s
	 * separate hand-written Svelte render tree. Replaces the old "two independent
	 * implementations of the same content model" split (2026-07-19 direction change — see
	 * `docs/backlog.md`'s "Read mode as a live, inactive TipTap Editor" entry for the full
	 * rationale/tradeoffs, including the accepted bundle-size cost: this loads the TipTap/
	 * ProseMirror chunk on every article view now, not just while editing).
	 *
	 * A SEPARATE `Editor` instance from `ArticleEditor.svelte`'s (not one instance toggling
	 * `editable`) — `ArticleReader.svelte` still swaps between this component and
	 * `ArticleEditor` the same way it swapped `ArticleBody`/`ArticleEditor` before; reconciling
	 * the read data source (`article`, this app's `Block[]` read-model) and the edit data
	 * source (`editPage`, loaded fresh through `EditSession`/the backend) into one persistent
	 * instance is a bigger, separate concern this pass doesn't attempt.
	 *
	 * Styled with the SAME `.tiptap-body` classes as `ArticleEditor.svelte` (built specifically
	 * so "read == edit" typography, per that component's own doc comment) — confirmed this is
	 * enough for visual parity without needing per-node Tailwind classes baked into the schema's
	 * `toDOM`/`renderHTML` specs (unlike the abandoned `renderPageToHtml`/`{@html}` static-HTML
	 * approach, which had no ambient class context to inherit).
	 *
	 * `headingIdDecoration`/`linkExistenceDecoration` (shared with the editable instance) plus
	 * two READER-ONLY decorations (`headingAnchorDecoration`, `mobileSectionCollapseDecoration`)
	 * restore what `ArticleBody.svelte` did that the bare schema doesn't: heading anchor-link
	 * icons and mobile h2-section collapse. Gallery richness (the read-mode slider) lives in the
	 * `gallery` NodeView itself (`GalleryNodeView.svelte`), not here — it's the SAME NodeView the
	 * editable instance uses, branching on `editor.isEditable`.
	 */
	import { onMount, onDestroy } from 'svelte'
	import { Editor } from '@tiptap/core'
	import { cn } from '@kit/ui/shadcn-utils'
	import {
		pageDocExtensions,
		headingIdDecoration,
		linkExistenceDecoration,
		headingAnchorDecoration,
		mobileSectionCollapseDecoration,
		citeNoteMarkerDecoration,
	} from './extensions'
	import { pageToDoc } from './pageDoc'
	import { articleToPage } from '../fromArticle'
	import { articleExists } from '$lib/wikipedia/state/wikiStore.svelte'
	import type { Article } from '$lib/wikipedia/data/types'
	import LinkHoverPreview from './LinkHoverPreview.svelte'

	let {
		article,
		toc = [],
	}: {
		article: Article
		toc?: readonly { id: string }[]
	} = $props()

	let element = $state<HTMLDivElement>()
	let editor: Editor | undefined

	onMount(() => {
		editor = new Editor({
			element,
			extensions: [
				...pageDocExtensions(),
				headingIdDecoration(() => toc),
				linkExistenceDecoration(articleExists),
				headingAnchorDecoration(() => toc),
				mobileSectionCollapseDecoration(() => toc),
				citeNoteMarkerDecoration(() => article.citations),
			],
			content: pageToDoc(articleToPage(article)),
			editable: false,
			editorProps: {
				attributes: {
					class: 'focus:outline-none',
					'aria-label': `Article: ${article.title}`,
				},
			},
		})
	})
	onDestroy(() => editor?.destroy())
</script>

<!-- Same wrapper classes as `ArticleEditor.svelte`'s mount point — "read == edit" typography
     parity is the whole point of `.tiptap-body`; kept in sync by hand since a Tailwind
     arbitrary-variant string can't be shared as a JS constant. -->
<div
	bind:this={element}
	lang={article.locale}
	class={cn(
		'tiptap-body min-h-[40vh] max-w-none leading-7',
		'[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-2',
		'[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-lg [&_blockquote]:italic',
		'[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-40 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight',
		'[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-40 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight',
		'[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:scroll-mt-40 [&_h4]:text-lg [&_h4]:font-semibold',
		'[&_li]:my-1 [&_li]:pl-1 [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc',
		'[&_p]:my-3',
		// heading + its inline chrome (HeadingAnchor, the mobile collapse chevron) on one row
		'[&_h2]:flex [&_h2]:items-center [&_h2]:gap-1.5 [&_h3]:flex [&_h3]:items-center [&_h3]:gap-1.5 [&_h4]:flex [&_h4]:items-center [&_h4]:gap-1.5',
	)}
></div>

{#if element}
	<LinkHoverPreview root={element} />
{/if}

<style>
	/* Redlink treatment — verbatim copy of ArticleEditor.svelte's own (kept in sync by hand;
	   the alternative, importing a shared class string, doesn't work for a Svelte <style> block
	   which only accepts literal CSS). */
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
