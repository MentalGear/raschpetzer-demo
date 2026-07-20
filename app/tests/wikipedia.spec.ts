import { test, expect, type Page, type Locator } from '@playwright/test'

/**
 * Wikipedia app — carve smoke tests. Assert the third carved app drives the SAME
 * kit (@kit/ui AppShell/SidebarNav/CommandPalette, @kit/core content/graph/diff)
 * for a reading- + editing-heavy domain, and that the carve wiring is intact
 * (routing de-prefixed to the app root, app.css loaded, ModeWatcher mounted).
 */
async function waitArticles(page: Page) {
	// article cards live in the page <main>; the sidebar nav also has links, so scope.
	await expect(page.getByRole('main').getByRole('link').first()).toBeVisible({ timeout: 40000 })
}

/**
 * Click into the editor's actual editable prose (its first top-level `<p>`), not a blind click
 * on the whole `[aria-label="Article editor"]` container's geometric center. Phase 4 made the
 * lead gallery NodeView (an atom, not text — see GalleryNodeView.svelte) taller, and on a long
 * enough article that pushes the container's midpoint far enough down that Playwright's
 * auto-scroll-into-view can land it behind the fixed-position floating Save/Publish bar
 * (FloatingEditBar.svelte) instead of on editable text — the click then lands on whatever's
 * fixed at that viewport point instead of placing a caret, so a follow-up `keyboard.type` silently
 * goes nowhere. `:scope > p` selects only TOP-LEVEL prose paragraphs (direct children of the
 * ProseMirror root), which also naturally excludes the gallery NodeView's own internal `<p>`
 * tags (sr-only status/help text) since those are nested, not top-level doc blocks.
 */
async function focusEditorProse(editor: Locator) {
	await editor.locator(':scope > p').first().click()
}

test('All Articles renders the article grid (kit AppShell + cards)', async ({ page }) => {
	await page.goto('/')
	await waitArticles(page)
	await expect(page.getByRole('heading', { level: 1, name: 'All Articles' })).toBeVisible()
	expect(await page.getByRole('main').getByRole('link').count()).toBeGreaterThan(2)
})

test('opening an article shows the reader with its title heading + History link', async ({
	page,
}) => {
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	// URL de-prefixed to the app root: a single-segment /<slug> (no /wikipedia prefix).
	await expect(page).toHaveURL(/\/[^/]+$/)
	// the reader renders the article title as the h1 and offers a History link in its
	// header (scoped: "History" is also a sidebar category name, so the page-wide role
	// query is intentionally ambiguous).
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	await expect(page.locator('header').getByRole('link', { name: 'History' })).toBeVisible()
})

test('a long article scrolls (content is not clipped by the shell inset)', async ({ page }) => {
	// Regression: AppShell's inset is a fixed-height (h-svh) overflow-hidden frame, so
	// the wikipedia layout must wrap routed content in its own scroller — otherwise a
	// tall article is clipped and the page can't scroll at all. Force the content to
	// exceed the viewport with a short window.
	await page.setViewportSize({ width: 1000, height: 600 })
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	await expect(page).toHaveURL(/\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const scroller = page.locator('[data-slot="sidebar-inset"] > div.overflow-y-auto').first()
	// the content is taller than the frame, and the scroller actually moves.
	expect(await scroller.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(100)
	await scroller.evaluate((el) => el.scrollTo(0, 400))
	expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
})

test('revision history renders (kit diff engine surface)', async ({ page }) => {
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	await page.locator('header').getByRole('link', { name: 'History' }).click()
	await expect(page.getByRole('heading', { level: 1, name: 'Revision history' })).toBeVisible()
	await expect(page.getByRole('list', { name: 'Revisions' })).toBeVisible()
})

test('search narrows the article list', async ({ page }) => {
	await page.goto('/search')
	const input = page.getByRole('textbox', { name: 'Search articles' })
	await expect(input).toBeVisible()
	await input.fill('the')
	// at least one result card appears in <main>.
	await expect(page.getByRole('main').getByRole('link').first()).toBeVisible({ timeout: 10000 })
})

test('categories route lists categories and drills into one', async ({ page }) => {
	await page.goto('/categories')
	await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible()
	// drill into the first category → its article list at the de-prefixed /category/<id>.
	await page.getByRole('main').getByRole('link').first().click()
	await expect(page).toHaveURL(/\/category\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('translate route renders the translation panel (de-prefixed /<slug>/translate)', async ({
	page,
}) => {
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	// wait for the SPA navigation to settle before reading the slug off the URL.
	await expect(page).toHaveURL(/\/[^/]+$/)
	const slug = new URL(page.url()).pathname.split('/').filter(Boolean).pop()
	await page.goto(`/${slug}/translate`)
	await expect(page).toHaveURL(/\/[^/]+\/translate$/)
	await expect(page.getByRole('heading', { level: 1, name: 'Translations' })).toBeVisible()
})

test('editing then navigating away fires the discard-guard confirm (beforeNavigate)', async ({
	page,
}) => {
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	// wait for the article reader to render before reaching for its Edit affordance.
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	// the session hydrates via getBackend() (the Title field appears when ready) and only
	// THEN is the editor (TipTap + its deps) dynamically imported — wait for each in turn.
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })
	await focusEditorProse(editor)
	await page.keyboard.type(' edited')
	const articleUrl = page.url()

	// (1) PROTECTION branch: dismissing the confirm must CANCEL the navigation —
	// the user stays on the dirty article with the editor still open. This is the
	// browser-level beforeNavigate → window.confirm wiring a unit test can't reach.
	const dismissed = page.waitForEvent('dialog')
	await page.getByRole('link', { name: 'All Articles' }).click()
	const d1 = await dismissed
	expect(d1.message()).toContain('Discard')
	await d1.dismiss()
	await expect(page).toHaveURL(articleUrl)
	await expect(editor).toBeVisible()

	// (2) ACCEPT branch: confirming discards the draft and the navigation proceeds.
	const accepted = page.waitForEvent('dialog')
	await page.getByRole('link', { name: 'All Articles' }).click()
	await (await accepted).accept()
	await expect(page).toHaveURL(/\/$/)
})

test('inline editor: load → edit → save (stage) → approve ×2 → publish → back to read', async ({
	page,
}) => {
	// Guard the toolbar teardown fix (EditorToolbar `editor?.off`): publishing runs
	// closeEditor(), which nulls editorInstance and UNMOUNTS the FloatingEditBar/toolbar — the
	// one path where `editor` is null at onDestroy. Without a pageerror listener a regressed
	// `editor.off` (non-null) would throw here silently and still leave the count assertions
	// green, so we assert no uncaught error fired across the publish/unmount.
	const pageErrors: string[] = []
	page.on('pageerror', (e) => pageErrors.push(String(e)))

	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	// wait for the SPA navigation to settle before capturing the article URL (the
	// homepage also has an h1, so asserting a heading isn't enough to prove we moved).
	await expect(page).toHaveURL(/\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	const articleUrl = page.url()

	// enter the single-surface editor IN PLACE (no /edit route). The session loads the
	// canonical Page through getBackend() and the editor's TipTap deps are dynamically
	// imported, so the title field + the one editor surface appear once ready.
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	const title = page.getByRole('textbox', { name: 'Title' })
	await expect(title).toBeVisible({ timeout: 30000 })
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })

	// exercise real ProseMirror editing on the single surface (not just the Title).
	await focusEditorProse(editor)
	await page.keyboard.type(' — appended in the editor')
	await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible()
	await expect(page.locator('#edit-status-desktop')).toHaveText('Unsaved changes')

	// Save stages the change; the consensus gate needs two approvals (this demo team's
	// quorum), so Publish is blocked until Bao + Cleo approve.
	// The title is a contenteditable `role=textbox` (not an <input>), so drive it as a
	// real user would: focus, select-all, type over the selection.
	await title.click()
	await page.keyboard.press('ControlOrMeta+a')
	await page.keyboard.type('Edited inline')
	const save = page.getByRole('button', { name: 'Save' })
	await expect(save).toBeEnabled()
	await save.click()
	// the floating bar's status badge is the in-place save confirmation (the fuller
	// "Saved as a staged change." message now lives in the Review overlay, asserted below).
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	// Publish relabels to a "Review" state (with the live approval count) until the gate is
	// satisfied, rather than sitting disabled — EditActionBar's needsReview behavior. The
	// approve/quorum workflow itself still lives in the member-only top-bar Review overlay: open
	// the member menu → Review, then approve as both reviewers there (this button ALSO opens the
	// same overlay on click, but the member-menu path is exercised here for its own coverage).
	const publish = page.getByTestId('publish-button-desktop')
	await expect(publish).toHaveText('Review (0/2)')
	await page.getByRole('button', { name: 'Member menu' }).click()
	await page.getByRole('menuitem', { name: 'Review' }).click()
	// the overlay carries the save confirmation, the approve buttons, and the quorum gate.
	await expect(page.getByText('Saved as a staged change.')).toBeVisible()
	// Each approve button reflects its own outcome (#11): after a reviewer signs off it
	// flips to a persistent, disabled "Approved ✓ {name}" (so you can't double-approve).
	await page.getByRole('button', { name: /Approve as Bao/ }).click()
	await expect(page.getByRole('button', { name: /Approved ✓ Bao/ })).toBeDisabled()
	await page.getByRole('button', { name: /Approve as Cleo/ }).click()
	await expect(page.getByRole('button', { name: /Approved ✓ Cleo/ })).toBeDisabled()
	await expect(page.getByText('Ready to publish')).toBeVisible()

	// Close the overlay (its backdrop would intercept the click) and publish from the floating
	// bar — once quorum is met the button reverts from "Review" back to a plain enabled
	// "Publish"; publishing returns to the READ view in place.
	await page.keyboard.press('Escape')
	await expect(publish).toHaveText('Publish')
	await expect(publish).toBeEnabled()
	await publish.click()
	// publishing returns to the READ view in place (same URL, editor gone, Edit is back).
	await expect(page).toHaveURL(articleUrl)
	await expect(editor).toHaveCount(0)
	await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
	// The publish→closeEditor→toolbar-unmount teardown threw nothing (guards `editor?.off`).
	await expect.poll(() => pageErrors).toEqual([])
})

test('Simple-Wikipedia variant: cross-links navigate, and the simple article edits/stages/publishes through the SAME flow as any other article', async ({
	page,
}) => {
	// The canonical article shows a "Simple English" link near the title (same treatment as
	// History/Translations); the simple variant shows a reciprocal "Full article" link back.
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()
	const simpleLink = page.getByRole('link', { name: 'Simple English' })
	await expect(simpleLink).toBeVisible()
	await simpleLink.click()
	await expect(page).toHaveURL(/\/photosynthesis-simple$/)
	await expect(
		page.getByRole('heading', { level: 1, name: 'Photosynthesis (Simple English)' }),
	).toBeVisible()
	const fullLink = page.getByRole('link', { name: 'Full article' })
	await expect(fullLink).toBeVisible()

	// A simple-variant article is a REAL separate Article — verify it edits/stages/reviews/
	// publishes through the exact same wikiEdit/EditSession/ContentBackend flow as any other
	// article (this is the load-bearing assertion: not a hypothetical, not implied by the
	// generic editor test above running against whichever article happens to sort first).
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	const title = page.getByRole('textbox', { name: 'Title' })
	await expect(title).toBeVisible({ timeout: 30000 })
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })

	await focusEditorProse(editor)
	await page.keyboard.type(' — appended in the editor')
	await expect(page.locator('#edit-status-desktop')).toHaveText('Unsaved changes')

	const save = page.getByRole('button', { name: 'Save' })
	await expect(save).toBeEnabled()
	await save.click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	const publish = page.getByTestId('publish-button-desktop')
	await expect(publish).toHaveText('Review (0/2)')
	await page.getByRole('button', { name: 'Member menu' }).click()
	await page.getByRole('menuitem', { name: 'Review' }).click()
	await expect(page.getByText('Saved as a staged change.')).toBeVisible()
	await page.getByRole('button', { name: /Approve as Bao/ }).click()
	await page.getByRole('button', { name: /Approve as Cleo/ }).click()
	await expect(page.getByText('Ready to publish')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(publish).toHaveText('Publish')
	await publish.click()

	// back to the read view, the edit landed (the appended text is now live).
	await expect(editor).toHaveCount(0)
	await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
	await expect(page.getByText('appended in the editor')).toBeVisible()

	// the reciprocal link still resolves back to the canonical article.
	await fullLink.click()
	await expect(page).toHaveURL(/\/photosynthesis$/)
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()
})

test('member-only admin button: visible when logged in, hidden after log out', async ({ page }) => {
	// The top bar's admin button is gated on a logged-in member (default: Ada). A logged-out
	// reader never sees it. Toggle the gate via the menu's Log out item and assert it vanishes.
	await page.goto('/')
	await waitArticles(page)
	const menu = page.getByRole('button', { name: 'Member menu' })
	await expect(menu).toBeVisible()

	await menu.click()
	await page.getByRole('menuitem', { name: 'Log out' }).click()
	await expect(menu).toHaveCount(0)
})

test('Edit is login-gated: visible for any logged-in member; hidden logged out; login restores it', async ({
	page,
}) => {
	// Edit is gated on being LOGGED IN, not on a role: ANY logged-in member (Ada/Bao/Cleo)
	// can author. A logged-out reader sees no Edit; logging back in restores it.
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	await expect(page).toHaveURL(/\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const edit = page.getByRole('button', { name: 'Edit', exact: true })
	const menu = page.getByRole('button', { name: 'Member menu' })

	// Default identity is Ada → Edit is available.
	await expect(edit).toBeVisible()

	// Switch to Bao (a reviewer) → Edit is STILL visible (login-gated, not role-gated).
	await menu.click()
	await page.getByRole('menuitemradio', { name: /Bao/ }).click()
	await expect(edit).toBeVisible()

	// Switch to Cleo (also a reviewer) → still visible.
	await menu.click()
	await page.getByRole('menuitemradio', { name: /Cleo/ }).click()
	await expect(edit).toBeVisible()

	// Log out → Edit disappears (login gates it).
	await menu.click()
	await page.getByRole('menuitem', { name: 'Log out' }).click()
	await expect(edit).toHaveCount(0)

	// Log back in → Edit returns.
	await page.getByRole('button', { name: 'Log in' }).click()
	await page.getByRole('menuitem', { name: /Ada/ }).click()
	await expect(edit).toBeVisible()
})

test('regression: switching member (or logging out) while editing neither crashes nor strands a saved change', async ({
	page,
}) => {
	// The prior role-gating pass auto-exited edit on capability loss, which (1) crashed
	// EditorToolbar's teardown (`editor.off` on a nulled instance), (2) silently dropped a
	// SAVED (non-dirty) change with no confirm, and (3) left a zombie confirm. Edit is
	// login-gated now with NO auto-exit, so switching member while editing simply KEEPS you
	// editing (as the newly-selected member); logging out mid-edit doesn't crash either.
	const pageErrors: string[] = []
	page.on('pageerror', (e) => pageErrors.push(String(e)))

	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	await expect(page).toHaveURL(/\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	const articleUrl = page.url()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	const title = page.getByRole('textbox', { name: 'Title' })
	await expect(title).toBeVisible({ timeout: 30000 })
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })

	// Make a real edit, then SAVE so the change is STAGED (non-dirty) — the exact state the
	// old auto-exit would have silently discarded on a member switch (bug #2).
	await focusEditorProse(editor)
	await page.keyboard.type(' regression edit')
	const save = page.getByRole('button', { name: 'Save' })
	await expect(save).toBeEnabled()
	await save.click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	// Switch member WHILE editing a staged change.
	const menu = page.getByRole('button', { name: 'Member menu' })
	await menu.click()
	await page.getByRole('menuitemradio', { name: /Bao/ }).click()

	// #1/#2/#3 gone: no crash, still editing IN PLACE (same URL), and the staged change
	// survived — the editor is still mounted, still shows "All changes saved", and is usable.
	await expect(page).toHaveURL(articleUrl)
	await expect(editor).toBeVisible()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')
	await focusEditorProse(editor)
	await page.keyboard.type(' still editable as the new member')
	await expect(page.locator('#edit-status-desktop')).toHaveText('Unsaved changes')

	// Log out WHILE editing a DIRTY change (steps above left "Unsaved changes") → this is the
	// exact trigger of bug #3: the old auto-exit ran requestClose() on capability loss, which on
	// a dirty session popped the "Discard changes?" confirm — a zombie dialog stranding the user.
	// With no auto-exit there's no crash and no confirm; the Log in affordance appears and the
	// editor stays put.
	await menu.click()
	await page.getByRole('menuitem', { name: 'Log out' }).click()
	await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
	await expect(editor).toBeVisible()
	await expect(page).toHaveURL(articleUrl)
	// #3 gone: no zombie discard-confirm was opened by the logout-while-dirty transition.
	await expect(page.getByRole('alertdialog')).toHaveCount(0)
	await expect(page.getByRole('button', { name: 'Keep editing' })).toHaveCount(0)

	// No uncaught exception fired on any of those transitions (bug #1's crash vector). Poll so a
	// late async teardown error (a microtask after unmount) can't slip past a one-shot snapshot.
	await expect.poll(() => pageErrors).toEqual([])
})

test('review: a reviewer who authored the change can’t self-approve, and the dead-end is surfaced honestly', async ({
	page,
}) => {
	// Login-gating lets ANY member author — including a reviewer (Bao/Cleo). The consensus demo
	// has exactly two reviewers and a quorum of two, so a reviewer's OWN change can only ever
	// collect one eligible approval → it can't reach quorum. This must be (a) enforced (the
	// author's own Approve button disabled, no self-quorum) and (b) surfaced honestly, not read
	// as a silent "one approval short forever." Authorship is pinned at session-open, so a later
	// member switch must NOT move it.
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	await expect(page).toHaveURL(/\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	// Switch to Bao (a reviewer) BEFORE editing, so Bao authors the change (actor === 'bao').
	const menu = page.getByRole('button', { name: 'Member menu' })
	await menu.click()
	await page.getByRole('menuitemradio', { name: /Bao/ }).click()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })
	await focusEditorProse(editor)
	await page.keyboard.type(' authored by a reviewer')
	await expect(page.locator('#edit-status-desktop')).toHaveText('Unsaved changes')

	const openReview = async () => {
		await menu.click()
		await page.getByRole('menuitem', { name: 'Review' }).click()
	}
	const bao = page.getByRole('button', { name: /Approve as Bao/ })
	const cleo = page.getByRole('button', { name: /Approve as Cleo/ })

	// While DIRTY (pre-Save) BOTH approve buttons are disabled and the save-first hint shows.
	await openReview()
	await expect(cleo).toBeDisabled()
	await expect(
		page.getByText('Save your changes before approving', { exact: false }),
	).toBeVisible()
	await page.keyboard.press('Escape')

	// Save → staged (non-dirty), isolating the self-authorship disable from the dirty disable.
	const save = page.getByRole('button', { name: 'Save' })
	await expect(save).toBeEnabled()
	await save.click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	await openReview()
	// The author (Bao) can't approve their own change; Cleo (not the author) can.
	await expect(bao).toBeDisabled()
	await expect(cleo).toBeEnabled()
	// The reason is stated in visible copy (not title-only) — accessible to everyone.
	// (Match an apostrophe-free substring so straight-vs-curly quotes can't flake the test.)
	await expect(
		page.getByText('The demo team has only two reviewers and needs two approvals', {
			exact: false,
		}),
	).toBeVisible()

	// Approve as the one eligible reviewer → still short of quorum, and the dead-end is named
	// EXPLICITLY rather than left as a bare "quorum not met".
	await cleo.click()
	await expect(page.getByRole('button', { name: /Approved ✓ Cleo/ })).toBeDisabled()
	// Scope "Blocked" to the Review overlay's own gate breakdown (the floating bar also shows it).
	await expect(page.locator('#publish-gate').getByText('Blocked')).toBeVisible()
	await expect(
		page.getByText('its author is one of only two reviewers', { exact: false }),
	).toBeVisible()

	// Authorship is pinned at open: switching the logged-in member to Cleo must NOT hand the
	// authorship (and thus the self-disable) to Cleo. Bao stays the author.
	await page.keyboard.press('Escape')
	await menu.click()
	await page.getByRole('menuitemradio', { name: /Cleo/ }).click()
	await openReview()
	await expect(bao).toBeDisabled() // still the author → still self-disabled
	await expect(
		page.getByText('its author is one of only two reviewers', { exact: false }),
	).toBeVisible()
})

test('logged out hides Edit + member button; logging in as Ada restores them', async ({ page }) => {
	// Logging out gates editing AND the admin surface; the compact Log in affordance (#13) is
	// the re-entry path — pick a member to log in as, no reload, no dead-end empty bar.
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	await expect(page).toHaveURL(/\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const edit = page.getByRole('button', { name: 'Edit', exact: true })
	const memberMenu = page.getByRole('button', { name: 'Member menu' })
	const loginMenu = page.getByRole('button', { name: 'Log in' })

	await expect(edit).toBeVisible()
	await expect(memberMenu).toBeVisible()

	// Log out → member menu + Edit vanish; the Log in affordance appears.
	await memberMenu.click()
	await page.getByRole('menuitem', { name: 'Log out' }).click()
	await expect(memberMenu).toHaveCount(0)
	await expect(edit).toHaveCount(0)
	await expect(loginMenu).toBeVisible()

	// Log back in as Ada (editor) → Edit + the member menu return in place.
	await loginMenu.click()
	await page.getByRole('menuitem', { name: /Ada/ }).click()
	await expect(edit).toBeVisible()
	await expect(memberMenu).toBeVisible()
})

test('zero layout shift: entering edit mode does not move or reflow the article body', async ({
	page,
}) => {
	// The redesign's defining property (A): edit is a mode toggle whose affordances FLOAT
	// (overlay), so the article body's geometry is identical read vs edit — no push-down, no
	// horizontal reflow. We measure the body region's box in read mode, enter edit, and assert
	// x/y/width are unchanged. Height legitimately differs (editor min-h-[40vh] + different
	// content length), so it's deliberately NOT asserted.
	// Pin a DESKTOP (lg, ≥1024px) viewport: below lg the infobox is in normal flow and its margin
	// masks the collapse-through the y assertion guards; at lg the infobox floats out of flow, so
	// this is the width where any body-top shift actually manifests. Don't leave it to the default.
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/')
	await waitArticles(page)
	await page.getByRole('main').getByRole('link').first().click()
	await expect(page).toHaveURL(/\/[^/]+$/)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const body = page.getByTestId('article-body-region')
	await expect(body).toBeVisible()
	const read = await body.boundingBox()
	expect(read).not.toBeNull()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	// wait for the editor to be fully ready (title field + the ProseMirror surface) so the
	// header has settled into its edit-mode composition before re-measuring.
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	await expect(page.locator('[aria-label="Article editor"]')).toBeVisible({ timeout: 30000 })

	const edit = await body.boundingBox()
	expect(edit).not.toBeNull()

	// x and width are pixel-identical — the header/title block has IDENTICAL height read vs edit
	// (top-controls + title only; the title swaps <h1>↔contenteditable at the same typography, the
	// Edit↔Done label flips in place, and the toolbar/Save/Publish live in the fixed floating bar
	// that overlays rather than reflowing). No push-down, no horizontal reflow.
	expect(edit!.x).toBeCloseTo(read!.x, 1)
	expect(edit!.width).toBeCloseTo(read!.width, 1)

	// The body region's top is PIXEL-IDENTICAL read↔edit. The chrome above is byte-identical, and
	// the one content-driven residual — the wrapper's `mt-2` collapses through its first child,
	// whose top margin differs (read body's first `<p class="my-3">` = 12px vs the editor's flex
	// root = 0px) — is neutralized by giving the editor's first child a matching 12px top in edit
	// mode (`[&>*:first-child]:mt-3` on the wrapper). So entering edit mode moves the body by zero
	// pixels. A regression that re-grew the header (a status/toolbar row ≥34px, or re-stickying it)
	// blows this loudly.
	expect(edit!.y).toBeCloseTo(read!.y, 1)
})

test('zero layout shift holds for an article containing a gallery (honeybee/en)', async ({
	page,
}) => {
	// The generic zero-shift test above (line 456) exercises whichever article the article list
	// happens to list first — not guaranteed to contain a gallery block. The gallery is the one
	// block type whose edit-mode rendering is UNAVOIDABLY taller than its read-mode rendering
	// (Phase 4's HScroller-strip rework gives it the same WIDTH/shape as read mode, but each card
	// gains alt/caption/credit fields + a remove button read mode doesn't have) — so this
	// is the specific case most likely to have broken the invariant if the redesign had pushed
	// that extra height into normal flow ABOVE the body region instead of the gallery block being
	// free to grow BELOW it. Same assertions as the generic test (x/width/y of the body region
	// unchanged; height deliberately not asserted), pointed at honeybee specifically.
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/honeybee')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const body = page.getByTestId('article-body-region')
	await expect(body).toBeVisible()
	const read = await body.boundingBox()
	expect(read).not.toBeNull()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	await expect(page.locator('[aria-label="Article editor"]')).toBeVisible({ timeout: 30000 })
	// Also wait for the (taller) gallery NodeView itself to be ready, so the measurement below
	// reflects its final settled layout, not a mid-mount transient.
	const galleries = page.locator('[data-gallery-editor]')
	await expect(galleries).toHaveCount(2, { timeout: 30000 })

	const edit = await body.boundingBox()
	expect(edit).not.toBeNull()

	expect(edit!.x).toBeCloseTo(read!.x, 1)
	expect(edit!.width).toBeCloseTo(read!.width, 1)
	expect(edit!.y).toBeCloseTo(read!.y, 1)
})

test('zero layout shift holds THROUGHOUT the transition, not just before/after', async ({
	page,
}) => {
	// The two zero-shift tests above only compare a settled read-mode snapshot against a settled
	// edit-mode snapshot — they can't see a transient mid-flight jump that resolves back to the
	// same final position. That's exactly the shape of bug a real user reported ("a jump between
	// the summary and the first content when entering edit mode") that those tests kept passing
	// through: `editPhase` flips to 'ready' before the dynamic `import('../content/editor/
	// ArticleEditor.svelte')` resolves — a dynamic import is ALWAYS at least one async tick, even
	// when the module is already cached (TipTap/ProseMirror core itself is NOT part of this lazy
	// chunk — it's already resident, loaded statically by the read surface; the lazy chunk here is
	// just ArticleEditor.svelte's own ~3KB-gzip code) — and the `{#await}` block had no `pending`
	// snippet, so the body region rendered NOTHING for that gap and collapsed to 0 height, snapping
	// the region's top edge up before snapping back once the chunk resolved. Fixed by giving that
	// await block a `pending` snippet matching the loading spinner. This test samples the region's top edge on
	// every animation frame across the whole click→settled transition (not just the endpoints) so a
	// regression here fails loudly instead of silently passing the endpoint-only assertions above.
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/honeybee')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const body = page.getByTestId('article-body-region')
	await expect(body).toBeVisible()
	const read = await body.boundingBox()
	expect(read).not.toBeNull()

	await page.evaluate(() => {
		const w = window as unknown as { __topSamples: number[] }
		w.__topSamples = []
		const region = document.querySelector('[data-testid="article-body-region"]')
		function sample() {
			w.__topSamples.push(region!.getBoundingClientRect().top)
			if (w.__topSamples.length < 180) requestAnimationFrame(sample)
		}
		requestAnimationFrame(sample)
	})

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	await expect(page.locator('[aria-label="Article editor"]')).toBeVisible({ timeout: 30000 })
	// give the sampler its full 180 frames (~3s at 60fps) to finish even once the editor is ready.
	await page.waitForFunction(
		() => (window as unknown as { __topSamples: number[] }).__topSamples.length >= 180,
	)

	const samples = await page.evaluate(
		() => (window as unknown as { __topSamples: number[] }).__topSamples,
	)
	for (const top of samples) expect(top).toBeCloseTo(read!.y, 0)
})

test('theme toggle flips dark mode (ModeWatcher mounted after carve)', async ({ page }) => {
	await page.goto('/')
	await waitArticles(page)
	const before = await page.evaluate(() => document.documentElement.classList.contains('dark'))
	await page.getByRole('button', { name: 'Theme' }).click()
	await page.getByRole('option', { name: before ? 'Light' : 'Dark' }).click()
	await expect
		.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
		.toBe(!before)
})

test('gallery NodeView: edit alt/caption, add, reorder, remove — round-trips through save', async ({
	page,
}) => {
	// Phase 3 (§F): the read-only gallery atom is now an interactive NodeView. Every edit writes
	// the `items` attr back through the editor, so the change must round-trip through docToPage
	// (which would SILENTLY swallow an invalid item). We assert propagation via the status badge
	// (only flips when onChange actually fired) and a successful Save (docToPage didn't throw).
	const pageErrors: string[] = []
	page.on('pageerror', (e) => pageErrors.push(String(e)))

	// The article's LEAD gallery (its figure's auto-generated one-item gallery_block) renders as a
	// hidden, zero-height placeholder now — not an interactive NodeView (see GalleryNodeView.svelte's
	// `isLead`; lead-figure editing is deferred, ADR-001). So a one-item gallery to exercise here has
	// to come from the Insert menu instead (G4 — inserts a real gallery atom with one placeholder
	// item, `newPlaceholderItem`), which also exercises that real, user-facing insertion path.
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })

	await focusEditorProse(editor)
	await page.getByRole('button', { name: 'Insert block' }).click()
	await page.getByRole('menuitem', { name: 'Media gallery' }).click()

	// The lead's own gallery placeholder is also `[data-gallery-editor]` but stays `hidden` —
	// `:not([hidden])` uniquely identifies the one just inserted. The inline render is now the
	// SAME rich slider read mode uses (2026-07-19 — GalleryNodeView.svelte's own doc comment);
	// the metadata/order form fields moved into a modal, opened via a hover-revealed pencil icon.
	const galleryRegion = page.locator('[data-gallery-editor]:not([hidden])')
	await expect(galleryRegion).toBeVisible({ timeout: 30000 })
	await galleryRegion.hover()
	await galleryRegion.getByRole('button', { name: 'Edit gallery' }).click()
	const gallery = page.getByRole('dialog', { name: 'Edit gallery' })
	await expect(gallery).toBeVisible()
	// Alt inputs are named by their visible <Label> ("Alt text (required)"); the card scopes them
	// as "Image N" (role=group), so we index by position.
	const alts = gallery.getByRole('textbox', { name: 'Alt text (required)' })
	await expect(alts).toHaveCount(1)

	// (1) edit alt → propagates (status flips, so docToPage accepted the write).
	await alts.first().fill('Backlit leaf, edited')
	await alts.first().blur()
	await expect(page.locator('#edit-status-desktop')).toHaveText('Unsaved changes')

	// (2) whitespace-only alt is REJECTED (WCAG-required, schema min(1)): not committed, flagged
	// aria-invalid with a visible error — no silent revert, no silent docToPage swallow. Fixing it
	// clears the error.
	await alts.first().fill('   ')
	await alts.first().blur()
	// Scope to the item card (the sr-only status region shares this text): the VISIBLE field error.
	const card1 = gallery.getByRole('group', { name: 'Image 1' })
	await expect(card1.getByText('Alt text is required for accessibility.')).toBeVisible()
	await expect(alts.first()).toHaveAttribute('aria-invalid', 'true')
	await alts.first().fill('Backlit leaf, edited')
	await alts.first().blur()
	await expect(card1.getByText('Alt text is required for accessibility.')).toHaveCount(0)

	// (3) add a placeholder image → two items; the announcement counts correctly (no off-by-one)
	// and focus lands in the new item's alt field.
	await gallery.getByRole('button', { name: 'Add image' }).click()
	await expect(alts).toHaveCount(2)
	await expect(alts.nth(1)).toHaveValue('New image')
	await expect(gallery.getByRole('status')).toHaveText('Added a placeholder image. 2 total.')
	await expect(alts.nth(1)).toBeFocused()

	// (4) reorder lives on the INLINE cards now, not the modal (2026-07-19, later round) — close
	// the modal first. Move image 2 left → the new item leads; focus follows the item to the
	// bound (its left arrow is now disabled, so focus moves to the still-enabled right arrow —
	// not to <body>).
	await gallery.getByRole('button', { name: 'Done' }).click()
	await expect(gallery).toBeHidden()
	await galleryRegion.getByRole('button', { name: /Move image 2 left/ }).click()
	await expect(galleryRegion.getByRole('button', { name: /Move image 1 right/ })).toBeFocused()

	// re-open the modal (reordering happened while it was closed) and confirm the alt fields
	// reflect the new order.
	await galleryRegion.hover()
	await galleryRegion.getByRole('button', { name: 'Edit gallery' }).click()
	await expect(gallery).toBeVisible()
	await expect(alts.first()).toHaveValue('New image')
	await expect(alts.nth(1)).toHaveValue('Backlit leaf, edited')

	// (5) remove image 1 → an AlertDialog confirm gates the actual removal (destructive, no undo);
	// dismissing it via Cancel does nothing, confirming via Remove takes effect. Back to one item
	// (the edited leaf); the announcement counts correctly and focus moves to the remaining item's
	// Remove button (never dropped to <body>).
	await gallery.getByRole('button', { name: /Remove image 1/ }).click()
	const confirmRemove = page.getByRole('alertdialog', { name: 'Remove this image?' })
	await expect(confirmRemove).toBeVisible()
	await confirmRemove.getByRole('button', { name: 'Keep image' }).click()
	await expect(confirmRemove).toBeHidden()
	await expect(alts).toHaveCount(2)

	await gallery.getByRole('button', { name: /Remove image 1/ }).click()
	await expect(confirmRemove).toBeVisible()
	await confirmRemove.getByRole('button', { name: 'Remove' }).click()
	await expect(confirmRemove).toBeHidden()
	await expect(alts).toHaveCount(1)
	await expect(alts.first()).toHaveValue('Backlit leaf, edited')
	await expect(gallery.getByRole('status')).toHaveText(/Removed .*\. 1 remaining\./)
	await expect(gallery.getByRole('button', { name: /Remove image 1/ })).toBeFocused()

	// (6) Save stages the change: docToPage produced a schema-valid Page for every edit above.
	// Close the modal first — Save lives in the page chrome behind it.
	await gallery.getByRole('button', { name: 'Done' }).click()
	await expect(gallery).toBeHidden()
	const save = page.getByRole('button', { name: 'Save' })
	await expect(save).toBeEnabled()
	await save.click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	await expect.poll(() => pageErrors).toEqual([])
})

test('gallery NodeView renders a genuine multi-item body gallery correctly (honeybee/en)', async ({
	page,
}) => {
	// The test above only ever exercised the NodeView against a 1-item gallery (the lead figure's
	// auto-generated gallery_block). honeybee/en's body gallery (data/mock.ts, 4 items) is the
	// first REAL multi-item gallery the editor renders from real fixture data — regression
	// coverage for galleryBlockToGallery/galleryToGalleryBlock's >1-item round trip actually
	// reaching the editor UI, not just the unit-tested converter functions in isolation.
	const pageErrors: string[] = []
	page.on('pageerror', (e) => pageErrors.push(String(e)))

	await page.goto('/honeybee')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })

	// Two galleries: the lead figure's auto-generated 1-item gallery, and the new 4-item body
	// gallery — target the one with 4 items rather than assuming an order. The inline render is
	// now the SAME rich slider read mode uses (2026-07-19), so "has 4 items" is identified via
	// the slider's own "Edit image N of 4" buttons (in edit mode, clicking any image opens the
	// edit modal directly — see the aria-label's editable branch), not a role=group edit-form
	// card (that only exists inside the edit modal now — opened below).
	const galleries = page.locator('[data-gallery-editor]')
	await expect(galleries).toHaveCount(2, { timeout: 30000 })
	const bodyGalleryRegion = galleries.filter({
		has: page.getByRole('button', { name: /Edit image 4 of 4/ }),
	})
	await expect(bodyGalleryRegion).toHaveCount(1)
	await bodyGalleryRegion.hover()
	await bodyGalleryRegion.getByRole('button', { name: 'Edit gallery' }).click()
	const bodyGallery = page.getByRole('dialog', { name: 'Edit gallery' })
	await expect(bodyGallery).toBeVisible()

	const alts = bodyGallery.getByRole('textbox', { name: 'Alt text (required)' })
	await expect(alts).toHaveCount(4)
	await expect(alts.nth(0)).toHaveValue(
		'A honeybee worker tending capped brood cells on a comb frame',
	)
	await expect(alts.nth(1)).toHaveValue('A wooden Langstroth hive box standing in an apiary')
	await expect(alts.nth(2)).toHaveValue('A honeybee dusted with pollen visiting an apple blossom')
	await expect(alts.nth(3)).toHaveValue('A beekeeper inspecting a hive frame in protective gear')

	// caption/credit round-trip too — not just alt.
	await expect(
		bodyGallery.getByRole('group', { name: 'Image 1' }).getByLabel('Caption'),
	).toHaveValue('A nurse bee tends capped brood within the comb.')
	await expect(
		bodyGallery.getByRole('group', { name: 'Image 1' }).getByLabel('Credit'),
	).toHaveValue('Illustration')
	// item 2 ('gal-langstroth') has neither caption nor credit — both fields blank.
	await expect(
		bodyGallery.getByRole('group', { name: 'Image 2' }).getByLabel('Caption'),
	).toHaveValue('')
	await expect(
		bodyGallery.getByRole('group', { name: 'Image 2' }).getByLabel('Credit'),
	).toHaveValue('')

	await expect.poll(() => pageErrors).toEqual([])
})

test('gallery card width matches between read mode and edit mode (honeybee/en)', async ({
	page,
}) => {
	// 2026-07-19: the gallery NodeView's inline render is now the SAME rich slider in both
	// read and edit modes (GalleryNodeView.svelte's own doc comment) — read and edit no longer
	// have two independently-styled layouts to keep in sync by hand; this is the direct
	// regression test that the two really do share one component, not just "happen to match."
	await page.goto('/honeybee')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const readCard = page.getByRole('button', { name: /Open image 1 of 4/ })
	await expect(readCard).toBeVisible()
	const readBox = await readCard.boundingBox()
	expect(readBox).not.toBeNull()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	// Same underlying card/component, same aria-label pattern (just "Edit" instead of "Open" —
	// editing intent, not viewing intent, while editable) — this only passes if it's genuinely
	// the same component rendering in both modes, not a coincidentally-matching separate one.
	const editCard = page.getByRole('button', { name: /Edit image 1 of 4/ })
	await expect(editCard).toBeVisible({ timeout: 30000 })
	const editBox = await editCard.boundingBox()
	expect(editBox).not.toBeNull()

	expect(editBox!.width).toBeCloseTo(readBox!.width, 0)
})

test('gallery editor fields: arrow keys move the caret and extend selection (regression)', async ({
	page,
}) => {
	// Nesting the gallery's Alt/Caption/Credit text inputs inside HScroller's content (Phase 4)
	// exposed TWO independent bugs, both found in expert review: (1) HScroller's own track-level
	// ArrowLeft/ArrowRight paging handler intercepted the keydown before the input's native caret
	// movement ran (fixed in HScroller.svelte itself, with its own regression story); (2)
	// separately, the editor's own keymap (gapcursor, bundled by StarterKit — binds bare arrow
	// keys to move the cursor around atom nodes) ALSO intercepted the same keydown via a listener
	// on the editor's view.dom, regardless of NodeView.stopEvent (fixed via a capture-phase guard
	// in GalleryNodeView.svelte, guardFieldArrowKeys). This test guards BOTH: without either fix,
	// a focused field's caret simply never moves off position 0.
	await page.goto('/honeybee')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })

	const galleries = page.locator('[data-gallery-editor]')
	await expect(galleries).toHaveCount(2, { timeout: 30000 })
	const bodyGalleryRegion = galleries.filter({
		has: page.getByRole('button', { name: /Edit image 4 of 4/ }),
	})
	await bodyGalleryRegion.hover()
	await bodyGalleryRegion.getByRole('button', { name: 'Edit gallery' }).click()
	const bodyGallery = page.getByRole('dialog', { name: 'Edit gallery' })
	await expect(bodyGallery).toBeVisible()
	const altInput = bodyGallery.getByRole('textbox', { name: 'Alt text (required)' }).first()

	await altInput.click()
	await altInput.fill('hello')
	await altInput.press('Home')
	await expect.poll(() => altInput.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(0)

	await altInput.press('ArrowRight')
	await expect.poll(() => altInput.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(1)

	await altInput.press('ArrowRight')
	await expect.poll(() => altInput.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(2)

	// Shift+ArrowRight extends the selection too (not just plain caret movement).
	await altInput.press('Home')
	await altInput.press('Shift+ArrowRight')
	await altInput.press('Shift+ArrowRight')
	await expect
		.poll(() =>
			altInput.evaluate((el: HTMLInputElement) => ({
				start: el.selectionStart,
				end: el.selectionEnd,
			})),
		)
		.toEqual({ start: 0, end: 2 })
})

test('redlink styling matches between read and edit mode (regression: editor used to blanket-blue every link)', async ({
	page,
}) => {
	// `photosynthesis`'s first paragraph links "chloroplast" and "chlorophyll" both to the
	// `chlorophyll` slug (data/mock.ts), which has an Entity but no backing Article — a
	// deliberate redlink. `linkExistenceDecoration` (extensions.ts) adds an `editor-link-redlink`
	// class, styled to a dotted-red treatment (ArticleEditor.svelte / ArticleTipTapReader.svelte,
	// both carrying an identical copy of the same CSS rule). 2026-07-19: read mode is now the SAME
	// live-editor render as edit mode (ArticleTipTapReader vs. ArticleEditor, both built on the
	// same schema + `linkExistenceDecoration`) — so this test now checks the literal SAME
	// selector in both states, which is itself the regression coverage: before this
	// architecture change, read and edit had two INDEPENDENT redlink implementations
	// (InlineRuns.svelte's own Tailwind classes vs. this decoration) that had to be kept in
	// visual sync by hand; now there's only one mechanism to go stale.
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	async function assertRedlinks(context: string) {
		const redlinks = page.locator('.tiptap-body .editor-link-redlink')
		// both "chloroplast" and "chlorophyll" runs point at the same missing `chlorophyll` slug.
		// Explicit 30s timeout (playwright.config.ts's own note that the first test to mount the
		// editor pays a cold on-demand compile): the default 5s `expect` timeout flaked here on a
		// genuinely cold run (found in expert review).
		await expect(redlinks, context).toHaveCount(2, { timeout: 30000 })
		await expect(redlinks.nth(0), context).toHaveText('chloroplast', { timeout: 30000 })
		await expect(redlinks.nth(1), context).toHaveText('chlorophyll', { timeout: 30000 })
	}

	await assertRedlinks('read mode')

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	await expect(page.locator('[aria-label="Article editor"]')).toBeVisible({ timeout: 30000 })

	await assertRedlinks('edit mode')
})

test('hover previews: citation, footnote, and internal-link markers show rich content in read mode', async ({
	page,
}) => {
	// The 2026-07-19 "Interactive HoverCard behavior on links/citations/notes" backlog item
	// (previously deferred): `citeNoteMarkerDecoration` mounts a numbered `[n]` marker after every
	// `cite`/`note`-marked run (content ported verbatim from the retired `InlineRuns.svelte`), and
	// `LinkHoverPreview` gives every internal link the same rich title+blurb preview via a single
	// shared popover (bits-ui `customAnchor`, since a `link` MARK's real `<a>` can't be wrapped in
	// a mounted Svelte component the way a widget can). `photosynthesis`/en (data/mock.ts) has one
	// of each: citation `c1` (Blackman 1905), one footnote on "oxygen", and an internal link to
	// `chlorophyll` (an Entity with no backing Article — also exercises the redlink caveat line).
	//
	// Asserted via the popover's own `data-slot="hover-card-content"` + `data-state`, NOT loose
	// text matching — the citation's title/authors/year text is ALSO present, always, in the
	// always-visible References section at the bottom of the article, so a plain `getByText` check
	// would pass whether or not the actual hover-card ever opened (found live while building this).
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const content = page.locator('[data-slot="hover-card-content"]')

	// citation marker
	// citation `c1` is cited twice in this article (data/mock.ts) — same reference number both
	// times, matching real Wikipedia's "cite the same source more than once" semantics.
	const citeMarker = page
		.locator('.tiptap-body')
		.getByRole('button', { name: 'Jump to reference 1' })
		.first()
	await expect(citeMarker).toHaveText('[1]')
	await citeMarker.hover()
	await expect(content).toContainText('Photosynthesis and its relation to light')
	await expect(content).toContainText('Blackman, F. F.')
	await expect(content).toContainText('1905')
	await expect(content).toContainText('Annals of Botany')
	await page.mouse.move(20, 20, { steps: 10 })
	await expect(content).toHaveCount(0, { timeout: 5000 })

	// footnote marker
	const noteMarker = page.locator('.tiptap-body').getByRole('button', { name: 'Footnote 1' })
	await expect(noteMarker).toHaveText('[1]')
	await noteMarker.hover()
	await expect(content).toContainText(
		'Almost all atmospheric oxygen originates from photosynthesis over geological time.',
	)
	await page.mouse.move(20, 20, { steps: 10 })
	await expect(content).toHaveCount(0, { timeout: 5000 })

	// internal-link marker (the shared delegated popover) — "chlorophyll" is an Entity with no
	// backing Article (see the redlink test above), so this also covers the "doesn't exist" line.
	const linkMarker = page.locator('.tiptap-body a[href="/chlorophyll"]').first()
	await linkMarker.hover()
	await expect(content).toContainText('Chlorophyll')
	await expect(content).toContainText(
		'The green pigment that captures light in plants and algae.',
	)
	await expect(content).toContainText("This article doesn't exist yet.")
	await page.mouse.move(20, 20, { steps: 10 })
	await expect(content).toHaveCount(0, { timeout: 5000 })
})

test('hover previews also work while editing (the shared link popover is NOT read-only)', async ({
	page,
}) => {
	// The link preview is the one piece with genuinely new interaction plumbing (a delegated
	// hover/focus listener on the editor root, not a widget-mounted HoverCard like citations/notes
	// get) — and citeNoteMarkerDecoration's widgets must survive being torn down and rebuilt on
	// every keystroke (unlike the read-only reader, where `apply` never rebuilds past `init`). This
	// is the regression coverage for both: hover the SAME internal link while actively editing,
	// then type near a citation marker to force a doc-changed rebuild and confirm its marker still
	// opens correctly afterwards (proving `citeNoteMarkerDecoration`'s mount/unmount cleanup is
	// sound, not just "doesn't crash").
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })
	await expect(page.locator('[aria-label="Article editor"]')).toBeVisible({ timeout: 30000 })

	const content = page.locator('[data-slot="hover-card-content"]')

	const linkMarker = page.locator('.tiptap-body a[href="/chlorophyll"]').first()
	await linkMarker.hover()
	await expect(content).toContainText('Chlorophyll')
	await page.mouse.move(20, 20, { steps: 10 })
	await expect(content).toHaveCount(0, { timeout: 5000 })

	// force a docChanged rebuild via a real edit, then re-check the citation marker.
	const firstP = page.locator('.tiptap-body [role="textbox"] p').first()
	await firstP.click()
	await page.keyboard.press('End')
	await page.keyboard.type(' more')

	// citation `c1` is cited twice in this article (data/mock.ts) — same reference number both
	// times, matching real Wikipedia's "cite the same source more than once" semantics.
	const citeMarker = page
		.locator('.tiptap-body')
		.getByRole('button', { name: 'Jump to reference 1' })
		.first()
	await citeMarker.hover()
	await expect(content).toContainText('Photosynthesis and its relation to light')
})

test('publish reconciliation: a published edit actually shows in the read view', async ({
	page,
}) => {
	// The reader renders wikiStore (mock Article); the editor publishes a Page into the backend.
	// Without reconciliation the published change silently never appears. Edit title + body, run the
	// full gate, publish, and assert the READ view we return to shows the change (+ a confirmation).
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	const title = page.getByRole('textbox', { name: 'Title' })
	await expect(title).toBeVisible({ timeout: 30000 })
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })

	// edit the title
	await title.click()
	await page.keyboard.press('ControlOrMeta+a')
	await page.keyboard.type('Photosynthesis (published edit)')
	// add a unique body marker
	await focusEditorProse(editor)
	await page.keyboard.type(' MARKER_PUBLISHED_42')

	await page.getByRole('button', { name: 'Save' }).click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	// run the consensus gate via the Review overlay, then publish from the floating bar
	await page.getByRole('button', { name: 'Member menu' }).click()
	await page.getByRole('menuitem', { name: 'Review' }).click()
	await page.getByRole('button', { name: /Approve as Bao/ }).click()
	await page.getByRole('button', { name: /Approve as Cleo/ }).click()
	await expect(page.getByText('Ready to publish')).toBeVisible()
	await page.keyboard.press('Escape')
	const publish = page.getByRole('button', { name: 'Publish' })
	await expect(publish).toBeEnabled()
	await publish.click()

	// back in the read view: the confirmation shows AND the published change is actually rendered.
	await expect(page.getByText('Published — your change is now live.')).toBeVisible()
	await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
	await expect(
		page.getByRole('heading', { level: 1, name: 'Photosynthesis (published edit)' }),
	).toBeVisible()
	await expect(page.getByText('MARKER_PUBLISHED_42')).toBeVisible()
	// provenance is stamped too — the reader reads "Edited today", not the stale base date.
	await expect(page.getByText(/Edited today/)).toBeVisible()
})

test('publish reconciliation (non-en): a published de edit shows in the de read view', async ({
	page,
}) => {
	// The `article.locale === wikiStore.locale` guard exists FOR the non-en path, so exercise it:
	// switch typography to German, edit + gate + publish, and assert the de reader reflects it.
	await page.goto('/typography')
	await expect(page.getByRole('heading', { level: 1, name: 'Typography' })).toBeVisible()

	// switch language to Deutsch via the article's language switcher
	await page.getByRole('button', { name: 'English' }).click()
	await page.getByRole('menuitem', { name: 'Deutsch' }).click()
	await expect(page.getByRole('heading', { level: 1, name: 'Typografie' })).toBeVisible()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	const title = page.getByRole('textbox', { name: 'Title' })
	await expect(title).toBeVisible({ timeout: 30000 })
	const editor = page.locator('[aria-label="Article editor"]')
	await expect(editor).toBeVisible({ timeout: 30000 })

	await title.click()
	await page.keyboard.press('ControlOrMeta+a')
	await page.keyboard.type('Typografie (bearbeitet)')
	await focusEditorProse(editor)
	await page.keyboard.type(' MARKER_DE_77')

	await page.getByRole('button', { name: 'Save' }).click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	await page.getByRole('button', { name: 'Member menu' }).click()
	await page.getByRole('menuitem', { name: 'Review' }).click()
	await page.getByRole('button', { name: /Approve as Bao/ }).click()
	await page.getByRole('button', { name: /Approve as Cleo/ }).click()
	await expect(page.getByText('Ready to publish')).toBeVisible()
	await page.keyboard.press('Escape')
	const publish = page.getByRole('button', { name: 'Publish' })
	await expect(publish).toBeEnabled()
	await publish.click()

	// the de reader reflects the de publish (overlay keyed by de, not spliced onto the en source)
	await expect(page.getByText('Published — your change is now live.')).toBeVisible()
	await expect(
		page.getByRole('heading', { level: 1, name: 'Typografie (bearbeitet)' }),
	).toBeVisible()
	// Scope to the body region (the marker also surfaces in the ToC links since it landed in a
	// heading) — assert it rendered in the reconciled read body.
	await expect(
		page.getByTestId('article-body-region').getByText('MARKER_DE_77').first(),
	).toBeVisible()
})

test('infobox editing: edit a quick fact via the modal, publish, and see it in the read view', async ({
	page,
}) => {
	// The infobox (Page.infobox) is the first schema field this redesign arc added — exercise
	// its FULL path: click-to-edit modal → EditSession.edit() → save → consensus gate → publish
	// → pageToArticle reconciliation, the SAME pipeline prose edits go through.
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })

	await page.getByRole('button', { name: 'Edit quick facts' }).click()
	const dialog = page.getByRole('dialog', { name: 'Edit quick facts' })
	await expect(dialog).toBeVisible()
	await dialog.locator('input[id^="infobox-value-"]').first().fill('Sunlight, water, CO₂')
	await dialog.getByRole('button', { name: 'Save' }).click()
	await expect(dialog).toBeHidden()

	// the read-mode-shaped aside re-renders the edited value immediately (staged, not yet saved).
	await expect(page.getByRole('complementary', { name: 'Quick facts' })).toContainText(
		'Sunlight, water, CO₂',
	)

	await page.getByRole('button', { name: 'Save' }).click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	await page.getByRole('button', { name: 'Member menu' }).click()
	await page.getByRole('menuitem', { name: 'Review' }).click()
	await page.getByRole('button', { name: /Approve as Bao/ }).click()
	await page.getByRole('button', { name: /Approve as Cleo/ }).click()
	await expect(page.getByText('Ready to publish')).toBeVisible()
	await page.keyboard.press('Escape')
	const publish = page.getByRole('button', { name: 'Publish' })
	await expect(publish).toBeEnabled()
	await publish.click()

	await expect(page.getByText('Published — your change is now live.')).toBeVisible()
	await expect(page.getByRole('complementary', { name: 'Quick facts' })).toContainText(
		'Sunlight, water, CO₂',
	)
})

test('mobile: h2 body sections start collapsed and the ToC disclosure is closed', async ({
	page,
}) => {
	// Wikipedia's own mobile skin starts each section collapsed (the lead stays expanded).
	// `lg` is 1024px — pick a real phone width below that. 2026-07-19: section collapse is now
	// `mobileSectionCollapseDecoration` (extensions.ts) — a plain `<button aria-expanded>` widget
	// inside each h2, not a bits-ui `Collapsible` (`data-slot`/`data-state`).
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()
	// The H1 is the reader's own header (renders immediately); the body content — including
	// this decoration's chevron widgets — comes from the read-only Editor's async onMount, which
	// can pay a cold on-demand compile on the first test to reach this route (same concern the
	// redlink test above already documents an explicit longer timeout for).
	await expect(page.locator('.tiptap-body')).toBeVisible({ timeout: 30000 })

	// `[data-slot="mobile-section-trigger"]`, not a role/name query — on desktop this button is
	// CSS `display:none` (`lg:hidden`), which removes it from the accessibility tree entirely,
	// so `getByRole('button', ...)` can never find it there even though the DOM node (and its
	// `aria-expanded`) genuinely exist; a plain attribute locator still can. Also avoids the
	// ambiguity a bare `button[aria-expanded]` selector would have — HeadingAnchor's own
	// HoverCard.Trigger ("copy link") ALSO carries `aria-expanded` (bits-ui's HoverCard sets it).
	const section = page.locator('[data-slot="mobile-section-trigger"]').first()
	await expect(section).toHaveAttribute('aria-expanded', 'false', { timeout: 30000 })
	await section.click()
	await expect(section).toHaveAttribute('aria-expanded', 'true')

	// the infobox itself starts partly collapsed too (photosynthesis has 4 facts > preview of 3).
	await expect(page.getByRole('button', { name: 'Show all 4 facts' })).toBeVisible()
})

test('desktop: h2 body sections are always expanded, no collapse affordance', async ({ page }) => {
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()
	await expect(page.locator('.tiptap-body')).toBeVisible({ timeout: 30000 })
	// See the mobile test above for why this is a plain attribute locator, not getByRole — on
	// desktop this button is legitimately `display:none` (lg:hidden), invisible to ARIA queries
	// but still present in the DOM with the correct aria-expanded value.
	const section = page.locator('[data-slot="mobile-section-trigger"]').first()
	await expect(section).toHaveAttribute('aria-expanded', 'true', { timeout: 30000 })
	await expect(page.getByRole('button', { name: 'Show all 4 facts' })).toBeHidden()
})

test('ToC: clicking an entry smooth-scrolls to the section and updates the URL hash', async ({
	page,
}) => {
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()

	const tocLink = page.getByRole('navigation', { name: 'Outline' }).getByRole('link', {
		name: 'The two stages',
	})
	await tocLink.click()
	await expect(page).toHaveURL(/#.+/)
	await expect(page.getByRole('heading', { level: 2, name: 'The two stages' })).toBeInViewport()
})

test('ToC: clicking an entry highlights the entry actually navigated to, not a nearby one (regression)', async ({
	page,
}) => {
	// Regression: the scroll-spy IntersectionObserver kept firing WHILE the click-triggered
	// smooth-scroll was still animating — with two headings close enough together to be
	// simultaneously inside the observer's "upper third" zone mid-scroll, a stale mid-flight
	// callback could overwrite the just-clicked entry's highlight with a different, merely
	// nearby heading before the scroll settled (reported live: "doesn't work after 2nd
	// click" — the scroll itself worked, but the wrong ToC entry stayed highlighted).
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()

	const toc = page.getByRole('navigation', { name: 'Outline' })
	async function clickAndExpectActive(name: string) {
		await toc.getByRole('link', { name }).click()
		await expect(toc.getByRole('link', { name, current: 'location' })).toBeVisible()
	}

	// "The two stages" and "Overall equation" sit close together — clicking the earlier one
	// first is the exact sequence that raced before the fix.
	await clickAndExpectActive('The two stages')
	await clickAndExpectActive('Overall equation')
	await clickAndExpectActive('The two stages')
	await clickAndExpectActive('Overview')
})

test('mobile ToC: jumping to a heading inside a collapsed section expands it first', async ({
	page,
}) => {
	// Regression: "Overall equation" (h3) lives inside the "The two stages" (h2) section,
	// which starts collapsed on mobile. Before the auto-expand fix, scrollIntoView on a
	// `hidden` descendant was a no-op — a dead ToC link until the section was opened by hand.
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/photosynthesis')
	await expect(page.getByRole('heading', { level: 1, name: 'Photosynthesis' })).toBeVisible()

	await page.locator('summary').filter({ hasText: 'Outline' }).click()
	const tocLink = page.getByRole('navigation', { name: 'Outline' }).getByRole('link', {
		name: 'Overall equation',
	})
	await tocLink.click()

	// `[data-slot="mobile-section-trigger"]`, not getByRole — see the mobile/desktop collapse
	// tests above for why (HeadingAnchor's own button also carries `aria-expanded`, and on
	// desktop this button is `display:none`; using the same locator shape everywhere here too).
	const section = page.getByRole('heading', { level: 2, name: 'The two stages' })
	await expect(section.locator('[data-slot="mobile-section-trigger"]')).toHaveAttribute(
		'aria-expanded',
		'true',
	)
	await expect(page.getByRole('heading', { level: 3, name: 'Overall equation' })).toBeInViewport()
})

test('lead summary editing: edit the "in brief" line, publish, and see it in the read view', async ({
	page,
}) => {
	// Bug: the lead summary (Page.summary, the blockquote-styled "in brief" line) was
	// un-gated-but-inert chrome — visible while editing but not actually editable, unlike
	// the title/infobox. Now a contenteditable field, same pattern as the title, staged
	// through the same EditSession.edit() → consensus-gate → publish pipeline.
	await page.goto('/astrolabe')
	await expect(page.getByRole('heading', { level: 1, name: 'Astrolabe' })).toBeVisible()

	await page.getByRole('button', { name: 'Edit', exact: true }).click()
	await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible({ timeout: 30000 })

	const summary = page.getByRole('textbox', { name: 'Summary' })
	await expect(summary).toBeVisible()
	await expect(summary).toHaveText(/ancient instrument that models the sky/)

	await summary.click()
	await page.keyboard.press('ControlOrMeta+a')
	await page.keyboard.type('An astrolabe is EDITED an ancient instrument.')

	await page.getByRole('button', { name: 'Save' }).click()
	await expect(page.locator('#edit-status-desktop')).toHaveText('All changes saved')

	await page.getByRole('button', { name: 'Member menu' }).click()
	await page.getByRole('menuitem', { name: 'Review' }).click()
	await page.getByRole('button', { name: /Approve as Bao/ }).click()
	await page.getByRole('button', { name: /Approve as Cleo/ }).click()
	await expect(page.getByText('Ready to publish')).toBeVisible()
	await page.keyboard.press('Escape')
	const publish = page.getByRole('button', { name: 'Publish' })
	await expect(publish).toBeEnabled()
	await publish.click()

	await expect(page.getByText('Published — your change is now live.')).toBeVisible()
	await expect(page.getByText('An astrolabe is EDITED an ancient instrument.')).toBeVisible()
})

test('gallery: the reader renders an image strip and MediaLightbox opens on a card click', async ({
	page,
}) => {
	// honeybee/en's gallery block (data/mock.ts) — 4 items, inserted mid-article (not the
	// article's first block — see GalleryBlock's own doc comment on why a leading gallery
	// can't be authored). Only proves THIS app's wiring (GalleryNodeView.svelte): the strip
	// renders one card per item, a card opens @kit/ui's MediaLightbox at that item, and
	// Escape closes it with focus restored — the underlying MediaLightbox/HScroller
	// gesture/animation behavior already has its own kit-level test coverage.
	await page.goto('/honeybee')
	await expect(page.getByRole('heading', { level: 1, name: 'Honeybee' })).toBeVisible()

	const cards = page.getByRole('button', { name: /^Open image \d of 4:/ })
	await expect(cards).toHaveCount(4)

	// 1st item ('gal-brood', data/mock.ts): has BOTH a caption and a credit — the button's
	// aria-describedby must reach both (regression: the figcaption used to be an
	// unreferenced sibling, invisible to a screen reader jumping straight to the button).
	const first = cards.nth(0)
	const describedbyId = await first.getAttribute('aria-describedby')
	expect(describedbyId).toBeTruthy()
	await expect(page.locator(`#${describedbyId}`)).toHaveText(
		'A nurse bee tends capped brood within the comb. · Illustration',
	)

	// Keyboard-driven open (Tab + Enter, not a mouse click): proves focus lands on the card
	// via the browser's own default Tab behavior (not the click-focus quirk Safari lacks),
	// so closing the lightbox has a well-defined element to restore focus to regardless of
	// browser. Also exercises a different card (2nd) than the click path below.
	const second = cards.nth(1)
	await second.focus()
	await expect(second).toBeFocused()
	await page.keyboard.press('Enter')
	await expect(page.getByRole('dialog', { name: 'Media viewer' })).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('dialog', { name: 'Media viewer' })).toBeHidden()
	await expect(second).toBeFocused()

	// 3rd item ('gal-forager', data/mock.ts): has a caption but no credit, a 1:1 ratio.
	// Mouse-click path (exercises the explicit .focus() call in the button's onclick).
	const third = cards.nth(2)
	await third.click()

	const dialog = page.getByRole('dialog', { name: 'Media viewer' })
	await expect(dialog).toBeVisible()
	await expect(page.getByTestId('lightbox-img')).toBeVisible()
	await expect(page.getByTestId('lightbox-img').locator('img')).toHaveAttribute(
		'alt',
		'Image 3 of 4: A honeybee dusted with pollen visiting an apple blossom',
	)
	await expect(
		dialog.getByText('A forager collects pollen while visiting an orchard in bloom.'),
	).toBeVisible()

	await page.keyboard.press('Escape')
	await expect(dialog).toBeHidden()
	await expect(third).toBeFocused()
})
