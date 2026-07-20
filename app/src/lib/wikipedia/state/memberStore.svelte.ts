/**
 * The demo's "currently logged-in member" — a minimal, front-end-only login concept
 * (no real auth). It gates BOTH the member-only top-bar admin surface (§D of the
 * floating-edit redesign) AND edit capability — but the gate is LOGIN, not role:
 * ANY logged-in member can edit + open Review; a logged-out reader can't. (The true
 * editor-vs-reviewer capability model + a session-independent review surface are
 * deferred to the multi-role drive — see the redesign doc §D/decisions.)
 *
 * Roles are still surfaced, but as INFORMATIONAL labels only (they never gate
 * capability). They're derived from the SAME source the consensus gate uses
 * (`DEMO_TEAM` in `backend.ts`): a `contributor` shows as "Editor", an `approver` as
 * "Reviewer" (ada = Editor; bao & cleo = Reviewers), displayed in the member menu and
 * the Members admin page.
 *
 * Members here are the app's UI-layer view of `DEMO_MEMBERS`: the raw backend names carry
 * the role in parens ("Ada (editor)"), so we split a clean display name + the role label
 * without touching the gate's `Team`/`DEMO_MEMBERS` shape.
 */
import { DEMO_MEMBERS, DEMO_TEAM, type DemoMemberId } from '../content/backend'

/** First-class role: the app's editor (authors) vs reviewer (approves quorum). */
export type WikiRole = 'editor' | 'reviewer'

export type WikiMember = {
	id: DemoMemberId
	/** clean display name, e.g. "Ada" (the raw backend name is "Ada (editor)"). */
	name: string
	/** machine role derived from the team (`contributor`→editor, `approver`→reviewer). */
	role: WikiRole
	/** human label for the role, e.g. "Editor" / "Reviewer". */
	roleLabel: string
}

/** Two-letter avatar initials — one shared helper (was duplicated across components). */
export const initials = (name: string): string => name.slice(0, 2).toUpperCase()

/** Map a member id to its first-class role via the gate's `DEMO_TEAM` (single source of
 *  truth): a `contributor` authors → editor; an `approver` reviews → reviewer. */
function roleFor(id: DemoMemberId): WikiRole {
	const m = DEMO_TEAM.members.find((x) => x.id === id)
	return m?.role === 'contributor' ? 'editor' : 'reviewer'
}

const ROLE_LABEL: Record<WikiRole, string> = { editor: 'Editor', reviewer: 'Reviewer' }

/** The three demo identities as UI members (stable module const — never mutated). */
export const MEMBERS: WikiMember[] = DEMO_MEMBERS.map((m) => {
	const role = roleFor(m.id)
	return {
		id: m.id,
		name: m.name.replace(/\s*\(.*\)$/, ''),
		role,
		roleLabel: ROLE_LABEL[role],
	}
})

class MemberStore {
	/** the logged-in member, default Ada (the demo editor); `null` = logged out.
	 *  `raw` — a small object we only ever reassign wholesale. */
	current = $state.raw<WikiMember | null>(MEMBERS[0])

	/** the logged-in member (null when logged out → the admin button + Edit are hidden). */
	get currentMember(): WikiMember | null {
		return this.current
	}

	/** switch/log in the acting member (demo/role drive). */
	login(id: DemoMemberId): void {
		this.current = MEMBERS.find((m) => m.id === id) ?? null
	}

	/** log out → hides the member-only admin button + gates editing (demonstrates the gate). */
	logout(): void {
		this.current = null
	}
}

export const memberStore = new MemberStore()
