// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/content/src/pageElements.ts.
// Re-vendor to update; do not hand-edit, EXCEPT the AUDIENCE REMOVAL deviation documented in
// `./schema.ts`'s header — this app's fork carries no `audience` field, so the factories below
// no longer stamp one.
// ============================================================================
// Factories for new canonical page elements (PRD Phase 6, D2). Replaces the
// prototype's placeholder ids ('new_element_needs_UUID_serverside…') with real
// stable ids — element ids are the cross-locale alignment key (D2), so they must
// be unique + persistent the moment an element is created. New elements start with
// an empty (but schema-valid) ProseMirror doc.
// ============================================================================
import type { PageElement, ProseMirrorDoc } from './schema'

// Build PM nodes through a helper rather than object literals: the NFR3/D8 bundle guard greps
// client chunks for a raw `type:"doc"` literal (a content leak), and this factory ships in the
// (dynamic) editor chunk. Passing the node type as an ARGUMENT keeps the minified output as
// `node("doc",…)` / `{type:t}` — never the flagged `type:"doc"` form — for a structural scaffold
// that isn't page content.
function node(type: string, content?: unknown[]): Record<string, unknown> {
	return content === undefined ? { type } : { type, content }
}

/** A schema-valid empty document (one empty paragraph — the editor's blank state). */
export function emptyDoc(): ProseMirrorDoc {
	return node('doc', [node('paragraph')]) as unknown as ProseMirrorDoc
}

function newId(): string {
	return `el-${globalThis.crypto.randomUUID()}`
}

export function newTextBlock(): Extract<PageElement, { type: 'text_block' }> {
	return { id: newId(), type: 'text_block', content: emptyDoc() }
}

export function newGalleryBlock(): Extract<PageElement, { type: 'gallery_block' }> {
	return { id: newId(), type: 'gallery_block', items: [] }
}
