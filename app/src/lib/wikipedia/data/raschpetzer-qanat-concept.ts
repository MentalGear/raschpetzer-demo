/**
 * Real content: "Qanat" as a general engineering/technology concept — distinct from
 * `raschpetzer.ts`'s site-specific article about the Raschpëtzer itself. This article has
 * no local-data page-locator citations to draw on (unlike the site-specific articles), so
 * every claim is backed by a real external source found via web search instead.
 *
 * Slug is 'qanat' (NOT 'raschpetzer-qanat', which is already taken by the site article) to
 * avoid a slug collision — see the closing section's `link()` back to that article.
 */
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's/raschpetzer.ts's tiny inline-run authoring helpers — kept
// separate (not imported from ./mock) so this module has no circular dependency on it.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

// Every citation here is a real external source found via web search (verified by
// fetching each page's content directly, except the UNESCO listing — see note below).
const c = {
	wikipedia: {
		id: 'c-qanat-wikipedia',
		title: 'Qanat',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Qanat',
	},
	worldHistory: {
		id: 'c-qanat-worldhistory',
		title: 'Qanat',
		publisher: 'World History Encyclopedia',
		url: 'https://www.worldhistory.org/qanat/',
	},
	unesco: {
		id: 'c-qanat-unesco',
		title: 'The Persian Qanat',
		year: 2016,
		publisher: 'UNESCO World Heritage Centre (World Heritage List, ID 1506)',
		url: 'https://whc.unesco.org/en/list/1506/',
	},
	subbrit: {
		id: 'c-qanat-subbrit',
		title: 'Raschpëtzer Qanat',
		publisher: 'Subterranea Britannica',
		url: 'https://www.subbrit.org.uk/sites/raschpetzer-qanat/',
	},
} satisfies Record<string, Citation>

export const qanatArticleCitations = c

export const qanatArticle: Article = {
	id: 'a-qanat',
	slug: 'qanat',
	locale: 'en',
	title: 'Qanat',
	summary:
		'A qanat is a gently sloping underground channel that taps groundwater and carries it to the surface by gravity alone, reached along its length by a chain of vertical access and ventilation shafts. The technology was developed in ancient Persia and later spread, under many local names, across the Middle East, North Africa, and Central Asia — and, more rarely, to the fringes of the Roman Empire, as at the Raschpëtzer.',
	categories: ['archaeology', 'history'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('A '),
				b('qanat'),
				cite(
					' is a gently sloping underground channel that taps into an aquifer or a hillside water table and carries the water to a lower-lying outlet by gravity alone, without pumps.',
					'c-qanat-wikipedia',
				),
				cite(
					' The channel is dug and later maintained through a line of vertical access shafts sunk along its route — used to remove excavated spoil during construction, to sight and check the tunnel’s slope, and afterward for ventilation and upkeep.',
					'c-qanat-worldhistory',
				),
				t(
					' Because the water travels underground for most of its course, a qanat loses comparatively little of its flow to evaporation — the property that makes the technique so effective in hot, arid climates.',
				),
			),
		},
		{ id: 'h-origins', type: 'heading', level: 2, text: 'Origin' },
		{
			id: 'p-origins',
			type: 'paragraph',
			runs: p(
				cite(
					'The technology is generally attributed to ancient Persian engineers, with the strongest evidence tying its spread to the Achaemenid Empire (c. 550–330 BCE); archaeological evidence of qanat-fed settlement in the region reaches back to around 1,000 BCE, making the technique at least three thousand years old',
					'c-qanat-worldhistory',
				),
				cite(
					', developed by the ancient Iranians in the early 1st millennium BCE and spreading westward and eastward from there.',
					'c-qanat-wikipedia',
				),
			),
		},
		{ id: 'h-spread', type: 'heading', level: 2, text: 'Spread and regional names' },
		{
			id: 'p-spread',
			type: 'paragraph',
			runs: p(
				cite(
					'From Persia the technology spread across the arid belt of the Middle East, North Africa, and Central Asia, taking on a different local name in almost every region it reached',
					'c-qanat-wikipedia',
				),
				cite(
					': kāriz in Iran, foggara across North Africa and the Levant, khettara in Morocco, falaj in Oman and the United Arab Emirates, and karez in Afghanistan, Pakistan, and — as kanerjing — the Turpan basin of northwestern China.',
					'c-qanat-worldhistory',
				),
				t(' Today qanat-type systems have been documented in more than thirty countries.'),
			),
		},
		{
			id: 'p-rome',
			type: 'paragraph',
			runs: p(
				cite(
					'The technique also reached the Roman world: Roman-era qanats are documented from Jordan (the roughly 94 km Gadara Aqueduct) to Italy (the Tunnels of Claudius) and, more sparsely, as far as Luxembourg — the Raschpëtzer itself.',
					'c-qanat-wikipedia',
				),
				t(
					' Compared with its heartland in the Middle East and Central Asia, this Roman-period extension of the technology into the northwestern provinces of the Empire is comparatively rare and thinly documented — the technique also appears elsewhere in the Mediterranean at other periods, such as ',
				),
				cite(
					"Samos's pre-Roman 6th-century-BC Tunnel of Eupalinos and Palermo's Arab-period (9th–11th-century) qanat system",
					'c-qanat-wikipedia',
				),
				t(
					', but those predate or postdate this Roman-era thread rather than belonging to it.',
				),
			),
		},
		{ id: 'h-recognition', type: 'heading', level: 2, text: 'Recognition' },
		{
			id: 'p-unesco',
			type: 'paragraph',
			runs: p(
				cite(
					'In 2016, UNESCO inscribed "The Persian Qanat" — a serial listing of eleven qanat systems across several Iranian provinces, including rest areas, reservoirs, and watermills built around them — onto the World Heritage List, recognizing the ensemble as an outstanding illustration of how gravity-fed groundwater technology enabled permanent settlement of arid and semi-arid regions.',
					'c-qanat-unesco',
				),
			),
		},
		{
			id: 'h-raschpetzer',
			type: 'heading',
			level: 2,
			text: 'The Raschpëtzer, a rare northern example',
		},
		{
			id: 'p-raschpetzer',
			type: 'paragraph',
			runs: p(
				t('The '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' near Walferdange, Luxembourg, is a Gallo-Roman example of this same underlying technology, built and operated far from the arid regions where qanats are most common — reached, like its Persian and Central Asian counterparts, through a line of vertical shafts feeding a single gravity-flow gallery.',
				),
				cite(
					' It is regarded by many as the best-preserved example of its kind north of the Alps',
					'c-qanat-subbrit',
				),
				t(
					', making it an unusually well-documented case study of qanat engineering outside the technology’s traditional heartland.',
				),
			),
		},
	],
	citations: [c.wikipedia, c.worldHistory, c.unesco, c.subbrit],
	revisions: [
		{
			id: 'r1',
			author: 'web research (2026-07-20)',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Initial draft: qanat as a general concept, sourced from external references',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['web research (2026-07-20)'],
}
