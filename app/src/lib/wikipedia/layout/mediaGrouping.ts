/**
 * Groups a newest-first MediaItem array into Day sections for the Media page's sticky
 * headers — lifted from the photos app's day/month/year grouping
 * (apps/photos/src/lib/photos/layout/grouping.ts), scoped to the single day granularity
 * the media page needs. Pure: returns index ranges + display strings; `@kit/ui`'s
 * VirtualGrid turns each Section into a header row + justified rows.
 *
 * Items are assumed pre-sorted (newest-first, same precondition as `groupPhotos`) so every
 * item from the same UTC day is contiguous — `groupMedia` does no defensive sort/check, and
 * a caller that violates this gets the same day split across two same-keyed Sections instead
 * of one.
 */
import type { MediaItem } from '../data/media'
import type { Section } from '@kit/core'

// Section is a domain-free kit type (apps may import @kit/core directly).
export type { Section }

// UTC accessors throughout, matching the photos app's grouping — `updatedAt` epochs are
// UTC-anchored (see data/mock.ts's REF_NOW), and local accessors would bucket the same
// item into a different day per viewer timezone, breaking the reproducible VRT baseline.
function dayKey(d: Date): string {
	const y = d.getUTCFullYear()
	const m = `${d.getUTCMonth() + 1}`.padStart(2, '0')
	const day = `${d.getUTCDate()}`.padStart(2, '0')
	return `${y}-${m}-${day}`
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

function dayTitle(d: Date): string {
	return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

/** Distinct source-article titles within an index range, in first-seen order. */
function articleSubtitle(items: readonly MediaItem[], start: number, end: number): string {
	const titles: string[] = []
	for (let i = start; i < end; i++) {
		const t = items[i].articleTitle
		if (!titles.includes(t)) titles.push(t)
	}
	return titles.join(', ')
}

export function groupMedia(items: readonly MediaItem[]): Section[] {
	if (items.length === 0) return []
	const sections: Section[] = []
	let start = 0
	let curKey = dayKey(new Date(items[0].updatedAt))

	const flush = (end: number) => {
		sections.push({
			key: curKey,
			title: dayTitle(new Date(items[start].updatedAt)),
			subtitle: articleSubtitle(items, start, end),
			startIndex: start,
			endIndex: end,
			count: end - start,
		})
	}

	for (let i = 1; i < items.length; i++) {
		const k = dayKey(new Date(items[i].updatedAt))
		if (k !== curKey) {
			flush(i)
			start = i
			curKey = k
		}
	}
	flush(items.length)
	return sections
}
