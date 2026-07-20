/**
 * `canonicalizePage` — the Class-A structural fix (see
 * `docs/research/2026-07-15-block-editor-structural-fixes.md`).
 *
 * Defines canonical := "whatever the editor SCHEMA produces". Every ProseMirror
 * doc is normalized once through the block editor's schema — `getSchema()` over the
 * SAME `blockExtensions()` the live editor mounts — so a load → edit → `getJSON`
 * round-trip is identity BY CONSTRUCTION. This retires the whole class of
 * normalization drift (attr-default fill, mark rank re-sort, mark exclusivity)
 * instead of matching each rule by hand in the converter.
 *
 * Why this is safe + sufficient:
 *  - Headless: `getSchema` returns only the Schema (nodes/marks) — no `EditorView`,
 *    no plugins — so plugin/`appendTransaction` mutations (e.g. TrailingNode) cannot
 *    run here (and we keep `trailingNode:false` in the live editor too). Runs in Node.
 *  - `.check()` is REQUIRED, not just `fromJSON`→`toJSON`: `fromJSON` sorts marks +
 *    fills defaults, but mark EXCLUSIVITY (`code excludes _`) is only applied by
 *    `Mark.addToSet`; `Node.check()` rebuilds the set that way and THROWS on a
 *    violation. Without it, the exclusivity class would silently survive.
 *  - It THROWS on schema-invalid content by design (fail loud at the seed boundary) —
 *    callers pass trusted/parsed content (the mock corpus is schema-valid).
 *
 * CANONICAL-FORM CONTRACT (pinned): the canonical shape is a function of
 * `blockExtensions()` (extension set + order + priority) and the `@tiptap/*` /
 * `prosemirror-model` versions in `package.json`. Changing any of them can reshuffle
 * the canonical mark order and MUST be treated as a schema migration — re-canonicalize
 * the corpus and rehash any stored translation-staleness hashes. The idempotency +
 * editor-agreement tests (`canonicalize.svelte.test.ts`) fail if the form drifts.
 */
import { getSchema } from '@tiptap/core'
import { Node as PMNode } from '@tiptap/pm/model'
import { blockExtensions } from './editor/extensions'
import { parsePage, type Page, type ProseMirrorDoc } from './schema'

// One shared Schema instance — the exact nodes/marks the live editor uses.
const schema = getSchema(blockExtensions())

/**
 * Normalize one ProseMirror doc to the editor schema's canonical form.
 * Throws (RangeError) on schema-invalid content — callers pass validated docs.
 */
export function canonicalizeDoc(doc: ProseMirrorDoc): ProseMirrorDoc {
	const node = PMNode.fromJSON(schema, doc) // fills attr defaults, sorts marks by rank
	node.check() // enforce mark-exclusivity + content model (throws on violation)
	return node.toJSON() as ProseMirrorDoc
}

/**
 * Canonicalize every ProseMirror doc a Page carries — each `text_block`'s content
 * and the optional `summary`. Gallery blocks + metadata pass through unchanged. The
 * result is re-validated with `parsePage`, so a canonical Page is always schema-valid.
 */
export function canonicalizePage(page: Page): Page {
	const next: Page = {
		...page,
		elements: page.elements.map((el) =>
			el.type === 'text_block' ? { ...el, content: canonicalizeDoc(el.content) } : el,
		),
	}
	if (page.summary) next.summary = canonicalizeDoc(page.summary)
	return parsePage(next)
}
