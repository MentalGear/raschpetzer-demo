import { describe, it, expect } from 'vitest'

/** Stubs `window.matchMedia` to report a fixed `matches` value for every query,
 *  restoring the real implementation after the test. */
function stubMatchMedia(matches: boolean): () => void {
	const real = window.matchMedia
	window.matchMedia = ((query: string) =>
		({
			matches,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
		}) as MediaQueryList) as typeof window.matchMedia
	return () => {
		window.matchMedia = real
	}
}

describe('prefersReducedMotion', () => {
	// Module-level $state reads matchMedia once at import time. `reducedMotion.svelte`
	// is a real ES module the browser caches by URL — a plain re-`import()` of the
	// same specifier returns the SAME cached instance regardless of `vi.resetModules()`
	// (that API resets Vitest's own module graph bookkeeping, not the browser's native
	// ESM cache that browser-mode tests actually run against). A `?t=` cache-busting
	// query string forces a genuinely fresh module instance per test, so each test's
	// `stubMatchMedia` is actually in effect when the module's top-level code runs.
	it('defaults to false when the OS has no reduced-motion preference — never opts every animation out by default', async () => {
		const restore = stubMatchMedia(false)
		try {
			const { prefersReducedMotion } = await import(
				/* @vite-ignore */ `./reducedMotion.svelte.ts?t=${Date.now()}-a`
			)
			expect(prefersReducedMotion()).toBe(false)
		} finally {
			restore()
		}
	})

	it('reflects true when the OS DOES prefer reduced motion — genuinely wired to the signal, not hardcoded false', async () => {
		const restore = stubMatchMedia(true)
		try {
			const { prefersReducedMotion } = await import(
				/* @vite-ignore */ `./reducedMotion.svelte.ts?t=${Date.now()}-b`
			)
			expect(prefersReducedMotion()).toBe(true)
		} finally {
			restore()
		}
	})
})
