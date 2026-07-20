/**
 * `EditSession` — the edit→review→publish flow as one runes store (Class-B fix; see
 * `docs/research/2026-07-15-block-editor-structural-fixes.md`).
 *
 * The route used to hand-roll this with scattered `$state` booleans where every async
 * handler had to independently remember to (a) try/catch, (b) drop its result if a
 * newer edit landed mid-flight, and (c) thread the CAS `headKey` — and review rounds
 * kept finding handlers that forgot one. Here EVERY action goes through a single
 * `#run()` wrapper that makes (a) + the generation capture for (b) un-skippable, and
 * `headKey` lives in one place. It owns no DOM (the route keeps focus/navigation);
 * the backend is injected, so it's unit-testable in isolation.
 *
 * We deliberately did NOT reach for XState: its one real win (auto-cancel of stale
 * async results) is the `#editGen` guard below in ~10 lines, and it doesn't help the
 * `headKey` CAS threading anyway (research doc, Class B).
 *
 * PORT SHAPE NOTE: this used to import the `ContentBackend` port + its types from the
 * hand-written `./port` (mirroring `@thesoria/content`/`@thesoria/identity-core`) while
 * the app ran on the hand-written `./stub` (`StubBackend`). Both are retired: the port
 * now comes from the vendored `./thesoria/contentBackend`, and `backend.ts` constructs
 * the real `createMemoryBackend`. The method set is identical; the one behavioral
 * adaptation needed here is `isNonFastForward()` below — the real backend signals a CAS
 * clash via `BackendError.code`, not a fixed `.message` string.
 */
import {
	BackendError,
	type ContentBackend,
	type Change,
	type MemberId,
	type PublishEvaluation,
} from './thesoria/contentBackend'
import type { Page, Locale } from './schema'

/** True for a CAS ("the change head moved") clash — the vendored real backend's
 *  `BackendError` carries a stable `.code` (never rely on `.message` text for it:
 *  `contentBackend.ts`'s error contract explicitly reserves the message string for
 *  humans), but a test fake may still throw a plain `Error('non_fast_forward')`
 *  (as this file's own unit tests do) — so this checks both. See the port
 *  shape-mismatch note in this file's header. */
function isNonFastForward(e: unknown): boolean {
	if (e instanceof BackendError) return e.code === 'non_fast_forward'
	return (e as Error)?.message === 'non_fast_forward'
}

export type EditPhase = 'loading' | 'ready' | 'notFound' | 'error'

export class EditSession {
	/** working page (large object reassigned wholesale → raw). */
	page = $state.raw<Page | null>(null)
	change = $state.raw<Change | null>(null)
	headKey = $state('')
	dirty = $state(false)
	phase = $state<EditPhase>('loading')
	/** an async action (save/approve/publish) is in flight. */
	busy = $state(false)
	evaluation = $state.raw<PublishEvaluation | null>(null)
	message = $state('')
	messageIsError = $state(false)

	/** bumped on every edit; an in-flight action drops its state commit if this moved. */
	#editGen = 0
	readonly #slug: string
	readonly #locale: Locale
	readonly #actor: MemberId
	readonly #backend: ContentBackend

	constructor(opts: { slug: string; locale: Locale; actor: MemberId; backend: ContentBackend }) {
		this.#slug = opts.slug
		this.#locale = opts.locale
		this.#actor = opts.actor
		this.#backend = opts.backend
	}

	get canSave(): boolean {
		return !this.busy && this.dirty
	}
	get canPublish(): boolean {
		return !this.busy && !this.dirty && this.evaluation?.allowed === true
	}

	/** Load the page + open a change + show the gate state. Own try/catch (not `#run`,
	 * since it drives `phase`, not `busy`). */
	async load(): Promise<void> {
		this.phase = 'loading'
		this.message = ''
		this.messageIsError = false
		try {
			const loaded = await this.#backend.loadPage(this.#slug, this.#locale)
			if (!loaded) {
				this.phase = 'notFound'
				return
			}
			// Atomic hydrate via loadChange (not a second loadPage) — one snapshot.
			const change = await this.#backend.openChange({
				slug: this.#slug,
				locale: this.#locale,
				actor: this.#actor,
			})
			const hydrated = await this.#backend.loadChange(change.id)
			this.change = change
			this.headKey = hydrated.headKey
			this.page = hydrated.page
			this.evaluation = await this.#backend.evaluate(change.id)
			this.phase = 'ready'
		} catch (e) {
			this.phase = 'error'
			this.messageIsError = true
			this.message = `Couldn't open the editor: ${(e as Error).message}`
		}
	}

	/** Record an edit from the editor. Any edit invalidates prior review (seam invariant). */
	edit(next: Page): void {
		this.page = next
		this.dirty = true
		this.#editGen++
		this.evaluation = null
		this.message = ''
		this.messageIsError = false
	}

	save(): Promise<void> {
		return this.#run('Save failed', async (gen) => {
			if (!this.change || !this.page) return
			const snapshot = this.page
			try {
				const res = await this.#backend.stage({
					changeId: this.change.id,
					page: snapshot,
					baseHeadKey: this.headKey,
					actor: this.#actor,
				})
				this.headKey = res.headKey // advances regardless — the backend head moved
				if (this.#isCurrent(gen)) {
					this.dirty = false
					this.evaluation = await this.#backend.evaluate(this.change.id)
					this.#ok('Saved as a staged change.')
				} else {
					this.#ok('Saved an earlier revision — you still have newer unsaved edits.')
				}
			} catch (e) {
				// CAS clash: our baseHeadKey is stale — refresh it so a retry can succeed.
				if (isNonFastForward(e) && this.change) {
					try {
						this.headKey = (await this.#backend.loadChange(this.change.id)).headKey
					} catch {
						/* leave headKey; #run surfaces the original failure */
					}
				}
				throw e
			}
		})
	}

	approve(reviewer: MemberId): Promise<void> {
		return this.#run('Approve failed', async (gen) => {
			if (!this.change) return
			await this.#backend.approve({
				changeId: this.change.id,
				reviewer,
				headKey: this.headKey,
			})
			const ev = await this.#backend.evaluate(this.change.id)
			if (this.#isCurrent(gen)) this.evaluation = ev // drop if a newer edit landed
		})
	}

	/** Publish; on success the caller navigates (a route concern — kept out of the store).
	 *  `onPublished` is AWAITED so `busy` stays true through the caller's post-publish work
	 *  (e.g. reconciling the read model) — otherwise `busy` would clear mid-reconcile and a
	 *  second Publish click could re-enter the gate on the just-published change. */
	publish(onPublished: () => void | Promise<void>): Promise<void> {
		return this.#run('Publish failed', async (gen) => {
			if (!this.change) return
			const res = await this.#backend.publish(this.change.id) // re-runs the gate + merge
			if ('published' in res) {
				await onPublished()
			} else if ('blocked' in res) {
				if (this.#isCurrent(gen)) this.evaluation = res.evaluation
				this.#fail('Publish is blocked — consensus not met.')
			} else {
				this.#fail(`Publish hit ${res.conflicts.length} conflict(s) — resolve them first.`)
			}
		})
	}

	// ── internals ────────────────────────────────────────────────────────────────
	/** The single action path: uniform busy + try/catch + generation capture, so no
	 * handler can forget them. `work` gets the captured gen for its own stale-guard. */
	async #run(errPrefix: string, work: (gen: number) => Promise<void>): Promise<void> {
		if (this.busy) return
		this.busy = true
		this.message = ''
		this.messageIsError = false
		const gen = this.#editGen
		try {
			await work(gen)
		} catch (e) {
			this.#fail(`${errPrefix}: ${(e as Error).message}`)
		} finally {
			this.busy = false
		}
	}

	#isCurrent(gen: number): boolean {
		return gen === this.#editGen
	}
	#ok(msg: string): void {
		this.message = msg
		this.messageIsError = false
	}
	#fail(msg: string): void {
		this.message = msg
		this.messageIsError = true
	}
}
