/**
 * Runes store for the Wikipedia demo. Owns the article corpus + derived reading views
 * (per-locale lookup with source fallback, category index, the link graph → backlinks,
 * and token search). Static data (no fetching); `$state.raw` for the array we only ever
 * read (see photoStore/notesStore), matching the kit's perf rule for large objects.
 */
import { SvelteMap } from 'svelte/reactivity'
import { articles as ALL, categories as CATS, entities as ENTITIES } from '../data/mock'
import type { Article, Category, Entity, Locale, Mark } from '../data/types'
import { collectMedia, type MediaItem } from '../data/media'
import { groupMedia, type Section } from '../layout/mediaGrouping'
import { collectSources, type SourceItem } from '../data/sources'

/**
 * Collect internal-link target slugs referenced anywhere in an article's blocks.
 * Exported so `../data/graph.ts` (the `@kit/core/graph` adapter) reuses this exact
 * edge-extraction step instead of re-deriving it — the only other place in the app
 * that scans wikilinks for a link-graph edge list.
 */
export function outboundSlugs(article: Article): string[] {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive local tally in a pure function; returns a plain array
	const out = new Set<string>()
	const scanMark = (m?: Mark) => {
		if (m?.link?.kind === 'internal') out.add(m.link.slug)
	}
	for (const block of article.blocks) {
		if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'callout') {
			for (const run of block.runs) scanMark(run.marks)
		} else if (block.type === 'list') {
			for (const item of block.items) for (const run of item) scanMark(run.marks)
		}
	}
	return [...out]
}

/** Whether an internal link's target article exists, checked in the current reading
 *  locale first (falling back to `en`, per `bySlug`) — the single source of truth for
 *  "redlink" styling shared by the reader (`InlineRuns.svelte`) and the editor
 *  (`extensions.ts`'s `linkExistenceDecoration`), so the two surfaces can never diverge. */
export function articleExists(slug: string): boolean {
	return wikiStore.bySlug(slug) !== undefined
}

class WikiStore {
	/** every article across locales — the static mock corpus (read-only base). */
	all = $state.raw<Article[]>(ALL)
	categories = $state.raw<Category[]>(CATS)
	entities = $state.raw<Entity[]>(ENTITIES)

	/** current reading locale (drives the language switcher). */
	locale = $state<Locale>('en')

	/** The article currently mounted in `ArticleReader` (null on any non-article route) — set/
	 *  cleared by `ArticleReader.svelte` itself. The language switcher lives in the GLOBAL left
	 *  sidebar footer (`WikiSidebarFooter.svelte`, present on every route), but which locales are
	 *  available is per-article data that only the mounted reader has, so this bridges it up
	 *  without threading article-scoped props through the whole route/layout tree. `raw` — large
	 *  object, only ever reassigned wholesale (matches `all`/`bySlug`'s own return values). */
	activeArticle = $state.raw<Article | null>(null)

	/**
	 * Published edits overlaid on the mock corpus (demo reconciliation): `slug:locale` → the
	 * reconciled `Article` (from `pageToArticle`). Editing publishes a `Page` into the backend;
	 * `applyPublished` overlays the reconciled Article here so the reader AND the browse lists
	 * reflect the change (otherwise the reader keeps rendering the untouched mock — the publish
	 * would silently vanish). SvelteMap so reads in `bySlug`/`sourceArticles` react to publishes.
	 */
	#published = new SvelteMap<string, Article>()

	#key(slug: string, locale: Locale): string {
		return `${slug}:${locale}`
	}

	/** Overlay a just-published Article so every read view reflects it. */
	applyPublished(article: Article): void {
		this.#published.set(this.#key(article.slug, article.locale), article)
	}

	#overlay(a: Article): Article {
		return this.#published.get(this.#key(a.slug, a.locale)) ?? a
	}

	/** English (source) articles, alphabetical — the canonical browse order (publish-overlaid). */
	sourceArticles = $derived.by<Article[]>(() =>
		this.all
			.filter((a) => a.locale === 'en')
			.map((a) => this.#overlay(a))
			.sort((a, b) => a.title.localeCompare(b.title)),
	)

	get count(): number {
		return this.sourceArticles.length
	}

	/** Look up an article by slug in a locale, falling back to the `en` source (D3-style).
	 *  A published edit for the resolved article is overlaid (so the reader shows it). */
	bySlug(slug: string, locale: Locale = this.locale): Article | undefined {
		const base =
			this.all.find((a) => a.slug === slug && a.locale === locale) ??
			this.all.find((a) => a.slug === slug && a.locale === 'en')
		return base ? this.#overlay(base) : undefined
	}

	/** Which locales exist for a slug (for the language switcher). */
	localesFor(slug: string): Locale[] {
		return this.all.filter((a) => a.slug === slug).map((a) => a.locale)
	}

	entityBySlug(slug: string): Entity | undefined {
		return this.entities.find((e) => e.slug === slug)
	}

	categoryById(id: string): Category | undefined {
		return this.categories.find((c) => c.id === id)
	}

	/** Source articles in a category, alphabetical. */
	inCategory(id: string): Article[] {
		return this.sourceArticles.filter((a) => a.categories.includes(id))
	}

	/** The link graph: slug → the source articles that link to it. Derived over `sourceArticles`,
	 *  so it recomputes whenever that changes (i.e. on each publish overlay), not just once. */
	backlinks = $derived.by<Map<string, Article[]>>(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- computed wholesale each run and only read via .get(); never mutated in place, so a plain Map is correct (SvelteMap would be wrong)
		const map = new Map<string, Article[]>()
		for (const a of this.sourceArticles) {
			for (const target of outboundSlugs(a)) {
				if (target === a.slug) continue // an article never backlinks to itself
				const list = map.get(target) ?? []
				list.push(a)
				map.set(target, list)
			}
		}
		return map
	})

	/** "What links here" for a slug. */
	backlinksFor(slug: string): Article[] {
		return this.backlinks.get(slug) ?? []
	}

	/** The Simple-Wikipedia-style variant of `article`, if one exists — scanned from
	 *  `sourceArticles` for `simpleOfId === article.id` at read time (no bidirectional field
	 *  to keep in sync, same spirit as `backlinksFor`/the link graph). `undefined` when
	 *  `article` has no simple variant, or IS one itself (a simple variant never has its own
	 *  further-simplified variant). */
	simpleVariantOf(article: Article): Article | undefined {
		return this.sourceArticles.find((a) => a.simpleOfId === article.id)
	}

	/** The canonical article `article` is a simplified rewrite of, if `article.simpleOfId` is
	 *  set (the reciprocal lookup — resolves the id to a full `Article` by scanning
	 *  `sourceArticles`, same read-time-computed pattern as `simpleVariantOf`). */
	canonicalOfSimple(article: Article): Article | undefined {
		if (!article.simpleOfId) return undefined
		return this.sourceArticles.find((a) => a.id === article.simpleOfId)
	}

	/** Every figure/gallery image across the source articles, grouped by category — the
	 *  Media page's data source. */
	media = $derived.by<MediaItem[]>(() => collectMedia(this.sourceArticles))

	/** `media` grouped into category sections for the Media page's sticky headers. */
	mediaSections = $derived.by<Section[]>(() => groupMedia(this.media, this.categories))

	/** Every citation across the source articles, one row per citation (no cross-article
	 *  dedup — see `data/sources.ts`) — the Sources page's data source. */
	sources = $derived.by<SourceItem[]>(() => collectSources(this.sourceArticles))

	/** Token-AND search over title + summary + category labels, in browse order. */
	search(query: string): Article[] {
		const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
		if (tokens.length === 0) return []
		return this.sourceArticles.filter((a) => {
			const cats = a.categories.map((c) => this.categoryById(c)?.label ?? c).join(' ')
			const hay = `${a.title} ${a.summary} ${cats}`.toLowerCase()
			return tokens.every((tok) => hay.includes(tok))
		})
	}
}

export const wikiStore = new WikiStore()
