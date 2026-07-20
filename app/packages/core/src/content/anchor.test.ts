import { describe, it, expect } from 'vitest'
import { resolveAnchor } from './anchor'

interface Node {
	id: string
	value: string
}
const n = (id: string, value: string): Node => ({ id, value })

describe('resolveAnchor', () => {
	it('is orphaned when the anchor id is absent from current', () => {
		expect(resolveAnchor('gone', [n('x', 'a')])).toBe('orphaned')
	})

	it('is resolved when present in current and no origin is given', () => {
		expect(resolveAnchor('x', [n('x', 'a')])).toBe('resolved')
	})

	it('is resolved when present in current with the same signature as origin', () => {
		const origin = [n('x', 'a')]
		const current = [n('x', 'a')]
		expect(resolveAnchor('x', current, origin)).toBe('resolved')
	})

	it('is changed when present in current but the signature differs from origin', () => {
		const origin = [n('x', 'a')]
		const current = [n('x', 'a2')]
		expect(resolveAnchor('x', current, origin)).toBe('changed')
	})

	it('is orphaned even when origin still has the (now-removed) node', () => {
		const origin = [n('x', 'a')]
		const current: Node[] = []
		expect(resolveAnchor('x', current, origin)).toBe('orphaned')
	})

	it('is resolved when current has the node but origin does not contain the id', () => {
		// nothing to compare against — treated as resolved, not changed.
		const origin = [n('other', 'z')]
		const current = [n('x', 'a')]
		expect(resolveAnchor('x', current, origin)).toBe('resolved')
	})

	it('matches the LAST occurrence on a duplicate anchor id (last-wins, matches diff/merge)', () => {
		const origin = [n('x', 'a'), n('x', 'b')]
		const current = [n('x', 'first'), n('x', 'b')]
		// last of origin is 'b', last of current is 'b' → same signature → resolved
		expect(resolveAnchor('x', current, origin)).toBe('resolved')

		const changedCurrent = [n('x', 'first'), n('x', 'different')]
		expect(resolveAnchor('x', changedCurrent, origin)).toBe('changed')
	})

	it('is insensitive to field construction order when comparing to origin', () => {
		interface Multi {
			id: string
			a: number
			b: number
		}
		const origin: Multi[] = [{ id: 'x', a: 1, b: 2 }]
		const current: Multi[] = [{ b: 2, id: 'x', a: 1 }]
		expect(resolveAnchor('x', current, origin)).toBe('resolved')
	})
})
