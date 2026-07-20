/**
 * `@kit/core/content` — structured-content diff / three-way merge / anchor resolution
 * + a discussion (comment/suggestion) data model, generic over any node type
 * `T extends { id: string }`. The non-UI substrate for a review/diff-viewer UI and a
 * git-native backend. No Svelte/DOM, no domain import.
 */
export * from './diff'
export * from './merge'
export * from './anchor'
export * from './discussion'
