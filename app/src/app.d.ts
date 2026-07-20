// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import 'vite-plugin-pwa/info'
import 'vite-plugin-pwa/pwa-assets'
import 'vite-plugin-pwa/client'

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}  // Notes uses URL search params, not shallow routing.
		// interface Platform {}
	}
}

export {}
