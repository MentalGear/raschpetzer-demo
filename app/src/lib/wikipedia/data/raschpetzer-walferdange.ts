/**
 * Real content: Walferdange, Luxembourg — the municipality that contains Helmsange (the
 * Raschpëtzer qanat's location) and the Alzette valley (the qanat's water destination).
 * Companion piece to `raschpetzer.ts`: geographic/administrative facts here are sourced from
 * the same companion data repo `raschpetzer-model-digital-3d` (`data/site.json`'s `regions`
 * and `villa` objects) plus the primary-source brochure it cites (vendored at
 * `static/sources/`), and general facts about the commune/Helmsange/the Alzette are sourced
 * from Wikipedia via web search. Every specific fact carries its own adjacent citation. The
 * inferred Roman villa (site.json's `villa` object) is presented as an unconfirmed working
 * estimate, not a surveyed location — matching the `status: 'inferred'` / `confidence: 'low'`
 * fields on that record.
 */
import { base } from '$app/paths'
import type { Article, Citation, Entity, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./mock) so this module has no circular dependency on it; mock.ts is the
// one that imports articles/categories FROM here to append to its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto`
 *  targets are (see `$lib/paths`'s `href`) — a citation `url` literal needs the GitHub
 *  Pages project-subpath base prefixed by hand, or it 404s under a non-root `BASE_PATH`
 *  deploy (works locally where `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`

// Page locators per data/sources.json's `_prov` map / docs/RASCHPETZER_DATA.md in the
// raschpetzer-model-digital-3d repo — kept as plain page/#page anchors (not a search/
// highlight viewer): opens the vendored PDF directly at the cited page, new tab.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	brochureTopography: {
		id: 'c-walferdange-brochure-p7',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 7, regional topography)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=7`,
	},
	brochureFlow: {
		id: 'c-walferdange-brochure-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, flow direction toward the Alzette valley)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	wikipediaWalferdange: {
		id: 'c-walferdange-wikipedia-walferdange',
		title: 'Walferdange',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Walferdange',
	},
	wikipediaHelmsange: {
		id: 'c-walferdange-wikipedia-helmsange',
		title: 'Helmsange',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Helmsange',
	},
	wikipediaAlzette: {
		id: 'c-walferdange-wikipedia-alzette',
		title: 'Alzette',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Alzette',
	},
} satisfies Record<string, Citation>

export const walferdangeCitations = c

export const walferdangeArticle: Article = {
	id: 'a-walferdange',
	slug: 'walferdange',
	locale: 'en',
	title: 'Walferdange',
	summary:
		'Walferdange is a commune in the canton of Luxembourg, north of Luxembourg City in the valley of the Alzette. Its district of Helmsange sits below the Pëtschend plateau, where the Raschpëtzer qanat was cut to carry spring water west toward the Alzette valley — most likely to a Roman-era estate whose exact site remains unconfirmed.',
	categories: ['history'],
	infobox: [
		{ label: 'Type', value: 'Commune (municipality)' },
		{ label: 'Canton', value: 'Luxembourg' },
		{ label: 'Country', value: 'Luxembourg' },
		{ label: 'Population', value: '≈ 8,900 (2025)' },
		{ label: 'Area', value: '7.06 km²' },
		{ label: 'Constituent localities', value: 'Bereldange, Helmsange, Walferdange' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('Walferdange'),
				cite(
					' is a commune in the canton of Luxembourg, north of Luxembourg City, in the valley of the Alzette.',
					'c-walferdange-wikipedia-walferdange',
				),
				cite(
					' It had a population of roughly 8,900 as of 2025, across an area of 7.06 km², and is made up of three constituent localities: Bereldange, Helmsange, and Walferdange itself',
					'c-walferdange-wikipedia-walferdange',
				),
				t(' — the commune was formed in 1851, when it was detached from Steinsel.'),
			),
		},
		{ id: 'h-helmsange', type: 'heading', level: 2, text: 'Helmsange and the qanat' },
		{
			id: 'p-helmsange',
			type: 'paragraph',
			runs: p(
				cite(
					'Helmsange is a town within the commune, with a population of about 3,269 as of 2025.',
					'c-walferdange-wikipedia-helmsange',
				),
				t(' Northeast of the town, in Helmsange Forest, the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat was cut into the sandstone of the nearby Pëtschend plateau, drawing on springs there and in the neighbouring Haedchen depression',
				),
				cite(
					' — a mountain spur roughly 395 m above sea level, with the marshy Haedchen catchment about 375 m a.s.l. some 600 m to its east.',
					'c-walferdange-brochure-p7',
				),
			),
		},
		{ id: 'h-alzette', type: 'heading', level: 2, text: 'The Alzette valley' },
		{
			id: 'p-alzette',
			type: 'paragraph',
			runs: p(
				cite(
					'The Alzette is a 73-kilometre river rising near Villerupt in northeastern France and flowing north through Esch-sur-Alzette, Luxembourg City, and Mersch before joining the Sauer.',
					'c-walferdange-wikipedia-alzette',
				),
				cite(
					' The qanat carried its water east to west, against the natural dip of the surrounding strata, down toward this Alzette valley',
					'c-walferdange-brochure-p9',
				),
				t(' — the destination the whole gallery was engineered to reach.'),
			),
		},
		{ id: 'h-villa', type: 'heading', level: 2, text: 'The inferred Roman recipient site' },
		{
			id: 'p-villa',
			type: 'paragraph',
			runs: p(
				cite(
					"The qanat's water is thought to have supplied a Roman-era estate downslope, to the west, at the valley end of the gallery",
					'c-walferdange-brochure-p9',
				),
				t(
					' — but that recipient site has not been excavated or surveyed. Its placement in the model dataset is an ',
				),
				b('inferred working estimate'),
				t(', not a confirmed location, carried at low confidence.'),
				cite(
					' Separately, general accounts of the commune note evidence of Roman-era occupation in the area, including a substantial villa',
					'c-walferdange-wikipedia-walferdange',
				),
				t(
					' — consistent with, but not proof of, the specific inferred site the qanat is thought to have served.',
				),
			),
		},
	],
	citations: [
		c.brochureTopography,
		c.brochureFlow,
		c.wikipediaWalferdange,
		c.wikipediaHelmsange,
		c.wikipediaAlzette,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Initial draft: commune/Helmsange/Alzette context for the Raschpëtzer qanat',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

/** Linkable stubs for nearby places named in `walferdangeArticle` and `raschpetzer.ts` but not
 *  (yet) given their own full `Article` — powers hover-preview cards and wikilink autocomplete
 *  for these terms. Facts are the same ones cited above / in the site SSOT `regions` array. */
export const walferdangeEntities: Entity[] = [
	{
		id: 'e-helmsange',
		slug: 'helmsange',
		title: 'Helmsange',
		blurb: 'A town in the commune of Walferdange, Luxembourg, with a population of about 3,269 (2025); the Raschpëtzer qanat lies in the forest northeast of the town.',
	},
	{
		id: 'e-alzette',
		slug: 'alzette',
		title: 'Alzette',
		blurb: 'A 73-kilometre river rising in northeastern France and flowing north through Esch-sur-Alzette, Luxembourg City, and Mersch — the valley the Raschpëtzer qanat carried its water toward.',
	},
	{
		id: 'e-petschend-plateau',
		slug: 'petschend-plateau',
		title: 'Pëtschend Plateau',
		blurb: 'A mountain spur east of Helmsange, about 395 m above sea level, whose springs feed the Raschpëtzer qanat.',
	},
	{
		id: 'e-haedchen-depression',
		slug: 'haedchen-depression',
		title: 'Haedchen Depression',
		blurb: "A marshy source area about 375 m above sea level, roughly 600 m east of the Pëtschend plateau, one of the qanat's spring catchments.",
	},
]
