import { describe, it, expect } from 'vitest'
import { buildGraph } from './types'
import { neighbors, outbound, inbound } from './neighbors'

// a -> b -> c -> a (triangle), plus d isolated
const graph = buildGraph(
	['a', 'b', 'c', 'd'],
	[
		['a', 'b'],
		['b', 'c'],
		['c', 'a'],
	],
)

describe('outbound / inbound', () => {
	it('returns the outbound set for a node', () => {
		expect(outbound(graph, 'a')).toEqual(new Set(['b']))
	})

	it('returns the inbound set for a node', () => {
		expect(inbound(graph, 'a')).toEqual(new Set(['c']))
	})

	it('returns an empty set for an unknown id', () => {
		expect(outbound(graph, 'ghost')).toEqual(new Set())
		expect(inbound(graph, 'ghost')).toEqual(new Set())
	})
})

describe('neighbors', () => {
	it('unions outbound and inbound, deduped', () => {
		// a links to b (out) and is linked from c (in) -> {b, c}
		expect(new Set(neighbors(graph, 'a'))).toEqual(new Set(['b', 'c']))
	})

	it('never includes the node itself', () => {
		expect(neighbors(graph, 'a')).not.toContain('a')
	})

	it('returns [] for an isolated node', () => {
		expect(neighbors(graph, 'd')).toEqual([])
	})

	it('returns [] for an unknown id', () => {
		expect(neighbors(graph, 'ghost')).toEqual([])
	})

	it('dedupes a mutual edge (a<->b) into one neighbour', () => {
		const g = buildGraph(
			['x', 'y'],
			[
				['x', 'y'],
				['y', 'x'],
			],
		)
		expect(neighbors(g, 'x')).toEqual(['y'])
	})
})
