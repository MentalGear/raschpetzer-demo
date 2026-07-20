// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/content/src/contentBackend.ts.
// Re-vendor to update; do not hand-edit. Import rewrite: `@thesoria/identity-core`
// → `./identity` (the local re-export surface for the vendored identity-core subset).
// ============================================================================
// ContentBackend — the PORT (interface + error contract + data types) for the
// broker write FLOW (openChange → stage(CAS) → approve/object → publish(consensus
// gate + structural 3-way merge) → history), over `Page` snapshots.
//
// This file is the SEAM: it holds ONLY the contract, no implementation. The
// in-memory adapter (`memoryBackend.ts`, `createMemoryBackend`) is the first
// implementation; a future HTTP adapter wrapping the real broker endpoints would
// be a second — and should import the port from HERE (a neutral name), never from
// a concretely-named sibling adapter file. See `memoryBackend.ts`'s header for the
// full architectural status and field-name mapping to the real broker.
// ============================================================================
import { type Page, type Locale } from './schema'
import { type FieldConflict } from './mergePage'
export type { PublishEvaluation } from './identity'
import type { PublishEvaluation } from './identity'

// ----------------------------------------------------------------------------
// Errors — a single typed class with a stable `.code` (parallels the real client
// path's `BrokerError`). Callers branch on `.code`, never on the message text.
// EXPECTED publish outcomes (gate-blocked, merge-conflict) are RETURN values (the
// `PublishResult` union); everything that is a caller/precondition error is THROWN
// as a `BackendError`.
// ----------------------------------------------------------------------------
export type BackendErrorCode =
	| 'no_such_change'
	| 'no_such_page'
	| 'no_such_objection'
	| 'non_fast_forward'
	| 'schema_invalid'
	| 'slug_locale_mismatch'
	| 'change_not_open'
	| 'no_pending_conflict'
	| 'unknown_conflict_path'
	| 'duplicate_conflict_path'
	| 'invalid_pick_take'
	| 'unresolved_conflict'
	| 'objection_not_clearable'
	| 'duplicate_seed'

export class BackendError extends Error {
	readonly code: BackendErrorCode
	constructor(code: BackendErrorCode, message?: string, options?: { cause?: unknown }) {
		super(message ?? code, options)
		this.name = 'BackendError'
		this.code = code
	}
}

// ----------------------------------------------------------------------------
// Port data types.
// ----------------------------------------------------------------------------
export type HeadKey = string
export type ChangeId = string
export type MemberId = string

export interface Change {
	id: ChangeId
	slug: string
	locale: Locale
	/** The publish MERGE-BASE captured at openChange (the live head then). NOTE:
	 *  this is NOT the token to resend to a later `stage()` — after the FIRST
	 *  successful stage the change's head MOVES, and `stage()`'s CAS compares its
	 *  `baseHeadKey` arg against the CURRENT head. Always pass the `headKey` most
	 *  recently returned (by openChange, then by each stage/resolveConflicts) as
	 *  the next stage's `baseHeadKey`; resending this original value after an edit
	 *  yields `non_fast_forward`. (The name `baseHeadKey` is fixed by the seam
	 *  contract; the internal field is `mergeBaseKey`.) */
	baseHeadKey: HeadKey
}

export interface Commit {
	headKey: HeadKey
	page: Page
	author: MemberId
	ts: number
	message?: string
}

export interface ConflictPick {
	path: string
	take: 'ours' | 'theirs' | 'base'
	/** Explicit override applied at `path` instead of the `take` side. NOTE: an
	 *  explicit `value: undefined` is indistinguishable from "no override" (both
	 *  fall through to `take`) — use `take` to clear a field to a side's value; a
	 *  sentinel would be needed if explicit-undefined ever becomes a real case. */
	value?: unknown
}

export type PublishResult =
	| { published: true; page: Page; headKey: HeadKey }
	| { blocked: true; evaluation: PublishEvaluation }
	| { conflict: true; conflicts: FieldConflict[] }

export interface ContentBackend {
	loadPage(slug: string, locale: Locale): Promise<Page | null>
	history(slug: string, locale: Locale): Promise<Commit[]> // newest-first
	openChange(a: { slug: string; locale: Locale; actor: MemberId }): Promise<Change>
	/** CAS (`baseHeadKey` must equal the change's CURRENT head, else throws
	 *  BackendError('non_fast_forward')) → validate(schema) → slug/locale match →
	 *  re-pin a new content-hash head (which invalidates prior approvals).
	 *  `baseHeadKey` is a CAS token, NOT the publish merge-base (see
	 *  `Change.baseHeadKey`). */
	stage(a: {
		changeId: ChangeId
		page: Page
		baseHeadKey: HeadKey
		actor: MemberId
	}): Promise<{ headKey: HeadKey }>
	loadChange(changeId: ChangeId): Promise<{ page: Page; headKey: HeadKey; base: Page }>
	/** Record an approval bound to `headKey` (the reviewed head). `locale` is
	 *  reserved for parity with a future locale-scoped-approval adapter and is
	 *  unused here — gated-locale coverage derives from the change's locale +
	 *  the approver's team competencies inside evaluatePublish. */
	approve(a: {
		changeId: ChangeId
		reviewer: MemberId
		headKey: HeadKey
		locale?: Locale
	}): Promise<void>
	object(a: {
		changeId: ChangeId
		reviewer: MemberId
		reason: string
	}): Promise<{ objectionId: string }>
	resolveObjection(a: { objectionId: string; reviewer: MemberId }): Promise<void>
	evaluate(changeId: ChangeId): Promise<PublishEvaluation>
	publish(changeId: ChangeId): Promise<PublishResult>
	/** Apply a resolution for EVERY pending conflict (fail-closed: a missing pick
	 *  → `unresolved_conflict`; an unknown/duplicate pick path → `unknown_conflict_path`/
	 *  `duplicate_conflict_path`), then re-stage the resolved page (new head ⇒ re-review). */
	resolveConflicts(a: {
		changeId: ChangeId
		picks: ConflictPick[]
	}): Promise<{ headKey: HeadKey }>
}
