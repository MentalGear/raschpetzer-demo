// VENDORED from MentalGear/raschpetzer-guide @ 2b698f2 — packages/identity-core/src/locales.ts.
// Re-vendor to update; do not hand-edit.
// ============================================================================
// Locale primitives — framework-neutral SSOT (PRD review-board R17). Lives in
// identity-core (zod-only, no SvelteKit `$lib`, no Vite `import.meta`) so BOTH
// the SvelteKit app AND the Hono write-mediator can import the same locale set.
// src/lib/content/schema.ts re-exports these, so existing `$lib/content/schema`
// imports are unchanged.
// ============================================================================
import { z } from 'zod'

export const LOCALES = ['de', 'fr', 'en', 'lb'] as const
export const localeSchema = z.enum(LOCALES)
export type Locale = z.infer<typeof localeSchema>
