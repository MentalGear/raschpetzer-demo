/**
 * Semantic (block-level) diff between two revisions of an article — NOT a raw
 * line/character diff. A thin, `Block`-typed adapter over `@kit/core`'s generic
 * `diffNodes` (blocks are matched by their stable `id`; each surviving block is
 * added / removed / changed / unchanged). This is the research's "present prose
 * changes as reviewable change-sets, not line diffs" (Upwelling/Peritext) applied to
 * the demo. The generic algorithm + its tests now live in
 * `packages/core/src/content/diff.ts` (`packages/core/src/content/diff.test.ts`);
 * this file only adapts `@kit/core`'s `node`-shaped entries to the `block`-shaped
 * entries this app's components (`RevisionDiff.svelte`, `RevisionHistory.svelte`)
 * already consume. Pure TS, no DOM.
 */
import { diffNodes, summarize as coreSummarize, type DiffStatus, type DiffSummary } from '@kit/core'
import type { Block } from '../data/types'

export type { DiffStatus, DiffSummary }

export interface DiffEntry {
	status: DiffStatus
	block: Block
	/** the previous block (only for `changed`), for a before/after view. */
	prev?: Block
}

/** Diff `oldBlocks` → `newBlocks` by stable block id. */
export function diffBlocks(oldBlocks: Block[], newBlocks: Block[]): DiffEntry[] {
	return diffNodes(oldBlocks, newBlocks).map((e) => ({
		status: e.status,
		block: e.node,
		prev: e.prev,
	}))
}

// Reuses @kit/core's `summarize` (it only inspects `.status`) via a cheap field-rename map —
// this app's `DiffEntry` uses `.block` where the kit's generic uses `.node`, so a direct call
// would need a cast; this way there isn't one.
export function summarize(entries: DiffEntry[]): DiffSummary {
	return coreSummarize(entries.map((e) => ({ status: e.status, node: e.block, prev: e.prev })))
}
