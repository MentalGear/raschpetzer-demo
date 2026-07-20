// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/identity-core/src/team.ts.
// Re-vendor to update; do not hand-edit.
// ============================================================================
// Team / identity model — framework-neutral Zod SSOT (PRD Phase 4a, D5/D6/D23;
// extracted per review-board R17). PURE: zod + the locale primitives only — NO
// SvelteKit `$lib` alias, NO Vite `import.meta`. This is the single home of the
// authorization truth (roles → capabilities, consensus policy), imported BOTH by
// the SvelteKit app (via the `$core` alias → src/lib/auth/team.ts re-export) and
// by the Hono write-mediator (services/auth) — so server-side enforcement (D6)
// is never a duplicated second copy that can drift.
// ============================================================================
import { z } from 'zod'
import { localeSchema, LOCALES, type Locale } from './locales'

export const SCHEMA_VERSION = 1 as const

// ----------------------------------------------------------------------------
// Roles. `reader` = an authenticated account with view-only rights (the public
// needs no account at all). Capabilities are derived from the role below.
// ----------------------------------------------------------------------------
export const roleSchema = z.enum(['reader', 'contributor', 'approver', 'lead'])
export type Role = z.infer<typeof roleSchema>

// ----------------------------------------------------------------------------
// Capabilities (server-enforced, D6). NOTE: `publish:request` only means a user
// may INITIATE a publish; success additionally requires the consensus gate
// (D19, Phase 4c) — quorum + no unresolved objections + a locale-competent
// approver. `publish:minor` is the lightweight fast-path for trivial changesets
// (governance review must-fix: avoid the full ceremony for a typo). R15: the
// "minor" qualification must be a server-checkable predicate, not self-asserted.
// ----------------------------------------------------------------------------
export const CAPABILITIES = [
	'content:draft',
	'content:stage',
	'discussion:participate',
	'review:approve',
	'review:object',
	'publish:minor',
	'publish:request',
	'objection:clearStale',
	'team:manage',
	'quorum:configure',
] as const
export type Capability = (typeof CAPABILITIES)[number]

const CONTRIBUTOR_CAPS: Capability[] = ['content:draft', 'content:stage', 'discussion:participate']
const APPROVER_CAPS: Capability[] = [
	...CONTRIBUTOR_CAPS,
	'review:approve',
	'review:object',
	'publish:minor',
	'publish:request',
]
const LEAD_CAPS: Capability[] = [
	...APPROVER_CAPS,
	'objection:clearStale',
	'team:manage',
	'quorum:configure',
]

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
	reader: [],
	contributor: CONTRIBUTOR_CAPS,
	approver: APPROVER_CAPS,
	lead: LEAD_CAPS,
}

// ----------------------------------------------------------------------------
// A registered WebAuthn credential (PUBLIC key only — safe to commit). Populated
// by the registration ceremony (Phase 4a.2); seeded empty.
// ----------------------------------------------------------------------------
export const webauthnCredentialSchema = z.object({
	/** Base64url credential id. */
	id: z.string().min(1),
	/** Base64url COSE public key. */
	publicKey: z.string().min(1),
	/** Signature counter (clone-detection). */
	counter: z.number().int().nonnegative().default(0),
	transports: z.array(z.string()).optional(),
	label: z.string().optional(),
	addedAt: z.string().datetime().optional(),
})
export type WebAuthnCredential = z.infer<typeof webauthnCredentialSchema>

export const memberSchema = z.object({
	/** Stable internal id (NOT an email/login); used in provenance + sessions. */
	id: z.string().min(1),
	name: z.string().min(1),
	role: roleSchema,
	/** Locales this member may AUTHORITATIVELY review (locale-gated approval, D19). */
	localeCompetencies: z.array(localeSchema).default([]),
	active: z.boolean().default(true),
	/**
	 * Session epoch (revocation, R2). All sessions carry the epoch they were
	 * minted at; bumping it (deactivation, key rotation, suspected compromise)
	 * invalidates every outstanding session immediately, despite stateless JWTs.
	 */
	tokenEpoch: z.number().int().nonnegative().default(1),
	credentials: z.array(webauthnCredentialSchema).default([]),
})
export type Member = z.infer<typeof memberSchema>

export const policySchema = z.object({
	/** Consensus quorum for a full publish (D19). */
	quorum: z.number().int().positive().default(3),
	/** Locales whose publish requires a locale-competent approver (e.g. lb). */
	gatedLocales: z.array(localeSchema).default([]),
})
export type Policy = z.infer<typeof policySchema>

export const teamSchema = z
	.object({
		schemaVersion: z.literal(SCHEMA_VERSION),
		policy: policySchema.default({ quorum: 3, gatedLocales: [] }),
		members: z.array(memberSchema).default([]),
	})
	.superRefine((team, ctx) => {
		const ids = new Set<string>()
		for (const m of team.members) {
			if (ids.has(m.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate member id: ${m.id}`,
				})
			}
			ids.add(m.id)
		}
		// Quorum can't exceed the number of members who can actually approve,
		// or full publish could never be reached (deadlock).
		const approverCount = team.members.filter(
			(m) => m.active && can(m, 'review:approve'),
		).length
		if (team.policy.quorum > approverCount) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Quorum (${team.policy.quorum}) exceeds the number of active approvers (${approverCount}).`,
				path: ['policy', 'quorum'],
			})
		}
		// Gated-locale coverage (review-board Sec-M4 / R10): a gated locale with
		// ZERO competent active approvers can NEVER publish — a structurally
		// impossible team. Hard error at config time. (The "exactly one" SPOF is
		// a governance WARNING, see governanceIssues(), not a hard error — the
		// R10 waive/banner fallback exists for it.)
		for (const loc of team.policy.gatedLocales) {
			const competent = team.members.filter(
				(m) => m.active && can(m, 'review:approve') && m.localeCompetencies.includes(loc),
			).length
			if (competent === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Gated locale "${loc}" has no competent active approver — publish would be permanently blocked.`,
					path: ['policy', 'gatedLocales'],
				})
			}
		}
	})
export type Team = z.infer<typeof teamSchema>

// ----------------------------------------------------------------------------
// Capability + competence helpers (pure; reused server-side for enforcement).
// ----------------------------------------------------------------------------
/** Does this member's role grant the capability? */
export function can(member: Pick<Member, 'role'>, capability: Capability): boolean {
	return ROLE_CAPABILITIES[member.role].includes(capability)
}

/** May this member authoritatively review the given locale (D19 gating)? */
export function isLocaleCompetent(member: Member, locale: Locale): boolean {
	return member.localeCompetencies.includes(locale)
}

/** Active members who can approve. */
export function approvers(team: Team): Member[] {
	return team.members.filter((m) => m.active && can(m, 'review:approve'))
}

/** Active approvers competent in a locale (for the gated-locale requirement). */
export function localeCompetentApprovers(team: Team, locale: Locale): Member[] {
	return approvers(team).filter((m) => isLocaleCompetent(m, locale))
}

/**
 * Recovery hardening (R9): a lost/replaced authenticator locks out a member with
 * only one credential. Flag members who should register a backup passkey.
 */
export function needsBackupAuthenticator(member: Member): boolean {
	return member.active && member.role !== 'reader' && member.credentials.length < 2
}

/** All capabilities for a role (for UI affordance gating). */
export function capabilitiesOf(role: Role): readonly Capability[] {
	return ROLE_CAPABILITIES[role]
}

/**
 * Governance health beyond schema validity (review-board Sec-S5 / Gov-M3).
 * `errors` = the team cannot function and MUST be rejected at load:
 *  - no active lead → nobody can manage the team, clear stale objections, or
 *    issue passkey-recovery invites (R9).
 * `warnings` = fragile but valid configurations the lead should resolve:
 *  - single active lead (bus-factor 1 for management + recovery),
 *  - quorum == approver count (mandatory unanimity; any absence blocks publish),
 *  - a gated locale with exactly one competent approver (the R10 SPOF),
 *  - members with <2 authenticators (R9 recovery risk).
 */
export function governanceIssues(team: Team): { errors: string[]; warnings: string[] } {
	const errors: string[] = []
	const warnings: string[] = []

	const leads = team.members.filter((m) => m.active && m.role === 'lead')
	if (leads.length === 0) {
		errors.push(
			'No active lead — team:manage / objection:clearStale / quorum:configure unreachable.',
		)
	} else if (leads.length < 2) {
		warnings.push(
			'Only one active lead — single point of failure for team management and passkey recovery (R9).',
		)
	}

	const approverCount = approvers(team).length
	if (approverCount > 0 && team.policy.quorum === approverCount) {
		warnings.push(
			`Quorum (${team.policy.quorum}) equals the approver count — unanimity required; any one absence blocks all full publishes.`,
		)
	}

	for (const loc of team.policy.gatedLocales) {
		if (localeCompetentApprovers(team, loc).length === 1) {
			warnings.push(`Gated locale "${loc}" has only one competent approver — SPOF (R10).`)
		}
	}
	for (const m of team.members.filter(needsBackupAuthenticator)) {
		warnings.push(`Member ${m.id} has <2 authenticators (R9 recovery risk).`)
	}
	return { errors, warnings }
}

export const ALL_LOCALES = LOCALES
