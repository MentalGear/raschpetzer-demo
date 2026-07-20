import { describe, it, expect } from 'vitest'
import { diffBlocks, summarize } from './blockDiff'
import type { Block, ParagraphBlock } from '../data/types'

// The generic diff algorithm (matching by id, structural-signature comparison,
// ordering, duplicate-id handling, insensitivity to field-construction order, …) is
// now tested against a domain-free fixture in `packages/core/src/content/diff.test.ts`.
// This is a smoke test of the app-level adapter: it must produce `Block`-typed entries
// keyed by `.block` (not `.node`, which `@kit/core`'s generic `DiffEntry` uses) so
// `RevisionDiff.svelte` / `RevisionHistory.svelte` keep working unchanged, and it must
// still catch Block-specific structural edits (inline marks, links) that flatten to
// the same rendered text.
const para = (id: string, text: string): ParagraphBlock => ({
	id,
	type: 'paragraph',
	runs: [{ text }],
})
const heading = (id: string, text: string): Block => ({ id, type: 'heading', level: 2, text })

describe('diffBlocks (adapter smoke test)', () => {
	it('produces Block-typed entries under `.block`, in new-revision order, with removed appended', () => {
		const oldB = [para('p1', 'a'), para('p2', 'b')]
		const newB = [para('p1', 'a2'), para('p3', 'c')]
		const d = diffBlocks(oldB, newB)
		expect(d.map((e) => [e.block.id, e.status])).toEqual([
			['p1', 'changed'],
			['p3', 'added'],
			['p2', 'removed'],
		])
		expect(d[0].prev?.id).toBe('p1')
		expect(summarize(d)).toEqual({ added: 1, removed: 1, changed: 1 })
	})

	it('treats a same-id block whose type changed as changed', () => {
		const d = diffBlocks([para('x', 'Title')], [heading('x', 'Title')])
		expect(d[0].status).toBe('changed')
	})

	it('detects Block-specific structural edits that flatten to the same rendered text', () => {
		// heading level change (same text) → changed
		const h1 = { id: 'h', type: 'heading', level: 2, text: 'Overview' } as const
		const h2 = { id: 'h', type: 'heading', level: 3, text: 'Overview' } as const
		expect(diffBlocks([h1], [h2])[0].status).toBe('changed')

		// inline mark added (bold) but same rendered text → changed
		const plain: Block = { id: 'p', type: 'paragraph', runs: [{ text: 'water is wet' }] }
		const bold: Block = {
			id: 'p',
			type: 'paragraph',
			runs: [{ text: 'water is wet', marks: { bold: true } }],
		}
		expect(diffBlocks([plain], [bold])[0].status).toBe('changed')

		// internal link added on a run (same text) → changed
		const linked: Block = {
			id: 'p',
			type: 'paragraph',
			runs: [{ text: 'water is wet', marks: { link: { kind: 'internal', slug: 'water' } } }],
		}
		expect(diffBlocks([plain], [linked])[0].status).toBe('changed')
	})

	it('empty → all added; identical → all unchanged', () => {
		expect(summarize(diffBlocks([], [para('a', '1'), para('b', '2')]))).toEqual({
			added: 2,
			removed: 0,
			changed: 0,
		})
		const same = [para('a', '1')]
		expect(summarize(diffBlocks(same, same))).toEqual({ added: 0, removed: 0, changed: 0 })
	})
})
