<script lang="ts">
	/**
	 * The floating edit bar — the persistent home for the formatting toolbar while editing. It is
	 * `position: fixed` (bottom-center overlay), so it NEVER reserves layout space or adds body
	 * padding: that's what keeps entering edit mode zero-shift (the read↔edit article-body box is
	 * unchanged — the redesign's governing constraint). v1 tradeoff: it can overlay the very
	 * bottom of long content; caret/selection-anchoring is the backlogged refinement (reuse
	 * `slashMenu.ts`'s `coordsAtPos`).
	 *
	 * `EditorToolbar` is dynamically imported (like the old header toolbar row) so the read-only
	 * bundle never ships the editor deps; it runs against the live `editor` instance handed up by
	 * ArticleEditor's onReady. Done is NOT here — it's the top-slot Edit↔Done toggle in
	 * ArticleReader.
	 *
	 * Save/Publish (`EditActionBar`) moved to the TOP of the desktop right-side panel
	 * (ArticleReader.svelte, above Quick facts/ToC) so they're no longer a viewport-bottom
	 * overlay. This bar keeps a mobile/tablet-only COPY (`lg:hidden` below) since that right
	 * panel is desktop-only (`hidden lg:block`) — editing must stay reachable at every width.
	 */
	import type { Editor } from '@tiptap/core'
	import EditActionBar from './EditActionBar.svelte'
	import type { EditSession } from '../content/editSession.svelte'

	let {
		editor,
		session,
		onPublish,
	}: { editor: Editor; session: EditSession; onPublish: () => void } = $props()
</script>

<!-- Elevated floating surface (rounded/border/blur/shadow — the repo's sticky-toolbar
     treatment), fixed bottom-center. `max-w` + `flex-wrap` keep it inside a narrow viewport. -->
<div
	class="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden"
	aria-busy={session.busy}
>
	{#await import('../content/editor/EditorToolbar.svelte') then ToolbarMod}
		<ToolbarMod.default {editor} />
	{/await}

	<!-- mobile/tablet fallback — desktop gets the top-of-right-panel instance instead
	     (ArticleReader.svelte); see the file header doc comment. -->
	<EditActionBar
		{session}
		{onPublish}
		idPrefix="mobile"
		class="flex items-center gap-2 lg:hidden"
	/>
</div>
