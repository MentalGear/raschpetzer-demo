// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/content/src/memoryBackend.ts.
// Re-vendor to update; do not hand-edit. Import rewrite: `@thesoria/identity-core`
// → `./identity` (the local re-export surface for the vendored identity-core subset).
// ============================================================================
// In-memory ContentBackend — a browser-only, framework-neutral simulation of the
// Thesoria broker + git write path (openChange → stage(CAS) → approve/object →
// publish(consensus gate + structural 3-way merge) → history), built ENTIRELY on
// already-vendored pure core: schema.ts (parsePage/stableStringify/hashString),
// mergePage.ts (the structural 3-way merge), applyPicks.ts (conflict resolution),
// and @thesoria/identity-core's evaluatePublish (the D19 consensus gate). This
// module reimplements NONE of that logic — it is pure orchestration + storage.
// The PORT it implements (interface + error contract + data types) lives in
// `contentBackend.ts`; this file is only the adapter (`createMemoryBackend`).
//
// ARCHITECTURAL STATUS — READ BEFORE WIRING THIS UP: this is a HERMETIC TEST
// DOUBLE ("backend-free mode"), a LATENT seam. Nothing in the app or @thesoria/ui
// imports it yet. The REAL browser→broker client path today is
// `packages/ui/src/state/cmsWrite.svelte.ts` (authedFetch → the /content/*
// mediator endpoints); this adapter does NOT replace it, does NOT wire into it,
// and talking to it is not equivalent to talking to the live Forgejo broker.
//
// A future HTTP adapter that wraps the existing broker endpoints behind the SAME
// port (`contentBackend.ts`) would be the second implementation.
//
// FIELD-NAME MAPPING to the real broker (so the port stays honest if a real HTTP
// adapter is later built against it):
//   - `headKey`               ↔ the broker's `headSha` — but here it is a
//     deterministic CONTENT HASH (hashString(stableStringify(page))), not a git
//     commit sha.
//   - `Change`                ↔ identity-core's `ChangeRequest`.
//   - `baseHeadKey`/`mergeBase` ↔ the base commit a real publish merge-bases onto.
//   - "CAS" in `stage()`      is a plain headKey EQUALITY compare — NOT a
//     cryptographic or git-host optimistic-lock; it only detects "the content
//     changed since you last read it" within this in-memory store.
//
// WHAT IT FAITHFULLY REPRODUCES (by delegating to the SAME pure functions the live
// stack calls): fast-forward CAS on stage, headSha-bound approvals (re-stage
// invalidates prior approvals), fail-closed schema validation, the D19 consensus
// gate (quorum / no-self-quorum / approver-eligibility / gated-locale competence /
// objection holds), disjoint-edits-auto-merge vs. overlap-conflict, the
// post-conflict rebase, and lifecycle (only an `open` change may be mutated).
//
// WHAT IT DELIBERATELY DOES NOT MODEL (out of scope — "simulate the shape of
// governance, not the auth"):
//   - R16 objection-clearing CEREMONY: the real `canClearStaleObjection` requires
//     an `objection:clearStale` (lead) capability AND a 72h dwell. This adapter
//     enforces only the conflict-of-interest SHAPE (no self-clear, no author-clear,
//     clearer must be an eligible objector) — NOT the dwell or the lead capability.
//   - Any real auth (WebAuthn/JWT/CSRF/crypto/HMAC/Forgejo).
//   - ATOMICITY under concurrency: every method is `async` but runs fully
//     synchronously to completion, so overlapping calls get "free" atomicity a
//     real network-backed adapter cannot provide. Do not rely on it.
//
// CONTENT-HASH HEAD KEYS — one deliberate consequence: because the head is a pure
// content hash, an edit-then-revert cycle (H1 → H2 → back to byte-identical H1)
// makes approvals recorded at H1 count again, without a fresh re-affirmation after
// the reviewer saw H2. That is intended for THIS model (content-addressed: the
// state IS the content; an approval is for exact content, and the reverted content
// is byte-identical to what was approved). A design that wanted every stage to
// force re-review would use a monotonic head instead of a content hash.
//
// DETERMINISM (invariant): no Date.now()/Math.random(). Callers may inject `now`
// (default: a monotonic millisecond counter) so every timestamp/id sequence is
// reproducible across runs.
// ============================================================================
import { type Page, type Locale, parsePage, stableStringify, hashString } from './schema'
import { mergePage, type FieldConflict } from './mergePage'
import { applyPicks } from './applyPicks'
import {
	evaluatePublish,
	isEligibleObjection,
	objectionConflictOfInterest,
	changeBranchName,
	type Team,
	type ChangeRequest,
	type Approval,
	type Objection,
	type PublishEvaluation,
} from './identity'
// NOTE (repo-local lint adaptation, not an upstream behavior change): only the
// bindings this file's BODY actually references are imported here — `Change`,
// `ConflictPick`, and `PublishResult` are needed only by the re-export statement
// below, which re-exports them directly from `./contentBackend` regardless of
// this import list, so including them here would be a dead import
// (`@typescript-eslint/no-unused-vars`, enforced in this repo's `bun run lint`).
import {
	BackendError,
	type ContentBackend,
	type Commit,
	type HeadKey,
	type ChangeId,
	type MemberId,
} from './contentBackend'

// Re-export the port surface so existing `from './memoryBackend'` importers keep
// working; NEW code (esp. a second adapter) should import the port from
// './contentBackend' directly.
export {
	BackendError,
	type BackendErrorCode,
	type ContentBackend,
	type Change,
	type Commit,
	type ConflictPick,
	type HeadKey,
	type ChangeId,
	type MemberId,
	type PublishResult,
} from './contentBackend'

// ----------------------------------------------------------------------------
// Internal state (distinct from the public `Change` — carries the publish
// merge-base, the current staged head, and review bookkeeping the port doesn't
// expose directly).
// ----------------------------------------------------------------------------
interface PendingMerge {
	merged: Page
	conflicts: FieldConflict[]
	theirsLive: Page
	theirsKey: HeadKey
}

interface InternalChange {
	id: ChangeId
	slug: string
	locale: Locale
	author: MemberId
	status: 'open' | 'merged'
	/** The publish MERGE-BASE — fixed at openChange (= live then), advanced only
	 *  by resolveConflicts' post-conflict rebase (invariant 5). */
	mergeBase: Page
	mergeBaseKey: HeadKey
	/** The CURRENT staged content; moves on every `stage`. */
	page: Page
	head: HeadKey
	approvals: Approval[]
	objections: Objection[]
	pendingMerge?: PendingMerge
}

interface StoreEntry {
	live: Page | null
	liveHeadKey: HeadKey
	commits: Commit[] // insertion order (oldest first); history() reverses
}

const storeKey = (slug: string, locale: Locale): string => `${slug}/${locale}`

/** Content-hash head key — deterministic; identical content ⇒ identical key
 *  (a no-op re-stage keeps approvals valid; changed content mints a new key,
 *  which is how prior approvals stop counting — see evaluatePublish). */
const headKeyOf = (page: Page): HeadKey => hashString(stableStringify(page))

/** Deep clone a page (plain JSON — Pages carry no functions/dates). Used at every
 *  ingest AND egress boundary so callers can never mutate stored state in place:
 *  a returned `Page` is a caller-owned copy, and stored `Page`s are copied in.
 *  (parsePage alone is insufficient — zod passes unknown/passthrough leaves such
 *  as ProseMirror `attrs` through by reference.) */
const clonePage = (page: Page): Page => JSON.parse(JSON.stringify(page)) as Page

/** Deep clone conflicts before returning them: FieldConflict.base/ours/theirs are
 *  built by mergePage from references into the change/live pages, so an unclone
 *  return would let a caller (e.g. a resolver UI) mutate live/staged state via a
 *  returned conflict. */
const cloneConflicts = (conflicts: FieldConflict[]): FieldConflict[] =>
	JSON.parse(JSON.stringify(conflicts)) as FieldConflict[]

const SEED_AUTHOR: MemberId = '__seed__'

export function createMemoryBackend(opts: {
	team: Team
	seed?: Page[]
	now?: () => number
}): ContentBackend {
	// `team` is held by reference ON PURPOSE: evaluatePublish re-evaluates
	// eligibility against the CURRENT team (consensus.ts R2), so a caller may mutate
	// membership/active flags mid-scenario to exercise that — the store's Page
	// clone discipline does not apply to the governance policy input.
	const team = opts.team
	let t = 1_700_000_000_000
	const now = opts.now ?? (() => (t += 1000))
	const isoNow = (): string => new Date(now()).toISOString()

	let changeCounter = 0
	let objectionCounter = 0
	const nextChangeId = (): ChangeId => `change-${++changeCounter}`
	const nextObjectionId = (): string => `obj-${++objectionCounter}`

	const pages = new Map<string, StoreEntry>()
	const changes = new Map<ChangeId, InternalChange>()

	for (const seedPage of opts.seed ?? []) {
		const page = parsePage(seedPage)
		const stored = clonePage(page) // decouple from the caller's object (passthrough leaves alias)
		const sk = storeKey(stored.slug, stored.locale)
		if (pages.has(sk)) {
			throw new BackendError('duplicate_seed', `duplicate seed page for ${sk}`)
		}
		const key = headKeyOf(stored)
		pages.set(sk, {
			live: stored,
			liveHeadKey: key,
			commits: [
				{
					headKey: key,
					page: clonePage(stored),
					author: SEED_AUTHOR,
					ts: now(),
					message: 'seed',
				},
			],
		})
	}

	/** The store entry for a key, or undefined — never creates one (reads on an
	 *  unseeded key stay side-effect-free; no phantom empty entries). */
	const getEntry = (slug: string, locale: Locale): StoreEntry | undefined =>
		pages.get(storeKey(slug, locale))

	const requireChange = (changeId: ChangeId): InternalChange => {
		const c = changes.get(changeId)
		if (!c) throw new BackendError('no_such_change', `no such change: ${changeId}`)
		return c
	}

	/** Only an OPEN change may be staged-to, reviewed, or published (consensus.ts
	 *  lifecycle note — an invariant evaluatePublish itself does not enforce, so it
	 *  is the adapter's job). Guards against double-publish / post-merge mutation. */
	const requireOpen = (change: InternalChange): void => {
		if (change.status !== 'open') {
			throw new BackendError(
				'change_not_open',
				`change ${change.id} is ${change.status}, not open`,
			)
		}
	}

	const buildChangeRequest = (change: InternalChange): ChangeRequest => ({
		id: change.id,
		branch: changeBranchName(change.id), // centralized `change/<id>` convention (never a 2nd copy)
		headSha: change.head,
		status: change.status,
		authorId: change.author,
		locales: [change.locale],
	})

	const evaluateChange = (change: InternalChange): PublishEvaluation =>
		evaluatePublish({
			team,
			change: buildChangeRequest(change),
			approvals: change.approvals,
			objections: change.objections,
		})

	return {
		async loadPage(slug, locale) {
			const live = getEntry(slug, locale)?.live
			return live ? clonePage(live) : null
		},

		async history(slug, locale) {
			const entry = getEntry(slug, locale)
			if (!entry) return []
			return [...entry.commits].reverse().map((c) => ({ ...c, page: clonePage(c.page) }))
		},

		async openChange({ slug, locale, actor }) {
			const entry = getEntry(slug, locale)
			if (!entry?.live) {
				throw new BackendError(
					'no_such_page',
					`openChange: no page at ${storeKey(slug, locale)}`,
				)
			}
			const id = nextChangeId()
			const snapshot = clonePage(entry.live) // decouple the change's merge-base/staged copy from the store
			const change: InternalChange = {
				id,
				slug,
				locale,
				author: actor,
				status: 'open',
				mergeBase: snapshot,
				mergeBaseKey: entry.liveHeadKey,
				page: clonePage(snapshot),
				head: entry.liveHeadKey,
				approvals: [],
				objections: [],
			}
			changes.set(id, change)
			return { id, slug, locale, baseHeadKey: change.mergeBaseKey }
		},

		async stage({ changeId, page, baseHeadKey, actor: _actor }) {
			// `actor` is accepted for port parity (the real broker attributes the
			// stager) but is unused here — Commit.author uses the openChange actor.
			const change = requireChange(changeId)
			requireOpen(change)
			// CAS first (integrity guard, matching the real broker's CAS-primary
			// discipline): a stale base means "refetch and rebase" regardless of
			// whether the payload is also independently invalid.
			if (baseHeadKey !== change.head) {
				throw new BackendError(
					'non_fast_forward',
					'stage: baseHeadKey is stale (the change head moved)',
				)
			}
			let parsed: Page
			try {
				parsed = parsePage(page) // throws on invalid schema (acceptance case 8)
			} catch (cause) {
				throw new BackendError('schema_invalid', 'stage: page failed schema validation', {
					cause,
				})
			}
			if (parsed.slug !== change.slug || parsed.locale !== change.locale) {
				throw new BackendError(
					'slug_locale_mismatch',
					`stage: page ${parsed.slug}/${parsed.locale} does not match change ${change.slug}/${change.locale}`,
				)
			}
			change.page = clonePage(parsed)
			change.head = headKeyOf(change.page)
			// A fresh stage supersedes any unresolved conflict from a prior publish
			// attempt — otherwise a later resolveConflicts would apply picks to the
			// now-stale pending merge and clobber this newer edit (silent data loss).
			change.pendingMerge = undefined
			return { headKey: change.head }
		},

		async loadChange(changeId) {
			const change = requireChange(changeId)
			return {
				page: clonePage(change.page),
				headKey: change.head,
				base: clonePage(change.mergeBase),
			}
		},

		async approve({ changeId, reviewer, headKey, locale: _locale }) {
			const change = requireChange(changeId)
			requireOpen(change)
			change.approvals.push({ memberId: reviewer, headSha: headKey, at: isoNow() })
		},

		async object({ changeId, reviewer, reason }) {
			const change = requireChange(changeId)
			requireOpen(change)
			const objectionId = nextObjectionId()
			change.objections.push({ id: objectionId, memberId: reviewer, reason, at: isoNow() })
			return { objectionId }
		},

		async resolveObjection({ objectionId, reviewer }) {
			for (const change of changes.values()) {
				const objection = change.objections.find((o) => o.id === objectionId)
				if (!objection) continue
				requireOpen(change) // symmetric with the other mutators — no post-merge audit mutation
				// Conflict-of-interest SHAPE (a proportionate slice of R16 — NOT the
				// 72h dwell or lead-only capability, which are out of scope): no
				// self-clear / no author-clear (via identity-core's shared SSOT
				// predicate, so this can't drift from canClearStaleObjection), and
				// the clearer must hold `review:object` (isEligibleObjection). NOTE:
				// that capability is a deliberate stand-in — the real R16 gate is the
				// lead-only `objection:clearStale`, intentionally unmodeled in this
				// test double (see the header's "DOES NOT MODEL" section).
				if (
					objectionConflictOfInterest({
						change: { authorId: change.author },
						objection,
						clearerId: reviewer,
					})
				) {
					throw new BackendError(
						'objection_not_clearable',
						'clearer has a conflict of interest (the objector or the change author)',
					)
				}
				if (!isEligibleObjection(team, reviewer)) {
					throw new BackendError(
						'objection_not_clearable',
						`${reviewer} is not an eligible objection clearer`,
					)
				}
				objection.resolvedAt = isoNow()
				objection.resolvedBy = reviewer
				return
			}
			throw new BackendError('no_such_objection', `no such objection: ${objectionId}`)
		},

		async evaluate(changeId) {
			return evaluateChange(requireChange(changeId))
		},

		async publish(changeId) {
			const change = requireChange(changeId)
			requireOpen(change)
			const evaluation = evaluateChange(change)
			if (!evaluation.allowed) {
				return { blocked: true, evaluation }
			}

			const entry = getEntry(change.slug, change.locale)!
			const currentLive = entry.live as Page // non-null: openChange required a seeded page
			// mergePage can only throw on a slug/locale mismatch or invalid content;
			// stage() has already guaranteed change.page matches the change key, and
			// currentLive is the store's own page for that same key — so both inputs
			// share slug/locale and are schema-valid. Provably no throw here.
			const res = mergePage(change.mergeBase, change.page, currentLive)

			if (res.clean) {
				const newHeadKey = headKeyOf(res.merged)
				change.status = 'merged'
				// Only advance + record a commit if the merge actually changed live —
				// a no-op publish (nothing staged, or a merge identical to live) must
				// not append a duplicate history entry.
				if (newHeadKey !== entry.liveHeadKey) {
					const merged = clonePage(res.merged) // clone at the ingest boundary (res.merged aliases change.page/currentLive leaves)
					entry.live = merged
					entry.liveHeadKey = newHeadKey
					entry.commits.push({
						headKey: newHeadKey,
						page: clonePage(merged),
						author: change.author,
						ts: now(),
					})
					return { published: true, page: clonePage(merged), headKey: newHeadKey }
				}
				return { published: true, page: clonePage(res.merged), headKey: newHeadKey }
			}

			change.pendingMerge = {
				merged: res.merged,
				conflicts: res.conflicts,
				theirsLive: currentLive,
				theirsKey: entry.liveHeadKey,
			}
			return { conflict: true, conflicts: cloneConflicts(res.conflicts) }
		},

		async resolveConflicts({ changeId, picks }) {
			const change = requireChange(changeId)
			requireOpen(change)
			const pending = change.pendingMerge
			if (!pending)
				throw new BackendError(
					'no_pending_conflict',
					`no pending conflict for change ${changeId}`,
				)

			// Fail-closed pick validation (mergePage's "never silent" discipline):
			//  - every pick path must match a pending conflict (no typo'd/stale paths),
			//  - no duplicate pick paths (ambiguous last-write-wins),
			//  - EVERY pending conflict must be addressed by a pick (no silent default
			//    to "ours" for an unaddressed conflict).
			const seen = new Set<string>()
			for (const p of picks) {
				// Fail-closed on an out-of-union `take` — TS guards it in-process, but a future
				// wire adapter deserializing untrusted JSON could pass anything; without this an
				// unrecognized take silently falls through to `base`.
				if (p.take !== 'ours' && p.take !== 'theirs' && p.take !== 'base') {
					throw new BackendError(
						'invalid_pick_take',
						`resolveConflicts: invalid take '${String(p.take)}' at path ${p.path}`,
					)
				}
				if (!pending.conflicts.some((c) => c.path === p.path)) {
					throw new BackendError(
						'unknown_conflict_path',
						`resolveConflicts: no pending conflict at path ${p.path}`,
					)
				}
				if (seen.has(p.path)) {
					throw new BackendError(
						'duplicate_conflict_path',
						`resolveConflicts: duplicate pick for path ${p.path}`,
					)
				}
				seen.add(p.path)
			}
			for (const c of pending.conflicts) {
				if (!seen.has(c.path)) {
					throw new BackendError(
						'unresolved_conflict',
						`resolveConflicts: no pick for pending conflict ${c.path}`,
					)
				}
			}

			// Reuse applyPicks' path-tokenizer + element positioning via a synthetic-conflict
			// trick: applyPicks only understands 'ours'|'theirs' and always applies
			// conflict.theirs on a 'theirs' pick, so we build one synthetic FieldConflict per
			// pick whose `.theirs` carries the RESOLVED value (base/theirs/explicit override),
			// and pick 'theirs' for all of them. A pure 'ours' pick with no value override is
			// skipped — the tentative `pending.merged` already holds "ours" there.
			const synthetic: FieldConflict[] = []
			for (const p of picks) {
				const c = pending.conflicts.find((cc) => cc.path === p.path)!
				if (p.take === 'ours' && p.value === undefined) continue
				const valueToApply =
					p.value !== undefined ? p.value : p.take === 'theirs' ? c.theirs : c.base
				synthetic.push({
					path: c.path,
					label: c.label,
					base: c.base,
					ours: c.ours,
					theirs: valueToApply,
					after: c.after,
				})
			}
			let resolved: Page
			try {
				resolved = applyPicks(
					pending.merged,
					synthetic,
					Object.fromEntries(synthetic.map((c) => [c.path, 'theirs' as const])),
				)
			} catch (cause) {
				// applyPicks re-validates via parsePage; a resolution that yields invalid
				// content (e.g. a 'base' pick clearing a required field) throws — surface
				// it as a typed BackendError, not a raw ZodError.
				throw new BackendError(
					'schema_invalid',
					'resolveConflicts: resolved page failed schema validation',
					{ cause },
				)
			}

			// Post-conflict rebase (invariant 5): advance the merge-base to the live version we
			// just conflicted against, so a follow-up publish doesn't re-conflict on the same
			// already-resolved divergence.
			change.mergeBase = clonePage(pending.theirsLive)
			change.mergeBaseKey = pending.theirsKey
			change.page = clonePage(resolved)
			change.head = headKeyOf(change.page)
			change.pendingMerge = undefined

			return { headKey: change.head }
		},
	}
}
