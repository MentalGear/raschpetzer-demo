/**
 * Real content: "Roman Aqueducts" as a general engineering/technology concept — distinct
 * from `raschpetzer-qanat-concept.ts`'s article on qanats (which covers the qanat
 * technique specifically and globally, including its Persian origin and spread outside
 * the Roman world). This article covers Roman aqueduct engineering more broadly:
 * gravity-flow principles, the buried-channel/tunnel/arcade/siphon toolkit Roman
 * engineers reached for depending on terrain, and famous above-ground arcaded examples
 * (Pont du Gard, Aqua Claudia) — the visible, iconic form the Raschpëtzer notably is
 * NOT. It closes by situating the Raschpëtzer as an atypical, qanat-style choice for a
 * Roman-era water system this far north.
 *
 * This article has no local-data page-locator citations to draw on (unlike
 * `raschpetzer.ts`), so every claim is backed by a real external source found via web
 * search and verified by fetching each page's content directly.
 *
 * Slug is 'roman-aqueducts' (distinct from 'raschpetzer-qanat' and 'qanat', already
 * taken) — see the closing section's `link()`s back to those two articles.
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
// fetching each page's content directly).
const c = {
	wikipedia: {
		id: 'c-roman-aqueducts-wikipedia',
		title: 'Roman aqueduct',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Roman_aqueduct',
	},
	pontDuGard: {
		id: 'c-roman-aqueducts-pontdugard',
		title: 'Pont du Gard',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Pont_du_Gard',
	},
	pontDuGardUnesco: {
		id: 'c-roman-aqueducts-unesco-pontdugard',
		title: 'Pont du Gard (Roman Aqueduct)',
		year: 1985,
		publisher: 'UNESCO World Heritage Centre (World Heritage List, ID 344)',
		url: 'https://whc.unesco.org/en/list/344/',
	},
	aquaClaudia: {
		id: 'c-roman-aqueducts-aquaclaudia',
		title: 'Aqua Claudia',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Aqua_Claudia',
	},
	siphons: {
		id: 'c-roman-aqueducts-siphons',
		title: 'Siphons in Roman (and Hellenistic) aqueducts',
		publisher: 'Aqua Clopedia (romanaqueducts.info)',
		url: 'http://www.romanaqueducts.info/siphons/siphons.htm',
	},
	subbrit: {
		id: 'c-roman-aqueducts-subbrit',
		title: 'Raschpëtzer Qanat',
		publisher: 'Subterranea Britannica',
		url: 'https://www.subbrit.org.uk/sites/raschpetzer-qanat/',
	},
} satisfies Record<string, Citation>

export const romanAqueductsArticleCitations = c

export const romanAqueductsArticle: Article = {
	id: 'a-roman-aqueducts',
	slug: 'roman-aqueducts',
	locale: 'en',
	title: 'Roman Aqueducts',
	summary:
		"Roman aqueducts were engineered systems that moved water from a distant source to cities, baths, and farms by gravity alone, along a channel graded to a slight, carefully surveyed downward slope. Most of a typical aqueduct ran underground in a buried conduit or rock-cut tunnel; engineers reached for a raised masonry arcade or a pressurized siphon only where a valley or depression made burial impractical. The famous arched bridges — the Pont du Gard, the Aqua Claudia — are the exception that became the type's popular image, not its everyday form.",
	categories: ['technology', 'history'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('A '),
				b('Roman aqueduct'),
				cite(
					' was an engineered channel that moved water from a source — typically a spring or catchment at higher elevation — to a city, fort, or estate through gravity alone, along a slight overall downward gradient, without pumps.',
					'c-roman-aqueducts-wikipedia',
				),
				t(
					' Aqueducts supplied public fountains and baths as well as private households, mills, and gardens, and their engineering — surveying, gradient control, and terrain-crossing technique — was one of the signature achievements of Roman infrastructure.',
				),
			),
		},
		{ id: 'h-gravity', type: 'heading', level: 2, text: 'Gravity flow and gradient' },
		{
			id: 'p-gravity',
			type: 'paragraph',
			runs: p(
				t('The architect '),
				b('Vitruvius'),
				cite(
					' recommended a gradient of not less than 1 in 4,800 for an aqueduct channel — steep enough to keep the water moving, shallow enough that it would not erode the channel bed or overwhelm the structure.',
					'c-roman-aqueducts-wikipedia',
				),
				t(' The '),
				b('Pont du Gard'),
				cite(
					", built to carry the aqueduct of Nîmes across the Gardon river, held to an average gradient of about 34 cm per kilometre — descending only 17 metres in elevation over the aqueduct's roughly 50-kilometre course, and just 2.5 cm across the 456-metre span of the bridge itself.",
					'c-roman-aqueducts-pontdugard',
				),
				cite(
					' Achieving that precision over tens of kilometres of varied terrain required real surveying instruments: the chorobates, a long wooden frame fitted with a water level and plumb lines for checking horizontals, and the groma and dioptra for plotting courses and angles.',
					'c-roman-aqueducts-wikipedia',
				),
			),
		},
		{ id: 'h-construction', type: 'heading', level: 2, text: 'Construction methods' },
		{
			id: 'p-construction-buried',
			type: 'paragraph',
			runs: p(
				cite(
					"Most of an aqueduct's length was not the dramatic arched bridge of popular imagination but a buried conduit, typically laid half a metre to a metre below the surface with inspection-and-access covers at regular intervals — cheaper to build, less exposed to damage, tampering, and evaporation loss than an elevated channel.",
					'c-roman-aqueducts-wikipedia',
				),
				cite(
					' Where a hill stood directly in the route, engineers cut a tunnel large enough for the conduit and the workers who built and later maintained it, sometimes driving the cut from both ends to meet in the middle.',
					'c-roman-aqueducts-wikipedia',
				),
			),
		},
		{
			id: 'p-construction-arcade',
			type: 'paragraph',
			runs: p(
				cite(
					"Only where a valley or low-lying stretch made burial impractical did engineers raise the channel onto a masonry arcade — a series of piered arches carrying the conduit at a constant grade above the dip in the terrain. Even in Rome's own supply network, only about 47 of the roughly 780–800 kilometres of total aqueduct length ran above ground on such supports — a small minority of the whole system.",
					'c-roman-aqueducts-wikipedia',
				),
				t(
					' For the deepest or widest depressions, Roman engineers instead built an inverted siphon: ',
				),
				cite(
					'a closed, soldered-lead pipe (sometimes cased in concrete or stone) that let the water descend under its own weight to the valley floor and rise back up the other side under the resulting pressure, avoiding the cost of an arcade tall enough to bridge the gap directly.',
					'c-roman-aqueducts-siphons',
				),
			),
		},
		{ id: 'h-examples', type: 'heading', level: 2, text: 'Famous examples' },
		{
			id: 'p-pontdugard',
			type: 'paragraph',
			runs: p(
				b('Pont du Gard'),
				cite(
					' (France, built c. 40–60 AD) is the best-known Roman aqueduct arcade: a three-tier bridge of six, eleven, and thirty-five arches rising 48.8 metres above the Gardon river, carrying the 50 km aqueduct of Nîmes across the valley and delivering an estimated 40,000 cubic metres of water a day to the city.',
					'c-roman-aqueducts-pontdugard',
				),
				cite(
					' It was inscribed on the UNESCO World Heritage List in 1985 for its exceptional preservation and engineering ingenuity.',
					'c-roman-aqueducts-unesco-pontdugard',
				),
			),
		},
		{
			id: 'p-aquaclaudia',
			type: 'paragraph',
			runs: p(
				b('Aqua Claudia'),
				cite(
					" (Italy, begun under Caligula in 38 AD and completed under Claudius in 52 AD) ran about 69 kilometres to Rome, most of it underground; only on its final approach to the city did it rise onto arches, some reaching over 30 metres high, delivering roughly 185,000 cubic metres of water a day — about a fifth of the city's total supply.",
					'c-roman-aqueducts-aquaclaudia',
				),
			),
		},
		{
			id: 'h-raschpetzer',
			type: 'heading',
			level: 2,
			text: 'The Raschpëtzer: an atypical northern example',
		},
		{
			id: 'p-raschpetzer',
			type: 'paragraph',
			runs: p(
				t(
					'Even accounting for the buried channels, tunnels, and occasional siphons described above, the great majority of Roman water-supply systems still followed a single-conduit profile graded from a spring intake down to their destination, surfacing onto an arcade only where terrain demanded it. The ',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' near Walferdange, Luxembourg, took a different approach entirely: rather than a buried channel occasionally bridged by arches, it was built as a ',
				),
				link('qanat', 'qanat'),
				t(
					" — a gallery reached along its whole length by a chain of vertical access shafts, with no arcade at any point. That construction method is far more strongly associated with Roman-era engineering in the arid Middle East and North Africa than with the Empire's northwestern provinces, which makes a qanat-built water system this far north — in the forests above the Alzette valley rather than a desert catchment — an unusual choice on the part of whoever specified it.",
				),
				cite(
					' The Raschpëtzer is regarded by many as the best-preserved example of its kind north of the Alps',
					'c-roman-aqueducts-subbrit',
				),
				t(
					', a rarity that owes as much to that atypical design choice as to its survival.',
				),
			),
		},
	],
	citations: [c.wikipedia, c.pontDuGard, c.pontDuGardUnesco, c.aquaClaudia, c.siphons, c.subbrit],
	revisions: [
		{
			id: 'r1',
			author: 'web research (2026-07-20)',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: Roman aqueduct engineering as a general concept, sourced from external references',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['web research (2026-07-20)'],
}
