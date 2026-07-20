import { describe, it, expect } from 'vitest'
import { alignBlocks, summarizeTranslation } from './align'
import type { Block } from '../data/types'

const para = (id: string, text: string): Block => ({ id, type: 'paragraph', runs: [{ text }] })

describe('alignBlocks', () => {
	it('pairs source and target blocks that share an id (translated)', () => {
		const rows = alignBlocks([para('p1', 'water is wet')], [para('p1', 'Wasser ist nass')])
		expect(rows).toHaveLength(1)
		expect(rows[0].status).toBe('translated')
		expect(rows[0].source && rows[0].target).toBeTruthy()
	})

	it('marks a source block with no counterpart as untranslated (source only)', () => {
		const rows = alignBlocks([para('p1', 'a'), para('p2', 'b')], [para('p1', 'A')])
		expect(rows.map((r) => [r.id, r.status])).toEqual([
			['p1', 'translated'],
			['p2', 'untranslated'],
		])
		expect(rows[1].target).toBeUndefined()
	})

	it('appends target-only blocks as added, after source-order rows', () => {
		const rows = alignBlocks([para('p1', 'a')], [para('p1', 'A'), para('x', 'extra')])
		expect(rows.map((r) => [r.id, r.status])).toEqual([
			['p1', 'translated'],
			['x', 'added'],
		])
		expect(rows[1].source).toBeUndefined()
	})

	it('preserves source reading order regardless of target order', () => {
		const source = [para('p1', 'a'), para('p2', 'b'), para('p3', 'c')]
		const target = [para('p3', 'C'), para('p1', 'A')]
		const rows = alignBlocks(source, target)
		expect(rows.map((r) => r.id)).toEqual(['p1', 'p2', 'p3'])
	})

	it('summarizes coverage: total counts the translatable (source) surface', () => {
		const rows = alignBlocks(
			[para('p1', 'a'), para('p2', 'b'), para('p3', 'c')],
			[para('p1', 'A'), para('x', 'extra')],
		)
		expect(summarizeTranslation(rows)).toEqual({
			translated: 1,
			untranslated: 2,
			added: 1,
			total: 3,
		})
	})

	it('empty target → all untranslated; empty source → all added', () => {
		expect(summarizeTranslation(alignBlocks([para('a', '1'), para('b', '2')], []))).toEqual({
			translated: 0,
			untranslated: 2,
			added: 0,
			total: 2,
		})
		expect(summarizeTranslation(alignBlocks([], [para('a', '1')]))).toEqual({
			translated: 0,
			untranslated: 0,
			added: 1,
			total: 0,
		})
	})
})
