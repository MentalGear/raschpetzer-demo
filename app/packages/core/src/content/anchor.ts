/**
 * Anchor resolution: given the id a comment/suggestion is attached to, determine
 * whether that anchor still points at a live, unchanged node in the current content —
 * the substrate a discussion-thread UI needs to decide whether to render a comment
 * inline, flag it as pointing at edited content, or fold it into an "orphaned" bucket.
 *
 * Pure TS, no DOM, deterministic.
 */
import { nodeSignature } from './diff'

export type AnchorState = 'resolved' | 'changed' | 'orphaned'

/**
 * Resolve `anchorId` against `current`:
 * - not found in `current` → `orphaned` (the anchored node no longer exists).
 * - found, and `origin` was given and also contains the id, but with a different
 *   `nodeSignature` → `changed` (the node still exists but its content moved under
 *   the anchor since the comment/suggestion was made).
 * - found, and either `origin` was not given or `origin` doesn't contain the id
 *   (nothing to compare against) or the signature matches → `resolved`.
 *
 * Duplicate ids in `current`/`origin` are a data-integrity error, not a normal input; matched
 * **last-wins** (the last occurrence with the given id), matching `diffNodes`/`threeWayMerge`.
 */
export function resolveAnchor<T extends { id: string }>(
	anchorId: string,
	current: T[],
	origin?: T[],
): AnchorState {
	const node = current.findLast((n) => n.id === anchorId)
	if (!node) return 'orphaned'
	if (!origin) return 'resolved'
	const originNode = origin.findLast((n) => n.id === anchorId)
	if (!originNode) return 'resolved'
	return nodeSignature(node) !== nodeSignature(originNode) ? 'changed' : 'resolved'
}
