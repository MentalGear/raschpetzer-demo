import { describe, it, expect } from 'vitest'
import {
	mergeBlocks,
	summarizeMerge,
	resolveBlockAnchor,
	acceptSuggestion,
	applyBlockSuggestion,
} from '../diff/blockMerge'
import { reviewFixture, base, branchA, branchB, comments, suggestions } from './reviewFixture'

// This test is what makes `reviewFixture` a *verified* substrate rather than just
// plausible-looking data: it pins down that every `MergeStatus` (including at least
// two distinct `conflict`s), every comment/suggestion anchor, and every intended
// anchor-resolution outcome the fixture's doc comments promise actually holds — so a
// future edit to the fixture that stops exercising some status/anchor fails loudly
// here instead of silently degrading the demo.

describe('reviewFixture', () => {
	it('exposes base/branchA/branchB/comments/suggestions consistently via the named export', () => {
		expect(reviewFixture.base).toBe(base)
		expect(reviewFixture.branchA).toBe(branchA)
		expect(reviewFixture.branchB).toBe(branchB)
		expect(reviewFixture.comments).toBe(comments)
		expect(reviewFixture.suggestions).toBe(suggestions)
	})

	describe('mergeBlocks(base, branchA, branchB)', () => {
		const entries = mergeBlocks(base.blocks, branchA.blocks, branchB.blocks)
		const summary = summarizeMerge(entries)

		it('hits every MergeStatus at least once', () => {
			expect(summary.unchanged).toBeGreaterThanOrEqual(1)
			expect(summary.changedA).toBeGreaterThanOrEqual(1)
			expect(summary.changedB).toBeGreaterThanOrEqual(1)
			expect(summary.changedBothAgree).toBeGreaterThanOrEqual(1)
			expect(summary.addedA).toBeGreaterThanOrEqual(1)
			expect(summary.addedB).toBeGreaterThanOrEqual(1)
			expect(summary.removed).toBeGreaterThanOrEqual(1)
			expect(summary.conflict).toBeGreaterThanOrEqual(2)
		})

		it('has exactly the expected status distribution (pins the fixture down precisely)', () => {
			expect(summary).toEqual({
				unchanged: 1,
				addedA: 1,
				addedB: 1,
				removed: 2,
				changedA: 1,
				changedB: 1,
				changedBothAgree: 1,
				conflict: 2,
			})
		})

		it('includes a "both edited the same block differently" conflict (list-features)', () => {
			const entry = entries.find((e) => e.id === 'list-features')
			expect(entry).toEqual({
				id: 'list-features',
				status: 'conflict',
				base: base.blocks.find((bl) => bl.id === 'list-features'),
				a: branchA.blocks.find((bl) => bl.id === 'list-features'),
				b: branchB.blocks.find((bl) => bl.id === 'list-features'),
			})
		})

		it('includes a "changed-vs-removed" conflict (A edits callout-access, B deletes it)', () => {
			const entry = entries.find((e) => e.id === 'callout-access')
			expect(entry).toEqual({
				id: 'callout-access',
				status: 'conflict',
				base: base.blocks.find((bl) => bl.id === 'callout-access'),
				a: branchA.blocks.find((bl) => bl.id === 'callout-access'),
			})
		})

		it('changed-a: p-overview is edited in branchA only, branchB matches base', () => {
			const entry = entries.find((e) => e.id === 'p-overview')
			expect(entry).toEqual({
				id: 'p-overview',
				status: 'changed-a',
				base: base.blocks.find((bl) => bl.id === 'p-overview'),
				a: branchA.blocks.find((bl) => bl.id === 'p-overview'),
				b: branchB.blocks.find((bl) => bl.id === 'p-overview'),
			})
		})

		it('changed-b: p-discovery is edited in branchB only, branchA matches base', () => {
			const entry = entries.find((e) => e.id === 'p-discovery')
			expect(entry).toEqual({
				id: 'p-discovery',
				status: 'changed-b',
				base: base.blocks.find((bl) => bl.id === 'p-discovery'),
				a: branchA.blocks.find((bl) => bl.id === 'p-discovery'),
				b: branchB.blocks.find((bl) => bl.id === 'p-discovery'),
			})
		})

		it('changed-both-agree: p-construction is independently edited to the same content', () => {
			const entry = entries.find((e) => e.id === 'p-construction')
			expect(entry).toEqual({
				id: 'p-construction',
				status: 'changed-both-agree',
				base: base.blocks.find((bl) => bl.id === 'p-construction'),
				a: branchA.blocks.find((bl) => bl.id === 'p-construction'),
				b: branchB.blocks.find((bl) => bl.id === 'p-construction'),
			})
		})

		it('added-a: p-new-a is present only in branchA', () => {
			const entry = entries.find((e) => e.id === 'p-new-a')
			expect(entry).toEqual({
				id: 'p-new-a',
				status: 'added-a',
				a: branchA.blocks.find((bl) => bl.id === 'p-new-a'),
			})
		})

		it('added-b: p-new-b is present only in branchB', () => {
			const entry = entries.find((e) => e.id === 'p-new-b')
			expect(entry).toEqual({
				id: 'p-new-b',
				status: 'added-b',
				b: branchB.blocks.find((bl) => bl.id === 'p-new-b'),
			})
		})

		it('removed: quote-visitor is dropped by branchA, kept unchanged by branchB', () => {
			const entry = entries.find((e) => e.id === 'quote-visitor')
			expect(entry).toEqual({
				id: 'quote-visitor',
				status: 'removed',
				base: base.blocks.find((bl) => bl.id === 'quote-visitor'),
				b: branchB.blocks.find((bl) => bl.id === 'quote-visitor'),
			})
		})

		it('removed: p-legacy is dropped by both branches', () => {
			const entry = entries.find((e) => e.id === 'p-legacy')
			expect(entry).toEqual({
				id: 'p-legacy',
				status: 'removed',
				base: base.blocks.find((bl) => bl.id === 'p-legacy'),
			})
		})
	})

	describe('comments', () => {
		it('has at least 3 comments, an open one, a resolved one, and a reply thread', () => {
			expect(comments.length).toBeGreaterThanOrEqual(3)
			expect(comments.some((c) => c.state === 'open')).toBe(true)
			expect(comments.some((c) => c.state === 'resolved')).toBe(true)
			const reply = comments.find((c) => c.parentId !== undefined)
			expect(reply).toBeDefined()
			expect(comments.some((c) => c.id === reply?.parentId)).toBe(true)
		})

		it('anchors every comment at an id that exists in base.blocks', () => {
			const baseIds = new Set(base.blocks.map((b) => b.id))
			for (const c of comments) {
				expect(baseIds.has(c.anchorId), `comment ${c.id} anchors a missing block`).toBe(
					true,
				)
			}
		})

		it("the reply shares its parent's anchorId (thread integrity)", () => {
			const reply = comments.find((c) => c.id === 'c-shaft-count-reply')
			const parent = comments.find((c) => c.id === reply?.parentId)
			expect(reply).toBeDefined()
			expect(parent).toBeDefined()
			expect(reply?.anchorId).toBe(parent?.anchorId)
		})

		it('pins exactly which comment is open vs resolved', () => {
			expect(comments.find((c) => c.id === 'c-shaft-count-root')?.state).toBe('open')
			expect(comments.find((c) => c.id === 'c-shaft-count-reply')?.state).toBe('open')
			expect(comments.find((c) => c.id === 'c-visiting-hours')?.state).toBe('resolved')
		})
	})

	describe('suggestions', () => {
		it('has at least 2 suggestions, each anchored at an id that exists in base.blocks', () => {
			expect(suggestions.length).toBeGreaterThanOrEqual(2)
			const baseIds = new Set(base.blocks.map((b) => b.id))
			for (const s of suggestions) {
				expect(baseIds.has(s.anchorId), `suggestion ${s.id} anchors a missing block`).toBe(
					true,
				)
			}
		})

		it('resolves to the intended resolved / changed / orphaned states against branchA', () => {
			const resolved = suggestions.find((s) => s.anchorId === 'p-discovery')
			const changed = suggestions.find((s) => s.anchorId === 'p-overview')
			const orphaned = suggestions.find((s) => s.anchorId === 'p-legacy')
			expect(resolved).toBeDefined()
			expect(changed).toBeDefined()
			expect(orphaned).toBeDefined()

			expect(resolveBlockAnchor(resolved!.anchorId, branchA.blocks, base.blocks)).toBe(
				'resolved',
			)
			expect(resolveBlockAnchor(changed!.anchorId, branchA.blocks, base.blocks)).toBe(
				'changed',
			)
			expect(resolveBlockAnchor(orphaned!.anchorId, branchA.blocks, base.blocks)).toBe(
				'orphaned',
			)
		})

		it('pins the exact payload of the s-tighten-intro suggestion', () => {
			const suggestion = suggestions.find((s) => s.id === 's-tighten-intro')
			const DAY = 86_400_000
			expect(suggestion).toEqual({
				id: 's-tighten-intro',
				anchorId: 'p-overview',
				author: 'Nora Schmit',
				ts: base.ts + 5 * DAY,
				rationale: 'Lead with the location before the classification, for readability.',
				proposed: {
					id: 'p-overview',
					type: 'paragraph',
					runs: [
						{
							text: 'Near Steinsel in central Luxembourg lies the Raschpëtzer, a Roman-era qanat: a gently sloping underground gallery built to tap groundwater. It is the northernmost known example of Persian-style qanat engineering in the Roman world.',
						},
					],
				},
				state: 'proposed',
			})
		})

		it('propose → accept → apply: accepting s-clarify-discovery then applying it replaces the anchored block', () => {
			const suggestion = suggestions.find((s) => s.id === 's-clarify-discovery')!
			const accepted = acceptSuggestion(suggestion)
			// full spread-integrity: only `state` changes, every other field preserved
			expect(accepted).toEqual({ ...suggestion, state: 'accepted' })

			const next = applyBlockSuggestion(branchA.blocks, accepted)
			expect(next.find((b) => b.id === 'p-discovery')).toEqual(suggestion.proposed)
		})

		it('applying s-tighten-intro still replaces the block even though its anchor is `changed` vs branchA (permissive apply)', () => {
			const suggestion = suggestions.find((s) => s.id === 's-tighten-intro')!
			expect(resolveBlockAnchor(suggestion.anchorId, branchA.blocks, base.blocks)).toBe(
				'changed',
			)

			const next = applyBlockSuggestion(branchA.blocks, suggestion)
			expect(next.find((b) => b.id === 'p-overview')).toEqual(suggestion.proposed)
		})
	})
})
