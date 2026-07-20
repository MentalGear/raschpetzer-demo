import { describe, it, expect } from 'vitest'
import { diffNodes, summarize, stableStringify, nodeSignature } from './diff'

// Domain-free fixture node (kit tests must not import app/domain code).
interface Node {
	id: string
	kind: string
	value?: unknown
}
const node = (id: string, kind: string, value?: unknown): Node => ({ id, kind, value })

describe('diffNodes', () => {
	it('marks a node present only in the new list as added', () => {
		const oldN = [node('p1', 'text', 'a')]
		const newN = [node('p1', 'text', 'a'), node('p2', 'text', 'b')]
		const d = diffNodes(oldN, newN)
		expect(d.map((e) => e.status)).toEqual(['unchanged', 'added'])
		expect(summarize(d)).toEqual({ added: 1, removed: 0, changed: 0 })
	})

	it('marks a node present only in the old list as removed', () => {
		const d = diffNodes(
			[node('p1', 'text', 'a'), node('p2', 'text', 'b')],
			[node('p1', 'text', 'a')],
		)
		expect(d.map((e) => e.status)).toEqual(['unchanged', 'removed'])
		expect(summarize(d)).toEqual({ added: 0, removed: 1, changed: 0 })
	})

	it('marks a same-id node with a different signature as changed and keeps prev', () => {
		const d = diffNodes([node('p1', 'text', 'old')], [node('p1', 'text', 'new')])
		expect(d[0].status).toBe('changed')
		expect(d[0].prev && d[0].prev.id).toBe('p1')
		expect(summarize(d)).toEqual({ added: 0, removed: 0, changed: 1 })
	})

	it('treats a same-id node whose kind changed as changed', () => {
		const d = diffNodes([node('x', 'text', 'Title')], [node('x', 'heading', 'Title')])
		expect(d[0].status).toBe('changed')
	})

	it('preserves new-list reading order and appends removed nodes', () => {
		const oldN = [node('p1', 't', 'a'), node('p2', 't', 'b'), node('p3', 't', 'c')]
		const newN = [node('p2', 't', 'b'), node('p1', 't', 'a2')]
		const d = diffNodes(oldN, newN)
		expect(d.map((e) => [e.node.id, e.status])).toEqual([
			['p2', 'unchanged'],
			['p1', 'changed'],
			['p3', 'removed'],
		])
	})

	it('is insensitive to field construction order (no spurious change)', () => {
		const a = { id: 'h', kind: 'heading', value: { level: 2, text: 'Overview' } } as Node
		const b = { value: { text: 'Overview', level: 2 }, id: 'h', kind: 'heading' } as Node
		expect(diffNodes([a], [b])[0].status).toBe('unchanged')
	})

	it('collapses duplicate ids last-wins (documents the data-integrity edge)', () => {
		// Duplicate ids are a data-integrity error, not a normal input. The old Map keeps the
		// last dup ('b'); the new node ('b') matches it → a single `unchanged`, no removed.
		const d = diffNodes([node('dup', 't', 'a'), node('dup', 't', 'b')], [node('dup', 't', 'b')])
		expect(d.map((e) => e.status)).toEqual(['unchanged'])
	})

	it('collapses a duplicate id on the NEW side too, last-wins, one entry', () => {
		const oldN = [node('dup', 't', 'x')]
		const newN = [node('dup', 't', 'a'), node('dup', 't', 'b')]
		const d = diffNodes(oldN, newN)
		// exactly one entry for 'dup' — last dup ('b') wins, compared against old ('x') → changed
		expect(d).toHaveLength(1)
		expect(d[0].status).toBe('changed')
		expect(d[0].node.value).toBe('b')
	})

	it('multiple removed nodes appear in old order, after new-order entries', () => {
		const oldN = [
			node('p1', 't', 'a'),
			node('p2', 't', 'b'),
			node('p3', 't', 'c'),
			node('p4', 't', 'd'),
		]
		const newN = [node('p2', 't', 'b')]
		const d = diffNodes(oldN, newN)
		expect(d.map((e) => [e.node.id, e.status])).toEqual([
			['p2', 'unchanged'],
			['p1', 'removed'],
			['p3', 'removed'],
			['p4', 'removed'],
		])
	})

	it('a removed duplicate-id produces exactly ONE removed entry (last-wins value)', () => {
		// Duplicate ids on the old side are a data-integrity error, not a normal input; the
		// removed-loop must walk the deduped old side (not raw oldNodes), so a dup-id removal
		// still produces exactly one `removed` entry, per the "one entry per id" docstring.
		const d = diffNodes([node('a', 't', 1), node('a', 't', 2)], [])
		expect(d).toHaveLength(1)
		expect(d[0].status).toBe('removed')
		expect(d[0].node.value).toBe(2) // last-wins
	})

	it('empty → all added; identical → all unchanged', () => {
		expect(summarize(diffNodes([], [node('a', 't', '1'), node('b', 't', '2')]))).toEqual({
			added: 2,
			removed: 0,
			changed: 0,
		})
		const same = [node('a', 't', '1')]
		expect(summarize(diffNodes(same, same))).toEqual({ added: 0, removed: 0, changed: 0 })
	})
})

describe('stableStringify', () => {
	it('sorts object keys recursively', () => {
		expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
		expect(stableStringify({ b: { d: 1, c: 2 }, a: 1 })).toBe(
			stableStringify({ a: 1, b: { c: 2, d: 1 } }),
		)
	})

	it('drops undefined-valued keys, matching JSON.stringify', () => {
		expect(stableStringify({ a: 1, b: undefined })).toBe(JSON.stringify({ a: 1 }))
	})

	it('serializes arrays element-wise, preserving order', () => {
		expect(stableStringify([1, { b: 1, a: 2 }])).toBe('[1,{"a":2,"b":1}]')
	})

	it('tags NaN/Infinity/-Infinity distinctly instead of collapsing to null', () => {
		const nan = stableStringify(NaN)
		const inf = stableStringify(Infinity)
		const negInf = stableStringify(-Infinity)
		const nul = stableStringify(null)
		// all four must be pairwise distinct
		expect(new Set([nan, inf, negInf, nul]).size).toBe(4)
	})

	it('serializes different Dates (via .toJSON()) to different strings', () => {
		const a = stableStringify(new Date('2020-01-01T00:00:00.000Z'))
		const b = stableStringify(new Date('2021-01-01T00:00:00.000Z'))
		expect(a).not.toBe(b)
		expect(a).toBe(stableStringify(new Date('2020-01-01T00:00:00.000Z')))
	})

	it('handles bigint without throwing, and distinguishes values', () => {
		expect(() => stableStringify(10n)).not.toThrow()
		expect(stableStringify(10n)).not.toBe(stableStringify(11n))
		expect(stableStringify(10n)).toBe(stableStringify(10n))
	})

	it('two different symbols produce distinct signatures (not a shared "undefined")', () => {
		expect(stableStringify(Symbol('a'))).not.toBe(stableStringify(Symbol('b')))
	})

	it('-0 is tagged distinctly from 0', () => {
		expect(stableStringify(-0)).not.toBe(stableStringify(0))
	})

	it('top-level undefined returns a distinct string, not the JS value undefined', () => {
		const s = stableStringify(undefined)
		expect(typeof s).toBe('string')
		expect(s).toBe('\u0000undefined')
	})

	it('a string field cannot forge a special-value tag (tag-injection)', () => {
		// The tags used to be quoted strings (`'"__NaN__"'`) byte-identical to a stringified string,
		// so a text field whose content literally was "__NaN__" collided with an actual NaN. Every
		// tag now leads with a raw NUL that JSON.stringify escapes, so no string can reproduce one.
		const forgeries: [unknown, string][] = [
			[NaN, '__NaN__'],
			[undefined, '__undefined__'],
			[Infinity, '__Infinity__'],
			[-Infinity, '__-Infinity__'],
			[-0, '__-0__'],
			[5n, '__bigint__:5'],
			[Symbol('x'), '__symbol__:Symbol(x)'],
		]
		for (const [special, forged] of forgeries) {
			expect(stableStringify(special)).not.toBe(stableStringify(forged))
		}
		// …and it must still hold nested in a node field, since that is what reaches diffNodes.
		expect(nodeSignature({ id: 'a', v: NaN })).not.toBe(
			nodeSignature({ id: 'b', v: '__NaN__' }),
		)
	})

	it('always returns a string, even for a function (totality)', () => {
		expect(typeof stableStringify(() => 1)).toBe('string')
		expect(typeof stableStringify(function named() {})).toBe('string')
	})

	it('two different RegExps produce distinct signatures (no collapse to "{}")', () => {
		expect(stableStringify(/abc/)).not.toBe(stableStringify(/def/))
		expect(stableStringify(/abc/g)).not.toBe(stableStringify(/abc/i)) // flags matter
		expect(stableStringify(/abc/)).not.toBe(stableStringify({}))
		expect(stableStringify(/abc/g)).toBe(stableStringify(/abc/g))
	})

	it('two different Errors produce distinct signatures (no collapse to "{}")', () => {
		expect(stableStringify(new Error('boom'))).not.toBe(stableStringify(new Error('bang')))
		expect(stableStringify(new Error('boom'))).not.toBe(stableStringify({}))
		expect(stableStringify(new TypeError('x'))).not.toBe(stableStringify(new RangeError('x'))) // name matters
	})

	it('an array-contained undefined is distinct from [] and from [null]', () => {
		const withUndefined = stableStringify([undefined])
		const empty = stableStringify([])
		const withNull = stableStringify([null])
		expect(new Set([withUndefined, empty, withNull]).size).toBe(3)
	})

	it('two different Maps produce distinct signatures', () => {
		const a = stableStringify(
			new Map([
				['a', 1],
				['b', 2],
			]),
		)
		const b = stableStringify(
			new Map([
				['a', 1],
				['b', 3],
			]),
		)
		expect(a).not.toBe(b)
		expect(a).toBe(
			stableStringify(
				new Map([
					['a', 1],
					['b', 2],
				]),
			),
		)
	})

	it('two different Sets produce distinct signatures', () => {
		const a = stableStringify(new Set([1, 2, 3]))
		const b = stableStringify(new Set([1, 2, 4]))
		expect(a).not.toBe(b)
		expect(a).toBe(stableStringify(new Set([1, 2, 3])))
	})

	it('a Map and a Set do not collapse to the shared "{}" a bare object would', () => {
		const emptyMap = stableStringify(new Map())
		const emptySet = stableStringify(new Set())
		const emptyObj = stableStringify({})
		expect(new Set([emptyMap, emptySet, emptyObj]).size).toBe(3)
	})
})

describe('nodeSignature', () => {
	it('excludes the id field from the fingerprint', () => {
		expect(nodeSignature(node('x', 'text', 'a'))).toBe(nodeSignature(node('y', 'text', 'a')))
	})

	it('differs when any non-id field differs', () => {
		expect(nodeSignature(node('x', 'text', 'a'))).not.toBe(
			nodeSignature(node('x', 'text', 'b')),
		)
	})
})
