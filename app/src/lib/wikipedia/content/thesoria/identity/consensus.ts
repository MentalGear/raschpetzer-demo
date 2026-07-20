// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/identity-core/src/consensus.ts.
// Re-vendor to update; do not hand-edit.
// ============================================================================
// Consensus publish gate (PRD D19, Phase 4c) — framework-neutral Zod + pure
// logic. The server-enforced predicate that decides whether a staged change may
// be PUBLISHED (merged to live). Lives in identity-core (zod + relative only) so
// the SAME truth runs in the app (affordance/preview) and the Hono mediator
// (the authoritative gate) — never a drifting second copy (D6/R17).
//
// D19 rule: publishing requires
//   (a) a QUORUM of distinct ELIGIBLE approvals, AND
//   (b) NO unresolved objections (an objection is a blocking hold, not outvoted —
//       true consensus), AND
//   (c) for every GATED locale the change touches, ≥1 eligible approval from a
//       LOCALE-COMPETENT approver.
// "Eligible" is re-evaluated against the CURRENT team (R2): a vote from a member
// since deactivated or demoted does NOT count, and a member cannot approve their
// OWN change (no self-quorum). Records are git-native committed files (D20-style).
// ============================================================================
import { z } from 'zod'
import { localeSchema, LOCALES, type Locale } from './locales'
import { can, isLocaleCompetent, type Team } from './team'

// ----------------------------------------------------------------------------
// Server-side locale derivation (review-board Sec-4c-M2, hardened after a 2nd
// security review). The gated-locale gate must key off the locales a change
// ACTUALLY touches — computed from the changed file paths, NEVER a client-supplied
// list. Only files under the LOCALIZED content roots (D2/D22) carry per-locale
// text; among those, a recognized `<locale>.json` maps to that locale, but ANY
// other localized-content JSON (a combined/alternate file, or `site.json`'s
// per-locale label map) could carry ANY locale — so it is treated as touching
// EVERY gated locale (FAIL-CLOSED), not none. Region/case variants (lb-LU, LB)
// normalize to the base locale. Non-localized paths (assets, team.json) contribute
// nothing. *Path knowledge encodes the D2/D22 content layout.*
// ----------------------------------------------------------------------------
const LOCALE_SET = new Set<string>(LOCALES)

/**
 * Case/whitespace-fold a repo path for layout matching. The renderer's content
 * loader (and many filesystems) match case-INSENSITIVELY, so the gate must too —
 * else `Content/PAGES/x/lb.json` renders as the lb page but evades a case-sensitive
 * `startsWith('content/pages/')` check (security review W2). Folding to lowercase
 * is the FAIL-CLOSED direction: it can only classify MORE paths as localized.
 */
function normPath(path: string): string {
	return path.trim().toLowerCase()
}

/** Normalize a file stem to a base locale: lowercase + drop a region suffix (lb-LU → lb). */
function stemToLocale(stem: string): Locale | null {
	const base = stem.trim().toLowerCase().split('-')[0]
	return LOCALE_SET.has(base) ? (base as Locale) : null
}

/**
 * Is this path a content JSON file that the locale gate must consider (D2/D22)? ROOT-AGNOSTIC and
 * FAIL-CLOSED (R8 review): ANY `content/**.json` qualifies — NOT just the pre-enumerated
 * `content/pages/` / `content/site/` roots. That closes a latent fail-OPEN: previously a `.json` under
 * a FUTURE localized root with a combined (non-`<locale>`) stem (e.g. `content/articles/index.json`
 * carrying lb text) was classified non-localized → contributed zero touched locales → the gated-locale
 * approver requirement was silently skipped. Now `deriveTouchedLocales` sees every content JSON and
 * fails closed on any it can't resolve to a specific locale (→ all gated locales). A per-locale
 * `<locale>.json` under any root still resolves to its exact locale (self-identifying convention).
 *
 * Binary masters under `content/uploads/` (`.jpeg`/`.webp`/…) carry no per-locale text and are excluded
 * by the `.json` gate. `content/team.json` is a GOVERNANCE file that can never appear in a content-
 * change diff (assertSafeChangePath rejects governance paths on content branches), so classifying it
 * all-gated here is moot — and fail-safe (over-blocks) in the impossible case it ever did.
 */
function isLocalizedContent(path: string): boolean {
	const p = normPath(path)
	return p.startsWith('content/') && p.endsWith('.json')
}

/**
 * Derive the locales a change set TOUCHES from its changed paths — the trusted,
 * server-side input to the gated-locale gate. FAIL-CLOSED: a changed JSON under a
 * localized root that is NOT a recognized `<locale>.json` is assumed to touch every
 * gated locale (forcing a competent approver). The caller MUST pass the diff of the
 * pinned `headSha` (not the live branch), and MUST fail closed when it can't.
 */
export function deriveTouchedLocales(paths: string[], gatedLocales: Locale[]): Locale[] {
	const out = new Set<Locale>()
	let unknownLocalized = false
	for (const p of paths) {
		if (!isLocalizedContent(p)) continue // already case-folded + `.json`-gated
		const stem = (normPath(p).split('/').pop() ?? '').replace(/\.json$/, '')
		const loc = stemToLocale(stem)
		if (loc) out.add(loc)
		else unknownLocalized = true // combined/alternate/site-labels file → could be any locale
	}
	if (unknownLocalized) for (const g of gatedLocales) out.add(g)
	return [...out]
}

// ----------------------------------------------------------------------------
// Git-native records (committed under e.g. `reviews/<changeId>.json`).
// ----------------------------------------------------------------------------
/** A staged change set seeking publish (e.g. the draft head the editor promoted). */
export const changeRequestSchema = z.object({
	id: z.string().min(1),
	/** The change's own draft branch (per-change branch, D12). The publish endpoint
	 *  re-checks `getBranchHead(branch) === headSha` so a moved head blocks publish
	 *  even if the record wasn't re-pinned (review-board Sec-4c-M3 defense-in-depth). */
	branch: z.string().min(1),
	/**
	 * The IMMUTABLE draft commit sha this change request is pinned to (review-board
	 * Sec-4c-M1). Approvals are bound to a `headSha` (below), so pushing new content
	 * to the change MUST re-pin this to the new draft head — which invalidates every
	 * prior approval (they were for the old sha). This is what makes the gate
	 * authorize a CONTENT STATE, not just an id (closes approve-then-mutate).
	 */
	headSha: z.string().min(1),
	/** Lifecycle (A2). Only an `open` change may be staged-to, reviewed, or published;
	 *  publish flips it to `merged`. (Absent = `open`, for back-compat.) */
	status: z.enum(['open', 'merged', 'abandoned']).default('open'),
	/** Member who authored/initiated the change (excluded from its own quorum). */
	authorId: z.string().min(1),
	/**
	 * Locales the change touches (drives the gated-locale requirement). MUST be
	 * SERVER-DERIVED from the actual diff of `headSha` vs base (review-board
	 * Sec-4c-M2) — never client-set / self-reported, or the gated-locale gate is
	 * bypassable by under-reporting. (Diff derivation lands with the Phase-5
	 * recording flow; until then treat a record's locales as untrusted.)
	 */
	locales: z.array(localeSchema).default([]),
})
export type ChangeRequest = z.infer<typeof changeRequestSchema>

/** The canonical per-change branch name (D12). The SINGLE source of the `change/<id>`
 *  convention — mint AND validate through here so the two never drift. */
export function changeBranchName(id: string): string {
	return `change/${id}`
}

/**
 * True iff `branch` is exactly the change's own per-change branch (`change/<id>`).
 * The commit + publish handlers assert this before writing to / merging from `branch`
 * (security-followups.md "Constrain changeRequestSchema.branch"): `branch` is only
 * `z.string().min(1)`, safe today solely because `createChange` is the sole writer. A
 * future second writer that set `branch:'main'` (or `'draft'/'audit'/'reviews'`) could
 * otherwise trick a writer into committing onto — or publishing from — a shared target.
 * Fail-closed defense-in-depth: a record whose branch isn't its own is unprocessable.
 */
export function isChangeBranch(branch: string, id: string): boolean {
	return branch === changeBranchName(id)
}

export const approvalSchema = z.object({
	memberId: z.string().min(1),
	/** The change-request revision approved — MUST equal the change's current `headSha` to count. */
	headSha: z.string().min(1),
	at: z.string().datetime(),
})
export type Approval = z.infer<typeof approvalSchema>

export const objectionSchema = z.object({
	id: z.string().min(1),
	memberId: z.string().min(1),
	reason: z.string().min(1),
	at: z.string().datetime(),
	/** Set when withdrawn/resolved; an unset value = an OPEN (blocking) objection. */
	resolvedAt: z.string().datetime().optional(),
	/** Who resolved it (R16: clearing a STALE objection requires a *different* lead). */
	resolvedBy: z.string().optional(),
})
export type Objection = z.infer<typeof objectionSchema>

// ----------------------------------------------------------------------------
// Evaluation result.
// ----------------------------------------------------------------------------
export type PublishBlock =
	| { code: 'quorum_not_met'; have: number; need: number }
	| { code: 'open_objection'; objectionId: string; memberId: string }
	| { code: 'gated_locale_uncovered'; locale: Locale }

export interface PublishEvaluation {
	allowed: boolean
	quorum: number
	/** Distinct member ids whose approval is currently eligible + counts. */
	eligibleApprovals: string[]
	blocks: PublishBlock[]
}

/** Is this approval currently eligible to count toward the change's quorum? */
function isEligibleApproval(team: Team, change: ChangeRequest, memberId: string): boolean {
	if (memberId === change.authorId) return false // no self-quorum
	const m = team.members.find((x) => x.id === memberId)
	return !!m && m.active && can(m, 'review:approve')
}

/**
 * Is this objection currently eligible to HOLD the gate? Mirrors `isEligibleApproval`'s R2 rule:
 * eligibility is re-evaluated against the CURRENT team, so an objection filed by a member who has
 * since been DEACTIVATED or lost `review:object` (the standard revocation response to a departed /
 * compromised account) stops vetoing — otherwise a revoked member's hold would freeze an
 * otherwise-consensus publish until a lead clears it after the 72h dwell. Fail-safe either way (this
 * only ever UNblocks; it can never let an ineligible approval publish something).
 */
export function isEligibleObjection(team: Team, memberId: string): boolean {
	const m = team.members.find((x) => x.id === memberId)
	return !!m && m.active && can(m, 'review:object')
}

/**
 * Evaluate the D19 consensus gate. Pure: same inputs → same verdict. The caller
 * (mediator) performs the merge ONLY when `allowed`. `blocks` enumerates every
 * reason it is held, so the UI can show exactly what's outstanding.
 */
export function evaluatePublish(args: {
	team: Team
	change: ChangeRequest
	approvals: Approval[]
	objections: Objection[]
}): PublishEvaluation {
	const { team, change, approvals, objections } = args
	const quorum = team.policy.quorum

	// (a) distinct, currently-eligible approvers — AND the approval must be for
	// the change's CURRENT revision (Sec-4c-M1): an approval bound to a superseded
	// `headSha` (i.e. the content changed since) does not count.
	const eligible = new Set<string>()
	for (const a of approvals) {
		if (a.headSha !== change.headSha) continue
		if (isEligibleApproval(team, change, a.memberId)) eligible.add(a.memberId)
	}
	const eligibleApprovals = [...eligible]
	const blocks: PublishBlock[] = []

	if (eligibleApprovals.length < quorum) {
		blocks.push({ code: 'quorum_not_met', have: eligibleApprovals.length, need: quorum })
	}

	// (b) any UNRESOLVED objection from a CURRENTLY-ELIGIBLE objector blocks (consensus, not majority).
	// Eligibility is re-checked against the live team (R2), symmetric with approvals: a hold from a
	// now-deactivated/demoted member no longer vetoes (see isEligibleObjection).
	for (const o of objections) {
		if (o.resolvedAt) continue
		if (!isEligibleObjection(team, o.memberId)) continue
		blocks.push({ code: 'open_objection', objectionId: o.id, memberId: o.memberId })
	}

	// (c) gated locales touched need ≥1 eligible, locale-competent approval.
	for (const loc of change.locales) {
		if (!team.policy.gatedLocales.includes(loc)) continue
		const covered = eligibleApprovals.some((id) => {
			const m = team.members.find((x) => x.id === id)
			return !!m && isLocaleCompetent(m, loc)
		})
		if (!covered) blocks.push({ code: 'gated_locale_uncovered', locale: loc })
	}

	return { allowed: blocks.length === 0, quorum, eligibleApprovals, blocks }
}

/**
 * Default dwell (R16, security review) before a filed objection becomes eligible for a lead
 * OVERRIDE via /review/resolve. An objection is a BLOCKING hold ("true consensus, not outvoted",
 * D19); a lead must not be able to dismiss a fresh, actively-contested one on sight. "Stale" earns
 * its name only after the objector has had a real window to engage — 72h (a weekend + a day for a
 * non-technical objector). This is a TIME gate, not a substitute for the objector withdrawing (that
 * primitive is a documented follow-on); it only bounds the lead-override escape hatch.
 */
export const DEFAULT_OBJECTION_DWELL_SEC = 72 * 3600

/**
 * Is `objection` old enough (>= dwell) to be eligible for a lead override? `nowMs` is epoch-ms;
 * `objection.at` is ISO. FAIL-CLOSED: a malformed or future `at` (unparseable, or filed "after" now
 * — clock skew / tampering) is treated as NOT stale, so an override can never ride an untrustworthy
 * timestamp. Pure — the caller supplies `nowMs` (identity-core stays deterministic, no Date.now).
 */
export function isObjectionStale(args: {
	objection: Objection
	nowMs: number
	dwellSec?: number
}): boolean {
	const dwellSec = args.dwellSec ?? DEFAULT_OBJECTION_DWELL_SEC
	const filedMs = Date.parse(args.objection.at)
	if (Number.isNaN(filedMs)) return false
	return args.nowMs - filedMs >= dwellSec * 1000
}

/**
 * R16 conflict-of-interest core (the pure identity half, no dwell/capability): the person clearing an
 * objection must not be the one who raised it (no self-clear), nor the change's own author (no clearing
 * the way for your own publish). SINGLE SOURCE OF TRUTH — `canClearStaleObjection` layers the dwell +
 * lead-capability *auth* checks on top of this, and other governance surfaces that only need the COI
 * *shape* (e.g. a backend that simulates governance without the auth ceremony) call THIS directly, so the
 * rule can never drift into two hand-rolled copies. Returns true iff the clearer is DISQUALIFIED.
 */
export function objectionConflictOfInterest(args: {
	change: Pick<ChangeRequest, 'authorId'>
	objection: Pick<Objection, 'memberId'>
	clearerId: string
}): boolean {
	return args.clearerId === args.objection.memberId || args.clearerId === args.change.authorId
}

/**
 * R16 conflict-of-interest + dwell: a STALE objection may be cleared by a lead, but NOT
 * by the same person who raised it, NOT by the change's own author clearing the way for their
 * own publish, and NOT before it has been open at least `dwellSec` (see isObjectionStale — a fresh
 * hold can't be instantly overridden). The clearer must be an active lead who is a different member
 * from both the objector and the change author. `nowMs` is REQUIRED — the staleness gate is part of
 * the predicate (defense-in-depth: the gate is correct even if a caller forgets the explicit check).
 */
export function canClearStaleObjection(args: {
	team: Team
	change: ChangeRequest
	objection: Objection
	clearerId: string
	nowMs: number
	dwellSec?: number
}): boolean {
	const { team, change, objection, clearerId } = args
	if (objectionConflictOfInterest({ change, objection, clearerId })) return false // no self-clear / no author-clear (SSOT)
	if (!isObjectionStale({ objection, nowMs: args.nowMs, dwellSec: args.dwellSec })) return false
	const m = team.members.find((x) => x.id === clearerId)
	return !!m && m.active && can(m, 'objection:clearStale')
}
