import { describe, it, expect } from 'vitest'
import { buildGraph } from './types'
import { related } from './related'

// p1 -> {x,y,z}; p2 -> {x,y}; p3 -> {x}; p5 -> {y}; p4 -> {} (no outbound links)
const graph = buildGraph(
	['p1', 'p2', 'p3', 'p4', 'p5', 'x', 'y', 'z'],
	[
		['p1', 'x'],
		['p1', 'y'],
		['p1', 'z'],
		['p2', 'x'],
		['p2', 'y'],
		['p3', 'x'],
		['p5', 'y'],
	],
)

describe('related', () => {
	it('scores by Jaccard overlap of outbound link sets, sorted desc', () => {
		const out = related(graph, 'p1')
		// p2 shares {x,y} (2/3), p3 and p5 each share one link (1/3) — p4/x/y/z have
		// no overlap (p4 has no outbound links; x/y/z have no outbound links either)
		expect(out.map((r) => r.id)).toEqual(['p2', 'p3', 'p5'])
		expect(out[0].score).toBeCloseTo(2 / 3)
		expect(out[1].score).toBeCloseTo(1 / 3)
	})

	it('tiebreaks equal scores by id (compareIds, ascending)', () => {
		const out = related(graph, 'p1')
		const [, second, third] = out
		expect(second.score).toBe(third.score)
		expect(second.id < third.id).toBe(true) // 'p3' < 'p5'
	})

	it('excludes the queried id itself', () => {
		const out = related(graph, 'p1')
		expect(out.map((r) => r.id)).not.toContain('p1')
	})

	it('respects `limit`', () => {
		const out = related(graph, 'p1', { limit: 1 })
		expect(out).toEqual([{ id: 'p2', score: 2 / 3 }])
	})

	it('clamps a negative `limit` to zero results instead of slicing from the end', () => {
		expect(related(graph, 'p1', { limit: -1 })).toEqual([])
	})

	it('returns [] for a node with no outbound links', () => {
		expect(related(graph, 'p4')).toEqual([])
	})

	it('returns [] for an unknown id', () => {
		expect(related(graph, 'ghost')).toEqual([])
	})

	it('returns [] when nothing shares any link', () => {
		const isolated = buildGraph(['a', 'b', 'c'], [['a', 'c']])
		expect(related(isolated, 'a')).toEqual([]) // b has no outbound links to overlap with
	})
})
