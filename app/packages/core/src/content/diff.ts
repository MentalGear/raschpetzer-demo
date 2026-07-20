/**
 * Generic semantic (node-level) diff between two lists of structured-content nodes —
 * NOT a raw line/character diff. Nodes are matched by their stable `id`; each surviving
 * node is added / removed / changed / unchanged. Generalizes the Wikipedia demo's
 * block-level diff
 * (`apps/wikipedia/src/lib/wikipedia/diff/blockDiff.ts`, now a thin adapter over this
 * module) so any structured-content domain (blocks, CMS fields, form schemas, …) gets the
 * same "reviewable change-sets, not line diffs" behavior (Upwelling/Peritext).
 *
 * Pure TS, no DOM, deterministic (no `Date.now`/`Math.random`).
 */

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged'

export interface DiffEntry<T> {
	status: DiffStatus
	node: T
	/** the previous node (only for `changed`), for a before/after view. */
	prev?: T
}

export interface DiffSummary {
	added: number
	removed: number
	changed: number
}

/**
 * A control-character sentinel that prefixes every special-value tag below. `JSON.stringify` of an
 * ordinary string always (a) wraps it in `"` and (b) escapes U+0000 to the six-char sequence
 * `\u0000` — it can never emit a *raw* NUL byte. So any branch whose output starts with a raw
 * `\u0000` is unreachable by the `JSON.stringify` fallback for a string field: a text value whose
 * content literally is `"__NaN__"` (or any tag string) serializes to `"\"__NaN__\""`, never to the
 * tagged form. This closes the "tag-injection" collision class (a string field forging a
 * special-value signature) that a quoted tag like `'"__NaN__"'` did not.
 */
const TAG = '\u0000'

/**
 * JSON with object keys sorted recursively — a stable, construction-order-independent encoding.
 *
 * Total over the inputs this module cares about (never throws except on the documented non-goals
 * below, never collides two distinct values onto the same string, and always returns a `string` —
 * including for a top-level `undefined`, where `JSON.stringify` would return the JS value
 * `undefined`, not a string). Every special value is tagged with a leading raw-NUL sentinel (see
 * `TAG`) so no tag can be forged by an ordinary string field:
 * - `undefined` is tagged both at the top level and as an array element — `JSON.stringify(undefined)`
 *   is the non-string `undefined`, and `Array.prototype.join` (what an untagged recursive
 *   `map`+`join` would rely on) renders a hole the same as `null`, so `[undefined]` and `[null]`
 *   (and `[]`, once the element is dropped) would otherwise collide. Object-valued `undefined`
 *   fields are still *dropped* (not tagged), matching `JSON.stringify`.
 * - `NaN` / `Infinity` / `-Infinity` are tagged instead of collapsing to the `null` that
 *   `JSON.stringify` would produce for all three (a real collision: distinct values, same encoding).
 * - `-0` is tagged distinctly so it doesn't collide with `0` (`JSON.stringify(-0)` is `"0"`, same as
 *   `JSON.stringify(0)`, even though `Object.is(-0, 0)` is `false`).
 * - `bigint` is tagged (`…bigint:<n>`) since `JSON.stringify` throws on it.
 * - `function` is tagged as a single class (`…function`) purely for **totality** — `JSON.stringify`
 *   returns the non-string `undefined` for a function. Functions aren't content values; two distinct
 *   functions share a signature (a documented non-goal, like symbol identity).
 * - `symbol` is tagged by description (`…symbol:<description>`) — `JSON.stringify(symbol)` returns
 *   `undefined` (not a string), which would otherwise make every symbol-valued field hash equal.
 *   **Limitation:** two symbols with the same description (e.g. two separate `Symbol('x')`) are
 *   indistinguishable — only the description is serialized (identity isn't string-representable).
 * - `Map` / `Set` are serialized structurally with a distinct tag — neither has a `.toJSON()` nor own
 *   enumerable keys, so both would otherwise collapse to `"{}"` for every distinct Map/Set. Serialized
 *   via **iteration order** (insertion order); deliberately not re-sorted like plain-object keys — two
 *   Maps/Sets with the same entries in a different insertion order are *not* considered equal.
 * - `RegExp` / `Error` are serialized structurally (`source`+`flags`; `name`+`message`) — like Map/Set
 *   they have no `.toJSON()` and no own enumerable keys, so every distinct RegExp/Error would otherwise
 *   collapse to `"{}"`. `Error.stack` is intentionally excluded (environment-dependent, non-canonical).
 *
 * Branch order matters: `undefined`, `symbol`, `bigint`, `function`, non-finite numbers + `-0`, `Map`,
 * `Set`, `RegExp`, `Error`, arrays, objects-with-`toJSON` (e.g. `Date`), plain objects, then the
 * `JSON.stringify` fallback (booleans, strings, finite non-zero numbers, `null`) — every branch returns
 * a `string` so no input falls through to a non-string result.
 *
 * **Out of scope / non-goals** (this function targets JSON-serializable content nodes, not arbitrary
 * JS graphs):
 * - **Non-introspectable built-ins** — `ArrayBuffer`, `WeakMap`, `WeakSet`, `Promise` and the like have
 *   no enumerable own keys and no way to read their contents, so they all serialize to `"{}"` (mutually
 *   colliding). They are not JSON-serializable content and aren't meant to be diffed; don't put them in a
 *   content field. (Typed arrays like `Uint8Array` *do* have enumerable indices and serialize via the
 *   object branch, so they're distinguished — but are likewise not intended content.)
 * - **Circular references** — a data-integrity error (like duplicate ids), not this function's job;
 *   a self-referential object throws a stack overflow rather than being caught here.
 */
export function stableStringify(value: unknown): string {
	if (value === undefined) return `${TAG}undefined`
	if (typeof value === 'symbol') return `${TAG}symbol:${String(value)}`
	if (typeof value === 'bigint') return `${TAG}bigint:${value}`
	if (typeof value === 'function') return `${TAG}function`
	if (typeof value === 'number') {
		if (Number.isNaN(value)) return `${TAG}NaN`
		if (value === Infinity) return `${TAG}Infinity`
		if (value === -Infinity) return `${TAG}-Infinity`
		if (Object.is(value, -0)) return `${TAG}-0`
		return JSON.stringify(value)
	}
	if (value instanceof Map) return `${TAG}Map:${stableStringify([...value.entries()])}`
	if (value instanceof Set) return `${TAG}Set:${stableStringify([...value])}`
	if (value instanceof RegExp)
		return `${TAG}RegExp:${stableStringify([value.source, value.flags])}`
	if (value instanceof Error) return `${TAG}Error:${stableStringify([value.name, value.message])}`
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
	if (value && typeof value === 'object') {
		if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
			return stableStringify((value as { toJSON(): unknown }).toJSON())
		}
		const obj = value as Record<string, unknown>
		const keys = Object.keys(obj)
			.filter((k) => obj[k] !== undefined) // match JSON.stringify: undefined-valued keys are dropped
			.sort()
		return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
	}
	return JSON.stringify(value)
}

/**
 * A canonical structural fingerprint of a node — every field *except* its `id` (the
 * match key), serialized with recursively **sorted keys** so the comparison is
 * insensitive to the order in which fields happened to be constructed. Comparing
 * signatures (not rendered text) catches structural edits that flatten to the same
 * text/value (e.g. inline marks, a heading level, a table row).
 *
 * Known limitation (matches the original blockDiff behavior): an *absent* optional
 * field and its explicit default hash differently — callers that vary a field's
 * presence across revisions should coerce per-variant defaults before diffing.
 *
 * `undefined`, `NaN`/`Infinity`/`-Infinity`, `-0`, `Date` (or anything else with `.toJSON()`),
 * `bigint`, `symbol`, `Map`, and `Set` fields are all handled soundly by `stableStringify` (see its
 * docstring) — they no longer collide with unrelated values or throw. Two limitations carry over
 * from `stableStringify`: two symbols with the same description are indistinguishable (identity
 * isn't string-representable), and `Map`/`Set` element order is significant (iteration order, not
 * re-sorted). Circular references are an explicit non-goal (a data-integrity error, like duplicate
 * ids) — not guarded against.
 *
 * Exported so `merge.ts` and `anchor.ts` share the exact same fingerprint rule.
 */
export function nodeSignature<T extends { id: string }>(node: T): string {
	const { id: _id, ...rest } = node
	return stableStringify(rest)
}

/**
 * Diff `oldNodes` → `newNodes` by stable node id.
 *
 * Duplicate ids within a single side are a data-integrity error, not a normal input; both sides
 * are deduped last-wins (a later duplicate replaces an earlier one at its *first* position in
 * reading order) before comparison, so each id produces exactly one entry.
 */
export function diffNodes<T extends { id: string }>(oldNodes: T[], newNodes: T[]): DiffEntry<T>[] {
	// Same dedupe helper as the new side (one source of truth for the last-wins-at-first-position
	// tie-break) — equivalent to the plain `new Map(oldNodes.map(...))` this used to build inline,
	// since a `Map.set` on an existing key overwrites the value without moving its iteration
	// position, which is exactly what `dedupeFirstSeenOrder` does explicitly.
	const oldById = new Map(dedupeFirstSeenOrder(oldNodes))
	const newById = dedupeFirstSeenOrder(newNodes)
	const newIds = new Set(newById.map(([id]) => id))
	const entries: DiffEntry<T>[] = []

	// walk the new order first (added / changed / unchanged, in reading order)…
	for (const [, node] of newById) {
		const prev = oldById.get(node.id)
		if (!prev) {
			entries.push({ status: 'added', node })
		} else if (nodeSignature(prev) !== nodeSignature(node)) {
			entries.push({ status: 'changed', node, prev })
		} else {
			entries.push({ status: 'unchanged', node })
		}
	}
	// …then any removed nodes (present in old, gone from new). Walk the already-deduped
	// `oldById` (not raw `oldNodes`) so a duplicate id on the old side still produces exactly
	// one `removed` entry (last-wins value), matching the "one entry per id" contract above.
	for (const [id, node] of oldById) {
		if (!newIds.has(id)) entries.push({ status: 'removed', node })
	}
	return entries
}

/**
 * Dedupe `nodes` by id, last-wins on value but keeping each id at its *first* position (reading
 * order) — matches the old-side `Map` behavior above (a plain `Map` also keeps first-seen key
 * order while overwriting the value on a later duplicate).
 */
function dedupeFirstSeenOrder<T extends { id: string }>(nodes: T[]): [string, T][] {
	const byId = new Map<string, T>()
	for (const node of nodes) byId.set(node.id, node)
	return [...byId]
}

export function summarize<T>(entries: DiffEntry<T>[]): DiffSummary {
	return {
		added: entries.filter((e) => e.status === 'added').length,
		removed: entries.filter((e) => e.status === 'removed').length,
		changed: entries.filter((e) => e.status === 'changed').length,
	}
}
