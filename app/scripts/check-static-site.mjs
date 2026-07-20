#!/usr/bin/env node
/**
 * Crawls the built static site (../docs) the way GitHub Pages actually serves it — a
 * client-routed SPA where every unmatched path falls back to 404.html (see
 * svelte.config.ts's `fallback` option) — and reports anything a plain `curl` status-code
 * check would miss or get wrong:
 *   - internal links that render the app's own "Article not found" state (a soft 404 the
 *     SPA itself produces, not an HTTP error)
 *   - real HTTP 4xx/5xx on any resource the page actually requests (images, the PDF, JS
 *     chunks, fonts)
 *   - browser console errors / uncaught exceptions on any page
 *   - articles registered in the corpus but not reachable by following links from the
 *     homepage (orphans — they exist, but nothing in the site links to them)
 *
 * A raw HTTP check would flag every internal route as "404" (GH Pages returns 404 status
 * with the 404.html body for any path without a real file — that's by design for SPA
 * fallback), so this crawls with a real browser instead of trusting status codes alone.
 *
 * Usage: node scripts/check-static-site.mjs   (run after `bun run build`)
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = path.resolve(__dirname, '../../docs')
const DATA_DIR = path.resolve(__dirname, '../src/lib/wikipedia/data')
const PORT = Number(process.env.CHECK_STATIC_PORT ?? 8973)

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.pdf': 'application/pdf',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.txt': 'text/plain',
}

function detectBasePath() {
	const html = fs.readFileSync(path.join(DOCS_DIR, '404.html'), 'utf8')
	const m = html.match(/base:\s*"([^"]*)"/)
	return m ? m[1] : ''
}

/**
 * Article slugs only (`id: 'a-...'` immediately followed by `slug: '...'`) — Entities
 * (`id: 'e-...'`) back hover-preview cards, not routes, so they're never "reachable" pages
 * and would otherwise show up as false-positive orphans.
 */
function registeredArticleSlugs() {
	const slugs = new Set()
	for (const file of fs.readdirSync(DATA_DIR)) {
		if (!file.endsWith('.ts')) continue
		const text = fs.readFileSync(path.join(DATA_DIR, file), 'utf8')
		for (const m of text.matchAll(/id:\s*'a-[a-z0-9-]+',\s*\n\s*slug:\s*'([a-z0-9-]+)'/g)) {
			slugs.add(m[1])
		}
	}
	return slugs
}

function startServer(BASE) {
	const server = http.createServer((req, res) => {
		const urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0])
		// `docs/` has no `<base>/` subfolder of its own — GH Pages serves it AT that path
		// prefix, but the files on disk sit at the repo root, so strip it before mapping.
		const relPath = BASE && urlPath.startsWith(BASE) ? urlPath.slice(BASE.length) : urlPath
		let filePath = path.join(DOCS_DIR, relPath)
		if (relPath.endsWith('/')) filePath = path.join(filePath, 'index.html')
		let status = 200
		if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
			filePath = path.join(DOCS_DIR, '404.html')
			status = 200 // real GH Pages sends 404 here; the browser still renders the body either way
		}
		const ext = path.extname(filePath)
		res.writeHead(status, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
		fs.createReadStream(filePath).pipe(res)
	})
	return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)))
}

async function main() {
	if (!fs.existsSync(path.join(DOCS_DIR, '404.html'))) {
		console.error(`No build found at ${DOCS_DIR} — run \`bun run build\` first.`)
		process.exit(2)
	}
	const BASE = detectBasePath()
	const slugs = registeredArticleSlugs()
	const server = await startServer(BASE)
	const ORIGIN = `http://127.0.0.1:${PORT}`

	const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
	const context = await browser.newContext()

	const seen = new Set()
	const queue = [`${BASE}/`]
	const pages = []
	const brokenAssets = []

	while (queue.length) {
		const url = queue.shift()
		if (seen.has(url)) continue
		seen.add(url)

		const page = await context.newPage()
		const consoleErrors = []
		page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
		page.on('console', (m) => {
			if (m.type() === 'error') consoleErrors.push(`console: ${m.text()}`)
		})
		page.on('response', (res) => {
			if (res.status() >= 400)
				brokenAssets.push({ page: url, url: res.url(), status: res.status() })
		})

		let navError = null
		try {
			await page.goto(ORIGIN + url, { waitUntil: 'networkidle', timeout: 20000 })
			await page.waitForTimeout(300)
		} catch (e) {
			navError = e.message
		}

		const bodyText = (await page.textContent('body').catch(() => '')) ?? ''
		const isDeadArticle = bodyText.includes('Article not found')

		let hrefs = []
		try {
			hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
		} catch {
			// page may have failed to render at all — leave hrefs empty, already flagged via navError
		}
		for (const href of hrefs) {
			if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
			let abs
			try {
				abs = new URL(href, ORIGIN + url)
			} catch {
				continue
			}
			if (abs.origin !== ORIGIN) continue // external link — not crawled, not checked here
			const p = abs.pathname
			if (BASE && !p.startsWith(BASE)) continue
			if (!seen.has(p)) queue.push(p)
		}

		pages.push({ url, navError, consoleErrors, isDeadArticle })
		await page.close()
	}

	await browser.close()
	server.close()

	// Cross-reference: which registered article slugs were never reached by the crawl?
	const reachedPaths = new Set(pages.map((p) => p.url))
	const orphanSlugs = [...slugs].filter((slug) => !reachedPaths.has(`${BASE}/${slug}`))

	// ── report ──────────────────────────────────────────────────────────────
	let problems = 0
	console.log(`Crawled ${pages.length} pages from ${ORIGIN}${BASE}/\n`)

	for (const p of pages) {
		const issues = []
		if (p.navError) issues.push(`navigation error: ${p.navError}`)
		if (p.isDeadArticle)
			issues.push('renders "Article not found" (broken internal link target)')
		if (p.consoleErrors.length) issues.push(...p.consoleErrors)
		if (issues.length) {
			problems += issues.length
			console.log(`FAIL ${p.url}`)
			for (const i of issues) console.log(`  - ${i}`)
		}
	}

	if (brokenAssets.length) {
		problems += brokenAssets.length
		console.log(`\n${brokenAssets.length} resource(s) returned an HTTP error:`)
		for (const a of brokenAssets) console.log(`  [${a.status}] ${a.url}  (on ${a.page})`)
	}

	if (orphanSlugs.length) {
		console.log(
			`\n${orphanSlugs.length} registered article(s) exist but are unreachable by following links from the homepage:`,
		)
		for (const s of orphanSlugs) console.log(`  - ${s}`)
	}

	console.log(
		`\n${pages.length - pages.filter((p) => p.navError || p.isDeadArticle || p.consoleErrors.length).length}/${pages.length} crawled pages OK` +
			`, ${brokenAssets.length} broken resource(s), ${orphanSlugs.length} orphan article(s)`,
	)

	if (problems > 0 || orphanSlugs.length > 0) process.exit(1)
}

main()
