// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/content/src/mergePage.ts.
// Re-vendor to update; do not hand-edit.
// ============================================================================
// Structural three-way merge for canonical pages — the engine behind the deferred
// overlapping-edit conflict resolution (docs/vcs-substrate-evaluation.md, ADR-001 P3).
//
// WHY this exists: today the broker fails CLOSED on any same-file divergence
// (`publish_diverged` → full re-review), even when two editors touched DIFFERENT
// paragraphs of the same page. This merges the three content versions the broker
// already holds — base (merge-base), ours (the change head), theirs (current live) —
// so DISJOINT edits combine automatically and only a field BOTH sides changed
// differently surfaces as a conflict for a human to resolve.
//
// WHY structural, not a textual `git merge-tree`: content is ProseMirror JSON. A byte
// merge yields ugly `<<<<<<<`-marker JSON; a STRUCTURAL merge (per element by stable id
// D2, per field) yields clean base/ours/theirs conflicts a WYSIWYG can render as
// "yours / theirs → pick". `git merge-tree --write-tree` (git ≥2.38) proves the SAME
// working-copy-less merge is native to standard git for the general case; this module is
// the JSON-native specialization that needs no local git and no non-standard formats.
//
// PURE + framework-free (imports only the schema types + its canonical stableStringify).
// Deterministic; unit-tested on the app side (identity-core purity rule).
// ============================================================================
import { type Page, parsePage, stableStringify } from './schema'

/** One field both sides changed differently — the atom the resolver UI renders + a human picks. */
export interface FieldConflict {
	/** Machine path, e.g. `title`, `elements[intro].content`, `elements[gal].items[img1].caption`. */
	path: string
	/** Short human label for the resolver UI (derived from the path). */
	label: string
	/** Common-ancestor value (undefined if the field/element was added on both sides). */
	base: unknown
	/** The editor's (this change's) value. */
	ours: unknown
	/** The concurrently-published (live) value. */
	theirs: unknown
	/** For a re-addable element conflict (theirs still has an element ours deleted): the id of its
	 *  preceding sibling on theirs' side, so applyPicks restores it to position instead of tail-appending. */
	after?: string
}

export type MergeResult =
	| { clean: true; merged: Page; conflicts: [] }
	| { clean: false; merged: Page; conflicts: FieldConflict[] }

/** Canonical deep-equality via the schema's frozen stable serialization (key-sorted). Exported so
 *  diffPage.ts (the 2-way reviewer diff) shares the exact same equality notion as the 3-way merge —
 *  a field that "hasn't changed" must mean the same thing in both places. */
export function eq(a: unknown, b: unknown): boolean {
	return stableStringify(a) === stableStringify(b)
}

/** Exported for diffPage.ts (mirrors this module's structural walk — see its header comment). */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** An array whose members are all objects carrying a string `id` — mergeable BY id (D2),
 *  i.e. `elements` and gallery `items`. (ProseMirror `content` node arrays have no id → leaf.)
 *  Exported for diffPage.ts.
 *  NOTE: an EMPTY array is vacuously an id-array (R-panel MAJOR): when one side deletes every element/
 *  item and the other edits one, the empty side must still dispatch to mergeIdArray/diffIdArray so the
 *  edit is merged per-id, not collapsed into a whole-array atomic conflict. This is safe because the
 *  only arrays that ever reach isIdArray are `elements`/`items` — PM `content` arrays are caught by the
 *  isPmNode leaf branch first (in both merge3 and diffPage), and a scalar array pairs with a non-id
 *  array so the `&&` guard still fails. */
export function isIdArray(v: unknown): v is Array<Record<string, unknown> & { id: string }> {
	return Array.isArray(v) && v.every((e) => isPlainObject(e) && typeof e.id === 'string')
}

/** A ProseMirror node/doc/mark: a typed object WITHOUT a stable id. Treated as an ATOMIC leaf so a
 *  conflict on a text block surfaces as one "Text" choice (pick the whole version) rather than an
 *  inner `.content.content` path a volunteer can't reason about. Id-bearing elements/items are NOT
 *  PM nodes, so they still merge field-by-field. Exported for diffPage.ts. */
export function isPmNode(v: unknown): boolean {
	return isPlainObject(v) && typeof v.type === 'string' && !('id' in v)
}

// Element/item ids may be ANY non-empty string, including the path-syntax chars `[ ] . #`. Encode them
// inside `[…]` path segments so the path string round-trips UNAMBIGUOUSLY through applyPicks' tokenizer —
// otherwise an id containing `[`/`]` mis-parses and the human's pick is silently dropped (R-review MAJOR).
export const encId = (id: string) =>
	id.replace(/[%.[\]#]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0'))
/** Reverse encId (also used by applyPicks' tokenizer). */
export const decId = (s: string) =>
	s.replace(/%([0-9a-fA-F]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))

/** Humanize the last meaningful path segment for the resolver UI. Exported so diffPage.ts's
 *  FieldChange labels stay IDENTICAL to the merge resolver's — the same path always reads the same
 *  way to a volunteer, whether they're picking a conflict side or reviewing a proposal. */
export function labelFor(path: string): string {
	const seg = path.split('.').filter(Boolean).pop() ?? path
	const key = seg.replace(/\[[^\]]*\]$/, '') || seg
	const map: Record<string, string> = {
		title: 'Title',
		description: 'Description',
		summary: 'In-brief summary',
		content: 'Text',
		caption: 'Caption',
		alt: 'Image alt text',
		elements: 'Section',
	}
	const idMatch = path.match(/\[([^\]]+)\]([^[]*)$/)
	const base = map[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
	return idMatch ? `${base} · ${decId(idMatch[1])}` : base
}

// ============================================================================
// Block-level three-way merge inside a ProseMirror node's `content` array (paragraphs, list items,
// etc). WHY: treating a whole PM node as one atomic leaf turns any two DISJOINT paragraph edits into
// a whole-block "ours vs theirs" conflict — a false conflict a volunteer has to resolve by hand even
// though nothing actually overlapped. This pushes the same "merge everything disjoint, conflict only
// on genuine overlap" discipline the rest of this module already applies to elements/gallery-items
// DOWN into the paragraph array.
//
// Paragraphs carry NO stable id (they're plain PM nodes), so alignment can't be by id — it MUST be
// content-based (diff3/LCS), never positional-by-index: a positional merge silently MISMERGES the
// instant one side inserts or deletes a paragraph (every following index shifts) — the exact
// silent-data-loss failure mode this project forbids. Every block below is aligned by deep equality
// (`eq`, this module's stableStringify comparison) — the same equality merge3 uses everywhere else.
// ============================================================================

/** One paragraph-level edit against `base`: base[bStart..bEnd) is replaced by `content` on this side.
 *  bStart===bEnd (zero-width) is a pure insertion at that point; content.length===0 is a pure
 *  deletion. Hunks for a single side are, by construction, mutually disjoint and sorted by bStart. */
interface Hunk {
	bStart: number
	bEnd: number
	content: unknown[]
}

/** Longest-common-subsequence index pairs (increasing i, increasing j) between two arrays under a
 *  custom equality — the alignment primitive every block merge below is built on. Standard O(n·m) DP;
 *  array sizes here are a page's paragraph counts, not a concern. */
function lcsIndices<T>(a: T[], b: T[], equal: (x: T, y: T) => boolean): Array<[number, number]> {
	const n = a.length
	const m = b.length
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = equal(a[i], b[j])
				? dp[i + 1][j + 1] + 1
				: Math.max(dp[i + 1][j], dp[i][j + 1])
		}
	}
	const pairs: Array<[number, number]> = []
	let i = 0
	let j = 0
	while (i < n && j < m) {
		if (equal(a[i], b[j])) {
			pairs.push([i, j])
			i++
			j++
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			i++
		} else {
			j++
		}
	}
	return pairs
}

/** Turn a base→side LCS alignment into the disjoint list of hunks where that side actually diverges
 *  from base (the gaps between matched anchors). */
function buildHunks(base: unknown[], side: unknown[]): Hunk[] {
	const matches = lcsIndices(base, side, eq)
	const hunks: Hunk[] = []
	let prevB = -1
	let prevS = -1
	for (const [bi, si] of [...matches, [base.length, side.length] as [number, number]]) {
		const bStart = prevB + 1
		const bEnd = bi
		const sStart = prevS + 1
		const sEnd = si
		if (bEnd > bStart || sEnd > sStart)
			hunks.push({ bStart, bEnd, content: side.slice(sStart, sEnd) })
		prevB = bi
		prevS = si
	}
	return hunks
}

/** Do two hunks from OPPOSITE sides touch the same base content, i.e. genuinely conflict? A
 *  zero-width hunk (a pure insertion, at a POINT between base elements) never overlaps a hunk that
 *  merely starts or ends at that same point — only one strictly INSIDE the other's range, or another
 *  insertion at the exact same point, counts. This is what lets "insert a paragraph right before one
 *  the other side edited" auto-merge instead of a false conflict: the insertion and the edit touch
 *  disjoint base content even though they're adjacent (the classic diff3 mismerge trap). */
function hunksOverlap(a: Hunk, b: Hunk): boolean {
	const aZero = a.bStart === a.bEnd
	const bZero = b.bStart === b.bEnd
	if (aZero && bZero) return a.bStart === b.bStart
	if (aZero) return b.bStart < a.bStart && a.bStart < b.bEnd
	if (bZero) return a.bStart < b.bStart && b.bStart < a.bEnd
	return a.bStart < b.bEnd && b.bStart < a.bEnd
}

/** Reconstruct one side's rendition of base[qStart..qEnd) from EXACTLY the hunks known to belong to
 *  that side within that span (sorted, disjoint) — unchanged stretches pass through from `base`. */
function applySideExact(base: unknown[], hunks: Hunk[], qStart: number, qEnd: number): unknown[] {
	const out: unknown[] = []
	let bi = qStart
	for (const h of hunks) {
		while (bi < h.bStart) {
			out.push(base[bi])
			bi++
		}
		out.push(...h.content)
		bi = h.bEnd
	}
	while (bi < qEnd) {
		out.push(base[bi])
		bi++
	}
	return out
}

const blocksEq = (a: unknown[], b: unknown[]) =>
	a.length === b.length && a.every((v, i) => eq(v, b[i]))

/** Tiny union-find over hunk indices — connects ours-hunks and theirs-hunks that genuinely overlap
 *  into merge/conflict clusters (transitively, so one wide edit that overlaps two disjoint edits on
 *  the other side pulls all three into one cluster). */
class Dsu {
	private parent: number[]
	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i)
	}
	find(x: number): number {
		while (this.parent[x] !== x) {
			this.parent[x] = this.parent[this.parent[x]]
			x = this.parent[x]
		}
		return x
	}
	union(a: number, b: number): void {
		const ra = this.find(a)
		const rb = this.find(b)
		if (ra !== rb) this.parent[ra] = rb
	}
}

/**
 * Content-based (LCS) three-way merge of a PM node's `content` block array. Standard diff3: hunks
 * where base diverges to ours / to theirs are aligned by LCS (not index), clustered by genuine
 * overlap, and each cluster/gap classified the same way merge3 classifies any leaf: unchanged → base;
 * one side changed → that side; both changed identically → either; both changed differently →
 * conflict. `oursResolved`/`theirsResolved` apply every conflict cluster toward that side while
 * keeping every OTHER disjoint auto-merged block — so picking either side in the resolver UI never
 * drops a paragraph the other editor touched.
 */
function diff3Blocks(
	base: unknown[],
	ours: unknown[],
	theirs: unknown[],
): { clean: boolean; merged: unknown[]; oursResolved: unknown[]; theirsResolved: unknown[] } {
	const oursHunks = buildHunks(base, ours)
	const theirsHunks = buildHunks(base, theirs)

	const dsu = new Dsu(oursHunks.length + theirsHunks.length)
	for (let i = 0; i < oursHunks.length; i++) {
		for (let j = 0; j < theirsHunks.length; j++) {
			if (hunksOverlap(oursHunks[i], theirsHunks[j])) dsu.union(i, oursHunks.length + j)
		}
	}

	interface Seg {
		qStart: number
		qEnd: number
		oursHunks: Hunk[]
		theirsHunks: Hunk[]
	}
	const groups = new Map<number, { ours: Hunk[]; theirs: Hunk[] }>()
	oursHunks.forEach((h, i) => {
		const r = dsu.find(i)
		if (!groups.has(r)) groups.set(r, { ours: [], theirs: [] })
		groups.get(r)!.ours.push(h)
	})
	theirsHunks.forEach((h, j) => {
		const r = dsu.find(oursHunks.length + j)
		if (!groups.has(r)) groups.set(r, { ours: [], theirs: [] })
		groups.get(r)!.theirs.push(h)
	})

	const clusters: Seg[] = []
	for (const g of groups.values()) {
		g.ours.sort((a, b) => a.bStart - b.bStart)
		g.theirs.sort((a, b) => a.bStart - b.bStart)
		const all = [...g.ours, ...g.theirs]
		clusters.push({
			qStart: Math.min(...all.map((h) => h.bStart)),
			qEnd: Math.max(...all.map((h) => h.bEnd)),
			oursHunks: g.ours,
			theirsHunks: g.theirs,
		})
	}
	// Zero-width (pure insertion) clusters sort BEFORE a same-point non-zero cluster/gap — an
	// insertion at point p belongs "before" whatever starts at base index p.
	clusters.sort(
		(a, b) => a.qStart - b.qStart || Number(a.qStart !== a.qEnd) - Number(b.qStart !== b.qEnd),
	)

	const segs: Seg[] = []
	let prevEnd = 0
	for (const c of clusters) {
		if (c.qStart > prevEnd)
			segs.push({ qStart: prevEnd, qEnd: c.qStart, oursHunks: [], theirsHunks: [] })
		segs.push(c)
		prevEnd = Math.max(prevEnd, c.qEnd)
	}
	if (prevEnd < base.length)
		segs.push({ qStart: prevEnd, qEnd: base.length, oursHunks: [], theirsHunks: [] })

	let clean = true
	const merged: unknown[] = []
	const oursResolved: unknown[] = []
	const theirsResolved: unknown[] = []
	for (const seg of segs) {
		const baseRendition = base.slice(seg.qStart, seg.qEnd)
		const oursRendition = applySideExact(base, seg.oursHunks, seg.qStart, seg.qEnd)
		const theirsRendition = applySideExact(base, seg.theirsHunks, seg.qStart, seg.qEnd)
		const oursChanged = !blocksEq(oursRendition, baseRendition)
		const theirsChanged = !blocksEq(theirsRendition, baseRendition)

		if (!oursChanged && !theirsChanged) {
			merged.push(...baseRendition)
			oursResolved.push(...baseRendition)
			theirsResolved.push(...baseRendition)
		} else if (oursChanged && !theirsChanged) {
			merged.push(...oursRendition)
			oursResolved.push(...oursRendition)
			theirsResolved.push(...oursRendition)
		} else if (!oursChanged && theirsChanged) {
			merged.push(...theirsRendition)
			oursResolved.push(...theirsRendition)
			theirsResolved.push(...theirsRendition)
		} else if (blocksEq(oursRendition, theirsRendition)) {
			merged.push(...oursRendition)
			oursResolved.push(...oursRendition)
			theirsResolved.push(...oursRendition)
		} else {
			clean = false
			oursResolved.push(...oursRendition)
			theirsResolved.push(...theirsRendition)
		}
	}
	return { clean, merged: clean ? merged : [], oursResolved, theirsResolved }
}

/** Three-way merge of a ProseMirror node whose `content` is a block array (a text_block's `content`
 *  doc, or any nested PM node shaped the same way) — the isPmNode branch of merge3 delegates here
 *  instead of treating the whole node as one atomic leaf. Falls back to the OLD atomic-conflict
 *  behavior whenever the shells (type + every non-content attr) don't line up cleanly, so a doc-level
 *  attribute divergence never gets silently dropped by a block-level merge that only understands
 *  `content`. */
function mergePmNode(
	base: unknown,
	ours: unknown,
	theirs: unknown,
	path: string,
	out: FieldConflict[],
): unknown {
	const oursShellOk = isPmNode(ours) && Array.isArray((ours as Record<string, unknown>).content)
	const theirsShellOk =
		isPmNode(theirs) && Array.isArray((theirs as Record<string, unknown>).content)
	const sameType =
		oursShellOk &&
		theirsShellOk &&
		(ours as Record<string, unknown>).type === (theirs as Record<string, unknown>).type
	const shellsEq =
		sameType &&
		eq(
			{ ...(ours as Record<string, unknown>), content: [] },
			{ ...(theirs as Record<string, unknown>), content: [] },
		)

	if (!oursShellOk || !theirsShellOk || !sameType || !shellsEq) {
		// Shells don't line up (different type, or a diverging non-content attr) → preserve the old
		// atomic whole-node conflict rather than risk a Frankenstein merge of incompatible nodes.
		out.push({ path, label: labelFor(path), base, ours, theirs })
		return ours
	}

	const oursObj = ours as Record<string, unknown> & { content: unknown[] }
	const theirsObj = theirs as Record<string, unknown> & { content: unknown[] }

	// base.content is the LCS anchor (the common ancestor's block array). It's a valid anchor whenever
	// base is a same-type PM node with a content array — the base's SHELL attrs are irrelevant here and
	// must NOT be required to match ours' shell. Requiring full base↔ours shell equality (as before) meant
	// a shell-attr change BOTH sides made identically (e.g. both dropping a legacy doc attr) discarded the
	// anchor (baseBlocks=[]), forcing diff3Blocks to treat the whole content array as a wholesale insertion
	// on each side → an unnecessary whole-block conflict for disjoint paragraph edits (R-panel MAJOR). The
	// ours-vs-theirs shell divergence is already handled by `shellsEq` above; `wrap` uses ours' shell, so
	// an agreed shell change is still captured. Using the real ancestor blocks can only IMPROVE the merge —
	// worst case (base.content unrelated) it degrades to more conflicts, never a silent mismerge.
	const baseCompatible =
		isPmNode(base) &&
		Array.isArray((base as Record<string, unknown>).content) &&
		(base as Record<string, unknown>).type === oursObj.type
	const baseBlocks = baseCompatible
		? ((base as Record<string, unknown>).content as unknown[])
		: []

	const result = diff3Blocks(baseBlocks, oursObj.content, theirsObj.content)
	const wrap = (blocks: unknown[]) => ({ ...oursObj, content: blocks }) // shells are equal → ours' shell/type/attrs is safe for both

	if (result.clean) return wrap(result.merged)

	out.push({
		path,
		label: labelFor(path),
		base,
		ours: wrap(result.oursResolved),
		theirs: wrap(result.theirsResolved),
	})
	return wrap(result.oursResolved)
}

/**
 * Recursive structural three-way merge. Returns the merged value; pushes a FieldConflict for any leaf
 * BOTH sides changed differently (tentatively keeping "ours" there so the merged doc stays whole).
 */
function merge3(
	base: unknown,
	ours: unknown,
	theirs: unknown,
	path: string,
	out: FieldConflict[],
): unknown {
	if (eq(ours, theirs)) return ours // both made the same change (or neither changed)
	if (eq(base, ours)) return theirs // only theirs changed → take theirs
	if (eq(base, theirs)) return ours // only ours changed → take ours

	// A ProseMirror doc/node both sides changed → merge it at BLOCK (paragraph) granularity so
	// disjoint paragraph edits auto-merge instead of becoming one whole-block conflict; only a
	// paragraph BOTH sides changed differently (or a doc-shell mismatch) surfaces a conflict.
	if (isPmNode(ours) || isPmNode(theirs)) {
		return mergePmNode(base, ours, theirs, path, out)
	}

	// All three differ. Recurse where structure lets us localize the conflict.
	if (isPlainObject(ours) && isPlainObject(theirs)) {
		// A typed element whose `type` diverged (e.g. text_block → gallery_block) can't be field-merged
		// without producing an invalid element — treat the whole element as one atomic conflict.
		if (
			typeof ours.type === 'string' &&
			typeof theirs.type === 'string' &&
			ours.type !== theirs.type
		) {
			out.push({ path, label: labelFor(path), base, ours, theirs })
			return ours
		}
		const b = isPlainObject(base) ? base : {}
		const merged: Record<string, unknown> = {}
		const keys = new Set([...Object.keys(b), ...Object.keys(ours), ...Object.keys(theirs)])
		for (const k of keys)
			merged[k] = merge3(b[k], ours[k], theirs[k], path ? `${path}.${k}` : k, out)
		return merged
	}
	if (isIdArray(ours) && isIdArray(theirs)) {
		return mergeIdArray(isIdArray(base) ? base : [], ours, theirs, path, out)
	}

	// Leaf (string / number / node-array without ids) that both sides changed → a real conflict.
	out.push({ path, label: labelFor(path), base, ours, theirs })
	return ours
}

const arrEq = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/** Merge two id-keyed arrays (elements / gallery items) by `id`, not by index (D2). Handles
 *  add / delete / edit / edit-delete-race per id, and REORDER (adopts the side that reordered; flags a
 *  `#order` conflict only when both reordered differently — D13 order is meaningful, never silently lost). */
function mergeIdArray(
	base: Array<{ id: string }>,
	ours: Array<{ id: string }>,
	theirs: Array<{ id: string }>,
	path: string,
	out: FieldConflict[],
): unknown[] {
	const byId = (arr: Array<{ id: string }>) => new Map(arr.map((e) => [e.id, e]))
	const bMap = byId(base)
	const oMap = byId(ours)
	const tMap = byId(theirs)

	// 1) Per-id content merge → which ids survive, and their merged value.
	const mergedById = new Map<string, unknown>()
	const allIds = new Set<string>([...oMap.keys(), ...tMap.keys()])
	for (const id of allIds) {
		const b = bMap.get(id)
		const o = oMap.get(id)
		const t = tMap.get(id)
		const p = `${path}[${encId(id)}]`
		if (o && t) {
			mergedById.set(id, merge3(b, o, t, p, out)) // present both sides (b undefined → added on both)
		} else if (o && !t) {
			if (!b)
				mergedById.set(id, o) // ours added
			else if (eq(b, o)) {
				/* they deleted an element we didn't touch → accept the delete */
			} else {
				out.push({
					path: p,
					label: `${labelFor(p)} (deleted by the other editor)`,
					base: b,
					ours: o,
					theirs: undefined,
				})
				mergedById.set(id, o) // keep our edited version tentatively until resolved
			}
		} else if (!o && t) {
			if (!b)
				mergedById.set(id, t) // theirs added
			else if (eq(b, t)) {
				/* we deleted an element they didn't touch → accept our delete */
			} else {
				// we deleted it, they edited it: tentative reflects OURS (absent, matching the default pick);
				// applyPicks re-adds their version if the human picks "theirs" — at its position on theirs'
				// side (record the preceding sibling id) rather than tail-appending (R-review MAJOR).
				const ti = theirs.findIndex((e) => e.id === id)
				const after = ti > 0 ? theirs[ti - 1].id : undefined
				out.push({
					path: p,
					label: `${labelFor(p)} (you deleted it; the other editor changed it)`,
					base: b,
					ours: undefined,
					theirs: t,
					after,
				})
			}
		}
		// neither side → gone (both deleted).
	}

	// 2) Order decision over the SURVIVING ids. Restrict each side's order to survivors, then compare the
	// ids common to ours & theirs: if they agree, use ours; if only one side reordered vs base, adopt that
	// side's order; if both reordered differently, flag a #order conflict (tentatively keep ours' order).
	const survivors = new Set(mergedById.keys())
	const seq = (arr: Array<{ id: string }>) =>
		arr.map((e) => e.id).filter((id) => survivors.has(id))
	const bo = seq(base)
	const oo = seq(ours)
	const to = seq(theirs)
	const common = (s: string[], ref: string[]) => s.filter((id) => ref.includes(id))
	const oCommon = common(oo, to)
	const tCommon = common(to, oo)
	const bCommon = common(bo, oCommon)

	let order: string[]
	if (arrEq(oCommon, tCommon))
		order = oo // agree on common order
	else if (arrEq(oCommon, bCommon))
		order = to // ours didn't reorder → adopt theirs'
	else if (arrEq(tCommon, bCommon))
		order = oo // theirs didn't reorder → adopt ours'
	else {
		out.push({ path: `${path}#order`, label: 'Section order', base: bo, ours: oo, theirs: to })
		order = oo
	}

	// 3) Emit survivors in the chosen backbone order, then splice in any one-sided add at its INTENDED
	// position — right after its nearest surviving predecessor on the side that added it — rather than
	// tail-appending it (which would silently drop the adding editor's placement; R-audit MAJOR).
	const placedRows: Array<{ id: string; val: unknown }> = []
	const placed = new Set<string>()
	for (const id of order)
		if (survivors.has(id) && !placed.has(id)) {
			placedRows.push({ id, val: mergedById.get(id) })
			placed.add(id)
		}

	const seen = new Set<string>()
	for (const id of [...oo, ...to]) {
		if (!survivors.has(id) || placed.has(id) || seen.has(id)) continue
		seen.add(id)
		const src = oMap.has(id) && oo.includes(id) ? oo : to // the side that actually carries this add
		const idx = src.indexOf(id)
		let anchorPos = -1
		for (let k = idx - 1; k >= 0; k--) {
			const at = placedRows.findIndex((r) => r.id === src[k])
			if (at >= 0) {
				anchorPos = at
				break
			}
		}
		placedRows.splice(anchorPos + 1, 0, { id, val: mergedById.get(id) })
		placed.add(id)
	}
	return placedRows.map((r) => r.val)
}

/**
 * Three-way merge two divergent versions of the SAME page against their common ancestor.
 * Clean when every difference is disjoint; otherwise returns the per-field conflicts for the resolver.
 * The `merged` page is always whole (tentatively "ours" at each conflict) so it round-trips the schema.
 */
export function mergePage(baseIn: Page, oursIn: Page, theirsIn: Page): MergeResult {
	// Validate all three inputs (defense-in-depth): a malformed input — e.g. a DUPLICATE element id —
	// would otherwise collapse silently in the id-keyed merge (byId Map is last-write-wins) and bypass the
	// clean-output check too. parsePage throws on invalid content; the caller maps that to the fail-closed
	// publish_diverged path. Also normalizes all three the same way so `eq` never false-conflicts.
	const base = parsePage(baseIn)
	const ours = parsePage(oursIn)
	const theirs = parsePage(theirsIn)
	if (ours.slug !== theirs.slug || ours.locale !== theirs.locale) {
		throw new Error('mergePage: refusing to merge different pages (slug/locale mismatch)')
	}
	const conflicts: FieldConflict[] = []
	const merged = merge3(base, ours, theirs, '', conflicts) as Page
	if (conflicts.length > 0) {
		// Tentative "ours"-at-conflict doc; the resolver applies the picks and the result is schema-validated
		// at stage time. We do NOT auto-publish a conflicted merge.
		return { clean: false, merged, conflicts }
	}
	// A CLEAN merge must round-trip the schema — parse to GUARANTEE validity (and normalize). If a clean
	// merge ever produced invalid content this throws, surfacing the bug rather than staging bad data.
	return { clean: true, merged: parsePage(merged), conflicts: [] }
}
