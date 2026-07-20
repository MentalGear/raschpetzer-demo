import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { kitAlias } from './kit.config.ts'

const config = {
	preprocess: vitePreprocess(),
	kit: {
		// GitHub Pages project subpath support (env-driven; '' in dev/tests). Internal
		// links go through $lib/paths (`href`/`navWithBase`) so they respect this.
		paths: {
			base: process.env.BASE_PATH ?? '',
			relative: false,
		},
		// Kit packages consumed as source (no build step), aliased ABSOLUTELY from the
		// workspace root via kit.config so they resolve from this sub-CWD app.
		alias: kitAlias,
		adapter: adapter({
			// GitHub Pages is configured to deploy from `main`'s /docs — build straight
			// there (repo root, one level up from this ejected app) instead of the
			// default build/, so `bun run build` output is what Pages serves directly.
			pages: '../docs',
			assets: '../docs',
			// Default 404.html — correct for a standalone/ejected app served at its own
			// root (GitHub Pages serves the site-wide 404.html for any unmatched SPA path).
			// A SUBPATH deploy (e.g. the preview build's /…/photos-app/) can't use that
			// (one 404.html per Pages site, owned by the site root), so those builds set
			// SPA_FALLBACK=index.html to make the subpath ROOT at least resolve.
			fallback: process.env.SPA_FALLBACK || '404.html',
			precompress: false,
			strict: false,
		}),
		serviceWorker: {
			register: false, // the PWA plugin generates the SW
		},
	},
}

export default config
