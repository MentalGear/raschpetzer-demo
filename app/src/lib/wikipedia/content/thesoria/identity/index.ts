/**
 * Local re-export surface for the vendored identity-core SUBSET (`locales.ts`,
 * `team.ts`, `consensus.ts` — see each file's own provenance header). This file
 * itself is NOT vendored: it mirrors the shape of upstream's
 * `@thesoria/identity-core` `index.ts` so every vendored content-core file that
 * upstream imports `from '@thesoria/identity-core'` only needs its import
 * SPECIFIER rewritten (to `./identity` / `../identity`), never its import list.
 */
export * from './locales'
export * from './team'
export * from './consensus'
