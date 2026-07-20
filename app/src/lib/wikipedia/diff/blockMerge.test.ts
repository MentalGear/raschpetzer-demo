import { describe, it, expect } from 'vitest'
import {
	mergeBlocks,
	summarizeMerge,
	resolveBlockAnchor,
	applyBlockSuggestion,
	acceptSuggestion,
	rejectSuggestion,
	withdrawSuggestion,
	resolveComment,
	reopenComment,
	type BlockSuggestion,
	type DiscussionComment,
} from './blockMerge'
import type { Block, ParagraphBlock } from '../data/types'

// The generic three-way-merge algorithm (the full status rule table, duplicate-id
// handling, id ordering, signature comparison) is tested against a domain-free fixture
// in `packages/core/src/content/merge.test.ts`. This is a smoke test of the app-level
// adapter: it must produce `Block`-typed `MergeEntry`s (still keyed `base`/`a`/`b`, no
// rename needed) and its `Block`-typed anchor/suggestion wrappers must behave the same
// as the generic functions they wrap.
const para = (id: string, text: string): ParagraphBlock => ({
	id,
	type: 'paragraph',
	runs: [{ text }],
})
const heading = (id: string, text: string): Block => ({ id, type: 'heading', level: 2, text })

describe('mergeBlocks (adapter smoke test)', () => {
	it('produces Block-typed entries keyed base/a/b, one per id, exact statuses + payloads', () => {
		const base = [heading('h', 'Title'), para('unchanged', 'same'), para('onlyBase', 'gone')]
		const a = [heading('h', 'Title'), para('unchanged', 'same'), para('addedBoth', 'new-a')]
		const b = [heading('h', 'Title'), para('unchanged', 'same'), para('addedBoth', 'new-a')]

		const m = mergeBlocks(base, a, b)
		expect(m.map((e) => [e.id, e.status])).toEqual([
			['h', 'unchanged'],
			['unchanged', 'unchanged'],
			['onlyBase', 'removed'],
			['addedBoth', 'changed-both-agree'],
		])
		expect(m[0]).toEqual({ id: 'h', status: 'unchanged', base: base[0], a: a[0], b: b[0] })
		expect(m[2]).toEqual({ id: 'onlyBase', status: 'removed', base: base[2] })
		expect(m[3]).toEqual({ id: 'addedBoth', status: 'changed-both-agree', a: a[2], b: b[2] })
	})

	it('flags a conflict when both sides edit the same block differently', () => {
		const base = [para('p', 'base text')]
		const a = [para('p', 'a text')]
		const b = [para('p', 'b text')]
		const m = mergeBlocks(base, a, b)
		expect(m).toEqual([{ id: 'p', status: 'conflict', base: base[0], a: a[0], b: b[0] }])
	})

	it('flags a conflict when one side edits and the other removes (changed-vs-removed, a-side)', () => {
		const base = [para('p', 'base text')]
		const a = [para('p', 'edited text')]
		const b: Block[] = []
		const m = mergeBlocks(base, a, b)
		expect(m).toEqual([{ id: 'p', status: 'conflict', base: base[0], a: a[0] }])
	})

	it('flags a conflict when one side edits and the other removes (changed-vs-removed, b-side)', () => {
		const base = [para('p', 'base text')]
		const a: Block[] = []
		const b = [para('p', 'edited text')]
		const m = mergeBlocks(base, a, b)
		expect(m).toEqual([{ id: 'p', status: 'conflict', base: base[0], b: b[0] }])
	})

	it('produces added-a for a block present only in a (base and b absent)', () => {
		const base: Block[] = []
		const a = [para('p', 'new in a')]
		const b: Block[] = []
		const m = mergeBlocks(base, a, b)
		expect(m).toEqual([{ id: 'p', status: 'added-a', a: a[0] }])
	})

	it('produces added-b for a block present only in b (base and a absent)', () => {
		const base: Block[] = []
		const a: Block[] = []
		const b = [para('p', 'new in b')]
		const m = mergeBlocks(base, a, b)
		expect(m).toEqual([{ id: 'p', status: 'added-b', b: b[0] }])
	})

	it('produces changed-a when only a edits a block both sides kept', () => {
		const base = [para('p', 'base text')]
		const a = [para('p', 'a-edited text')]
		const b = [para('p', 'base text')]
		const m = mergeBlocks(base, a, b)
		expect(m).toEqual([{ id: 'p', status: 'changed-a', base: base[0], a: a[0], b: b[0] }])
	})

	it('produces changed-b when only b edits a block both sides kept', () => {
		const base = [para('p', 'base text')]
		const a = [para('p', 'base text')]
		const b = [para('p', 'b-edited text')]
		const m = mergeBlocks(base, a, b)
		expect(m).toEqual([{ id: 'p', status: 'changed-b', base: base[0], a: a[0], b: b[0] }])
	})
})

describe('summarizeMerge (re-export)', () => {
	it('counts every status across a mixed merge', () => {
		const base = [para('unchanged', 'u'), para('removed', 'r'), para('conflict', 'base')]
		const a = [para('unchanged', 'u'), para('conflict', 'a'), para('addedA', 'new')]
		const b = [para('unchanged', 'u'), para('conflict', 'b'), para('addedB', 'new')]
		const m = mergeBlocks(base, a, b)
		expect(summarizeMerge(m)).toEqual({
			unchanged: 1,
			addedA: 1,
			addedB: 1,
			removed: 1,
			changedA: 0,
			changedB: 0,
			changedBothAgree: 0,
			conflict: 1,
		})
	})
})

describe('resolveBlockAnchor', () => {
	it('resolves an anchor still present and unchanged since origin', () => {
		const origin = [para('p', 'text')]
		const current = [para('p', 'text')]
		expect(resolveBlockAnchor('p', current, origin)).toBe('resolved')
	})

	it('flags an anchor whose block changed since origin', () => {
		const origin = [para('p', 'text')]
		const current = [para('p', 'edited')]
		expect(resolveBlockAnchor('p', current, origin)).toBe('changed')
	})

	it('flags an orphaned anchor (block no longer present)', () => {
		const current = [para('other', 'text')]
		expect(resolveBlockAnchor('p', current)).toBe('orphaned')
	})

	it('resolves a present anchor when no origin is given (nothing to compare against)', () => {
		const current = [para('p', 'text')]
		expect(resolveBlockAnchor('p', current)).toBe('resolved')
	})
})

// The suggestion/comment transitions are re-exported bare from `@kit/core` (no `Block`
// adaptation needed). These smoke tests pin the *adapter's re-export surface* — imported
// from `./blockMerge`, not `@kit/core` — so dropping/mis-aliasing one of them is caught
// here even before a UI consumes them (the underlying transitions are proven in
// `packages/core/src/content/discussion.test.ts`; this only guards the re-export).
describe('discussion/suggestion transitions (re-export surface)', () => {
	const suggestion: BlockSuggestion = {
		id: 's',
		anchorId: 'p',
		author: 'Reviewer',
		ts: 0,
		proposed: para('p', 'x'),
		state: 'proposed',
	}
	const comment: DiscussionComment = {
		id: 'c',
		anchorId: 'p',
		author: 'Reviewer',
		ts: 0,
		text: 'hi',
		state: 'open',
	}

	it('acceptSuggestion: proposed → accepted (spread-preserving)', () => {
		expect(acceptSuggestion(suggestion)).toEqual({ ...suggestion, state: 'accepted' })
	})
	it('rejectSuggestion: proposed → rejected', () => {
		expect(rejectSuggestion(suggestion)).toEqual({ ...suggestion, state: 'rejected' })
	})
	it('withdrawSuggestion: proposed → withdrawn', () => {
		expect(withdrawSuggestion(suggestion)).toEqual({ ...suggestion, state: 'withdrawn' })
	})
	it('resolveComment / reopenComment round-trip open ↔ resolved', () => {
		const resolved = resolveComment(comment)
		expect(resolved).toEqual({ ...comment, state: 'resolved' })
		expect(reopenComment(resolved)).toEqual(comment)
	})
})

describe('applyBlockSuggestion', () => {
	it('replaces the anchored block with the proposed block', () => {
		const blocks = [para('a', '1'), para('b', '2')]
		const suggestion: BlockSuggestion = {
			id: 's1',
			anchorId: 'b',
			author: 'Reviewer',
			ts: 0,
			proposed: para('b', 'replaced'),
			state: 'proposed',
		}
		const next = applyBlockSuggestion(blocks, suggestion)
		expect(next).toEqual([para('a', '1'), para('b', 'replaced')])
		expect(blocks[1]).toEqual(para('b', '2')) // original array untouched
	})

	it('is a no-op when the anchor is orphaned', () => {
		const blocks = [para('a', '1')]
		const suggestion: BlockSuggestion = {
			id: 's1',
			anchorId: 'missing',
			author: 'Reviewer',
			ts: 0,
			proposed: para('missing', 'x'),
			state: 'proposed',
		}
		expect(applyBlockSuggestion(blocks, suggestion)).toBe(blocks)
	})
})
