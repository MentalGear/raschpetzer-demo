import { describe, it, expect } from 'vitest'
import { resolveMenu } from './resolve'
import type { CommandCtx, MenuItem } from './types'

// Domain-free fixtures. `Icon` is irrelevant to resolution, so use `unknown`.
type Item = MenuItem<unknown>

const sep = (id: string, when?: (c: CommandCtx) => boolean): Item => ({ id, separator: true, when })
const cmd = (id: string, when?: (c: CommandCtx) => boolean): Item => ({
	id,
	label: id,
	command: id,
	when,
})

describe('resolveMenu', () => {
	it('keeps items with no `when` and items whose `when` is true', () => {
		const out = resolveMenu([cmd('a'), cmd('b', () => true)], {})
		expect(out.map((i) => i.id)).toEqual(['a', 'b'])
	})

	it('drops items whose `when` is false', () => {
		const out = resolveMenu([cmd('a'), cmd('b', () => false), cmd('c')], {})
		expect(out.map((i) => i.id)).toEqual(['a', 'c'])
	})

	it('passes ctx to predicates', () => {
		const items = [cmd('del', (c) => !c.readOnly)]
		expect(resolveMenu(items, { readOnly: true })).toHaveLength(0)
		expect(resolveMenu(items, { readOnly: false })).toHaveLength(1)
	})

	it('removes leading, trailing, and collapses adjacent separators', () => {
		const items = [sep('s0'), cmd('a'), sep('s1'), sep('s2'), cmd('b'), sep('s3')]
		expect(resolveMenu(items, {}).map((i) => i.id)).toEqual(['a', 's1', 'b'])
	})

	it('collapses separators exposed by filtering out the only item between them', () => {
		const items = [cmd('a'), sep('s1'), cmd('gone', () => false), sep('s2'), cmd('b')]
		expect(resolveMenu(items, {}).map((i) => i.id)).toEqual(['a', 's1', 'b'])
	})

	it('recurses into submenus and filters their children', () => {
		const items: Item[] = [
			{
				id: 'album',
				label: 'Add to Album',
				children: [cmd('fav'), cmd('hidden', () => false), cmd('recents')],
			},
		]
		const out = resolveMenu(items, {})
		expect(out).toHaveLength(1)
		const sub = out[0] as Extract<Item, { children: Item[] }>
		expect(sub.children.map((i) => i.id)).toEqual(['fav', 'recents'])
	})

	it('drops a submenu left empty after its children are filtered out', () => {
		const items: Item[] = [
			cmd('a'),
			{ id: 'empty', label: 'Empty', children: [cmd('x', () => false)] },
		]
		expect(resolveMenu(items, {}).map((i) => i.id)).toEqual(['a'])
	})

	it('does not mutate the input', () => {
		const items = [cmd('a'), cmd('b', () => false)]
		const snapshot = JSON.parse(JSON.stringify(items.map((i) => i.id)))
		resolveMenu(items, {})
		expect(items.map((i) => i.id)).toEqual(snapshot)
	})

	// --- Edge cases ---

	it('keeps a separator with a true `when` and drops one with false `when`', () => {
		// separator with when=true is kept; separator with when=false is dropped
		const items = [cmd('a'), sep('s1', () => true), cmd('b'), sep('s2', () => false), cmd('c')]
		const out = resolveMenu(items, {})
		expect(out.map((i) => i.id)).toEqual(['a', 's1', 'b', 'c'])
	})

	it('drops a `when=false` separator and tidies any resulting adjacency', () => {
		// Both separators around 'b' — dropping the second leaves no adjacent sep issue
		// but ensure no dangling separator remains when the only thing between them is dropped.
		const items = [cmd('a'), sep('s1', () => false), sep('s2', () => false), cmd('b')]
		const out = resolveMenu(items, {})
		// Both separators are filtered; result is just the two commands
		expect(out.map((i) => i.id)).toEqual(['a', 'b'])
	})

	it('resolves a 2-level nested submenu (outer → inner → leaf)', () => {
		const items: Item[] = [
			{
				id: 'outer',
				label: 'Outer',
				children: [
					{
						id: 'inner',
						label: 'Inner',
						children: [cmd('leaf'), cmd('hidden', () => false)],
					},
					cmd('sibling'),
				],
			},
		]
		const out = resolveMenu(items, {})
		expect(out).toHaveLength(1)
		const outer = out[0] as Extract<Item, { children: Item[] }>
		expect(outer.id).toBe('outer')
		expect(outer.children).toHaveLength(2)

		const inner = outer.children[0] as Extract<Item, { children: Item[] }>
		expect(inner.id).toBe('inner')
		// 'hidden' filtered out; only 'leaf' remains
		expect(inner.children.map((i) => i.id)).toEqual(['leaf'])

		expect(outer.children[1].id).toBe('sibling')
	})

	it('returns [] for all-separator input', () => {
		const items = [sep('s1'), sep('s2')]
		const out = resolveMenu(items, {})
		expect(out).toEqual([])
	})
})
