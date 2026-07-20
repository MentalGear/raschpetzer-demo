import { test, expect, type Page } from '@playwright/test'

/**
 * Mobile-viewport VRT — mirrors vrt.spec.ts, at the "mobile" project's phone
 * viewport (no `test.use({ viewport })` override, so it inherits the project's
 * device). Covers the mobile top-bar + sidebar-Sheet added to AppShell, plus the
 * ToC-collapses-to-disclosure behavior (docs/backlog.md "Mobile & responsive").
 * Runs only on the `mobile` Playwright project; the desktop `chromium` project
 * ignores it.
 */
const SLUG = 'photosynthesis'

async function fontsReady(page: Page) {
	await page.evaluate(() => document.fonts.ready)
}

const shot = { animations: 'disabled' as const }

async function openReader(page: Page) {
	await page.goto(`/${SLUG}`)
	await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible', timeout: 60000 })
	await fontsReady(page)
}

async function openEditor(page: Page) {
	await openReader(page)
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
		await expect(page).toHaveScreenshot('reader-mobile-light.png', shot)
	})

	test('editor', async ({ page }) => {
		await openEditor(page)
		await expect(page).toHaveScreenshot('editor-mobile-light.png', shot)
	})
})

test.describe('dark', () => {
	test.use({ colorScheme: 'dark' })

	test('article reader', async ({ page }) => {
		await openReader(page)
		await expect(page).toHaveScreenshot('reader-mobile-dark.png', shot)
	})

	test('editor', async ({ page }) => {
		await openEditor(page)
		await expect(page).toHaveScreenshot('editor-mobile-dark.png', shot)
	})

	test('sidebar open (mobile Sheet)', async ({ page }) => {
		await openReader(page)
		await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
		await page.getByRole('link', { name: 'All Articles' }).waitFor({ state: 'visible' })
		await expect(page).toHaveScreenshot('reader-sidebar-open-mobile-dark.png', shot)
	})
})
