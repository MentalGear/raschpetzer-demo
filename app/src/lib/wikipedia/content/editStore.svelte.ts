/**
 * The app-wide handle to the CURRENT inline edit session (single-surface B-lite editor).
 * The reader mounts `ArticleEditor` against `wikiEdit.session` when editing this article;
 * the layout's `beforeNavigate` reads `wikiEdit.editing`/`dirty` for the discard guard.
 *
 * This replaces the old in-memory `editorSession` (HTML draft, no backend) — inline
 * editing now runs the REAL flow through `EditSession` + `getBackend()` (the vendored
 * Thesoria `memoryBackend`: stage → consensus gate → structural merge). One session at a
 * time (front-end demo, one browser tab); opening a different article's editor while one
 * is dirty is guarded by `wouldDiscardOther`.
 */
import { EditSession } from './editSession.svelte'
import { getBackend, DEMO_MEMBERS, type DemoMemberId } from './backend'
import type { Locale } from './schema'

class WikiEdit {
	/** The live session (its own runes fields — phase/page/dirty — stay reactive when
	 *  read through here). `raw` because it's reassigned wholesale on open/close. */
	session = $state.raw<EditSession | null>(null)
	/** slug of the article being edited (null when not editing). */
	slug = $state<string | null>(null)
	/** the member who authored the open change (the actor the session was opened with;
	 *  null when not editing). Review reads this to disable an author's own self-approval —
	 *  since any logged-in member can now edit, the author can be any of the three. */
	actor = $state<DemoMemberId | null>(null)
	/** Whether the Review sheet is open. Session-scoped state lives here (not in whichever
	 *  component happens to render the trigger) because TWO independent triggers open the
	 *  SAME sheet — the member menu's "Review" item and the Publish button when it's in its
	 *  needs-review state (EditActionBar.svelte) — and `ReviewSheet` itself is mounted once
	 *  at the root layout (like CommandPalette), not owned by either trigger's component. */
	reviewOpen = $state(false)

	get editing(): boolean {
		return this.session !== null
	}
	get dirty(): boolean {
		return this.session?.dirty ?? false
	}

	/** Open an inline edit session for `slug` in `locale`, hydrating via the backend. The
	 *  change is authored as `actor` — the current logged-in member, passed by the caller.
	 *  Edit is login-gated (any member can author), so `actor` is whoever is logged in;
	 *  wiring it through keeps the actor honest rather than hardcoding `DEMO_MEMBERS[0]`.
	 *  Defaults to the demo editor only as a belt if a caller omits it. Re-opening the SAME
	 *  slug returns the existing session rather than orphaning it + leaking a fresh change. */
	open(slug: string, locale: Locale, actor: DemoMemberId = DEMO_MEMBERS[0].id): EditSession {
		if (this.session && this.slug === slug) return this.session
		const session = new EditSession({
			slug,
			locale,
			actor,
			backend: getBackend(),
		})
		this.session = session
		this.slug = slug
		this.actor = actor
		session.load()
		return session
	}

	close(): void {
		this.session = null
		this.slug = null
		this.actor = null
	}

	/** True if opening `slug` would abandon ANOTHER article's unsaved edits (used to
	 *  confirm before clobbering — a path that reaches Edit without an intervening
	 *  navigation, which the layout guard would otherwise cover). */
	wouldDiscardOther(slug: string): boolean {
		return this.session !== null && this.slug !== slug && this.dirty
	}
}

export const wikiEdit = new WikiEdit()

/**
 * Copy for the "you have unsaved edits" discard prompt, shared by the two guards that gate
 * `wikiEdit.dirty`: ArticleReader's styled AlertDialog (in-app Done / switch article) and
 * the wikipedia layout's synchronous `window.confirm` in `beforeNavigate`. Two mechanisms
 * are deliberate — `beforeNavigate` needs a *synchronous* answer to block a navigation,
 * which an async dialog can't give — but the wording lives here so the two can't drift.
 */
export const DISCARD_PROMPT = {
	title: 'Discard changes?',
	body: 'Your unsaved edits will be lost.',
	/** single-line form for the native confirm() in beforeNavigate */
	native: 'Discard your unsaved changes?',
} as const
