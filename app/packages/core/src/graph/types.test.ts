import { describe, it, expect } from 'vitest'
import { buildGraph, compareIds } from './types'

describe('buildGraph', () => {
	it('builds an empty graph from no nodes/edges', () => {
		const g = buildGraph<string>([], [])
		expect([...g.nodes]).toEqual([])
		expect(g.out.size).toBe(0)
		expect(g.in.size).toBe(0)
	})

	it('registers every node with empty out/in sets even with no edges', () => {
		const g = buildGraph(['a', 'b'], [])
		expect(g.out.get('a')).toEqual(new Set())
		expect(g.in.get('b')).toEqual(new Set())
	})

	it('builds out/in adjacency from directed edges', () => {
		const g = buildGraph(
			['a', 'b', 'c'],
			[
				['a', 'b'],
				['b', 'c'],
			],
		)
		expect(g.out.get('a')).toEqual(new Set(['b']))
		expect(g.out.get('b')).toEqual(new Set(['c']))
		expect(g.in.get('b')).toEqual(new Set(['a']))
		expect(g.in.get('c')).toEqual(new Set(['b']))
	})

	it('dedupes repeated identical edges', () => {
		const g = buildGraph(
			['a', 'b'],
			[
				['a', 'b'],
				['a', 'b'],
			],
		)
		expect(g.out.get('a')?.size).toBe(1)
	})

	it('drops self-loops', () => {
		const g = buildGraph(['a'], [['a', 'a']])
		expect(g.out.get('a')?.size).toBe(0)
		expect(g.in.get('a')?.size).toBe(0)
	})

	it('ignores edges referencing an id outside the node set', () => {
		const g = buildGraph(['a', 'b'], [['a', 'ghost']])
		expect(g.out.get('a')?.size).toBe(0)
		expect([...g.nodes]).toEqual(['a', 'b']) // the unknown id is not silently added
	})

	it('ignores an edge whose source is unknown', () => {
		const g = buildGraph(['a', 'b'], [['ghost', 'a']])
		expect(g.in.get('a')?.size).toBe(0)
	})
})

describe('compareIds', () => {
	it('orders strings lexicographically', () => {
		expect(compareIds('a', 'b')).toBeLessThan(0)
		expect(compareIds('b', 'a')).toBeGreaterThan(0)
		expect(compareIds('a', 'a')).toBe(0)
	})

	it('orders numbers numerically, not via their string form', () => {
		expect(compareIds(2, 10)).toBeLessThan(0)
		expect(compareIds(10, 2)).toBeGreaterThan(0)
		expect(compareIds(2, 2)).toBe(0)
	})

	it('still orders string ids lexicographically (not numerically) even when numeric-looking', () => {
		expect(compareIds('2', '10')).toBeGreaterThan(0) // '2' > '10' lexicographically
	})
})
