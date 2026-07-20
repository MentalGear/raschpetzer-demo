// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/content/src/applyPicks.ts.
// Re-vendor to update; do not hand-edit.
// ============================================================================
// Close the conflict-resolution loop: turn the human's per-conflict choices (from ConflictResolver) back
// into a FINAL, schema-valid page. mergePage() returns a tentative doc holding "ours" at every conflict;
// this applies each "theirs" pick at its path — including whole-element replace/DELETE (theirs === undefined)
// and section REORDER (`#order`), which a naive scalar swap can't do (R-audit). Result is parsePage-validated.
// PURE + framework-free; unit-tested.
// ============================================================================
import { type Page, parsePage } from './schema'
import { decId, type FieldConflict } from './mergePage'

type Token = { kind: 'key'; key: string } | { kind: 'id'; id: string } | { kind: 'order' }

/** Tokenize a conflict path: `elements[g].items[i1].caption` → key g(id) key i1(id) key; `elements#order` → key order. */
function tokenize(path: string): Token[] {
	const toks: Token[] = []
	const re = /#order|\[([^\]]+)\]|([^.[#]+)/g
	let m: RegExpExecArray | null
	while ((m = re.exec(path)) !== null) {
		if (m[0] === '#order') toks.push({ kind: 'order' })
		else if (m[1] !== undefined)
			toks.push({ kind: 'id', id: decId(m[1]) }) // ids are %-encoded in the path
		else toks.push({ kind: 'key', key: m[2] })
	}
	return toks
}

const isIdArr = (v: unknown): v is Array<{ id: string }> => Array.isArray(v)

/** Reorder an id-keyed array so its members follow `idSeq`; ids not listed keep their relative order at the end. */
function reorderById(arr: Array<{ id: string }>, idSeq: unknown): Array<{ id: string }> {
	const seq = Array.isArray(idSeq) ? (idSeq as string[]) : []
	const byId = new Map(arr.map((e) => [e.id, e]))
	const out: Array<{ id: string }> = []
	const used = new Set<string>()
	for (const id of seq) {
		const e = byId.get(id)
		if (e && !used.has(id)) {
			out.push(e)
			used.add(id)
		}
	}
	for (const e of arr) if (!used.has(e.id)) out.push(e)
	return out
}

/** Apply one conflict's chosen value at its path within `doc` (mutates doc). `after` positions a re-added
 *  element (id no longer present) right after that sibling id, instead of tail-appending. */
function applyOne(doc: unknown, tokens: Token[], value: unknown, after?: string): void {
	if (tokens.length === 0) return
	// Walk to the CONTAINER of the last token.
	let container: unknown = doc
	for (let i = 0; i < tokens.length - 1; i++) {
		const t = tokens[i]
		if (t.kind === 'key' && container && typeof container === 'object') {
			container = (container as Record<string, unknown>)[t.key]
		} else if (t.kind === 'id' && isIdArr(container)) {
			container = container.find((e) => e.id === t.id)
		} else {
			return // path doesn't resolve (defensive)
		}
	}
	const last = tokens[tokens.length - 1]
	if (last.kind === 'key') {
		if (container && typeof container === 'object')
			(container as Record<string, unknown>)[last.key] = value
	} else if (last.kind === 'id') {
		if (!isIdArr(container)) return
		const idx = container.findIndex((e) => e.id === last.id)
		if (value === undefined) {
			if (idx >= 0) container.splice(idx, 1) // pick "theirs" = they deleted it → remove
		} else if (idx >= 0) {
			container[idx] = value as { id: string } // replace whole element/item
		} else {
			// re-add an element the tentative doc omitted (ours-deleted, pick "theirs") — restore its position
			const at = after ? container.findIndex((e) => e.id === after) : -1
			container.splice(at + 1, 0, value as { id: string }) // after the anchor, or at the front if unknown
		}
	} else {
		// #order: reorder the container array in place to the chosen id sequence.
		if (isIdArr(container)) {
			const reordered = reorderById(container, value)
			container.length = 0
			container.push(...reordered)
		}
	}
}

/**
 * Produce the final page from mergePage()'s tentative `merged` + the human's `picks` (path → 'ours'|'theirs';
 * default 'ours', which the tentative already holds). Validates the result — an invalid final throws, which
 * the caller maps to fail-closed rather than staging bad content.
 */
export function applyPicks(
	merged: Page,
	conflicts: FieldConflict[],
	picks: Record<string, 'ours' | 'theirs'>,
): Page {
	const doc = JSON.parse(JSON.stringify(merged)) as Page
	for (const c of conflicts) {
		if ((picks[c.path] ?? 'ours') === 'theirs')
			applyOne(doc, tokenize(c.path), c.theirs, c.after)
	}
	return parsePage(doc)
}
