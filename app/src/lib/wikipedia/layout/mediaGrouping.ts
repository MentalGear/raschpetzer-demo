/**
 * Groups a category-sorted MediaItem array (see `collectMedia`) into Category sections for the
 * Media page's sticky headers. Pure: returns index ranges + display strings; `@kit/ui`'s
 * VirtualGrid turns each Section into a header row + justified rows.
 *
 * Previously grouped by day (edit date) — changed on request: a fixed-corpus demo's `updatedAt`
 * isn't a meaningful axis to browse real archaeological content by, whereas the site's own
 * categories (Archaeology, History, People, Technology) are.
 *
 * Items are assumed pre-sorted (`collectMedia`'s own category-priority sort) so every item in
 * the same category is contiguous — `groupMedia` does no defensive sort/check, and a caller
 * that violates this gets the same category split across two same-keyed Sections instead of one.
 */
import type { MediaItem } from '../data/media'
import type { Category } from '../data/types'
import type { Section } from '@kit/core'

// Section is a domain-free kit type (apps may import @kit/core directly).
export type { Section }

/** Distinct source-article titles within an index range, in first-seen order — capped, since a
 *  category section (unlike the old day-based ones) can now span dozens of articles; an
 *  uncapped comma list for e.g. all 19 Archaeology-only articles would be an unreadable wall of
 *  text in the header. */
const SUBTITLE_TITLE_CAP = 4
function articleSubtitle(items: readonly MediaItem[], start: number, end: number): string {
	const titles: string[] = []
	for (let i = start; i < end && titles.length < SUBTITLE_TITLE_CAP + 1; i++) {
		const t = items[i].articleTitle
		if (!titles.includes(t)) titles.push(t)
	}
	if (titles.length <= SUBTITLE_TITLE_CAP) return titles.join(', ')
	const shown = titles.slice(0, SUBTITLE_TITLE_CAP)
	// Recount properly (the loop above stopped early once it saw one title too many, so this
	// undercounts) — walk the full range once more for the real distinct count.
	const allTitles = new Set<string>()
	for (let i = start; i < end; i++) allTitles.add(items[i].articleTitle)
	return `${shown.join(', ')}, and ${allTitles.size - SUBTITLE_TITLE_CAP} more`
}

/** `categories` supplies real display labels/descriptions (mock.ts's `categories` export) —
 *  falls back to the raw category id, title-cased, for a `primaryCategory` fallback id that
 *  isn't a registered category (shouldn't happen for real content, but keeps this from ever
 *  rendering an empty header). */
function categoryLabel(id: string, categories: readonly Category[]): string {
	const found = categories.find((c) => c.id === id)
	if (found) return found.label
	return id.length > 0 ? id[0].toUpperCase() + id.slice(1) : id
}

export function groupMedia(
	items: readonly MediaItem[],
	categories: readonly Category[],
): Section[] {
	if (items.length === 0) return []
	const sections: Section[] = []
	let start = 0
	let curKey = items[0].category

	const flush = (end: number) => {
		sections.push({
			key: curKey,
			title: categoryLabel(curKey, categories),
			subtitle: articleSubtitle(items, start, end),
			startIndex: start,
			endIndex: end,
			count: end - start,
		})
	}

	for (let i = 1; i < items.length; i++) {
		const k = items[i].category
		if (k !== curKey) {
			flush(i)
			start = i
			curKey = k
		}
	}
	flush(items.length)
	return sections
}
