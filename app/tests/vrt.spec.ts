import { test, expect, type Page } from '@playwright/test'

/**
 * Visual-regression tests for the Wikipedia app. Deterministic by construction:
 * the mock corpus is static and the reader's relative-time label reads from a FIXED
 * `REF_NOW` constant (data/mock.ts), so no masking is needed. No network images —
 * figures/galleries render as token-only placeholders.
 *
 * Renderer pinning: pixel baselines are renderer-specific (font hinting /
 * antialiasing differ across OSes and Chromium builds), tagged `*-chromium-linux.png`.
 * They MUST be generated + compared in the pinned Playwright container — regenerate
 * with `VRT_APP=wikipedia scripts/vrt.sh --update-snapshots` (or the "Update VRT
 * baselines" workflow). See scripts/vrt.sh + docs/debug/troubleshooting.md.
 */
const SLUG = 'photosynthesis' // a stable slug in the mock corpus

async function fontsReady(page: Page) {
	await page.evaluate(() => document.fonts.ready)
}

const shot = { animations: 'disabled' as const }

test.use({ viewport: { width: 1280, height: 800 } })

async function openReader(page: Page) {
	await page.goto(`/${SLUG}`)
	await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible', timeout: 60000 })
	await fontsReady(page)
}

async function openEditor(page: Page) {
	// Editing is inline on the reader (no /edit route): open the article, click Edit, and
	// wait for the single-surface editor. It loads asynchronously (getBackend() + a
	// dynamically-imported TipTap): wait for the title field AND the editor surface.
	await page.goto(`/${SLUG}`)
	await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible', timeout: 60000 })
	// `exact` — the member top bar's trigger is labelled "Member menu — Ada, Editor", whose
	// "Editor" substring-matches a bare "Edit"; scope to the real Edit button.
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await page.getByRole('textbox', { name: 'Title' }).waitFor({ state: 'visible', timeout: 60000 })
	await page
		.locator('[aria-label="Article editor"]')
		.waitFor({ state: 'visible', timeout: 60000 })
	await fontsReady(page)
}

test.describe('light', () => {
	test.use({ colorScheme: 'light' })

	test('article reader', async ({ page }) => {
		await openReader(page)
		await expect(page).toHaveScreenshot('reader-light.png', shot)
	})

	test('editor', async ({ page }) => {
		await openEditor(page)
		await expect(page).toHaveScreenshot('editor-light.png', shot)
	})
})

test.describe('dark', () => {
	test.use({ colorScheme: 'dark' })

	test('article reader', async ({ page }) => {
		await openReader(page)
		await expect(page).toHaveScreenshot('reader-dark.png', shot)
	})

	test('editor', async ({ page }) => {
		await openEditor(page)
		await expect(page).toHaveScreenshot('editor-dark.png', shot)
	})
})
