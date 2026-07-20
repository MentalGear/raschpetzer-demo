/**
 * Smoke test for the VENDORED `createMemoryBackend` — proves the real Thesoria
 * in-memory backend (structural 3-way merge + the D19 consensus gate) runs
 * end-to-end against this app's own schema + a minimal demo `Team`, the way
 * `backend.ts` wires it up (see its `DEMO_TEAM`). This is deliberately NOT a
 * re-test of Thesoria's own unit suite (mergePage/consensus have their own
 * upstream coverage) — it only proves the WIRING: seed -> loadPage -> openChange
 * -> stage -> approve -> evaluate -> publish, against the REAL gate (no stub).
 *
 * Runs in the "server" vitest project (plain `.test.ts`, no DOM needed — pure
 * orchestration over in-memory state).
 */
import { describe, it, expect } from 'vitest'
import { createMemoryBackend } from './memoryBackend'
import { teamSchema, type Team } from './identity'
import { articleToPage } from '../fromArticle'
import { articles } from '../../data/mock'
import type { Page } from './schema'

/** Same shape as `backend.ts`'s `DEMO_TEAM` (kept local to this test so it does
 *  not depend on `backend.ts`'s module-scope singleton / mock-article seeding). */
const DEMO_TEAM: Team = teamSchema.parse({
	schemaVersion: 1,
	policy: { quorum: 2, gatedLocales: [] },
	members: [
		{ id: 'ada', name: 'Ada', role: 'contributor', localeCompetencies: ['en'] },
		{ id: 'bao', name: 'Bao', role: 'approver', localeCompetencies: ['en', 'de'] },
		{ id: 'cleo', name: 'Cleo', role: 'approver', localeCompetencies: ['en', 'fr', 'lb'] },
	],
})

describe('createMemoryBackend (vendored, real gate — not the retired StubBackend)', () => {
	it('seeds, loads, stages an edit, and publishes once quorum is met', async () => {
		const seedPage: Page = articleToPage(articles[0])
		const backend = createMemoryBackend({ team: DEMO_TEAM, seed: [seedPage] })

		expect(await backend.loadPage(seedPage.slug, seedPage.locale)).toEqual(seedPage)

		const change = await backend.openChange({
			slug: seedPage.slug,
			locale: seedPage.locale,
			actor: 'ada',
		})
		expect(change.slug).toBe(seedPage.slug)
		expect(change.locale).toBe(seedPage.locale)

		const edited: Page = { ...seedPage, title: `${seedPage.title} (edited)` }
		const staged = await backend.stage({
			changeId: change.id,
			page: edited,
			baseHeadKey: change.baseHeadKey,
			actor: 'ada',
		})
		expect(staged.headKey).not.toBe(change.baseHeadKey) // new content -> a new content-hash head

		// A solo (author-only) publish would be blocked by the quorum-of-2 gate — get bao +
		// cleo's approvals (both distinct from the author `ada`, both eligible approvers) so
		// this proves the FULL happy path, not just the gate's blocking side.
		await backend.approve({ changeId: change.id, reviewer: 'bao', headKey: staged.headKey })
		await backend.approve({ changeId: change.id, reviewer: 'cleo', headKey: staged.headKey })

		const evaluation = await backend.evaluate(change.id)
		expect(evaluation.allowed).toBe(true)
		expect(evaluation.eligibleApprovals.sort()).toEqual(['bao', 'cleo'])

		const result = await backend.publish(change.id)
		expect('published' in result).toBe(true)
		if ('published' in result) {
			expect(result.published).toBe(true)
			expect(result.page.title).toBe(edited.title)
		}

		// The published change is now live.
		const live = await backend.loadPage(seedPage.slug, seedPage.locale)
		expect(live?.title).toBe(edited.title)
	})

	it('blocks a solo publish (no approvals) with the real gate — the `blocked` shape', async () => {
		const seedPage: Page = articleToPage(articles[1])
		const backend = createMemoryBackend({ team: DEMO_TEAM, seed: [seedPage] })

		const change = await backend.openChange({
			slug: seedPage.slug,
			locale: seedPage.locale,
			actor: 'ada',
		})
		await backend.stage({
			changeId: change.id,
			page: { ...seedPage, title: `${seedPage.title} v2` },
			baseHeadKey: change.baseHeadKey,
			actor: 'ada',
		})

		const result = await backend.publish(change.id)
		expect('blocked' in result).toBe(true)
		if ('blocked' in result) {
			expect(result.evaluation.allowed).toBe(false)
			expect(result.evaluation.blocks).toContainEqual({
				code: 'quorum_not_met',
				have: 0,
				need: 2,
			})
		}
	})
})
