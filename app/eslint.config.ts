import prettier from 'eslint-config-prettier'
import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import ts from 'typescript-eslint'
import svelteConfig from './svelte.config'

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			// Treat a leading underscore as "intentionally unused" (e.g. a snippet's
			// positional index `_i` that exists only to reach the 3rd param).
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			// Off project-wide: this app configures no `kit.paths.base`, so `resolve()`
			// is a no-op on every internal link, and the kit primitives (packages/ui)
			// are forbidden from importing `$app/paths` anyway (kit-purity rule below).
			// Adopting resolve() everywhere would be type-fragile churn for dynamic /
			// query-string hrefs with zero runtime benefit. Re-enable if a base path
			// is ever introduced.
			'svelte/no-navigation-without-resolve': 'off',
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig,
			},
		},
	},
	{
		// Kit purity (ui): `@kit/ui` (packages/ui) is the self-contained,
		// domain-free Svelte layer — it owns the composites AND the shadcn
		// primitives. It may import only @kit/ui (self) + @kit/core + external;
		// ANY `$lib/*` (the app) is banned, so the package has no back-edge to an
		// app. Direction is one-way: apps → ui → core.
		files: ['packages/ui/**/*.svelte', 'packages/ui/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'$lib',
								'$lib/**',
								'$app/*',
								'@sveltejs/kit',
								'@sveltejs/kit/**',
								'$env/*',
								'$service-worker',
								'**/routes/*',
								'@kit/tokens',
								'@kit/tokens/**',
							],
							message:
								'Kit (packages/ui) is self-contained: import only @kit/ui (incl. shadcn), @kit/core, and external packages — never $lib/app, SvelteKit ($app/@sveltejs/kit/$env), or tokens (tokens are CSS).',
						},
						{
							// Catches a relative-path escape the `group` patterns above can't: those only
							// match specifiers starting with a banned alias literally (e.g. `$lib`), not a
							// relative climb like `../../../../apps/photos/src/...`. No legitimate import in
							// packages/ui/src needs to climb 4+ `../` levels — the deepest real subtree
							// (`shadcn-components/ui/<name>/`) is 3 levels below `src/`, so `../../../foo`
							// (3 levels) already reaches package root; 4+ always leaves the package.
							regex: '^(\\.\\./){4,}',
							message:
								'Kit (packages/ui) is self-contained: a relative import climbing 4+ `../` levels almost certainly escapes packages/ui/src into an app or another package — share via @kit/core, or export from @kit/ui, instead.',
						},
					],
				},
			],
		},
	},
	{
		// Kit purity (core): `packages/core/*` is the framework-agnostic pure layer.
		// Dependency direction is one-way (apps → ui → core): core may import only
		// itself + external packages — never ui, tokens, an app, or SvelteKit/$lib/
		// $app modules. (Apps may import core directly; that's allowed elsewhere.)
		files: ['packages/core/**/*.ts', 'packages/core/**/*.svelte'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'$lib',
								'$lib/**',
								'$app/*',
								'@sveltejs/kit',
								'@sveltejs/kit/**',
								'$env/*',
								'$service-worker',
								'**/routes/*',
								'@kit/ui',
								'@kit/ui/**',
								'@kit/tokens',
								'@kit/tokens/**',
								// framework-agnostic: no Svelte/DOM framework — pure TS only
								'svelte',
								'svelte/*',
							],
							message:
								'core (packages/core) is framework-agnostic pure TS: import only @kit/core, relative paths, and external packages — never ui, tokens, app, SvelteKit, or svelte itself.',
						},
						{
							// Catches a relative-path escape the `group` patterns above can't: those only
							// match specifiers starting with a banned alias literally (e.g. `$lib`), not a
							// relative climb like `../../../../apps/photos/src/...`. No legitimate import in
							// packages/core/src needs to climb 4+ `../` levels — the deepest real subtree
							// (e.g. `graph/`) is 1 level below `src/`, so 4+ always leaves the package.
							regex: '^(\\.\\./){4,}',
							message:
								'core (packages/core) is framework-agnostic pure TS: a relative import climbing 4+ `../` levels almost certainly escapes packages/core/src into an app or another package — share via a relative path within @kit/core, or export from @kit/core, instead.',
						},
					],
				},
			],
		},
	},
	{
		// App-to-app isolation: the Photos and Notes apps are independent domains
		// that share only the kit (@kit/ui, @kit/core). They must NOT reach into
		// each other's $lib — that cross-edge would block the future `apps/*` carve
		// (each app becomes its own package). Shared code belongs in the kit.
		// Photos carved into apps/photos (its own project) — isolation now physical;
		// this rule is retained but effectively moot (a separate app can't import $lib).
		files: ['apps/photos/src/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/notes', '$lib/notes/**'],
							message:
								'App isolation: the Photos app must not import from the Notes app. Share via @kit/ui / @kit/core instead.',
						},
					],
				},
			],
		},
	},
	{
		// Notes carved into apps/notes (its own project) — isolation now physical;
		// this rule is retained but effectively moot (a separate app can't import $lib).
		files: ['apps/notes/src/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/photos', '$lib/photos/**'],
							message:
								'App isolation: the Notes app must not import from the Photos app. Share via @kit/ui / @kit/core instead.',
						},
					],
				},
			],
		},
	},
	{
		// Wikipedia carved into apps/wikipedia (its own project) — isolation now physical;
		// this rule is retained but effectively moot (a separate app can't import $lib).
		files: ['apps/wikipedia/src/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/photos', '$lib/photos/**', '$lib/notes', '$lib/notes/**'],
							message:
								'App isolation: the Wikipedia app must not import from the Photos or Notes apps. Share via @kit/ui / @kit/core instead.',
						},
					],
				},
			],
		},
	},
)
