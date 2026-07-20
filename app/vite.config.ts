import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'
import { sveltekit } from '@sveltejs/kit/vite'
import { kitFsAllow } from './kit.config.ts'

// Base-correct PWA (GitHub Pages project subpath); '' in dev/tests.
const base = process.env.BASE_PATH ?? ''
const pwaBase = `${base}/`

export default defineConfig({
	resolve: {
		alias: {
			// piexif-ts@2.1.0's package.json declares `module`/`browser` entry points
			// (dist/piexif.es.js, dist/piexif.browser.js) that don't actually exist in the
			// published package — only the CJS `main` (dist/piexif.js) is really there, so Vite's
			// resolver fails outright ("Failed to resolve entry for package") without this. Points
			// straight at the real file rather than waiting on an upstream packaging fix. Mirrors
			// apps/photos/vite.config.ts's own alias — needed here too now that MediaLightbox
			// (barrel-exported from @kit/ui, which this app does import from) dynamically imports
			// MediaEditor's mediaMetadata.ts (which imports piexif-ts): Rollup resolves a dynamic
			// import's target unconditionally once the containing module is reachable at all, even
			// though this app never actually uses MediaLightbox's edit mode.
			'piexif-ts': 'piexif-ts/dist/piexif.js',
		},
	},
	server: {
		fs: {
			// Kit packages are consumed as source via aliases; allow serving/scanning
			// them from the workspace root (absolute → correct from this sub-CWD).
			allow: kitFsAllow,
		},
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			scope: pwaBase,
			base: pwaBase,
			pwaAssets: { config: true },
			manifest: {
				short_name: 'Raschpëtzer',
				name: 'Raschpëtzer Wiki',
				start_url: pwaBase,
				scope: pwaBase,
				display: 'standalone',
				theme_color: '#1c1c1e',
				background_color: '#1c1c1e',
			},
			devOptions: { enabled: true },
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				maximumFileSizeToCacheInBytes: 5_000_000,
				navigateFallback: pwaBase,
			},
		}),
	],
	test: {
		expect: { requireAssertions: true },
		// App-level tests only (the kit's own tests + storybook run once at the repo
		// root / package level — not re-run per app).
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }],
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				},
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				},
			},
		],
	},
})
