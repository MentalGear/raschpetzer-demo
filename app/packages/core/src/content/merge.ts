/**
 * Generic three-way merge over structured-content nodes, keyed by stable `id` and
 * compared by the same structural `nodeSignature` fingerprint as `diff.ts` (so "the
 * same edit" always means "same signature", never "same object identity" or "same
 * rendered text").
 *
 * ## The rule table
 *
 * For every id present in `base`, `a`, and/or `b`, classify by (a) whether the id is
 * present in each of the three lists, and (b) whether each side's signature differs
 * from base's (and, when base is absent, whether the two sides agree with each other):
 *
 * | base | a   | b   | a vs base | b vs base | a vs b   | → status            |
 * |------|-----|-----|-----------|-----------|----------|----------------------|
 * | -    | yes | -   |           |           |          | `added-a`            |
 * | -    | -   | yes |           |           |          | `added-b`            |
 * | -    | yes | yes |           |           | same     | `changed-both-agree` |
 * | -    | yes | yes |           |           | differ   | `conflict`           |
 * | yes  | -   | -   |           |           |          | `removed`            |
 * | yes  | yes | -   | same      |           |          | `removed`            |
 * | yes  | yes | -   | differ    |           |          | `conflict`           |
 * | yes  | -   | yes |           | same      |          | `removed`            |
 * | yes  | -   | yes |           | differ    |          | `conflict`           |
 * | yes  | yes | yes | same      | same      |          | `unchanged`          |
 * | yes  | yes | yes | differ    | same      |          | `changed-a`          |
 * | yes  | yes | yes | same      | differ    |          | `changed-b`          |
 * | yes  | yes | yes | differ    | differ    | same     | `changed-both-agree` |
 * | yes  | yes | yes | differ    | differ    | differ   | `conflict`           |
 *
 * In words:
 * - present in only one of `a`/`b` (base absent) → `added-a` / `added-b`.
 * - absent from both `a` and `b` (base present) → `removed` (both sides agree to drop it).
 * - present in base + exactly one of `a`/`b`, unchanged on the side that kept it →
 *   `removed` (the other side's deletion wins, no conflict).
 * - present in base + exactly one of `a`/`b`, CHANGED on the side that kept it →
 *   `conflict` (changed-vs-removed: one side edited a node the other side deleted).
 * - present in base + both sides, exactly one side edited it → `changed-a` / `changed-b`.
 * - present everywhere, both sides edited it to the SAME signature (or both added the
 *   same id with the same signature when base lacked it) → `changed-both-agree`.
 * - any other case where the two sides disagree on content for the same id → `conflict`.
 *
 * Duplicate ids within a single list (`base`/`a`/`b`) are a data-integrity error, not a normal
 * input; each list is looked up via a `Map` keyed by id, so a duplicate is resolved **last-wins**
 * (the last occurrence's value is what participates in the merge) — matching `diffNodes`'
 * (`diff.ts`) tie-break.
 *
 * Pure TS, no DOM, deterministic.
 */
import { nodeSignature } from './diff'

export type MergeStatus =
	| 'unchanged'
	| 'added-a'
	| 'added-b'
	| 'removed'
	| 'changed-a'
	| 'changed-b'
	| 'changed-both-agree'
	| 'conflict'

/**
 * Discriminated union on `status` — each variant declares exactly the fields the code below
 * actually pushes for it (no dead-optional fields to check at every call site):
 * - `added-a` / `added-b`: only the side that has it (`base` was absent, only one of `a`/`b` present).
 * - `removed`: `base` is always present (that's what makes it "removed"); whichever of `a`/`b`
 *   still agreed with base before being dropped is carried too — but never both at once
 *   (both-dropped carries neither; one-side-kept carries only that side), so the three reachable
 *   shapes (`{base}` / `{base,a}` / `{base,b}`) are three separate union members rather than one
 *   `{ base: T; a?: T; b?: T }` shape (which would also admit the impossible `{base,a,b}`).
 * - `changed-a` / `changed-b`: all three of `base`/`a`/`b` are always present (base present +
 *   both sides present is the only path to these statuses).
 * - `changed-both-agree`: `a` and `b` are always present (that's the "agree" being reported);
 *   `base` is present only when the id already existed in base (optional).
 * - `conflict`: only three shapes ever reach a conflict push (see the four call sites in
 *   `threeWayMerge` below) — `a`+`b` with `base` absent (added-in-both, differ) *or* `base`+`a`+`b`
 *   (both-changed, differ) collapse to the same `{ base?; a: T; b: T }` shape; `base`+`a` with `b`
 *   absent (a-changed vs b-removed); or `base`+`b` with `a` absent (b-changed vs a-removed). The
 *   degenerate all-optional `{}` / `base`-only shapes are impossible and no longer typecheck.
 */
export type MergeEntry<T> =
	| { id: string; status: 'unchanged'; base: T; a: T; b: T }
	| { id: string; status: 'added-a'; a: T }
	| { id: string; status: 'added-b'; b: T }
	| { id: string; status: 'removed'; base: T; a: T }
	| { id: string; status: 'removed'; base: T; b: T }
	| { id: string; status: 'removed'; base: T }
	| { id: string; status: 'changed-a'; base: T; a: T; b: T }
	| { id: string; status: 'changed-b'; base: T; a: T; b: T }
	| { id: string; status: 'changed-both-agree'; base?: T; a: T; b: T }
	| { id: string; status: 'conflict'; base?: T; a: T; b: T }
	| { id: string; status: 'conflict'; base: T; a: T; b?: T }
	| { id: string; status: 'conflict'; base: T; a?: T; b: T }

export function threeWayMerge<T extends { id: string }>(
	base: T[],
	a: T[],
	b: T[],
): MergeEntry<T>[] {
	const baseMap = new Map(base.map((n) => [n.id, n]))
	const aMap = new Map(a.map((n) => [n.id, n]))
	const bMap = new Map(b.map((n) => [n.id, n]))

	const ids: string[] = []
	const seen = new Set<string>()
	for (const n of [...base, ...a, ...b]) {
		if (!seen.has(n.id)) {
			seen.add(n.id)
			ids.push(n.id)
		}
	}

	const entries: MergeEntry<T>[] = []
	for (const id of ids) {
		const baseNode = baseMap.get(id)
		const aNode = aMap.get(id)
		const bNode = bMap.get(id)
		const inBase = baseNode !== undefined
		const inA = aNode !== undefined
		const inB = bNode !== undefined

		if (!inBase && inA && !inB) {
			entries.push({ id, status: 'added-a', a: aNode })
			continue
		}
		if (!inBase && !inA && inB) {
			entries.push({ id, status: 'added-b', b: bNode })
			continue
		}
		if (!inBase && inA && inB) {
			const agree = nodeSignature(aNode) === nodeSignature(bNode)
			// Branch to a literal `status` per push (rather than a ternary feeding one shared
			// object literal) — the now-3-way-split `conflict` variant of `MergeEntry` means a
			// `status`-as-union-of-literals object literal no longer structurally matches any
			// single member; a literal per branch keeps each push unambiguous.
			if (agree) {
				entries.push({ id, status: 'changed-both-agree', a: aNode, b: bNode })
			} else {
				entries.push({ id, status: 'conflict', a: aNode, b: bNode })
			}
			continue
		}
		if (inBase && !inA && !inB) {
			entries.push({ id, status: 'removed', base: baseNode })
			continue
		}
		if (inBase && inA && !inB) {
			const aChanged = nodeSignature(aNode) !== nodeSignature(baseNode)
			entries.push(
				aChanged
					? { id, status: 'conflict', base: baseNode, a: aNode }
					: { id, status: 'removed', base: baseNode, a: aNode },
			)
			continue
		}
		if (inBase && !inA && inB) {
			const bChanged = nodeSignature(bNode) !== nodeSignature(baseNode)
			entries.push(
				bChanged
					? { id, status: 'conflict', base: baseNode, b: bNode }
					: { id, status: 'removed', base: baseNode, b: bNode },
			)
			continue
		}
		// inBase && inA && inB — the only remaining combination once every branch above has
		// `continue`d; the explicit guard (rather than an unchecked fallthrough) is what lets
		// TS narrow base/a/b-Node from `T | undefined` to `T` below, with no `as T` cast.
		if (inBase && inA && inB) {
			const aSig = nodeSignature(aNode)
			const bSig = nodeSignature(bNode)
			const baseSig = nodeSignature(baseNode)
			const aChanged = aSig !== baseSig
			const bChanged = bSig !== baseSig
			if (!aChanged && !bChanged) {
				entries.push({ id, status: 'unchanged', base: baseNode, a: aNode, b: bNode })
			} else if (aChanged && !bChanged) {
				entries.push({ id, status: 'changed-a', base: baseNode, a: aNode, b: bNode })
			} else if (!aChanged && bChanged) {
				entries.push({ id, status: 'changed-b', base: baseNode, a: aNode, b: bNode })
			} else {
				const agree = aSig === bSig
				// Same reasoning as above: branch to a literal `status` per push.
				if (agree) {
					entries.push({
						id,
						status: 'changed-both-agree',
						base: baseNode,
						a: aNode,
						b: bNode,
					})
				} else {
					entries.push({ id, status: 'conflict', base: baseNode, a: aNode, b: bNode })
				}
			}
		}
	}
	return entries
}

export interface MergeSummary {
	unchanged: number
	addedA: number
	addedB: number
	removed: number
	changedA: number
	changedB: number
	changedBothAgree: number
	conflict: number
}

/**
 * Every `MergeStatus` mapped to its `MergeSummary` field — `satisfies Record<MergeStatus, …>`
 * means adding a 9th `MergeStatus` without adding it here is a compile error, so `summarizeMerge`
 * can never silently under-count a new status.
 */
const STATUS_TO_SUMMARY_KEY = {
	unchanged: 'unchanged',
	'added-a': 'addedA',
	'added-b': 'addedB',
	removed: 'removed',
	'changed-a': 'changedA',
	'changed-b': 'changedB',
	'changed-both-agree': 'changedBothAgree',
	conflict: 'conflict',
} satisfies Record<MergeStatus, keyof MergeSummary>

export function summarizeMerge<T>(entries: MergeEntry<T>[]): MergeSummary {
	const summary: MergeSummary = {
		unchanged: 0,
		addedA: 0,
		addedB: 0,
		removed: 0,
		changedA: 0,
		changedB: 0,
		changedBothAgree: 0,
		conflict: 0,
	}
	for (const e of entries) summary[STATUS_TO_SUMMARY_KEY[e.status]]++
	return summary
}
