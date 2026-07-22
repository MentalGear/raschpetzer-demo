<script lang="ts">
	import '../app.css'
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation'
	import { page } from '$app/state'
	import { ModeWatcher, toggleMode } from 'mode-watcher'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { wikiEdit, DISCARD_PROMPT } from '$lib/wikipedia/content/editStore.svelte'
	import { wikiNav } from '$lib/wikipedia/config/nav'
	import { href, navWithBase, stripBase, makeIsActive } from '$lib/paths'
	import WikiSidebarFooter from '$lib/wikipedia/components/WikiSidebarFooter.svelte'
	import ReviewSheet from '$lib/wikipedia/components/ReviewSheet.svelte'
	import {
		AppShell,
		StatFooter,
		CommandRegistry,
		setCommandRegistry,
		CommandPalette,
		useKeybindings,
		type KeybindingConfig,
	} from '@kit/ui'

	let { children } = $props()

	// Language is a per-article choice (routes don't encode locale): reset to the
	// source on navigation so a language switch on one article never bleeds into the
	// next. Also abandon any in-memory edit draft when leaving an article (front-end
	// demo — drafts don't persist; this prevents a stale draft clobbering another
	// article's edit session).
	beforeNavigate((nav) => {
		// prompt before dropping an unsaved draft (PRD E6 — discard protection); then
		// reset per-article language to the source (no cross-article bleed) and abandon
		// any edit session. Running before navigation avoids a wrong-locale render flash.
		// (a synchronous confirm can't reliably block a tab-close/hard-refresh 'leave', so
		// only prompt for in-app SPA navigations. Native confirm — not the styled AlertDialog
		// ArticleReader uses — because beforeNavigate needs a *synchronous* answer; the shared
		// DISCARD_PROMPT copy keeps the two in sync.)
		if (
			nav.type !== 'leave' &&
			wikiEdit.editing &&
			wikiEdit.dirty &&
			!window.confirm(DISCARD_PROMPT.native)
		) {
			nav.cancel()
			return
		}
		wikiStore.locale = 'en'
		if (wikiEdit.editing) wikiEdit.close()
	})

	// This app owns its own scroll (a full-height `overflow-y-auto` div below, not `window` —
	// see that div's doc comment), so SvelteKit's built-in scroll management (which only
	// resets `window`'s scroll position) never resets THIS container: navigating from deep in
	// one article to another lands the new page already scrolled to the old position (worst
	// on mobile, where that's most of the viewport). Reset it ourselves on every real route
	// change — but not a same-page hash jump (e.g. a citation anchor), which never fires this
	// (SvelteKit's navigation lifecycle only runs for an actual pathname change).
	let scrollContainer: HTMLDivElement | undefined
	afterNavigate(({ from, to }) => {
		if (from?.url?.pathname !== to?.url?.pathname) scrollContainer?.scrollTo(0, 0)
	})

	// ── a11y live region: announces route/search changes (WCAG 4.1.3) ──────────
	let statusMsg = $state('')

	function randomArticle() {
		const list = wikiStore.sourceArticles
		if (list.length === 0) return
		const a = list[Math.floor(Math.random() * list.length)]
		statusMsg = `Opening a random article: ${a.title}`
		goto(href(`/${a.slug}`))
	}

	// ── Shared command registry (registered once for all /wikipedia/* views) ────
	// app.* commands are titled → visible in the ⌘K palette. `app.random` is also
	// referenced by a command-item in the sidebar nav. Keybinding fields are
	// display-only; the authoritative bindings live in keybindingConfig below.
	const registry = new CommandRegistry().register([
		{
			id: 'app.nav.home',
			title: 'Go to All Articles',
			group: 'Navigation',
			run: () => goto(href('/')),
		},
		{
			id: 'app.nav.categories',
			title: 'Go to Categories',
			group: 'Navigation',
			run: () => goto(href('/categories')),
		},
		{
			id: 'app.nav.recent',
			title: 'Go to Recently Edited',
			group: 'Navigation',
			run: () => goto(href('/recent')),
		},
		{
			id: 'app.nav.media',
			title: 'Go to Media',
			group: 'Navigation',
			run: () => goto(href('/media')),
		},
		{
			id: 'app.search',
			title: 'Search Articles',
			group: 'Navigation',
			keybinding: '/',
			run: () => goto(href('/search')),
		},
		{ id: 'app.random', title: 'Random Article', group: 'Navigation', run: randomArticle },
		{
			id: 'app.view.toggleTheme',
			title: 'Toggle Dark / Light Mode',
			group: 'View',
			keybinding: 'mod+shift+l',
			run: () => toggleMode(),
		},
	])
	setCommandRegistry(registry)

	const keybindingConfig: KeybindingConfig = [
		{ command: 'app.view.toggleTheme', key: 'mod+shift+l' },
		{ command: 'app.search', key: '/' },
	]
	useKeybindings({
		config: keybindingConfig,
		registry,
		// toggleTheme is global; "/" (search) must NOT be, so it stays typeable in fields.
		globalCommands: new Set(['app.view.toggleTheme']),
	})

	const nav = $derived(navWithBase(wikiNav(wikiStore.categories)))

	// nav hrefs are base-prefixed; match on base-stripped route paths.
	const path = $derived(stripBase(page.url.pathname))
	// an article context is any path whose FIRST segment is a slug (not a named
	// section) — /<slug>, /<slug>/history, /<slug>/translate — keep "All Articles"
	// active across all of them so the sidebar always shows exactly one active item
	// (a /<slug>/history read would otherwise light zero items). A /category/<id>
	// path has its own matching nav link, so 'category' stays in SECTIONS here.
	// 'admin' is listed so the member-only /admin/* pages (Members, Settings) — which
	// have no sidebar nav link — don't fall through and falsely light "All Articles".
	const SECTIONS = [
		'categories',
		'category',
		'recent',
		'media',
		'sources',
		'search',
		'admin',
		'about',
	]
	const isArticleRead = $derived(path !== '/' && !SECTIONS.includes(path.split('/')[1] ?? ''))
	const isActive = makeIsActive((h) => {
		if (h === '/') return path === '/' || isArticleRead
		return path === h || path.startsWith(h + '/')
	})
</script>

<!-- Applies the `.dark` class to <html> from the mode-watcher store (theme toggle).
     Carried over from the monorepo root layout, which the wikipedia sub-layout used to
     inherit before the carve (see docs/debug/troubleshooting.md §14). -->
<ModeWatcher />

<span role="status" aria-live="polite" aria-atomic="true" class="sr-only">{statusMsg}</span>

<AppShell title="Raschpëtzer" {nav} {isActive}>
	{#snippet footer()}
		<!-- Session chrome (member/login menu + the per-article language switcher) sticks to the
		     bottom of the docked sidebar via Sidebar.Footer itself — no bespoke positioning needed
		     (see WikiSidebarFooter.svelte's own doc comment for why it moved here from a top bar). -->
		<WikiSidebarFooter />
		<StatFooter count={wikiStore.count} noun="articles" />
	{/snippet}
	<!-- AppShell's inset is a fixed-height (h-svh) overflow-hidden frame: each app owns
	     its own scroll. Photos scrolls its virtualized grid, Notes its browser column;
	     Wikipedia is plain document flow, so wrap the routed content in a full-height
	     vertical scroller (otherwise a tall article is clipped and the page can't
	     scroll). The reader's ToC scroll-spy (viewport-rooted IntersectionObserver) and
	     `#id` anchors work unchanged inside this scroller. `scroll-smooth`: THIS is the
	     element whose own scroll position actually changes on a citation/footnote/
	     backlink `#`-jump — `scroll-behavior` only affects the box it's set on, not an
	     ancestor's (a `<html>` rule here would be silent no-op, since `<html>` itself
	     never scrolls in this app; found in review after shipping it on `<html>` first). -->
	<div bind:this={scrollContainer} class="h-full overflow-y-auto scroll-smooth">
		{@render children()}
	</div>
</AppShell>

<!-- ⌘K command palette — dialog portal to <body>; registry from context. -->
<CommandPalette />

<!-- Review overlay (§D) — mounted once at the root (like CommandPalette) since it's opened from
     TWO independent triggers: the sidebar footer's member menu, and the Publish button when it's
     in its needs-review state (EditActionBar.svelte). Reads the app-wide `wikiEdit.session`
     reactively, so it needs no props from whichever route is active. -->
<ReviewSheet bind:open={() => wikiEdit.reviewOpen, (v) => (wikiEdit.reviewOpen = v)} />
