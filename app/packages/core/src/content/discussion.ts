/**
 * Discussion data model for structured content: comments (anchored, threaded, open/
 * resolved) and suggestions (an anchored *proposed replacement* for a node, subject to
 * accept/reject/withdraw). Generic over the node type `T` so it composes with any
 * domain's content list (see `diff.ts` / `merge.ts` / `anchor.ts`).
 *
 * All transitions are pure and **no-op on an illegal move** (rather than throw) — e.g.
 * resolving an already-resolved comment, or accepting a suggestion that isn't
 * `proposed`, returns the input unchanged. This makes transitions safe to call from a
 * UI without pre-validating state, and keeps them trivially idempotent.
 *
 * Pure TS, no DOM, deterministic (no `Date.now`/`Math.random` — callers pass `ts`).
 */

export interface DiscussionComment {
	id: string
	/** the node id this comment is attached to. */
	anchorId: string
	author: string
	ts: number
	text: string
	/** set for a reply; unset for a thread root. */
	parentId?: string
	state: 'open' | 'resolved'
}

export interface Suggestion<T> {
	id: string
	/** the node id this suggestion proposes to replace. */
	anchorId: string
	author: string
	ts: number
	proposed: T
	rationale?: string
	state: 'proposed' | 'accepted' | 'rejected' | 'withdrawn'
}

/** `open` → `resolved`. No-op if already resolved. */
export function resolveComment(comment: DiscussionComment): DiscussionComment {
	return comment.state === 'open' ? { ...comment, state: 'resolved' } : comment
}

/** `resolved` → `open`. No-op if already open. */
export function reopenComment(comment: DiscussionComment): DiscussionComment {
	return comment.state === 'resolved' ? { ...comment, state: 'open' } : comment
}

/** `proposed` → `accepted`. No-op for any other state (terminal or already-decided). */
export function acceptSuggestion<T>(suggestion: Suggestion<T>): Suggestion<T> {
	return suggestion.state === 'proposed' ? { ...suggestion, state: 'accepted' } : suggestion
}

/** `proposed` → `rejected`. No-op for any other state. */
export function rejectSuggestion<T>(suggestion: Suggestion<T>): Suggestion<T> {
	return suggestion.state === 'proposed' ? { ...suggestion, state: 'rejected' } : suggestion
}

/** `proposed` → `withdrawn`. No-op for any other state. */
export function withdrawSuggestion<T>(suggestion: Suggestion<T>): Suggestion<T> {
	return suggestion.state === 'proposed' ? { ...suggestion, state: 'withdrawn' } : suggestion
}

/**
 * Apply an (accepted) suggestion: replace the node anchored by `s.anchorId` with
 * `s.proposed`. Pure — returns a new array, `nodes` is untouched. No-op (returns
 * `nodes` as-is) if the anchor is orphaned (not present in `nodes`). Does not itself
 * check `s.state` — callers decide when a suggestion is applicable (typically after
 * `acceptSuggestion`); applying a still-`proposed` or `rejected` suggestion is legal at
 * the data-model level, since "what to do about state" is a UI/policy decision.
 *
 * Duplicate ids in `nodes` are a data-integrity error, not a normal input; matched
 * **last-wins** (the last occurrence with the anchor id is replaced), matching
 * `diffNodes`/`threeWayMerge`/`resolveAnchor`.
 */
export function applySuggestion<T extends { id: string }>(nodes: T[], s: Suggestion<T>): T[] {
	const idx = nodes.findLastIndex((n) => n.id === s.anchorId)
	if (idx === -1) return nodes
	const next = nodes.slice()
	next[idx] = s.proposed
	return next
}
