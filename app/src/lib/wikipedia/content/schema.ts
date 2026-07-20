/**
 * Thin re-export shim — the real content schema moved to `./thesoria/schema.ts`
 * (see its header for provenance + the locale-reconciliation note) as part of
 * vendoring Thesoria's content core (`createMemoryBackend` et al.) into
 * `./thesoria/`. Kept here so every existing `./schema` / `../schema` /
 * `content/schema` import across this app keeps working unchanged.
 */
export * from './thesoria/schema'
