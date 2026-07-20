/**
 * Reactive `prefers-reduced-motion` (domain-free kit primitive). A module-level
 * rune kept in sync with the OS setting via a `matchMedia` change listener, so
 * JS-driven motion (Svelte intro/outro transitions, imperative animations)
 * responds when the user toggles the preference *live* — a one-time
 * `matchMedia(...).matches` read never would. (CSS `@media (prefers-reduced-motion)`
 * already reacts on its own; this is for the JS paths the CSS reset can't reach.)
 * SSR-safe via the `typeof matchMedia` guard. One shared singleton, so every app
 * reads the same source of truth.
 *
 * Consume reactively: `const reduceMotion = $derived(prefersReducedMotion())`.
 */
let reduced = $state(false)

if (typeof matchMedia !== 'undefined') {
	const mq = matchMedia('(prefers-reduced-motion: reduce)')
	reduced = mq.matches
	mq.addEventListener('change', (e) => (reduced = e.matches))
}

export function prefersReducedMotion(): boolean {
	return reduced
}
