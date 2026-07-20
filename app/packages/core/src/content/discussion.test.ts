import { describe, it, expect } from 'vitest'
import {
	resolveComment,
	reopenComment,
	acceptSuggestion,
	rejectSuggestion,
	withdrawSuggestion,
	applySuggestion,
	type DiscussionComment,
	type Suggestion,
} from './discussion'

interface Node {
	id: string
	value: string
}
const n = (id: string, value: string): Node => ({ id, value })

const comment = (state: DiscussionComment['state']): DiscussionComment => ({
	id: 'c1',
	anchorId: 'x',
	author: 'alice',
	ts: 1,
	text: 'hello',
	state,
})

const suggestion = (state: Suggestion<Node>['state']): Suggestion<Node> => ({
	id: 's1',
	anchorId: 'x',
	author: 'bob',
	ts: 1,
	proposed: n('x', 'proposed'),
	state,
})

describe('comment transitions', () => {
	it('resolveComment: open → resolved', () => {
		const out = resolveComment(comment('open'))
		expect(out.state).toBe('resolved')
	})

	it('resolveComment: no-op if already resolved (returns an equal, but not necessarily identical, object)', () => {
		const c = comment('resolved')
		const out = resolveComment(c)
		expect(out).toBe(c) // no-op returns the same reference
	})

	it('reopenComment: resolved → open', () => {
		expect(reopenComment(comment('resolved')).state).toBe('open')
	})

	it('reopenComment: no-op if already open', () => {
		const c = comment('open')
		expect(reopenComment(c)).toBe(c)
	})

	it('transitions are pure (do not mutate the input)', () => {
		const c = comment('open')
		const out = resolveComment(c)
		expect(c.state).toBe('open')
		expect(out).not.toBe(c)
	})

	it('resolveComment: non-state fields survive the transition unchanged (spread integrity)', () => {
		const c: DiscussionComment = {
			id: 'c1',
			anchorId: 'x',
			author: 'alice',
			ts: 42,
			text: 'hello world',
			parentId: 'root1',
			state: 'open',
		}
		const out = resolveComment(c)
		expect(out).toEqual({ ...c, state: 'resolved' })
	})

	it('reopenComment: non-state fields survive the transition unchanged (spread integrity)', () => {
		const c: DiscussionComment = {
			id: 'c1',
			anchorId: 'x',
			author: 'alice',
			ts: 42,
			text: 'hello world',
			parentId: 'root1',
			state: 'resolved',
		}
		const out = reopenComment(c)
		expect(out).toEqual({ ...c, state: 'open' })
	})
})

describe('suggestion transitions', () => {
	it('acceptSuggestion: proposed → accepted', () => {
		expect(acceptSuggestion(suggestion('proposed')).state).toBe('accepted')
	})

	it('rejectSuggestion: proposed → rejected', () => {
		expect(rejectSuggestion(suggestion('proposed')).state).toBe('rejected')
	})

	it('withdrawSuggestion: proposed → withdrawn', () => {
		expect(withdrawSuggestion(suggestion('proposed')).state).toBe('withdrawn')
	})

	it('each transition is a no-op from any non-proposed state', () => {
		for (const state of ['accepted', 'rejected', 'withdrawn'] as const) {
			const s = suggestion(state)
			expect(acceptSuggestion(s)).toBe(s)
			expect(rejectSuggestion(s)).toBe(s)
			expect(withdrawSuggestion(s)).toBe(s)
		}
	})

	it('transitions are pure (do not mutate the input)', () => {
		const s = suggestion('proposed')
		const out = acceptSuggestion(s)
		expect(s.state).toBe('proposed')
		expect(out).not.toBe(s)
	})

	it('acceptSuggestion: non-state fields survive the transition unchanged (spread integrity)', () => {
		const s: Suggestion<Node> = {
			id: 's1',
			anchorId: 'x',
			author: 'bob',
			ts: 42,
			proposed: n('x', 'proposed'),
			rationale: 'because',
			state: 'proposed',
		}
		const out = acceptSuggestion(s)
		expect(out).toEqual({ ...s, state: 'accepted' })
	})

	it('rejectSuggestion: non-state fields survive the transition unchanged (spread integrity)', () => {
		const s: Suggestion<Node> = {
			id: 's1',
			anchorId: 'x',
			author: 'bob',
			ts: 42,
			proposed: n('x', 'proposed'),
			rationale: 'because',
			state: 'proposed',
		}
		const out = rejectSuggestion(s)
		expect(out).toEqual({ ...s, state: 'rejected' })
	})

	it('withdrawSuggestion: non-state fields survive the transition unchanged (spread integrity)', () => {
		const s: Suggestion<Node> = {
			id: 's1',
			anchorId: 'x',
			author: 'bob',
			ts: 42,
			proposed: n('x', 'proposed'),
			rationale: 'because',
			state: 'proposed',
		}
		const out = withdrawSuggestion(s)
		expect(out).toEqual({ ...s, state: 'withdrawn' })
	})
})

describe('applySuggestion', () => {
	it('replaces the anchored node with the proposed node', () => {
		const nodes = [n('a', '1'), n('x', 'old'), n('b', '2')]
		const out = applySuggestion(nodes, suggestion('accepted'))
		expect(out).toEqual([n('a', '1'), n('x', 'proposed'), n('b', '2')])
	})

	it('is pure (does not mutate the input array)', () => {
		const nodes = [n('x', 'old')]
		applySuggestion(nodes, suggestion('accepted'))
		expect(nodes).toEqual([n('x', 'old')])
	})

	it('is a no-op when the anchor is orphaned', () => {
		const nodes = [n('a', '1')]
		const out = applySuggestion(nodes, suggestion('accepted'))
		expect(out).toBe(nodes)
	})

	it('replaces the LAST occurrence on a duplicate anchor id (last-wins, matches diff/merge)', () => {
		const nodes = [n('x', 'first'), n('a', '1'), n('x', 'second')]
		const out = applySuggestion(nodes, suggestion('accepted'))
		expect(out).toEqual([n('x', 'first'), n('a', '1'), n('x', 'proposed')])
	})

	it('is state-agnostic: replaces the node even for a still-`proposed` suggestion (does not gate on state)', () => {
		const nodes = [n('a', '1'), n('x', 'old'), n('b', '2')]
		const out = applySuggestion(nodes, suggestion('proposed'))
		expect(out).toEqual([n('a', '1'), n('x', 'proposed'), n('b', '2')])
	})
})
