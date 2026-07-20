/**
 * Conformance test for @kit/ui composites.
 *
 * Enforces the machine-checkable subset of the composite contract defined in
 * docs/kit/components/composite-contract.md. Enforced rules:
 *
 *   1. Domain-free: no $lib / $app / @kit/tokens imports in the composite source
 *      (full-source regex, catches multi-line imports).
 *   2. Barrel export: packages/ui/src/index.ts contains `composites/X.svelte`.
 *   3. Story exists: a sibling X.stories.svelte file is present.
 *   4. Component doc exists: at least one docs/kit/components/*.md mentions
 *      `composites/X.svelte` AND that doc has at least 2 `##` headings (substantive).
 *   8. Semantic tokens only: checked externally by scripts/check-token-purity.mjs
 *      (rule 8 is now [machine] — token-purity runs in CI via `bun run lint`).
 *  10. Story has play+assert: X.stories.svelte source contains a `play` binding
 *      AND at least one `expect(` assertion.
 *  11. Controlled/uncontrolled: if the source contains `$bindable`, it must also
 *      contain `onValueChange`.
 *  12. Imperative return-type floor: every `export function`/arrow must annotate
 *      its return type, and that type must be `void` or `Promise<void>`.
 *      Un-annotated exports are NOT skipped — an inferred non-void return would
 *      silently escape the floor, so a missing annotation is itself a violation.
 *  13. Root `class` prop: composites not in the exception list (ContextMenu,
 *      SidebarNav) must declare `class?: string`.
 *  14. SSR top-level DOM: no browser-API tokens at the <script> block's base
 *      indentation (1 leading tab = top-level statement). Tokens in function
 *      bodies, $effect, onMount, or arrow bodies (2+ tabs) are excluded by the
 *      indentation heuristic.
 *
 * Internal sub-components (INTERNAL_SUBCOMPONENT_EXCEPTIONS below) are private
 * implementation detail of another composite — never imported directly by an
 * app, never barrel-exported — so rules 2/3/4/13 (barrel, story, doc, class prop)
 * don't apply to them. They still must be domain-free and still must pass rules
 * 11/12/14 (bindable/callback hygiene, return-type floor, SSR safety), since
 * those are about the code being safe to run, not about public-API surface.
 *
 * The composite list is discovered dynamically from the filesystem (*.svelte
 * excluding *.stories.svelte), so new composites are automatically covered.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Anchor paths via import.meta.url so the test works regardless of cwd.
const thisFile = fileURLToPath(import.meta.url)
// This file lives at packages/ui/src/composites/conformance.test.ts
// → repo root is 4 levels up.
const root = path.resolve(path.dirname(thisFile), '../../../../')

const compositesDir = path.join(root, 'packages/ui/src/composites')
const barrelPath = path.join(root, 'packages/ui/src/index.ts')
const docsDir = path.join(root, 'docs/kit/components')

/** Discover composites: *.svelte that are NOT *.stories.svelte */
function discoverComposites(): string[] {
	return fs
		.readdirSync(compositesDir)
		.filter((f) => f.endsWith('.svelte') && !f.endsWith('.stories.svelte'))
		.map((f) => path.basename(f, '.svelte'))
}

/** Recursively collect .ts/.svelte file paths under `dir`, skipping build/dep dirs. */
function walkSourceFiles(dir: string, out: string[] = []): string[] {
	const SKIP = new Set(['node_modules', '.svelte-kit', 'build', 'dist'])
	for (const name of fs.readdirSync(dir)) {
		if (SKIP.has(name)) continue
		const p = path.join(dir, name)
		if (fs.statSync(p).isDirectory()) walkSourceFiles(p, out)
		else if (name.endsWith('.ts') || name.endsWith('.svelte')) out.push(p)
	}
	return out
}

/** Return all *.md file contents from a directory as an array of {content, path} */
function readAllMdFiles(dir: string): { content: string; filePath: string }[] {
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.md'))
		.map((f) => {
			const filePath = path.join(dir, f)
			return { content: fs.readFileSync(filePath, 'utf8'), filePath }
		})
}

/**
 * Strip comments from source before pattern-scanning, so a commented-out
 * `// export function foo(): string` or a `window.` mentioned in a JSDoc block
 * can't produce a false positive. Conservative:
 *   - block comments `/* … *\/` and HTML comments `<!-- … -->` are removed wholesale,
 *   - line comments `//…` are removed only when NOT part of a `://` (so `https://`
 *     URLs inside strings survive).
 * Leading indentation is preserved (only trailing comment text is cut), so the
 * rule-14 indentation heuristic still holds on the stripped source.
 */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, '') // block comments
		.replace(/<!--[\s\S]*?-->/g, '') // svelte/HTML comments
		.split('\n')
		.map((line) => line.replace(/([^:]|^)\/\/.*$/, '$1')) // line comments, keep `://`
		.join('\n')
}

/** Count `##` headings in a markdown string (non-comment lines only). */
function countH2Headings(content: string): number {
	return content
		.split('\n')
		.filter((line) => !line.match(/^\s*\/\//)) // ignore JS comment lines
		.filter((line) => line.match(/^##\s/)).length
}

/**
 * Rule 14 — SSR top-level DOM check.
 *
 * Extracts the <script ...>…</script> block from a Svelte source, then scans
 * each line at exactly 1 leading tab (= top-level statement in the script block,
 * not nested inside a function / $effect / onMount / arrow body). Comment lines
 * are excluded. Returns an array of (lineNumber, lineContent) pairs that contain
 * a browser API token at top level.
 *
 * Conservative heuristic: indentation-depth is a reliable proxy here because:
 *   - The Svelte script block's contents are indented 1 tab relative to the file.
 *   - Code inside a function body / $effect callback / onMount / arrow function is
 *     indented 2+ tabs.
 *   - This means a top-level `const obs = new ResizeObserver(...)` would be flagged
 *     (true positive), but `new ResizeObserver` inside a $effect callback would not.
 */
const DOM_API_PATTERN =
	/\bnew (?:ResizeObserver|IntersectionObserver|MutationObserver|Worker)\b|\brequestAnimationFrame\b|\bgetBoundingClientRect\b|\b(?:window|document|navigator|globalThis|self)(?:\.|\[)|\bmatchMedia\b|\b(?:local|session)Storage\b|\blocation\.\b|\bcustomElements\b/

function findTopLevelDomAccess(source: string): { line: number; text: string }[] {
	// Extract the <script ...>…</script> block (non-module, or module — check both).
	// We want the instance script block (not <script module>).
	// Use a regex that captures the content between <script ...> and </script>.
	// Strip comments first so a browser API named only in a comment isn't flagged.
	source = stripComments(source)
	const scriptMatch = source.match(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g)
	if (!scriptMatch) return []

	const violations: { line: number; text: string }[] = []

	// Calculate the line offset of each script block within the source.
	let searchFrom = 0
	for (const block of scriptMatch) {
		const blockStart = source.indexOf(block, searchFrom)
		const lineOffset = source.slice(0, blockStart).split('\n').length

		// Strip the opening <script ...> and closing </script> lines.
		const lines = block.split('\n')
		// lines[0] is `<script ...>`, lines[lines.length-1] is `</script>` — skip them.
		for (let i = 1; i < lines.length - 1; i++) {
			const line = lines[i]
			// Skip blank lines and comment-only lines (// and * for JSDoc).
			if (/^\s*$/.test(line) || /^\s*(\/\/|\/\*|\*)/.test(line)) continue
			// Top-level = exactly one leading tab.
			if (/^\t[^\t]/.test(line) && DOM_API_PATTERN.test(line)) {
				violations.push({ line: lineOffset + i, text: line.trim() })
			}
		}

		searchFrom = blockStart + block.length
	}

	return violations
}

// Rule 13 exceptions: composites with no meaningful visual root.
const CLASS_PROP_EXCEPTIONS = new Set(['ContextMenu', 'SidebarNav'])

// Internal sub-components: private implementation detail of another composite
// (MediaEditor's MediaCropStage/MediaRedactLayer; NavArrow, shared by MediaLightbox
// and HScroller), never imported directly by an app or barrel-exported. Exempt from
// the public-API rules (sibling story, barrel export, doc reference, root class prop)
// — see the file-level doc comment above for why.
const INTERNAL_SUBCOMPONENT_EXCEPTIONS = new Set(['MediaCropStage', 'MediaRedactLayer', 'NavArrow'])

// Composites exported via their OWN dedicated package subpath instead of the shared
// `@kit/ui` barrel (index.ts), to keep a heavy dependency subgraph out of any chunk a
// caller statically imports something else from `@kit/ui` — see index.ts's file-level
// doc comment. Still a full public composite (story, doc, class prop all still apply);
// only the barrel-export rule is exempt.
const SUBPATH_EXPORT_EXCEPTIONS = new Set(['MediaEditor'])

const composites = discoverComposites()

// Sanity: if the glob somehow returns nothing the suite would silently vacuously
// pass. Fail loudly instead.
it('discovers at least one composite', () => {
	expect(composites.length).toBeGreaterThan(0)
})

it('the two exception sets are disjoint (a composite cannot be both internal and subpath-exported)', () => {
	// A name mistakenly added to BOTH sets would silently take whichever branch the
	// per-composite checks below happen to test first, skipping the other set's
	// enforcement entirely with nothing flagging the double-membership itself.
	const overlap = [...INTERNAL_SUBCOMPONENT_EXCEPTIONS].filter((n) =>
		SUBPATH_EXPORT_EXCEPTIONS.has(n),
	)
	expect(overlap, `Composite(s) in both exception sets: ${overlap.join(', ')}`).toHaveLength(0)
})

const barrel = fs.readFileSync(barrelPath, 'utf8')
// Strip ALL comments (not just `//` lines) — a `/** ... */` block comment mentioning a
// composite's name in prose (e.g. index.ts's own doc comment explaining why MediaEditor
// is deliberately NOT re-exported here) would otherwise false-positive the word-boundary
// identifier check below, which needs to see only real export statements.
const barrelNonCommentLines = stripComments(barrel)
const allDocFiles = readAllMdFiles(docsDir)
// Cached once for the ownership/exclusivity checks below (INTERNAL_SUBCOMPONENT_EXCEPTIONS
// and SUBPATH_EXPORT_EXCEPTIONS) — walking apps/ per-composite would be wasteful.
const appsDir = path.join(root, 'apps')
const appFiles = fs.existsSync(appsDir) ? walkSourceFiles(appsDir) : []
const appFileContents = appFiles.map((f) => ({ f, content: fs.readFileSync(f, 'utf8') }))

describe.each(composites.map((name) => [name]))('composite: %s', (name) => {
	it('has a sibling story file', () => {
		if (INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)) {
			expect(INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)).toBe(true)
			return
		}
		const storyPath = path.join(compositesDir, `${name}.stories.svelte`)
		expect(fs.existsSync(storyPath), `${name}.stories.svelte not found`).toBe(true)
	})

	it('is exported from the barrel (packages/ui/src/index.ts) or its own dedicated subpath', () => {
		// Word-boundary identifier check, not a literal `.svelte`-path substring: a future
		// barrel edit could re-export the SAME composite transitively — e.g.
		// `export { MediaEditor } from './media-editor'` — which contains the identifier but
		// not the raw `composites/${name}.svelte` path. Matching on the identifier itself
		// catches direct (`from './composites/X.svelte'`), transitive (`from './x'` where `x`
		// re-exports `X`), and any other re-export shape the barrel might one day use.
		const barrelExportsName = new RegExp(`\\b${name}\\b`).test(barrelNonCommentLines)
		if (INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)) {
			// Private sub-component: must NOT be reachable from the shared barrel at all —
			// that's the entire premise the public-API exceptions (story/doc/class-prop) rest
			// on. Unlike SUBPATH_EXPORT_EXCEPTIONS below, there's no dedicated subpath to check
			// FOR — only the negative (absence) matters here.
			expect(
				barrelExportsName,
				`${name} is an internal sub-component (INTERNAL_SUBCOMPONENT_EXCEPTIONS) but is exported from the shared barrel — that contradicts "private, never imported directly by an app"`,
			).toBe(false)
			return
		}
		if (SUBPATH_EXPORT_EXCEPTIONS.has(name)) {
			// Must be re-exported from a DEDICATED subpath — package.json's "." entry (the
			// shared barrel, index.ts) doesn't count here; that's the whole thing this
			// exception exists to keep it OUT of.
			const packageJsonPath = path.join(root, 'packages/ui/package.json')
			const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
			const subpathFiles = Object.entries(pkg.exports as Record<string, string>)
				.filter(([subpath]) => subpath !== '.')
				.map(([, target]) => target)
				.filter(
					(target): target is string =>
						typeof target === 'string' && target.endsWith('.ts'),
				)
			const reExported = subpathFiles.some((rel) => {
				const abs = path.join(root, 'packages/ui', rel)
				if (!fs.existsSync(abs)) return false
				return fs.readFileSync(abs, 'utf8').includes(`default as ${name}`)
			})
			expect(
				reExported,
				`${name} must be re-exported ('default as ${name}') from a dedicated package.json exports subpath (not the shared barrel ".")`,
			).toBe(true)
			// The other half of the invariant, and the actual regression this exception
			// exists to prevent (see index.ts's doc comment): must NOT also be barrel-exported,
			// directly OR transitively (e.g. `export { MediaEditor } from './media-editor'`
			// inside index.ts would reintroduce the eager-bundling regression just as surely
			// as a direct `.svelte` re-export would, and a literal-path substring check alone
			// wouldn't catch it).
			expect(
				barrelExportsName,
				`${name} must NOT also be exported from the shared barrel (packages/ui/src/index.ts), directly or transitively — that defeats the point of its dedicated subpath`,
			).toBe(false)
			return
		}
		expect(barrelNonCommentLines).toContain(`composites/${name}.svelte`)
	})

	it('internal sub-components are never imported directly by app code (rather than just asserted)', () => {
		// INTERNAL_SUBCOMPONENT_EXCEPTIONS's whole justification is "private, never imported
		// directly by an app" (see the file-level doc comment) — this actually checks that,
		// instead of just trusting whoever adds a name to the set. A future author adding an
		// entry here to dodge the public-API rules (story/barrel/doc/class-prop) without the
		// component genuinely being private would be caught the moment any app imports it.
		if (!INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)) {
			expect(INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)).toBe(false)
			return
		}
		// An actual import statement (static or dynamic), not just the name mentioned anywhere
		// (e.g. an e2e test's title/comment referencing "MediaCropStage" in prose is not a
		// real import and shouldn't fail this).
		const importPattern = new RegExp(
			`(from\\s+['"][^'"]*${name}\\.svelte['"]|import\\(\\s*['"][^'"]*${name}\\.svelte['"])`,
		)
		const importingFiles = appFileContents
			.filter(({ content }) => importPattern.test(stripComments(content)))
			.map(({ f }) => f.slice(root.length))
		expect(
			importingFiles,
			`${name} is in INTERNAL_SUBCOMPONENT_EXCEPTIONS (claimed private, app-inaccessible) but is referenced by app code: ${importingFiles.join(', ')}`,
		).toHaveLength(0)
	})

	it('subpath-export composites are never statically imported by app code (only dynamic import() or import type)', () => {
		// SUBPATH_EXPORT_EXCEPTIONS composites (MediaEditor today) exist specifically so their
		// heavy dependency subgraph stays out of any chunk a caller statically imports something
		// else from — see index.ts's doc comment. That guarantee holds only as long as apps
		// reach the subpath via a dynamic import() (or a type-only import, erased at compile
		// time) — a plain `import { X } from '@kit/ui/x'` would eagerly bundle it, silently
		// reintroducing the exact regression the subpath split was built to avoid. Flag any
		// static, non-type import of a dedicated subpath composite.
		if (!SUBPATH_EXPORT_EXCEPTIONS.has(name)) {
			expect(SUBPATH_EXPORT_EXCEPTIONS.has(name)).toBe(false)
			return
		}
		// The subpath(s) that actually re-export THIS composite (not every subpath in the
		// exports map — e.g. `./shadcn-utils`/`./shadcn-components/*` are unrelated,
		// legitimately statically-imported subpaths with no bundle-splitting concern) PLUS
		// the raw `@kit/ui/composites/${name}.svelte` alias reach-around: every app's
		// `kit.config.ts`/`svelte.config.ts` aliases `@kit/ui/*` straight to
		// `packages/ui/src/*`, which resolves BEFORE package.json's `exports` map is ever
		// consulted — so the declared subpath is not actually the only way to reach this
		// file, and a check that only looks for the declared specifier misses the far more
		// direct reach-around (see docs/backlog.md's "wildcard alias bypasses exports"
		// entry — this doesn't close that gap generally, but it does close it for THIS
		// composite's own two known paths in).
		const packageJsonPath = path.join(root, 'packages/ui/package.json')
		const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
		const specifiers = Object.entries(pkg.exports as Record<string, string>)
			.filter(([subpath, target]) => {
				if (subpath === '.') return false
				if (typeof target !== 'string' || !target.endsWith('.ts')) return false
				const abs = path.join(root, 'packages/ui', target)
				return (
					fs.existsSync(abs) &&
					fs.readFileSync(abs, 'utf8').includes(`default as ${name}`)
				)
			})
			.map(([subpath]) => `@kit/ui${subpath.slice(1)}`) // './media-editor' -> '@kit/ui/media-editor'
			.concat([`@kit/ui/composites/${name}.svelte`])
		const staticImportViolations: string[] = []
		// Scan the WHOLE (comment-stripped) content per import statement, not line-by-line —
		// a wrapped multi-line `import type {\n  X,\n} from '...'` has its `type` keyword on a
		// different line than its `from`, so a per-line check would misclassify it as a real
		// value import. `[\s\S]*?` spans newlines; requiring `from` after `import` naturally
		// excludes dynamic `import(...)` calls (no `from` keyword at all).
		const importStmtPattern = /import\s+(type\s+)?([\s\S]*?)from\s+['"]([^'"]+)['"]/g
		for (const { f, content: rawContent } of appFileContents) {
			const content = stripComments(rawContent)
			for (const match of content.matchAll(importStmtPattern)) {
				const [, wholeStatementTypeOnly, specifierClause, specifier] = match
				if (!specifiers.includes(specifier)) continue
				if (wholeStatementTypeOnly) continue
				// TS's inline per-specifier modifier — `import { type X } from '...'` — is also
				// fully erased at compile time (zero runtime cost), same as `import type {...}`.
				// A braced clause where EVERY named specifier carries its own `type` prefix is
				// type-only overall, even without the whole-statement `import type` form; a MIXED
				// clause (`{ type X, Y }`) still has a real value import (`Y`) and must be flagged.
				const braced = specifierClause.match(/\{([^}]*)\}/)
				if (braced) {
					const entries = braced[1]
						.split(',')
						.map((e) => e.trim())
						.filter(Boolean)
					if (entries.length > 0 && entries.every((e) => /^type\s/.test(e))) continue
				}
				staticImportViolations.push(
					`${f.slice(root.length)} (${specifier}): ${match[0].trim()}`,
				)
			}
		}
		expect(
			staticImportViolations,
			`Static (non-type) import of a subpath-export composite found — this eagerly bundles its heavy deps, defeating the dedicated subpath: ${staticImportViolations.join(', ')}`,
		).toHaveLength(0)
	})

	it('is referenced by at least one substantive docs/kit/components/*.md (≥2 ## headings)', () => {
		if (INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)) {
			expect(INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)).toBe(true)
			return
		}
		const docRef = `composites/${name}.svelte`
		const matchingDocs = allDocFiles.filter(({ content }) => content.includes(docRef))
		expect(
			matchingDocs.length,
			`No doc under docs/kit/components/ references ${docRef}`,
		).toBeGreaterThan(0)
		// The referencing doc must be substantive: at least 2 ## headings.
		const substantive = matchingDocs.some(({ content }) => countH2Headings(content) >= 2)
		expect(
			substantive,
			`Doc referencing ${docRef} must have at least 2 ## headings (add more structure)`,
		).toBe(true)
	})

	it('contains no domain imports ($lib, $app, @kit/tokens) — full-source regex', () => {
		// Strip comments so a `$lib` mentioned in a doc comment isn't a false positive.
		const source = stripComments(
			fs.readFileSync(path.join(compositesDir, `${name}.svelte`), 'utf8'),
		)
		// Full-source regex catches multi-line imports too.
		const domainPattern =
			/(from|import\s*\(|import\s+['"])\s*['"][^'"]*(\$lib|\$app|@kit\/tokens)/
		expect(
			domainPattern.test(source),
			`${name}.svelte has a forbidden domain import ($lib, $app, or @kit/tokens)`,
		).toBe(false)
	})

	it('story has a play function with at least one expect() assertion and a keyboard interaction (rule 10)', () => {
		if (INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)) {
			expect(INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name)).toBe(true)
			return
		}
		const storyPath = path.join(compositesDir, `${name}.stories.svelte`)
		if (!fs.existsSync(storyPath)) {
			// covered by the "has a sibling story" test
			expect(fs.existsSync(storyPath)).toBe(false)
			return
		}
		const source = fs.readFileSync(storyPath, 'utf8')
		expect(
			/play[:=]/.test(source),
			`${name}.stories.svelte must have a play function (rule 10)`,
		).toBe(true)
		expect(
			/expect\(/.test(source),
			`${name}.stories.svelte play function must contain at least one expect() assertion (rule 10)`,
		).toBe(true)
		// Rule 10 [machine] — also requires a keyboard interaction in play.
		const KEYBOARD_PATTERN =
			/userEvent\.(keyboard|tab)\b|\.keyboard\(|\{(Tab|Enter|Escape|Arrow\w+)\}|fireEvent\.key/
		expect(
			KEYBOARD_PATTERN.test(source),
			`${name}.stories.svelte play function must contain a keyboard interaction ` +
				`(userEvent.keyboard/tab, {Tab}/{Enter}/{Escape}/{ArrowX}, or fireEvent.key) — rule 10`,
		).toBe(true)
	})

	it('rule 11 — a $bindable prop must be mirrored by an on<X>Change callback (open → onOpenChange)', () => {
		const source = fs.readFileSync(path.join(compositesDir, `${name}.svelte`), 'utf8')
		const hasBindable = /\$bindable/.test(source)
		if (!hasBindable) {
			// Vacuously pass: not a value-stateful composite.
			expect(hasBindable).toBe(false)
			return
		}
		// General floor: every $bindable composite must expose at least one mirrored
		// change callback (onValueChange for a value model, onOpenChange for open
		// state, onRowsChange, …) so one-way consumers can observe it.
		expect(
			/on[A-Z]\w*Change/.test(source),
			`${name}.svelte uses $bindable but exposes no on<X>Change callback (rule 11)`,
		).toBe(true)
		// Convention: an `open` bindable is open-state — it must use `onOpenChange`
		// (shadcn/Bits naming), NOT the value-model `onValueChange`.
		if (/\bopen\s*=\s*\$bindable/.test(source)) {
			expect(
				/onOpenChange/.test(source),
				`${name}.svelte has an \`open\` $bindable — its change callback must be \`onOpenChange\`, not \`onValueChange\` (rule 11 convention)`,
			).toBe(true)
		}
	})

	it('rule 12 — every export function/arrow must annotate its return type as void or Promise<void>', () => {
		// Strip comments so a commented-out `export function` signature isn't scanned.
		const source = stripComments(
			fs.readFileSync(path.join(compositesDir, `${name}.svelte`), 'utf8'),
		)
		// Two forms, each in an ANNOTATED and an UN-ANNOTATED variant. The param match
		// is GREEDY (`\(.*\)`) so callback params like `(cb: () => void)` don't truncate
		// the match at the first `)`; greedy `.` stays on one line (no `s` flag), and a
		// signature is one line. Un-annotated exports are NOT skipped — an inferred
		// non-void return type would silently escape the floor, so we require the
		// annotation to be present (and to be void / Promise<void>).
		const annotated = [
			/export\s+(?:async\s+)?function\s+\w+\s*(?:<[^>]*>)?\s*\(.*\)\s*:\s*([^{;]+?)\s*[{;]/g,
			/export\s+const\s+\w+\s*=\s*(?:async\s+)?(?:<[^>]*>)?\s*\(.*\)\s*:\s*([^={]+?)\s*=>/g,
		]
		// Un-annotated: closing `)` is followed directly by `{` (function) or `=>` (arrow),
		// with no `:` return type between them.
		const unAnnotated = [
			/export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\(.*\)\s*\{/g,
			/export\s+const\s+(\w+)\s*=\s*(?:async\s+)?(?:<[^>]*>)?\s*\(.*\)\s*=>/g,
		]
		const violations: string[] = []
		for (const pattern of annotated) {
			let match: RegExpExecArray | null
			while ((match = pattern.exec(source)) !== null) {
				const returnType = match[1].trim()
				if (returnType !== 'void' && returnType !== 'Promise<void>') {
					violations.push(`return type '${returnType}'`)
				}
			}
		}
		for (const pattern of unAnnotated) {
			let match: RegExpExecArray | null
			while ((match = pattern.exec(source)) !== null) {
				violations.push(
					`'${match[1]}' has no return-type annotation (must be : void or : Promise<void>)`,
				)
			}
		}
		// The patterns above match on ONE line (a signature is one line). Guard that
		// assumption: an export signature whose params wrap across lines slips past BOTH
		// patterns and silently escapes the floor. Flag any export function/arrow whose
		// opening `(` is unbalanced on its own line, so the author keeps it single-line.
		const sigStart =
			/export\s+(?:async\s+)?function\s+\w+\s*(?:<[^>]*>)?\s*\(|export\s+const\s+\w+\s*=\s*(?:async\s+)?(?:<[^>]*>)?\s*\(/
		source.split('\n').forEach((line, idx) => {
			if (!sigStart.test(line)) return
			const opens = (line.match(/\(/g) ?? []).length
			const closes = (line.match(/\)/g) ?? []).length
			if (opens > closes) {
				violations.push(
					`multi-line export signature at line ${idx + 1} — keep it on one line so rule 12 can verify the return type`,
				)
			}
		})
		expect(
			violations,
			`${name}.svelte violates the imperative return-type floor (rule 12): ${violations.join(', ')}`,
		).toHaveLength(0)
	})

	it('rule 13 — root class prop must be declared (unless in exception list)', () => {
		if (INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name) || CLASS_PROP_EXCEPTIONS.has(name)) {
			// Exception: composite has no meaningful visual root, or is an internal
			// sub-component with no public API surface.
			expect(
				INTERNAL_SUBCOMPONENT_EXCEPTIONS.has(name) || CLASS_PROP_EXCEPTIONS.has(name),
			).toBe(true)
			return
		}
		const source = fs.readFileSync(path.join(compositesDir, `${name}.svelte`), 'utf8')
		expect(
			/class\?\s*:\s*string/.test(source),
			`${name}.svelte must declare a 'class?: string' prop (rule 13); add it to the Props interface`,
		).toBe(true)
	})

	it('rule 14 — no browser-API access at script top level (SSR safety)', () => {
		const source = fs.readFileSync(path.join(compositesDir, `${name}.svelte`), 'utf8')
		const violations = findTopLevelDomAccess(source)
		expect(
			violations,
			`${name}.svelte has top-level browser API access (rule 14 — SSR unsafe): ` +
				violations.map((v) => `line ${v.line}: ${v.text}`).join('; '),
		).toHaveLength(0)
	})
})
