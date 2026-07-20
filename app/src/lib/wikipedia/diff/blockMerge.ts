/**
 * Three-way structured (block-level) merge between a common ancestor revision and two
 * diverging revisions — NOT a text/line three-way merge. A thin, `Block`-typed adapter
 * over `@kit/core`'s generic `threeWayMerge` (blocks are matched by their stable `id`;
 * each id across `base`/`a`/`b` is classified into one of the eight `MergeStatus`es —
 * see `@kit/core/content/merge.ts` for the full rule table), plus `Block`-typed wrappers
 * over the anchor-resolution and suggestion-application helpers a discussion/review UI
 * needs. The generic algorithm + its tests live in `packages/core/src/content/merge.ts`
 * (`merge.test.ts`), `anchor.ts`, and `discussion.ts`; this file only adapts them to the
 * `Block` domain type so app code (and a future review UI) imports one domain module
 * instead of reaching into `@kit/core` directly. Since `MergeEntry` already keys its
 * payload fields `base`/`a`/`b` (no field-rename needed, unlike `blockDiff.ts`'s
 * `node`→`block`), this stays a near pass-through. The `DiscussionComment`/`Suggestion`
 * transitions (`acceptSuggestion`/`rejectSuggestion`/`withdrawSuggestion`/
 * `resolveComment`/`reopenComment`) are generic over their node type already, so they
 * need no `Block` adaptation and are re-exported here bare — same reasoning as
 * `summarizeMerge` — so app code still has one domain module to import from. Pure TS,
 * no DOM.
 */
import {
	threeWayMerge,
	summarizeMerge,
	resolveAnchor,
	applySuggestion,
	acceptSuggestion,
	rejectSuggestion,
	withdrawSuggestion,
	resolveComment,
	reopenComment,
	type MergeEntry,
	type MergeStatus,
	type MergeSummary,
	type DiscussionComment,
	type Suggestion,
	type AnchorState,
} from '@kit/core'
import type { Block } from '../data/types'

export {
	summarizeMerge,
	acceptSuggestion,
	rejectSuggestion,
	withdrawSuggestion,
	resolveComment,
	reopenComment,
}
export type { MergeStatus, MergeSummary, AnchorState }

/** `Block`-typed alias of the generic `MergeEntry<T>`. */
export type BlockMergeEntry = MergeEntry<Block>

/** `Block`-typed alias of `Suggestion<T>` — a proposed replacement block. */
export type BlockSuggestion = Suggestion<Block>

export type { DiscussionComment }

/** Three-way merge `base`/`a`/`b` block lists by stable block id. */
export function mergeBlocks(base: Block[], a: Block[], b: Block[]): BlockMergeEntry[] {
	return threeWayMerge<Block>(base, a, b)
}

/**
 * Resolve `anchorId` (a comment's or suggestion's anchor) against `current` blocks,
 * optionally compared to the `origin` revision the anchor was made against.
 */
export function resolveBlockAnchor(
	anchorId: string,
	current: Block[],
	origin?: Block[],
): AnchorState {
	return resolveAnchor<Block>(anchorId, current, origin)
}

/** Apply an (accepted) `Block` suggestion: replace the anchored block with `s.proposed`. */
export function applyBlockSuggestion(blocks: Block[], s: BlockSuggestion): Block[] {
	return applySuggestion<Block>(blocks, s)
}
