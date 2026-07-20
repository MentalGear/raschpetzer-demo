import { describe, it, expect } from 'vitest'
import { threeWayMerge, summarizeMerge } from './merge'

interface Node {
	id: string
	value: string
}
const n = (id: string, value: string): Node => ({ id, value })

describe('threeWayMerge', () => {
	it('marks a node unchanged in both sides as unchanged', () => {
		const base = [n('x', 'a')]
		const a = [n('x', 'a')]
		const b = [n('x', 'a')]
		const m = threeWayMerge(base, a, b)
		expect(m).toEqual([{ id: 'x', status: 'unchanged', base: base[0], a: a[0], b: b[0] }])
	})

	it('added only in a → added-a; added only in b → added-b', () => {
		const base: Node[] = []
		const aNode = n('x', 'a')
		const bNode = n('x', 'a')
		expect(threeWayMerge(base, [aNode], [])[0]).toEqual({
			id: 'x',
			status: 'added-a',
			a: aNode,
		})
		expect(threeWayMerge(base, [], [bNode])[0]).toEqual({
			id: 'x',
			status: 'added-b',
			b: bNode,
		})
	})

	it('added in both with the same signature → changed-both-agree', () => {
		const aNode = n('x', 'a')
		const bNode = n('x', 'a')
		const m = threeWayMerge([], [aNode], [bNode])
		expect(m[0]).toEqual({ id: 'x', status: 'changed-both-agree', a: aNode, b: bNode })
	})

	it('added in both with different signatures (same id) → conflict', () => {
		const aNode = n('x', 'a')
		const bNode = n('x', 'b')
		const m = threeWayMerge([], [aNode], [bNode])
		expect(m[0]).toEqual({ id: 'x', status: 'conflict', a: aNode, b: bNode })
	})

	it('removed in both → removed (both-removed: only `base` carried)', () => {
		const base = [n('x', 'a')]
		expect(threeWayMerge(base, [], [])[0]).toEqual({
			id: 'x',
			status: 'removed',
			base: base[0],
		})
	})

	it("removed in b only, a unchanged → removed (b's deletion wins, no conflict)", () => {
		const base = [n('x', 'a')]
		const aNode = n('x', 'a')
		const m = threeWayMerge(base, [aNode], [])
		expect(m[0]).toEqual({ id: 'x', status: 'removed', base: base[0], a: aNode })
	})

	it('removed in a only, b unchanged → removed', () => {
		const base = [n('x', 'a')]
		const bNode = n('x', 'a')
		const m = threeWayMerge(base, [], [bNode])
		expect(m[0]).toEqual({ id: 'x', status: 'removed', base: base[0], b: bNode })
	})

	it('changed in a, removed in b → conflict (changed-vs-removed, a-side)', () => {
		const base = [n('x', 'a')]
		const aNode = n('x', 'a2')
		const m = threeWayMerge(base, [aNode], [])
		expect(m[0]).toEqual({ id: 'x', status: 'conflict', base: base[0], a: aNode })
	})

	it('changed in b, removed in a → conflict (changed-vs-removed, b-side)', () => {
		const base = [n('x', 'a')]
		const bNode = n('x', 'a2')
		const m = threeWayMerge(base, [], [bNode])
		expect(m[0]).toEqual({ id: 'x', status: 'conflict', base: base[0], b: bNode })
	})

	it('changed only in a → changed-a; changed only in b → changed-b', () => {
		const base = [n('x', 'a')]
		const aChangedNode = n('x', 'a2')
		const bSameNode = n('x', 'a')
		expect(threeWayMerge(base, [aChangedNode], [bSameNode])[0]).toEqual({
			id: 'x',
			status: 'changed-a',
			base: base[0],
			a: aChangedNode,
			b: bSameNode,
		})
		const aSameNode = n('x', 'a')
		const bChangedNode = n('x', 'a2')
		expect(threeWayMerge(base, [aSameNode], [bChangedNode])[0]).toEqual({
			id: 'x',
			status: 'changed-b',
			base: base[0],
			a: aSameNode,
			b: bChangedNode,
		})
	})

	it('changed in both to the same value → changed-both-agree', () => {
		const base = [n('x', 'a')]
		const aNode = n('x', 'a2')
		const bNode = n('x', 'a2')
		const m = threeWayMerge(base, [aNode], [bNode])
		expect(m[0]).toEqual({
			id: 'x',
			status: 'changed-both-agree',
			base: base[0],
			a: aNode,
			b: bNode,
		})
	})

	it('changed in both to different values → conflict (both-changed-differ)', () => {
		const base = [n('x', 'a')]
		const aNode = n('x', 'a2')
		const bNode = n('x', 'a3')
		const m = threeWayMerge(base, [aNode], [bNode])
		expect(m[0]).toEqual({ id: 'x', status: 'conflict', base: base[0], a: aNode, b: bNode })
	})

	it('carries base/a/b node references through on each status', () => {
		const base = [n('x', 'a')]
		const a = [n('x', 'a2')]
		const b = [n('x', 'a')]
		const m = threeWayMerge(base, a, b)
		expect(m[0]).toEqual({ id: 'x', status: 'changed-a', base: base[0], a: a[0], b: b[0] })
	})

	it('handles a full three-way scenario across many ids and summarizes it', () => {
		const base = [
			n('unchanged', 'u'),
			n('onlyA', 'a'),
			n('onlyB', 'b'),
			n('agree', 'g'),
			n('conflict', 'c'),
			n('removedBoth', 'r'),
			n('changedA1', 'ca1'),
			n('changedA2', 'ca2'),
			n('changedB1', 'cb1'),
			n('changedB2', 'cb2'),
			n('changedB3', 'cb3'),
		]
		const a = [
			n('unchanged', 'u'),
			n('onlyA', 'a2'),
			n('agree', 'g2'),
			n('conflict', 'c-a'),
			n('changedA1', 'ca1-x'),
			n('changedA2', 'ca2-x'),
			n('changedB1', 'cb1'),
			n('changedB2', 'cb2'),
			n('changedB3', 'cb3'),
			n('newA', 'na'),
		]
		const b = [
			n('unchanged', 'u'),
			n('onlyB', 'b2'),
			n('agree', 'g2'),
			n('conflict', 'c-b'),
			n('changedA1', 'ca1'),
			n('changedA2', 'ca2'),
			n('changedB1', 'cb1-x'),
			n('changedB2', 'cb2-x'),
			n('changedB3', 'cb3-x'),
			n('newB', 'nb'),
		]
		const m = threeWayMerge(base, a, b)
		const byId = Object.fromEntries(m.map((e) => [e.id, e.status]))
		expect(byId).toEqual({
			unchanged: 'unchanged',
			onlyA: 'conflict', // changed in a, removed in b
			onlyB: 'conflict', // changed in b, removed in a
			agree: 'changed-both-agree',
			conflict: 'conflict',
			removedBoth: 'removed',
			changedA1: 'changed-a',
			changedA2: 'changed-a',
			changedB1: 'changed-b',
			changedB2: 'changed-b',
			changedB3: 'changed-b',
			newA: 'added-a',
			newB: 'added-b',
		})
		// removed / changed-a / changed-b each occur with DISTINCT, non-zero counts (1 / 2 / 3),
		// so a swapped status→field mapping in summarizeMerge would fail this assertion.
		const sum = summarizeMerge(m)
		expect(sum).toEqual({
			unchanged: 1,
			addedA: 1,
			addedB: 1,
			removed: 1,
			changedA: 2,
			changedB: 3,
			changedBothAgree: 1,
			conflict: 3,
		})
	})

	it('summarizeMerge maps every status to the right field — PAIRWISE-DISTINCT counts (1..8)', () => {
		// The previous scenario had ties (unchanged/addedA/addedB/removed all at 1; changedA at 2
		// tied with nothing but changedBothAgree=1/conflict=3 not all distinct either) — a status
		// pair could be swapped in STATUS_TO_SUMMARY_KEY and this kind of fixture would still pass
		// (e.g. swapping unchanged<->addedA, both counted 1). Here every one of the 8
		// `MergeSummary` fields gets a unique count (1..8), so swapping ANY two mapping entries
		// necessarily changes at least one field's expected count and fails `toEqual`.
		const base: Node[] = []
		const a: Node[] = []
		const b: Node[] = []

		// unchanged: 1
		for (let i = 0; i < 1; i++) {
			base.push(n(`unchanged${i}`, 'u'))
			a.push(n(`unchanged${i}`, 'u'))
			b.push(n(`unchanged${i}`, 'u'))
		}
		// added-a: 2 (base absent, a only)
		for (let i = 0; i < 2; i++) {
			a.push(n(`addedA${i}`, 'a'))
		}
		// added-b: 3 (base absent, b only)
		for (let i = 0; i < 3; i++) {
			b.push(n(`addedB${i}`, 'b'))
		}
		// removed: 4 (base present, both sides dropped it)
		for (let i = 0; i < 4; i++) {
			base.push(n(`removed${i}`, 'r'))
		}
		// changed-a: 5 (base present, a diverges, b matches base)
		for (let i = 0; i < 5; i++) {
			base.push(n(`changedA${i}`, 'base'))
			a.push(n(`changedA${i}`, 'a-changed'))
			b.push(n(`changedA${i}`, 'base'))
		}
		// changed-b: 6 (base present, b diverges, a matches base)
		for (let i = 0; i < 6; i++) {
			base.push(n(`changedB${i}`, 'base'))
			a.push(n(`changedB${i}`, 'base'))
			b.push(n(`changedB${i}`, 'b-changed'))
		}
		// changed-both-agree: 7 (base present, both diverge to the SAME value)
		for (let i = 0; i < 7; i++) {
			base.push(n(`agree${i}`, 'base'))
			a.push(n(`agree${i}`, 'agreed'))
			b.push(n(`agree${i}`, 'agreed'))
		}
		// conflict: 8 (base present, both diverge to DIFFERENT values)
		for (let i = 0; i < 8; i++) {
			base.push(n(`conflict${i}`, 'base'))
			a.push(n(`conflict${i}`, 'a-changed'))
			b.push(n(`conflict${i}`, 'b-changed'))
		}

		const m = threeWayMerge(base, a, b)
		const sum = summarizeMerge(m)
		expect(sum).toEqual({
			unchanged: 1,
			addedA: 2,
			addedB: 3,
			removed: 4,
			changedA: 5,
			changedB: 6,
			changedBothAgree: 7,
			conflict: 8,
		})
	})

	it('preserves id order — union of base/a/b, first-seen order across the three lists', () => {
		const base = [n('one', '1'), n('two', '2')]
		const a = [n('two', '2'), n('three', '3')] // 'three' first appears in a
		const b = [n('one', '1'), n('four', '4')] // 'four' first appears in b
		const m = threeWayMerge(base, a, b)
		expect(m.map((e) => e.id)).toEqual(['one', 'two', 'three', 'four'])
	})

	it('duplicate id within a single list: last-wins (documents the data-integrity edge)', () => {
		const base = [n('dup', 'a'), n('dup', 'b')] // base Map keeps last: 'b'
		const aNode = n('dup', 'b') // matches base's last ('b') → unchanged on the a-side
		const bNode = n('dup', 'c')
		const m = threeWayMerge(base, [aNode], [bNode])
		expect(m).toHaveLength(1)
		expect(m[0]).toEqual({
			id: 'dup',
			status: 'changed-b',
			base: n('dup', 'b'),
			a: aNode,
			b: bNode,
		})
	})

	it('duplicate id in a and in b (not just base): all three collapse last-wins', () => {
		const base = [n('dup', 'x'), n('dup', 'base-last')] // base Map keeps last: 'base-last'
		const a = [n('dup', 'a-first'), n('dup', 'a-last')] // a Map keeps last: 'a-last'
		const b = [n('dup', 'b-first'), n('dup', 'b-last')] // b Map keeps last: 'b-last'
		const m = threeWayMerge(base, a, b)
		expect(m).toHaveLength(1)
		expect(m[0]).toEqual({
			id: 'dup',
			status: 'conflict', // base present, a and b both changed and disagree
			base: n('dup', 'base-last'),
			a: n('dup', 'a-last'),
			b: n('dup', 'b-last'),
		})
	})

	it('is insensitive to field construction order when comparing signatures', () => {
		interface Multi {
			id: string
			a: number
			b: number
		}
		const base: Multi[] = [{ id: 'x', a: 1, b: 2 }]
		const same = [{ b: 2, id: 'x', a: 1 }]
		const m = threeWayMerge(base, same, same)
		expect(m[0].status).toBe('unchanged')
	})
})
