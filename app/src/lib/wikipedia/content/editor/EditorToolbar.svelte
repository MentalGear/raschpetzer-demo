<script lang="ts">
	/**
	 * The formatting toolbar, extracted from `ArticleEditor` so it can render as the last row of
	 * `ArticleReader`'s consolidated sticky header (D6) instead of being fused into the content
	 * flow. `ArticleEditor` still owns the TipTap `Editor` instance and the slash-menu popover;
	 * only this toolbar's MARKUP and its own local toolbar-state (active marks/blocks, undo/redo,
	 * the link dialog) live here, driven by the live `editor` handed in as a prop. Behaviour is
	 * identical to when it lived in `ArticleEditor` — a pure DOM-placement refactor.
	 */
	import { onMount, onDestroy } from 'svelte'
	import type { Editor } from '@tiptap/core'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Separator } from '@kit/ui/shadcn-components/ui/separator'
	import * as DropdownMenu from '@kit/ui/shadcn-components/ui/dropdown-menu'
	import {
		Bold,
		Italic,
		Code,
		Link as LinkIcon,
		Heading2,
		Heading3,
		List,
		ListOrdered,
		Quote,
		Plus,
		Undo2,
		Redo2,
		Pilcrow,
	} from '@lucide/svelte'
	import LinkDialog from '../../components/LinkDialog.svelte'
	import { newPlaceholderItem } from './galleryItems'

	let { editor }: { editor: Editor } = $props()

	// ── toolbar active-state snapshot (marks + current block type) ────────────────
	let active = $state({
		bold: false,
		italic: false,
		code: false,
		link: false,
		paragraph: false,
		h2: false,
		h3: false,
		bullet: false,
		ordered: false,
		quote: false,
		callout: false,
	})
	let canUndo = $state(false)
	let canRedo = $state(false)
	function refresh() {
		active = {
			bold: editor.isActive('bold'),
			italic: editor.isActive('italic'),
			code: editor.isActive('code'),
			link: editor.isActive('link'),
			paragraph: editor.isActive('paragraph'),
			h2: editor.isActive('heading', { level: 2 }),
			h3: editor.isActive('heading', { level: 3 }),
			bullet: editor.isActive('bulletList'),
			ordered: editor.isActive('orderedList'),
			quote: editor.isActive('blockquote'),
			callout: editor.isActive('callout'),
		}
		canUndo = editor.can().undo()
		canRedo = editor.can().redo()
	}

	// The editor is constructed by ArticleEditor and handed in via onReady. Keep this snapshot in
	// sync by listening to its transactions — `transaction` fires on every state change (content
	// AND selection), covering the `onUpdate`/`onSelectionUpdate` refresh used to run under.
	onMount(() => {
		refresh()
		editor.on('transaction', refresh)
	})
	// Guard the teardown: on some close paths the parent clears the editor instance before
	// this toolbar unmounts, so `editor` can already be null here — `?.` avoids a null throw.
	onDestroy(() => editor?.off('transaction', refresh))

	// ── link dialog ───────────────────────────────────────────────────────────────
	let linkOpen = $state(false)
	let linkInitial = $state('')
	function openLink() {
		linkInitial = (editor.getAttributes('link').href as string) ?? ''
		linkOpen = true
	}
	function applyLink(url: string) {
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
		refresh()
	}
	function removeLink() {
		editor.chain().focus().extendMarkRange('link').unsetLink().run()
		refresh()
	}

	// ── mark + block commands ───────────────────────────────────────────────────
	const MARKS = [
		{
			key: 'bold',
			icon: Bold,
			label: 'Bold',
			run: () => editor.chain().focus().toggleBold().run(),
		},
		{
			key: 'italic',
			icon: Italic,
			label: 'Italic',
			run: () => editor.chain().focus().toggleItalic().run(),
		},
		{
			key: 'code',
			icon: Code,
			label: 'Inline code',
			run: () => editor.chain().focus().toggleCode().run(),
		},
		{ key: 'link', icon: LinkIcon, label: 'Link', run: openLink },
	] as const

	// Block commands are PLAIN — tier + element identity are preserved automatically by the
	// `BlockMetaNormalizer` (extensions.ts) after ANY transform, so there's no fragile
	// per-call-site re-stamp (which the native keyboard shortcuts would bypass anyway).
	const BLOCKS = [
		{
			key: 'paragraph',
			icon: Pilcrow,
			label: 'Paragraph',
			run: () => editor.chain().focus().setParagraph().run(),
		},
		{
			key: 'h2',
			icon: Heading2,
			label: 'Heading 2',
			run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
		},
		{
			key: 'h3',
			icon: Heading3,
			label: 'Heading 3',
			run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
		},
		{
			key: 'bullet',
			icon: List,
			label: 'Bullet list',
			run: () => editor.chain().focus().toggleBulletList().run(),
		},
		{
			key: 'ordered',
			icon: ListOrdered,
			label: 'Numbered list',
			run: () => editor.chain().focus().toggleOrderedList().run(),
		},
		{
			key: 'quote',
			icon: Quote,
			label: 'Quote',
			run: () => editor.chain().focus().toggleBlockquote().run(),
		},
	] as const

	/** Insert menu — the EDITABLE blocks not covered by a simple toggle (callout body is
	 *  editable; its variant/title chrome is read-only, like the reader). The new node
	 *  inherits the surrounding tier/identity via the `BlockMetaNormalizer` — EXCEPT
	 *  `gallery`, which is deliberately excluded from that inheritance (`isMetaDonor` in
	 *  extensions.ts) and so must supply its own `blockId` at insertion, same as `figureToGallery`
	 *  does server-side; a null blockId here would leave the node unidentified. Gallery is an
	 *  ATOM (like callout wraps content) rather than a "convert the current block" operation, so
	 *  it lives here, not the slash menu — same reasoning slashMenu.ts already documents for why
	 *  callout isn't offered there either. */
	const INSERTS: { label: string; run: () => void }[] = [
		{
			label: 'Callout',
			run: () =>
				editor
					.chain()
					.focus()
					.insertContent({
						type: 'callout',
						attrs: { variant: 'note', title: null },
						content: [{ type: 'paragraph' }],
					})
					.run(),
		},
		{
			label: 'Media gallery',
			run: () =>
				editor
					.chain()
					.focus()
					.insertContent({
						type: 'gallery',
						attrs: {
							blockId: `gallery-${crypto.randomUUID()}`,
							items: [newPlaceholderItem(`gallery-item-${crypto.randomUUID()}`)],
						},
					})
					.run(),
		},
	]

	function isActive(key: string): boolean {
		return (active as Record<string, boolean>)[key] ?? false
	}
</script>

<!-- Toolbar: marks · block types · insert · history. A single accessible group; the Insert menu
     is the kit DropdownMenu (keyboard + ARIA inherited). The sticky/backdrop treatment lives on
     the parent consolidated header wrapper now (this is row 4 of it), so this only carries the
     toolbar's own flex layout + a border to read as a contained formatting group. -->
<div
	class="flex flex-wrap items-center gap-0.5 rounded-md border border-border px-1.5 py-1"
	role="group"
	aria-label="Formatting"
>
	{#each MARKS as tool (tool.key)}
		{@const Icon = tool.icon}
		<Button
			variant={isActive(tool.key) ? 'secondary' : 'ghost'}
			size="icon"
			class="size-8 touch-target"
			aria-label={tool.label}
			aria-pressed={isActive(tool.key)}
			onclick={tool.run}
		>
			<Icon />
		</Button>
	{/each}

	<Separator orientation="vertical" class="mx-1 h-6" />

	{#each BLOCKS as tool (tool.key)}
		{@const Icon = tool.icon}
		<Button
			variant={isActive(tool.key) ? 'secondary' : 'ghost'}
			size="icon"
			class="size-8 touch-target"
			aria-label={tool.label}
			aria-pressed={isActive(tool.key)}
			onclick={tool.run}
		>
			<Icon />
		</Button>
	{/each}

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="sm"
					class="h-8 touch-target gap-1"
					aria-label="Insert block"
					{...props}
				>
					<Plus class="size-4" />
					Insert
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start">
			{#each INSERTS as ins (ins.label)}
				<DropdownMenu.Item onclick={ins.run}>{ins.label}</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<Separator orientation="vertical" class="mx-1 h-6" />

	<Button
		variant="ghost"
		size="icon"
		class="size-8 touch-target"
		aria-label="Undo"
		disabled={!canUndo}
		onclick={() => editor.chain().focus().undo().run()}
	>
		<Undo2 />
	</Button>
	<Button
		variant="ghost"
		size="icon"
		class="size-8 touch-target"
		aria-label="Redo"
		disabled={!canRedo}
		onclick={() => editor.chain().focus().redo().run()}
	>
		<Redo2 />
	</Button>
</div>

<LinkDialog
	bind:open={linkOpen}
	initialHref={linkInitial}
	oninsert={applyLink}
	onremove={removeLink}
/>
