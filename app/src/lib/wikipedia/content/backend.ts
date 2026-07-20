/**
 * The app's single `ContentBackend` instance, seeded from the mock articles
 * (converted to `Page`s), running the VENDORED Thesoria in-memory backend
 * (`createMemoryBackend` — structural 3-way merge + the D19 consensus gate).
 * This replaces the hand-written `StubBackend` (`./stub`, now deleted), which
 * short-circuited the gate/merge; `createMemoryBackend` runs the real logic
 * against a minimal demo `Team` (below) instead.
 */
import { articles } from '../data/mock'
import { articleToPage } from './fromArticle'
import { createMemoryBackend } from './thesoria/memoryBackend'
import { teamSchema, type Team } from './thesoria/identity'
import type { ContentBackend, HeadKey } from './thesoria/contentBackend'
import { renderPageToHtml } from './renderPageHtml'

// Module-scope singleton. This is safe ONLY because the app is an SPA
// (`ssr=false` in src/routes/+layout.ts) — the module lives in one browser tab,
// never a shared server process. Re-enabling SSR would turn this into shared
// cross-request/user state; keep the backend browser-only if that ever changes.
let instance: ContentBackend | null = null

/**
 * A minimal 3-member demo team matching `DEMO_MEMBERS` below (same ids), built
 * to satisfy the vendored consensus gate's `Team` shape:
 *  - `ada` (the demo's default "actor"/editor, `DEMO_MEMBERS[0]`) is a
 *    `contributor` — can draft/stage content but cannot approve/publish, so she
 *    can never grant herself quorum (the gate's no-self-quorum rule is
 *    author-based and would already exclude her either way, but the role match
 *    keeps the demo team's shape honest with the "editor" vs. "reviewer" labels
 *    in `DEMO_MEMBERS`).
 *  - `bao` and `cleo` are `approver`s (the demo's reviewers), together giving a
 *    quorum of 2 distinct eligible approvals.
 *  - `gatedLocales: []` — no locale-competence gate for this demo (every locale
 *    the mock corpus uses — en/de/fr/lb — would otherwise need a competent
 *    approver on the team; kept simple since the demo isn't exercising R10/D19's
 *    locale-gating specifically).
 * Built via `teamSchema.parse` (not a hand-typed literal) so the same
 * `superRefine` invariants the real gate relies on (unique member ids, quorum
 * <= approver count, gated-locale coverage) are enforced here too — a typo'd
 * demo team fails loudly at module load instead of silently never reaching quorum.
 */
export const DEMO_TEAM: Team = teamSchema.parse({
	schemaVersion: 1,
	policy: { quorum: 2, gatedLocales: [] },
	members: [
		{ id: 'ada', name: 'Ada (editor)', role: 'contributor', localeCompetencies: ['en'] },
		{ id: 'bao', name: 'Bao (reviewer)', role: 'approver', localeCompetencies: ['en', 'de'] },
		{
			id: 'cleo',
			name: 'Cleo (reviewer)',
			role: 'approver',
			localeCompetencies: ['en', 'fr', 'lb'],
		},
	],
})

// Rendered HTML per published head, keyed by `PublishResult.headKey` — set by
// `withRenderedHtml` below. A plain module-scope Map (not on the `Page`/`Article`
// schemas, both vendored — see their own do-not-hand-edit headers): rendered HTML is
// a derived cache artifact of a publish, not part of the canonical content those
// schemas describe, and keeping it out of them means a future re-vendor needs zero
// reconciliation for this feature. Not yet consumed anywhere in the app (no `{@html}`
// call site) — this lands the generation + storage plumbing on its own, ahead of any
// decision to actually serve it.
const renderedHtmlByHeadKey = new Map<HeadKey, string>()

/** The HTML `renderPageToHtml` produced for a given publish, if that head has been
 *  published through `getBackend()` — undefined for a head that was never published
 *  (e.g. a still-open change) or predates this feature landing. */
export function getRenderedHtml(headKey: HeadKey): string | undefined {
	return renderedHtmlByHeadKey.get(headKey)
}

/** Wrap a `ContentBackend` so every successful `publish()` also renders the merged
 *  `Page` to HTML and stores it, keyed by the publish's `headKey`. A decorator over
 *  the vendored adapter (not an edit to it, nor to the vendored `ContentBackend` port
 *  itself) — `createMemoryBackend`'s other methods pass through unchanged via the
 *  spread; only `publish` is intercepted. This IS "hosted behind ContentBackend's
 *  publish()": the interface doesn't change, so a future non-simulated backend
 *  implementing the same port picks up the identical contract without this wrapper
 *  needing to know or care which concrete adapter it's wrapping.
 *
 *  `'published' in result`, not `result.published`: `PublishResult` is a union of
 *  three differently-shaped variants (`published`/`blocked`/`conflict`), each its own
 *  literal discriminant key — only the success variant HAS a `published` property at
 *  all, so `result.published` doesn't type-check across the union (caught by an
 *  independent review's `bun run check` — root's own check doesn't reach this
 *  package, see the troubleshooting note this finding produced). Matches the same
 *  `in`-guard `thesoria/memoryBackend.smoke.test.ts` already uses for the same union.
 *
 *  The render+store runs AFTER `backend.publish()` has already returned success —
 *  the underlying store is already mutated by then (a real publish happened). A
 *  render failure must never surface as a failed publish to the caller (rendering is
 *  a derived cache artifact, not part of what "publish" means), so it's caught and
 *  logged, never rethrown — an already-successful publish always returns success.
 *
 *  Exported (not module-private) so the render-failure-must-not-reject-the-publish
 *  case can be tested directly against a fake `ContentBackend` — going through the
 *  real `createMemoryBackend` for that case isn't possible: its `stage()` already
 *  rejects a schema-illegal `Page` via `parsePage` before `publish()` is ever
 *  reached (see `renderPageHtml.svelte.test.ts`), so the only way to get a
 *  `PublishResult` whose `page` breaks `renderPageToHtml` is to fabricate one. */
export function withRenderedHtml(backend: ContentBackend): ContentBackend {
	return {
		...backend,
		async publish(changeId) {
			const result = await backend.publish(changeId)
			if ('published' in result) {
				try {
					renderedHtmlByHeadKey.set(result.headKey, renderPageToHtml(result.page))
				} catch (err) {
					console.error(
						'renderPageToHtml failed for a successful publish; HTML not cached',
						err,
					)
				}
			}
			return result
		},
	}
}

export function getBackend(): ContentBackend {
	if (!instance)
		instance = withRenderedHtml(
			createMemoryBackend({ seed: articles.map(articleToPage), team: DEMO_TEAM }),
		)
	return instance
}

/** Fixed demo identities (no real auth — see the seam contract §1). */
export const DEMO_MEMBERS = [
	{ id: 'ada', name: 'Ada (editor)' },
	{ id: 'bao', name: 'Bao (reviewer)' },
	{ id: 'cleo', name: 'Cleo (reviewer)' },
] as const
export type DemoMemberId = (typeof DEMO_MEMBERS)[number]['id']
