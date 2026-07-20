/**
 * Real content: Helmsange, Luxembourg — the town (within the commune of Walferdange) in
 * whose forest, northeast of the built-up area, the Raschpëtzer qanat lies. Companion piece
 * to `raschpetzer.ts` and `raschpetzer-walferdange.ts`: this article goes deeper on Helmsange
 * itself (its own administrative history, geography, and a notable local landmark) rather
 * than repeating the commune-level facts already covered in `raschpetzer-walferdange.ts`.
 * Sourced entirely from Wikipedia (EN/FR) via web search, plus the same vendored 2018
 * brochure (`static/sources/`) already cited by the sibling articles for the Pëtschend
 * plateau / Helmsange Forest topography. Every specific fact carries its own adjacent
 * citation. Uses the same `slug: 'helmsange'` as the `Entity` stub in
 * `raschpetzer-walferdange.ts` (hover-preview metadata) by design — this `Article` is the
 * full page that stub links to.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

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

// Same vendored brochure as raschpetzer.ts / raschpetzer-walferdange.ts — page 7 covers
// the regional topography (Pëtschend plateau, Helmsange Forest) that this article's
// geography section draws on.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	wikipediaEn: {
		id: 'c-helmsange-wikipedia-en',
		title: 'Helmsange',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Helmsange',
	},
	wikipediaFr: {
		id: 'c-helmsange-wikipedia-fr',
		title: 'Helmsange (French Wikipedia)',
		publisher: 'Wikipédia',
		url: 'https://fr.wikipedia.org/wiki/Helmsange',
	},
	wikipediaWalferdange: {
		id: 'c-helmsange-wikipedia-walferdange',
		title: 'Walferdange',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Walferdange',
	},
	brochureTopography: {
		id: 'c-helmsange-brochure-p7',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 7, regional topography)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=7`,
	},
	cricketGround: {
		id: 'c-helmsange-cricket-ground',
		title: 'Pierre Werner Cricket Ground',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Pierre_Werner_Cricket_Ground',
	},
} satisfies Record<string, Citation>

export const helmsangeCitations = c

export const helmsangeArticle: Article = {
	id: 'a-helmsange',
	slug: 'helmsange',
	locale: 'en',
	title: 'Helmsange',
	summary:
		'Helmsange is a town in the commune of Walferdange, Luxembourg, in the valley of the Alzette. Part of Steinsel until the 1851 administrative split that created Walferdange, it now sits below the Pëtschend plateau, whose forest northeast of the town holds the Raschpëtzer qanat.',
	categories: ['history'],
	infobox: [
		{ label: 'Type', value: 'Town, commune of Walferdange' },
		{ label: 'Canton', value: 'Luxembourg' },
		{ label: 'Country', value: 'Luxembourg' },
		{ label: 'Also known as', value: 'Helsem (Luxembourgish), Helmsingen (German)' },
		{ label: 'Population', value: '≈ 3,269 (2025)' },
		{ label: 'Coordinates', value: '49.650° N, 6.133° E' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('Helmsange'),
				cite(
					' is a town in the commune of Walferdange, in the canton of Luxembourg, with a population of about 3,269 as of 2025.',
					'c-helmsange-wikipedia-en',
				),
				cite(
					' In Luxembourgish it is known as Helsem, and in German as Helmsingen.',
					'c-helmsange-wikipedia-fr',
				),
			),
		},
		{ id: 'h-history', type: 'heading', level: 2, text: 'History' },
		{
			id: 'p-history',
			type: 'paragraph',
			runs: p(
				cite(
					'Before 1 January 1851, Helmsange was part of the commune of Steinsel',
					'c-helmsange-wikipedia-fr',
				),
				t(
					' — the same administrative split that detached Walferdange from Steinsel and created the present-day commune.',
				),
				t(
					' Even earlier, before either commune took its current shape, it was parish life rather than administration that first drew the area together: ',
				),
				cite(
					'accounts of the commune describe how, before its official unification and before its parish church was built, religion pulled the villages of Heisdorf, Helmsange, Bereldange, and Walferdange together.',
					'c-helmsange-wikipedia-walferdange',
				),
			),
		},
		{ id: 'h-geography', type: 'heading', level: 2, text: 'Geography and the Raschpëtzer' },
		{
			id: 'p-geography',
			type: 'paragraph',
			runs: p(
				t('The town lies in the valley of the '),
				link('Alzette', 'alzette'),
				t(
					', on the northern edge of the Luxembourg City agglomeration. Northeast of the built-up town, in ',
				),
				b('Helmsange Forest'),
				cite(
					', the ground rises to the sandstone Pëtschend plateau, whose springs feed the ',
					'c-helmsange-brochure-p7',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' — the Roman-era qanat cut into that plateau to carry spring water downslope toward a settlement in the Alzette valley.',
				),
			),
		},
		{ id: 'h-cricket', type: 'heading', level: 2, text: 'Pierre Werner Cricket Ground' },
		{
			id: 'p-cricket',
			type: 'paragraph',
			runs: p(
				t('The town is also home to the '),
				b('Pierre Werner Cricket Ground'),
				cite(
					', opened in 1991 on land donated by the Walferdange commune next to the Alzette river and renamed in 2002 to honour Pierre Werner (1913–2002), a former Prime Minister of Luxembourg and honorary president of its home club.',
					'c-helmsange-cricket-ground',
				),
				cite(
					' It is the home ground of the Optimists Cricket Club and of the Luxembourg national cricket team, and has hosted international fixtures including the 2020 Luxembourg T20I Trophy.',
					'c-helmsange-cricket-ground',
				),
			),
		},
	],
	citations: [
		c.wikipediaEn,
		c.wikipediaFr,
		c.wikipediaWalferdange,
		c.brochureTopography,
		c.cricketGround,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Initial draft: Helmsange-specific history, geography, and landmarks',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
