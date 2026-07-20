/**
 * Slash-insert ("/") for the single-surface editor, hand-built on a ProseMirror plugin
 * (no `@tiptap/suggestion` dependency — it isn't installed, and the decision doc calls
 * for hand-building on the primitives anyway). The plugin owns the interaction model —
 * detect a "/query" block, filter commands, drive keyboard navigation, commit — and
 * reports a plain `SlashState` to the Svelte component, which renders the caret-anchored
 * listbox and manages the combobox ARIA. See
 * `docs/research/2026-07-16-wiki-editor-granularity-decision.md`.
 *
 * Trigger: the caret sits at the END of a TOP-LEVEL paragraph (`$from.depth === 1`, so it
 * never fires inside a list item / blockquote / callout body) whose entire text is
 * `"/" + query` (a single whitespace-free token) — Notion's "slash on an empty line"
 * behaviour, kept strict so a stray "/" mid-prose never hijacks typing. On commit the
 * "/query" range is deleted and the chosen block is applied to the now-empty paragraph;
 * the block's tier + element identity are preserved automatically by the
 * `BlockMetaNormalizer` (extensions.ts), so no re-stamp is needed at this call site.
 */
import { Extension } from '@tiptap/core'
import type { Editor, ChainedCommands } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

/** A command as the component renders it (title/hint + a bound `run`). */
export interface SlashCommand {
	id: string
	title: string
	hint: string
	run: (editor: Editor) => void
}

/** The plugin's view-model, reported to the component on every relevant change. */
export interface SlashState {
	open: boolean
	query: string
	items: SlashCommand[]
	/** index of the highlighted item (kept in range of `items`; 0 when empty). */
	index: number
	/** caret rect (viewport coords, for `position: fixed`) or null when closed. */
	rect: { left: number; bottom: number } | null
}

interface CommandDef {
	id: string
	title: string
	hint: string
	keywords: string[]
	/** Apply to a chain already positioned on the emptied paragraph. */
	apply: (chain: ChainedCommands) => ChainedCommands
}

// The editable blocks — "convert the current block" commands only. Atoms (callout, gallery)
// aren't offered here even though gallery items are now editable and insertable (via the
// toolbar Insert menu): inserting an atom isn't a clean "convert this paragraph" operation
// like the commands below, same reasoning that already kept callout out of this list. table/
// math remain fully read-only in v1.
const DEFS: CommandDef[] = [
	{
		id: 'h2',
		title: 'Heading 2',
		hint: 'Big section heading',
		keywords: ['heading', 'h2', 'title', 'section'],
		apply: (c) => c.setNode('heading', { level: 2 }),
	},
	{
		id: 'h3',
		title: 'Heading 3',
		hint: 'Medium subsection heading',
		keywords: ['heading', 'h3', 'subsection'],
		apply: (c) => c.setNode('heading', { level: 3 }),
	},
	{
		id: 'bullet',
		title: 'Bulleted list',
		hint: 'A simple bulleted list',
		keywords: ['bullet', 'unordered', 'list', 'ul'],
		apply: (c) => c.toggleBulletList(),
	},
	{
		id: 'ordered',
		title: 'Numbered list',
		hint: 'A list with numbering',
		keywords: ['ordered', 'numbered', 'list', 'ol'],
		apply: (c) => c.toggleOrderedList(),
	},
	{
		id: 'quote',
		title: 'Quote',
		hint: 'Capture a quotation',
		keywords: ['quote', 'blockquote', 'citation'],
		apply: (c) => c.toggleBlockquote(),
	},
]

const key = new PluginKey('slashMenu')

function filterDefs(query: string): CommandDef[] {
	const q = query.toLowerCase().trim()
	if (!q) return DEFS
	return DEFS.filter(
		(d) => d.title.toLowerCase().includes(q) || d.keywords.some((k) => k.includes(q)),
	)
}

const CLOSED: SlashState = { open: false, query: '', items: [], index: 0, rect: null }

/** Commit a command: delete the "/query" range and apply the block. Tier + element identity
 *  are preserved automatically by the `BlockMetaNormalizer` (extensions.ts) after the
 *  resulting transaction — no re-stamp needed here. */
function commit(editor: Editor, def: CommandDef, range: { from: number; to: number }): void {
	def.apply(editor.chain().focus().deleteRange(range)).run()
}

/**
 * The slash-menu extension. `onState` is called whenever the menu opens/updates/closes;
 * pass a component setter. Keyboard (↑/↓/Enter/Tab/Esc) is handled here so focus stays in
 * the editor (the combobox pattern); the component handles mouse + rendering + ARIA.
 */
export function slashMenu(onState: (s: SlashState) => void): Extension {
	return Extension.create({
		name: 'slashMenu',
		// Run this extension's plugin BEFORE StarterKit's base keymap so `handleKeyDown`
		// wins Enter/Tab while the menu is open (higher priority = loaded first = keydown
		// precedence). Don't rely on array position alone for this.
		priority: 1000,
		addProseMirrorPlugins() {
			const editor = this.editor
			let snapshot: SlashState = CLOSED
			// The doc position of the currently-open trigger's "/", and the position the user
			// dismissed (Escape / scroll) so the SAME occurrence doesn't immediately reopen.
			let triggerFrom: number | null = null
			let dismissedAt: number | null = null

			const publish = (s: SlashState) => {
				snapshot = s
				onState(s)
			}

			const compute = (view: EditorView): SlashState => {
				const { selection } = view.state
				if (!selection.empty) {
					dismissedAt = null
					triggerFrom = null
					return CLOSED
				}
				const $from = selection.$from
				// TOP-LEVEL paragraph only — never inside a list item / quote / callout body.
				if ($from.depth !== 1 || $from.parent.type.name !== 'paragraph') {
					dismissedAt = null
					triggerFrom = null
					return CLOSED
				}
				const atEnd = $from.parentOffset === $from.parent.content.size
				const text = $from.parent.textContent
				if (!atEnd || !text.startsWith('/') || /\s/.test(text)) {
					dismissedAt = null
					triggerFrom = null
					return CLOSED
				}
				const from = $from.start()
				triggerFrom = from
				if (dismissedAt === from) return CLOSED // user dismissed this occurrence

				const query = text.slice(1)
				const range = { from, to: $from.pos }
				const items: SlashCommand[] = filterDefs(query).map((d) => ({
					id: d.id,
					title: d.title,
					hint: d.hint,
					run: (ed: Editor) => commit(ed, d, range),
				}))
				let rect: SlashState['rect'] = null
				try {
					const c = view.coordsAtPos(from)
					rect = { left: c.left, bottom: c.bottom }
				} catch {
					rect = null
				}
				// No anchor rect → don't claim an open popup (would desync the combobox ARIA).
				if (!rect) return CLOSED
				return { open: true, query, items, index: 0, rect }
			}

			// Dismiss the menu (like Escape) when it would otherwise be left stranded: a
			// scroll/resize detaches the fixed-position popup from the caret, and a blur
			// (Shift+Tab / focus-out) leaves it floating with stale combobox ARIA.
			const onDismiss = () => {
				if (snapshot.open) {
					dismissedAt = triggerFrom
					publish(CLOSED)
				}
			}

			return [
				new Plugin({
					key,
					view(editorView) {
						window.addEventListener('scroll', onDismiss, true)
						window.addEventListener('resize', onDismiss)
						editorView.dom.addEventListener('blur', onDismiss)
						return {
							update(view) {
								const next = compute(view)
								// Typing normally (menu closed) must not churn the component's
								// reactive state — only publish when something is/was open.
								if (!next.open && !snapshot.open) return
								// Preserve the highlighted index while the same query stays open.
								if (next.open && snapshot.open && next.query === snapshot.query) {
									next.index = Math.min(
										snapshot.index,
										Math.max(0, next.items.length - 1),
									)
								}
								publish(next)
							},
							destroy() {
								window.removeEventListener('scroll', onDismiss, true)
								window.removeEventListener('resize', onDismiss)
								editorView.dom.removeEventListener('blur', onDismiss)
							},
						}
					},
					props: {
						handleKeyDown(_view, event) {
							if (!snapshot.open) return false
							const n = snapshot.items.length
							if (event.key === 'Escape') {
								dismissedAt = triggerFrom
								publish(CLOSED)
								return true
							}
							if (event.key === 'ArrowDown') {
								if (n) publish({ ...snapshot, index: (snapshot.index + 1) % n })
								return true
							}
							if (event.key === 'ArrowUp') {
								if (n) publish({ ...snapshot, index: (snapshot.index - 1 + n) % n })
								return true
							}
							// Enter / Tab commit; Shift+Tab must NOT (it's reverse-focus).
							if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
								const cmd = snapshot.items[snapshot.index]
								if (!cmd) return false
								cmd.run(editor)
								return true
							}
							return false
						},
					},
				}),
			]
		},
	})
}
