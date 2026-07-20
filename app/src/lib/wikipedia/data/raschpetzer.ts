/**
 * Real content: the Raschpëtzer Roman qanat (Walferdange, Luxembourg). Sourced from the
 * companion data repo `raschpetzer-model-digital-3d` (`data/site.json`, `data/sources.json`)
 * and the primary-source brochure it cites (vendored at `static/sources/`), plus external
 * corroborating sources found via web search. Every fact carries a citation; every citation
 * that has a real URL/page locator is deep-linked (`Citation.url`, opened in a new tab by
 * `ArticleReader`'s references list) — see `c.brochure`'s `#page=N` fragments.
 */
import { base } from '$app/paths'
import type { Article, Category, Citation, Inline, TextRun } from './types'

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

export const archaeologyCategory: Category = {
	id: 'archaeology',
	label: 'Archaeology',
	description: 'Excavated sites, artifacts, and the methods used to study the human past.',
}

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto`
 *  targets are (see `$lib/paths`'s `href`) — a `<img src>`/citation `url` literal needs
 *  the GitHub Pages project-subpath base prefixed by hand, or it 404s under a non-root
 *  `BASE_PATH` deploy (works locally where `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`
/** Build a `srcset` attribute string from `[path, widthDescriptor]` pairs, base-prefixed. */
const srcsetOf = (entries: [string, string][]): string =>
	entries.map(([path, w]) => `${asset(path)} ${w}`).join(', ')

// Page locators per data/sources.json's `_prov` map in the raschpetzer-model-digital-3d repo.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	brochureOverview: {
		id: 'c-raschpetzer-brochure-p4',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 4, site facts)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=4`,
	},
	brochureDating: {
		id: 'c-raschpetzer-brochure-p29',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 29, dendrochronology)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=29`,
	},
	brochureExcavation: {
		id: 'c-raschpetzer-brochure-p11',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 11–13, excavation chronicle)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=11`,
	},
	geoportail: {
		id: 'c-geoportail-lu',
		title: 'Orthophoto officielle du Grand-Duché de Luxembourg, édition 2019',
		authors: 'Administration du cadastre et de la topographie (ACT)',
		year: 2019,
		publisher: 'geoportail.lu (Luxembourg open data, CC0 1.0)',
		url: 'https://data.public.lu/en/datasets/orthophoto-officielle-du-grand-duche-de-luxembourg-edition-2019/',
	},
	wikipediaEn: {
		id: 'c-wikipedia-raschpetzer',
		title: 'Raschpëtzer Qanat',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Raschp%C3%ABtzer_Qanat',
	},
	visitLuxembourg: {
		id: 'c-visitluxembourg-raschpetzer',
		title: 'Gallo-Roman aqueduct Raschpëtzer',
		publisher: 'Visit Luxembourg (official tourism board)',
		url: 'https://www.visitluxembourg.com/place/gallo-roman-site-raschpetzer-walferdange',
	},
} satisfies Record<string, Citation>

export const raschpetzerCitations = c

export const raschpetzer: Article = {
	id: 'a-raschpetzer',
	slug: 'raschpetzer-qanat',
	locale: 'en',
	title: 'Raschpëtzer Qanat',
	summary:
		'The Raschpëtzer is a Roman-era qanat (underground water-supply gallery) in Helmsange Forest, Walferdange, Luxembourg — a 720 m gravity-fed conduit reached through more than a dozen vertical shafts, built to carry spring water from the Pëtschend plateau down to a Roman settlement in the Alzette valley.',
	categories: ['archaeology', 'history'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 3,
		alt: 'Map showing the location of the Raschpëtzer site near Walferdange, Luxembourg, within the Alzette valley',
		caption:
			'The Raschpëtzer qanat (site 3) lies in the Alzette valley near Walferdange, Grand Duchy of Luxembourg.',
		credit: 'Faber, Waringo & Werner, 2018',
		src: asset('/media/raschpetzer/Fig1-01-fallback.jpg'),
		srcset: srcsetOf([
			['/media/raschpetzer/Fig1-01-480w.webp', '480w'],
			['/media/raschpetzer/Fig1-01-960w.webp', '960w'],
			['/media/raschpetzer/Fig1-01-1920w.webp', '1920w'],
		]),
		sizes: '(min-width: 768px) 640px, 100vw',
		ratio: 3676 / 2462,
	},
	infobox: [
		{ label: 'Type', value: 'Roman qanat (underground water-supply gallery)' },
		{ label: 'Location', value: 'Helmsange Forest, Walferdange, Luxembourg' },
		{ label: 'Coordinates', value: '49.668° N, 6.139° E' },
		{ label: 'Channel length', value: '720 m (310 m explored)' },
		{ label: 'Known shafts', value: '13 (depths 6–36 m)' },
		{ label: 'Service period', value: 'c. AD 140 – AD 350' },
		{ label: 'Average flow', value: '≈ 180 m³ / day' },
		{ label: 'Rediscovered', value: '1986 (excavations resumed 1967)' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				b('Raschpëtzer'),
				t(
					' is a Gallo-Roman qanat — a gently sloping underground gallery fed by a chain of vertical access shafts — cut into the sandstone of the Pëtschend plateau northeast of ',
				),
				link('Helmsange', 'raschpetzer-qanat'),
				t(', in the municipality of '),
				b('Walferdange'),
				cite(', Luxembourg.', 'c-raschpetzer-brochure-p4'),
				t(
					' It carried spring water roughly 720 metres, dropping about 100 metres in elevation, west toward the Alzette valley to supply a Roman-era settlement.',
				),
			),
		},
		{ id: 'h-overview', type: 'heading', level: 2, text: 'Construction and layout' },
		{
			id: 'p-shafts',
			type: 'paragraph',
			runs: p(
				t(
					'Thirteen shafts are currently known along the route, ranging from 6 to 36 metres deep and 0.8–1.2 metres in diameter; the connecting gallery itself is only 0.5–2.0 metres wide and 0.5–2.3 metres high above the stone-covered water conduit at its floor.',
				),
				cite(' Water flowed east to west', 'c-raschpetzer-brochure-p4'),
				t(
					' — from the springs of the Pëtschend plateau and the Haedchen depression toward the Alzette valley — contrary to the natural dip of the surrounding strata, meaning the gallery had to be surveyed and cut with real precision for an unpowered gravity flow of roughly 180 cubic metres a day.',
				),
			),
		},
		{
			id: 'fig-catchment',
			type: 'figure',
			tone: 1,
			alt: 'Topographic map of the Pëtschend plateau and Haedchen depression showing the catchment springs and the qanat shaft line',
			caption:
				"Catchment map of the Pëtschend plateau and Haedchen depression: springs A–C feed the qanat's shaft line (marked R), overlaid on the local topography and fault lines.",
			credit: 'Faber, Waringo & Werner, 2018',
			src: asset('/media/raschpetzer/Fig3-01-fallback.jpg'),
			srcset: srcsetOf([
				['/media/raschpetzer/Fig3-01-480w.webp', '480w'],
				['/media/raschpetzer/Fig3-01-960w.webp', '960w'],
			]),
			sizes: '(min-width: 768px) 640px, 100vw',
			ratio: 1461 / 1190,
		},
		{ id: 'h-dating', type: 'heading', level: 2, text: 'Dating' },
		{
			id: 'p-dating',
			type: 'paragraph',
			runs: p(
				t(
					'An oak beam recovered from shaft P8 gave an outer growth ring dated to AD 114, extrapolated to a felling date around AD 131 — placing construction in the early-to-mid 2nd century.',
				),
				cite(
					' The gallery is thought to have stayed in service until roughly AD 350.',
					'c-raschpetzer-brochure-p29',
				),
			),
		},
		{ id: 'h-discovery', type: 'heading', level: 2, text: 'Discovery and excavation' },
		{
			id: 'p-discovery',
			type: 'paragraph',
			runs: p(
				cite(
					'An initial excavation attempt in 1913 found nothing conclusive. Systematic excavation resumed in 1967 and, in 1986, uncovered the qanat gallery itself',
					'c-raschpetzer-brochure-p11',
				),
				t(
					' — since then it has been studied as one of the best-preserved examples of its kind north of the Alps.',
				),
			),
		},
		{ id: 'h-visiting', type: 'heading', level: 2, text: 'Visiting today' },
		{
			id: 'p-visiting',
			type: 'paragraph',
			runs: p(
				t(
					'Ten of the excavated shafts are accessible at the surface, each capped with a modern metal lid; two are fitted with windows — one over the 36-metre-deep shaft P5, the other over the overflow bifurcation at P-4 — so visitors can see down into the gallery without entering it.',
				),
			),
		},
	],
	citations: [
		c.brochureOverview,
		c.brochureDating,
		c.brochureExcavation,
		c.geoportail,
		c.wikipediaEn,
		c.visitLuxembourg,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary: 'Initial draft from the site SSOT dataset and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
