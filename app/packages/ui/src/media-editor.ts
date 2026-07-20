/**
 * `@kit/ui/media-editor` — MediaEditor's own package-export subpath, deliberately
 * separate from the main `@kit/ui` barrel (`./index.ts`). MediaEditor pulls in
 * konva/svelte-konva/exifr/piexif-ts (~350KB); keeping it off the shared barrel lets
 * callers lazy-load it via `import('@kit/ui/media-editor')` without that dynamic
 * import's chunk being merged with whatever else a caller statically imports from
 * `@kit/ui`. See `./index.ts`'s file-level doc comment for why this matters.
 */
export { default as MediaEditor } from './composites/MediaEditor.svelte'
export type { MediaEdit, Redaction, MetadataFields } from './composites/mediaEdit'
